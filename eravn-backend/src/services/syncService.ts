// ==========================================
// eravnProjects Backend - Sync Service (Core Logic)
// ==========================================
// Time-Snapshot Sync with recursive scan, continue mode, and p-limit concurrency

import pLimit from 'p-limit';
import { CONFIG } from '../config.js';
import logger from '../logger.js';
import { generateId, getCurrentTimestamp, generateRunId, formatTimestampForFilename } from '../utils.js';
import { getSettings } from './settingsService.js';
import * as projectService from './projectService.js';
import * as driveService from './driveService.js';
import * as webhookService from './webhookService.js';
import * as repo from '../repositories/firestoreRepository.js';
import { shouldStop, clearStop } from './stopSignalRegistry.js';
import type { Project, SyncSession, FileLog } from '../types.js';

/**
 * Run sync for all active projects (queue-based, with p-limit concurrency)
 */
export async function syncAllProjects(options?: { triggeredBy?: 'manual' | 'scheduled' }): Promise<{
    success: boolean;
    runId: string;
    sessionsCount: number;
    message?: string;
}> {
    const triggeredBy = options?.triggeredBy || 'scheduled';
    const runId = generateRunId();
    const settings = await getSettings();

    // Respect auto schedule switch
    if (triggeredBy !== 'manual' && settings.enableAutoSchedule === false) {
        logger.info('Auto schedule is disabled. Skipping syncAllProjects run.');
        return { success: false, runId, sessionsCount: 0, message: 'Auto schedule disabled' };
    }

    const projects = await projectService.getAllProjects();
    const activeProjects = projects.filter(p => p.status === 'active' && !p.isDeleted);

    // Sort Logic (same as GAS)
    activeProjects.sort((a, b) => {
        const aIsFailed = a.lastSyncStatus === 'error' || a.lastSyncStatus === 'interrupted';
        const bIsFailed = b.lastSyncStatus === 'error' || b.lastSyncStatus === 'interrupted';

        if (aIsFailed && !bIsFailed) return -1;
        if (!aIsFailed && bIsFailed) return 1;

        const timeA = a.lastSyncTimestamp ? new Date(a.lastSyncTimestamp).getTime() : 0;
        const timeB = b.lastSyncTimestamp ? new Date(b.lastSyncTimestamp).getTime() : 0;

        if (aIsFailed && bIsFailed) return timeB - timeA; // Newest first
        return timeA - timeB; // Oldest first
    });

    // Use p-limit for controlled concurrency (per user feedback)
    const limit = pLimit(CONFIG.SYNC_CONCURRENCY);
    const results = await Promise.allSettled(
        activeProjects.map(project =>
            limit(async () => {
                try {
                    return await syncSingleProject(project, runId, settings, { triggeredBy });
                } catch (e) {
                    logger.error(`Error syncing project ${project.name}: ${(e as Error).message}`);
                    const errorSession = await createErrorSession(project, runId, (e as Error).message);

                    // Update project status
                    await projectService.updateProject({
                        id: project.id,
                        status: 'error',
                        lastSyncStatus: 'error',
                    });

                    return errorSession;
                }
            })
        )
    );

    const sessions = results
        .filter((r): r is PromiseFulfilledResult<SyncSession> => r.status === 'fulfilled')
        .map(r => r.value);

    // Send summary notification
    if (settings.enableNotifications && settings.webhookUrl) {
        await webhookService.sendSyncSummary(sessions, runId);
    }

    return { success: true, runId, sessionsCount: sessions.length };
}

/**
 * Run sync for a single project by ID
 */
export async function syncProjectById(
    projectId: string,
    options?: { triggeredBy?: 'manual' | 'scheduled' }
): Promise<{
    success: boolean;
    runId: string;
    message: string;
    stats: { filesCount: number; totalSizeSynced: number; failedCount: number; status: string };
}> {
    const project = await projectService.getProjectById(projectId);
    if (!project) throw new Error('Project not found: ' + projectId);

    const runId = generateRunId();
    const settings = await getSettings();

    let result: SyncSession;
    try {
        result = await syncSingleProject(project, runId, settings, options);
    } catch (e) {
        // Unified error handling — same as syncAllProjects
        logger.error(`Error syncing project ${project.name}: ${(e as Error).message}`);
        result = await createErrorSession(project, runId, (e as Error).message);

        // Update project status to trigger continue mode on next sync
        await projectService.updateProject({
            id: project.id,
            status: 'error',
            lastSyncStatus: 'error',
        });
    }

    if (settings.enableNotifications && settings.webhookUrl) {
        await webhookService.sendSyncSummary([result], runId);
    }

    return {
        success: result.status !== 'error',
        runId,
        message: result.status === 'error'
            ? `Sync failed: ${result.errorMessage}`
            : `Synced ${result.filesCount} files`,
        stats: {
            filesCount: result.filesCount,
            totalSizeSynced: result.totalSizeSynced,
            failedCount: result.failedFilesCount || 0,
            status: result.status,
        },
    };
}

