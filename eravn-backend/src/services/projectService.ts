// ==========================================
// eravnProjects Backend - Project Service
// ==========================================
// Business logic layer for Projects (ported from ProjectService.gs)

import * as repo from '../repositories/firestoreRepository.js';
import { getSettings } from './settingsService.js';
import { generateId, getCurrentTimestamp, extractFolderIdFromLink } from '../utils.js';
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
        nextSyncTimestamp: null,
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

    project.nextSyncTimestamp = null;
    project.lastSyncStatus = 'pending';
    project.updatedAt = getCurrentTimestamp();

    return repo.saveProject(project);
}

/**
 * Get project statistics for Today and Last 7 Days
 */
export async function getProjectStatsMap(): Promise<Record<string, { todayFiles: number; last7DaysFiles: number }>> {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
