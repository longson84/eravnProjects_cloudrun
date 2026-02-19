// ==========================================
// eravnProjects Backend - Sync Log Service
// ==========================================
// Log filtering, details, and continue sync (ported from SyncLogService.gs)

import logger from '../logger.js';
import * as repo from '../repositories/firestoreRepository.js';
import { syncProjectById } from './syncService.js';
import type { SyncLogEntry, FileLog } from '../types.js';

/**
 * Get sync logs with filters
 */
export async function getSyncLogs(filters: {
    days?: number;
    status?: string;
    search?: string;
}): Promise<SyncLogEntry[]> {
    const options: { startDate?: Date; limit?: number } = { limit: 100 };

    if (filters.days && filters.days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.days);
        options.startDate = cutoffDate;
    }

    const sessions = await repo.getSyncSessions(options);
    const logs: SyncLogEntry[] = [];

    for (const data of sessions) {
        // Apply Status Filter
        if (filters.status && filters.status !== 'all' && data.status !== filters.status) {
            continue;
        }

        // Apply Search Filter
        if (filters.search) {
            const term = filters.search.toLowerCase();
            const match =
                (data.projectName || '').toLowerCase().includes(term) ||
                (data.runId || '').toLowerCase().includes(term);
            if (!match) continue;
        }

        logs.push({
            sessionId: data.id,
            projectId: data.projectId,
            projectName: data.projectName,
            runId: data.runId,
            startTime: data.timestamp,
            endTime: data.timestamp,
            duration: data.executionDurationSeconds,
            status: data.status as any,
            current: data.current,
            filesCount: data.filesCount,
            failedCount: data.failedFilesCount || 0,
            totalSize: data.totalSizeSynced,
            error: data.errorMessage,
            continueId: data.continueId || undefined,
            triggeredBy: data.triggeredBy || 'manual',
        });
    }

    return logs;
}

/**
 * Get detailed file logs for a session
 */
export async function getSyncLogDetails(sessionId: string): Promise<FileLog[]> {
    return repo.getFileLogsBySession(sessionId);
}

/**
 * Continue a sync project (triggers a new sync for the project)
 */
export async function continueSyncProject(sessionId: string, projectId: string): Promise<boolean> {
    try {
        await syncProjectById(projectId, { triggeredBy: 'manual' });
        return true;
    } catch (e) {
        logger.error(`Continue sync failed: ${(e as Error).message}`);
        throw e;
    }
}
