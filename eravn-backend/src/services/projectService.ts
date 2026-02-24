// ==========================================
// eravnProjects Backend - Project Service
// ==========================================
// Business logic layer for Projects (ported from ProjectService.gs)

import * as repo from '../repositories/firestoreRepository.js';
import { getSettings } from './settingsService.js';
import { generateId, getCurrentTimestamp, extractFolderIdFromLink, getTodayStartInTimezone, getMidnightInTimezone } from '../utils.js';
import logger from '../logger.js';
import type { Project, SyncSession } from '../types.js';

/**
 * Get all active (not deleted) projects
 */
export async function getAllProjects(): Promise<Project[]> {
    const all = await repo.getAllProjects();
    return all.filter(p => !p.isDeleted);
}

/**
 * Get a project by ID
 */
export async function getProjectById(id: string): Promise<Project | null> {
    if (!id) throw new Error('Project ID is required');
    const p = await repo.getProjectById(id);
    if (p && p.isDeleted) return null;
    return p;
}

/**
 * Create a new project with validation and default values
 */
export async function createProject(projectData: Partial<Project>): Promise<Project> {
    // Validation
    if (!projectData.name) throw new Error('Tên dự án là bắt buộc');
    if (!projectData.sourceFolderId && !projectData.sourceFolderLink) {
        throw new Error('Source folder là bắt buộc');
    }
    if (!projectData.destFolderId && !projectData.destFolderLink) {
        throw new Error('Destination folder là bắt buộc');
    }

    // Extract folder IDs from links if needed
    if (projectData.sourceFolderLink && !projectData.sourceFolderId) {
        projectData.sourceFolderId = extractFolderIdFromLink(projectData.sourceFolderLink);
    }
    if (projectData.destFolderLink && !projectData.destFolderId) {
        projectData.destFolderId = extractFolderIdFromLink(projectData.destFolderLink);
    }

    // Check for duplicates
    const existingProjects = await getAllProjects();
    const isDuplicate = existingProjects.some(
        p => p.sourceFolderId === projectData.sourceFolderId && p.destFolderId === projectData.destFolderId
    );
    if (isDuplicate) {
        throw new Error('Dự án với cặp thư mục Source và Destination này đã tồn tại!');
    }

    const settings = await getSettings();
    const nextSyncTimestamp = projectData.syncStartDate
        ? getMidnightInTimezone(projectData.syncStartDate, settings.timezone)
        : null;

    const newProject: Project = {
        id: generateId(),
        name: projectData.name,
        description: projectData.description || '',
        sourceFolderId: projectData.sourceFolderId!,
        sourceFolderLink: projectData.sourceFolderLink || '',
        destFolderId: projectData.destFolderId!,
        destFolderLink: projectData.destFolderLink || '',
        syncStartDate: projectData.syncStartDate || undefined,
        status: 'active',
        filesCount: 0,
        totalSize: 0,
        lastSyncTimestamp: null,
        lastSuccessSyncTimestamp: null,
        nextSyncTimestamp,
        lastSyncStatus: null,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
    };

    return repo.saveProject(newProject);
}

/**
 * Update an existing project
 */
export async function updateProject(projectData: Partial<Project>): Promise<Project> {
    if (!projectData.id) throw new Error('Project ID là bắt buộc');

    const existing = await repo.getProjectById(projectData.id);
    if (!existing) throw new Error('Không tìm thấy dự án');

    const merged: Project = {
        ...existing,
        ...projectData,
        updatedAt: getCurrentTimestamp(),
    };

    // If syncStartDate changed, update nextSyncTimestamp to match (midnight in timezone)
    if (projectData.syncStartDate !== undefined && projectData.syncStartDate !== existing.syncStartDate) {
        if (projectData.syncStartDate) {
            const settings = await getSettings();
            merged.nextSyncTimestamp = getMidnightInTimezone(projectData.syncStartDate, settings.timezone);
        } else {
            merged.nextSyncTimestamp = null;
        }
    }

    return repo.saveProject(merged);
}

/**
 * Delete a project (soft delete)
 */
export async function deleteProject(id: string): Promise<{ success: boolean }> {
    if (!id) throw new Error('Project ID là bắt buộc');
    return repo.deleteProjectDoc(id);
}

/**
 * Reset a project to force full resync
 */
export async function resetProject(id: string): Promise<Project> {
    if (!id) throw new Error('Project ID là bắt buộc');
    const project = await repo.getProjectById(id);
    if (!project) throw new Error('Không tìm thấy dự án');

    if (project.syncStartDate) {
        const settings = await getSettings();
        project.nextSyncTimestamp = getMidnightInTimezone(project.syncStartDate, settings.timezone);
    } else {
        project.nextSyncTimestamp = null;
    }
    project.lastSyncStatus = null; // LS: reset to null to force full resync
    project.isRunning = false;
    project.updatedAt = getCurrentTimestamp();

    return repo.saveProject(project);
}

/**
 * Soft Reset: Delete all sync logs, file logs, heartbeats, 
 * and reset all project sync metadata while keeping basic project info.
 */
export async function softReset(): Promise<boolean> {
    try {
        logger.info('Starting Soft Reset process...');

        // 1. Clear all sync logs, file logs and heartbeats
        await repo.clearSyncData();

        // 2. Reset all projects
        const projects = await repo.getAllProjects();
        const settings = await getSettings();
        const now = getCurrentTimestamp();

        for (const project of projects) {
            // Keep basic info, reset sync states
            const resetProject: Project = {
                id: project.id,
                name: project.name,
                description: project.description || '',
                sourceFolderId: project.sourceFolderId,
                sourceFolderLink: project.sourceFolderLink,
                destFolderId: project.destFolderId,
                destFolderLink: project.destFolderLink,
                syncStartDate: project.syncStartDate,
                createdAt: project.createdAt,
                status: 'active', // Reset to active
                filesCount: 0,
                totalSize: 0,
                lastSyncTimestamp: null,
                lastSuccessSyncTimestamp: null,
                lastSyncStatus: null,
                updatedAt: now,
                isDeleted: false,
                isRunning: false,
            };

            // Recalculate nextSyncTimestamp from syncStartDate
            if (project.syncStartDate) {
                resetProject.nextSyncTimestamp = getMidnightInTimezone(project.syncStartDate, settings.timezone);
            } else {
                resetProject.nextSyncTimestamp = null;
            }

            await repo.saveProject(resetProject);
        }

        logger.info(`Soft Reset completed. ${projects.length} projects reset.`);
        return true;
    } catch (e) {
        logger.error('Soft Reset failed', { error: (e as Error).message });
        throw e;
    }
}

/**
 * Get project statistics for Today and Last 7 Days
 */
export async function getProjectStatsMap(): Promise<Record<string, { todayFiles: number; last7DaysFiles: number }>> {
    try {
        const settings = await getSettings();
        const timezone = settings.timezone || 'Asia/Ho_Chi_Minh';

        const todayStart = getTodayStartInTimezone(timezone);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const recentSessions = await repo.getSyncSessions({ startDate: sevenDaysAgo });
        const stats: Record<string, { todayFiles: number; last7DaysFiles: number }> = {};

        for (const session of recentSessions) {
            if (!stats[session.projectId]) {
                stats[session.projectId] = { todayFiles: 0, last7DaysFiles: 0 };
            }
            stats[session.projectId].last7DaysFiles += session.filesCount;
            if (session.timestamp >= todayStart) {
                stats[session.projectId].todayFiles += session.filesCount;
            }
        }

        return stats;
    } catch (e) {
        logger.error('Error in getProjectStatsMap', { error: (e as Error).message });
        return {};
    }
}