/**
 * Core sync logic for a single project
 * Implements Time-Snapshot Sync with recursive folder scanning
 */
async function syncSingleProject(
    project: Project,
    runId: string,
    settings: any,
    options?: { triggeredBy?: 'manual' | 'scheduled' }
): Promise<SyncSession> {
    const triggeredBy = options?.triggeredBy || 'manual';
    const startTime = Date.now();
    const settingsCutoff = Number(settings.syncCutoffSeconds);
    const configCutoff = Number(CONFIG.SYNC_CUTOFF_SECONDS);
    const finalCutoffSeconds = settingsCutoff > 0 ? settingsCutoff : (configCutoff > 0 ? configCutoff : 300);
    const cutoffMs = finalCutoffSeconds * 1000;
    const sessionTimestamp = getCurrentTimestamp();

    logger.info(`[Sync:${project.id}] START. Cutoff: ${finalCutoffSeconds}s (Settings: ${settingsCutoff}s, Config: ${configCutoff}s). StartTime: ${startTime}`);

    // Step 1: Base timestamp & checkpoint
    const syncStartTime = project.syncStartDate ? new Date(project.syncStartDate).getTime() : 0;
    let checkpointTime = 0;
    if (project.nextSyncTimestamp) {
        checkpointTime = new Date(project.nextSyncTimestamp).getTime();
    } else if (project.lastSuccessSyncTimestamp) {
        checkpointTime = new Date(project.lastSuccessSyncTimestamp).getTime();
    }

    const lastSyncStatus = project.lastSyncStatus || null;

    // Atomic Lock Check: Prevent concurrent syncs for the same project
    // If status is 'pending', another instance is already running
    if (lastSyncStatus === 'pending') {
        const lastUpdate = new Date(project.updatedAt).getTime();
        const now = Date.now();
        // Safety: If it's been 'pending' for more than 2 hours, assume it's stalled and allow takeover
        if (now - lastUpdate < 2 * 60 * 60 * 1000) {
            logger.warn(`[Sync:${project.id}] ABORTED. Another sync is already in progress.`);
            throw new Error('Dự án này đang trong quá trình đồng bộ bởi một tiến trình khác.');
        }
    }

    const baseTimestamp = Math.max(checkpointTime, syncStartTime);

    let isContinueMode = false;
    let pendingSessions: SyncSession[] = [];
    const successFilesMap: Record<string, FileLog> = {};
    const effectiveTimestamp = baseTimestamp;

    logger.info(`Starting sync for project: ${project.name}, runId: ${runId}, triggeredBy: ${triggeredBy}`);
    if (lastSyncStatus) logger.info(`Last Sync Status: ${lastSyncStatus}`);

    const sinceTimestamp = effectiveTimestamp > 0
        ? new Date(effectiveTimestamp).toISOString()
        : '1970-01-01T00:00:00Z';

    const session: SyncSession = {
        id: generateId(),
        projectId: project.id,
        projectName: project.name,
        runId,
        timestamp: sessionTimestamp,
        executionDurationSeconds: 0,
        status: 'running', // Start as running — will become success/interrupted/error at the end
        current: 'running',
        filesCount: 0,
        failedFilesCount: 0,
        totalSizeSynced: 0,
        triggeredBy,
        retryOf: null,
        continueId: null,
    };

    // PERSISTENCE START: Save session immediately so Sync Logs can show it
    // Note: lastSyncStatus='pending' is already set by the controller before fire-and-forget
    await repo.saveSyncSession(session);

    const fileLogsBatch: Partial<FileLog>[] = [];
    let isInterrupted = false;

    // Helper to save progress incrementally
    async function saveProgress(): Promise<void> {
        if (fileLogsBatch.length === 0) return;

        try {
            const logsToSave = [...fileLogsBatch];
            fileLogsBatch.length = 0; // Clear the batch

            await repo.batchSaveFileLogs(session.id, logsToSave);

            // Update session record with current counts
            session.executionDurationSeconds = Math.round((Date.now() - startTime) / 1000);
            await repo.saveSyncSession(session);

            logger.info(`[Sync:${project.id}] Progressive save: ${session.filesCount} files synced.`);
        } catch (e) {
            const fileLogError = (e as Error).message;
            logger.error(`[Sync:${project.id}] Progressive save FAILED: ${fileLogError}`);
            // Reflect file log failure in session status
            if (session.status === 'success' || session.status === 'running') {
                session.status = 'warning';
            }
            session.errorMessage = (session.errorMessage ? session.errorMessage + ' | ' : '') +
                `[File logs save failed: ${fileLogError}]`;
        }
    }

    // Recursive sync function
    async function syncFolder(sourceFolderId: string, destFolderId: string, pathPrefix: string): Promise<void> {
        if (isInterrupted) return;

        // Check cutoff time + stop signal
        const elapsed = Date.now() - startTime;
        const stopRequested = shouldStop(project.id);
        if (elapsed > cutoffMs || stopRequested) {
            isInterrupted = true;
            session.status = 'interrupted';
            session.current = 'interrupted';
            session.errorMessage = stopRequested
                ? `Đã dừng theo yêu cầu người dùng. (Elapsed: ${Math.round(elapsed / 1000)}s)`
                : `Cutoff timeout: đã vượt quá ${finalCutoffSeconds} giây (Elapsed: ${elapsed}ms > Cutoff: ${cutoffMs}ms). Safe exit.`;
            if (stopRequested) clearStop(project.id);
            logger.warn(session.errorMessage);
            return;
        }

        // List modified files
        const files = await driveService.listModifiedFiles(sourceFolderId, sinceTimestamp);
        await processFiles(files, destFolderId, pathPrefix);

        // Recurse into subfolders
        const subFolders = await driveService.listSubFolders(sourceFolderId);
        for (const subFolder of subFolders) {
            if (isInterrupted) return;
            const destSubFolder = await driveService.findOrCreateFolder(subFolder.name, destFolderId);
            await syncFolder(subFolder.id, destSubFolder.id, pathPrefix + subFolder.name + '/');
        }
    }

    // Helper to process a batch of files
    async function processFiles(files: any[], destFolderId: string, pathPrefix: string): Promise<void> {
        for (const file of files) {
            if (isInterrupted) return;

            // Check cutoff + stop signal
            const elapsed = Date.now() - startTime;
            const stopRequested = shouldStop(project.id);
            if (elapsed > cutoffMs || stopRequested) {
                isInterrupted = true;
                session.status = 'interrupted';
                session.current = 'interrupted';
                session.errorMessage = stopRequested
                    ? `Đã dừng theo yêu cầu người dùng. (Elapsed: ${Math.round(elapsed / 1000)}s)`
                    : `Cutoff timeout: đã vượt quá ${finalCutoffSeconds} giây (Elapsed: ${elapsed}ms > Cutoff: ${cutoffMs}ms). Safe exit.`;
                if (stopRequested) clearStop(project.id);
                return;
            }

            const fileLogEntry: Partial<FileLog> = {
                fileName: file.name,
                sourceLink: `https://drive.google.com/file/d/${file.id}/view`,
                destLink: '',
                sourcePath: pathPrefix + file.name,
                sourceFileId: file.id,
                createdDate: file.createdTime || getCurrentTimestamp(),
                modifiedDate: file.modifiedTime || getCurrentTimestamp(),
                fileSize: 0,
                status: 'success',
                errorMessage: '',
            };

            try {
                // Skip folders
                if (file.mimeType === CONFIG.FOLDER_MIME_TYPE) continue;

                // Continue Mode check
                let shouldCopy = true;
                const currentSourcePath = pathPrefix + file.name;
                // Try unique ID first, then fallback to path for old logs
                const prevSuccessLog = successFilesMap[file.id] || successFilesMap[currentSourcePath];

                if (isContinueMode && prevSuccessLog) {
                    const prevModTime = new Date(prevSuccessLog.modifiedDate).getTime();
                    const currModTime = new Date(file.modifiedTime).getTime();
                    if (currModTime <= prevModTime) {
                        shouldCopy = false;
                        logger.info(`Skipping file (Continue Mode): ${file.name}`);
                    }
                }

                if (!shouldCopy) continue;

                // Rename Logic: OriginalName_vYYMMDD_HHmm.ext
                let destFileName = file.name;
                const existingFiles = await driveService.findFilesByName(file.name, destFolderId);
                if (existingFiles.length > 0) {
                    const timestamp = formatTimestampForFilename(new Date());
                    const dotIdx = file.name.lastIndexOf('.');
                    if (dotIdx !== -1) {
                        const name = file.name.substring(0, dotIdx);
                        const ext = file.name.substring(dotIdx);
                        destFileName = `${name}_v${timestamp}${ext}`;
                    } else {
                        destFileName = `${file.name}_v${timestamp}`;
                    }
                }

                // Copy file
                const copiedFile = await driveService.copyFileToDest(file.id, destFolderId, destFileName);
                const fileSize = Number(file.size) || 0;

                fileLogEntry.destLink = copiedFile.webViewLink || `https://drive.google.com/file/d/${copiedFile.id}/view`;
                fileLogEntry.fileSize = fileSize;

                session.filesCount++;
                session.totalSizeSynced += fileSize;
            } catch (e) {
                const errMsg = (e as Error).message;
                logger.error(`Error syncing file ${file.name}: ${errMsg}`);
                fileLogEntry.status = 'error';
                fileLogEntry.errorMessage = errMsg;
                session.failedFilesCount = (session.failedFilesCount || 0) + 1;

                if (errMsg.includes('File not found') || errMsg.includes('404')) {
                    fileLogEntry.status = 'skipped';
                    fileLogEntry.errorMessage = 'Source file not found (deleted)';
                } else {
                    if (session.status === 'success' || session.status === 'running') {
                        session.status = 'warning';
                    }
                }
            }

            fileLogsBatch.push(fileLogEntry);

            // Progressive save: every 50 files
            if (fileLogsBatch.length >= 50) {
                await saveProgress();
            }
        }
    }

    // EXECUTION — comprehensive error boundary covers continue mode init + sync
    try {
        // Determine Continue Mode (inside try-catch to guarantee session is saved on error)
        if (lastSyncStatus === 'error' || lastSyncStatus === 'interrupted') {
            isContinueMode = true;
            logger.info('Checking for pending sessions (Continue Mode)...');
            pendingSessions = await repo.getPendingSyncSessions(project.id);
            logger.info(`Found ${pendingSessions.length} pending sessions.`);

            if (pendingSessions.length > 0) {
                for (const ps of pendingSessions) {
                    const logs = await repo.getFileLogsBySession(ps.id);
                    for (const log of logs) {
                        if (log.status === 'success') {
                            // Use file ID as primary key if available, fallback to path
                            if (log.sourceFileId) {
                                successFilesMap[log.sourceFileId] = log;
                            } else {
                                successFilesMap[log.sourcePath] = log;
                            }
                        }
                    }
                }
                logger.info(`Mapped ${Object.keys(successFilesMap).length} successful files to skip.`);
            } else {
                isContinueMode = false;
            }
        }

        await syncFolder(project.sourceFolderId, project.destFolderId, '/');

        // Final status: only promote to 'success' if still 'running' (no timeout, no error)
        if (session.status === 'running') {
            session.status = 'success';
            session.current = 'success';
        }
    } catch (e) {
        logger.error(`Sync execution FAILED for project ${project.name}: ${(e as Error).message}`);
        session.status = 'error';
        session.current = 'error';
        session.errorMessage = (e as Error).message;
    }

    // Finalize duration
    session.executionDurationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Final save for any remaining logs and the session status
    await saveProgress();

    // Final session save to update duration and successful status
    await repo.saveSyncSession(session);

    await repo.saveProjectHeartbeat(project.id, session.status);

    // Post-Processing for Continue Mode
    if (isContinueMode && pendingSessions.length > 0) {
        logger.info(`Post-processing Continue Mode. Pending Sessions: ${pendingSessions.length}`);
        for (let i = 0; i < pendingSessions.length; i++) {
            const pSession = pendingSessions[i];
            const updates: Partial<SyncSession> = { current: session.status };
            if (i === 0) {
                updates.continueId = session.runId;
                logger.info(`Linking pending session ${pSession.runId} to new session ${session.runId}`);
            }
            try {
                await repo.updateSyncSession(pSession.id, updates);
            } catch (e) {
                logger.error(`Failed to update pending session ${pSession.id}: ${(e as Error).message}`);
            }
        }
    }

    // Update project metadata
    const projectUpdates: Partial<Project> = {
        id: project.id,
        lastSyncTimestamp: session.timestamp,
        lastSyncStatus: session.status as any,
        filesCount: (project.filesCount || 0) + session.filesCount,
        totalSize: (project.totalSize || 0) + session.totalSizeSynced,
    };

    if (session.status === 'success') {
        projectUpdates.lastSuccessSyncTimestamp = session.timestamp;
        projectUpdates.nextSyncTimestamp = session.timestamp;
    }

    if (project.status === 'error' && session.status !== 'error') {
        projectUpdates.status = 'active';
    }

    try {
        await projectService.updateProject(projectUpdates);
    } catch (e) {
        logger.error(`Failed to update project metadata: ${(e as Error).message}`);
    }

    logger.info(`Synced ${session.filesCount} files, total size ${session.totalSizeSynced}, status ${session.status}`);
    return session;
}

/**
 * Create an error session record
 */
async function createErrorSession(project: Project, runId: string, errorMsg: string): Promise<SyncSession> {
    const session: SyncSession = {
        id: generateId(),
        projectId: project.id,
        projectName: project.name,
        runId,
        timestamp: getCurrentTimestamp(),
        executionDurationSeconds: 0,
        status: 'error',
        filesCount: 0,
        totalSizeSynced: 0,
        errorMessage: errorMsg,
    };
    await repo.saveSyncSession(session);
    return session;
}
