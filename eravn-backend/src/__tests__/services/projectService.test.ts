// ==========================================
// Tests for Project Service
// ==========================================
// Tests CRUD operations, validation, duplicate checking, soft delete

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../repositories/firestoreRepository.js', () => ({
    getAllProjects: vi.fn(),
    getProjectById: vi.fn(),
    saveProject: vi.fn(),
    deleteProjectDoc: vi.fn(),
    getSyncSessions: vi.fn(),
}));

vi.mock('../../services/settingsService.js', () => ({
    getSettings: vi.fn().mockResolvedValue({
        syncCutoffSeconds: 300,
        maxRetries: 3,
        batchSize: 450,
    }),
}));

import {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    resetProject,
    getProjectStatsMap,
} from '../../services/projectService.js';
import * as repo from '../../repositories/firestoreRepository.js';
import type { Project, SyncSession } from '../../types.js';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'proj-1',
    name: 'Test Project',
    description: 'Test description',
    sourceFolderId: 'source-folder-id',
    sourceFolderLink: 'https://drive.google.com/drive/folders/source-folder-id',
    destFolderId: 'dest-folder-id',
    destFolderLink: 'https://drive.google.com/drive/folders/dest-folder-id',
    status: 'active',
    filesCount: 0,
    totalSize: 0,
    lastSyncTimestamp: null,
    lastSuccessSyncTimestamp: null,
    nextSyncTimestamp: null,
    lastSyncStatus: null,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    ...overrides,
});

describe('ProjectService', () => {
    beforeEach(() => {
        vi.mocked(repo.getAllProjects).mockResolvedValue([]);
        vi.mocked(repo.getProjectById).mockResolvedValue(null);
        vi.mocked(repo.saveProject).mockImplementation(async (p) => p);
        vi.mocked(repo.deleteProjectDoc).mockResolvedValue({ success: true });
        vi.mocked(repo.getSyncSessions).mockResolvedValue([]);
    });

    describe('getAllProjects', () => {
        it('should filter out deleted projects', async () => {
            vi.mocked(repo.getAllProjects).mockResolvedValue([
                makeProject({ id: '1', isDeleted: false }),
                makeProject({ id: '2', isDeleted: true }),
                makeProject({ id: '3' }),
            ]);

            const result = await getAllProjects();
            expect(result).toHaveLength(2);
            expect(result.map(p => p.id)).toEqual(['1', '3']);
        });

        it('should return empty array when no projects', async () => {
            const result = await getAllProjects();
            expect(result).toEqual([]);
        });
    });

    describe('getProjectById', () => {
        it('should return project by ID', async () => {
            const project = makeProject();
            vi.mocked(repo.getProjectById).mockResolvedValue(project);

            const result = await getProjectById('proj-1');
            expect(result).toEqual(project);
        });

        it('should return null for deleted projects', async () => {
            vi.mocked(repo.getProjectById).mockResolvedValue(makeProject({ isDeleted: true }));

            const result = await getProjectById('proj-1');
            expect(result).toBeNull();
        });

        it('should throw if ID is empty', async () => {
            await expect(getProjectById('')).rejects.toThrow('Project ID is required');
        });
    });

    describe('createProject', () => {
        it('should create project with valid data', async () => {
            const result = await createProject({
                name: 'New Project',
                sourceFolderId: 'src-id',
                destFolderId: 'dst-id',
            });

            expect(result.name).toBe('New Project');
            expect(result.sourceFolderId).toBe('src-id');
            expect(result.status).toBe('active');
            expect(result.id).toBeTruthy();
            expect(repo.saveProject).toHaveBeenCalledOnce();
        });

        it('should throw if name is missing', async () => {
            await expect(createProject({
                sourceFolderId: 'src-id',
                destFolderId: 'dst-id',
            })).rejects.toThrow('Tên dự án là bắt buộc');
        });

        it('should throw if source folder is missing', async () => {
            await expect(createProject({
                name: 'Project',
                destFolderId: 'dst-id',
            })).rejects.toThrow('Source folder là bắt buộc');
        });

        it('should throw if dest folder is missing', async () => {
            await expect(createProject({
                name: 'Project',
                sourceFolderId: 'src-id',
            })).rejects.toThrow('Destination folder là bắt buộc');
        });

        it('should extract folder ID from link', async () => {
            const result = await createProject({
                name: 'Project',
                sourceFolderLink: 'https://drive.google.com/drive/folders/extracted-src-id',
                destFolderLink: 'https://drive.google.com/drive/folders/extracted-dst-id',
            });

            expect(result.sourceFolderId).toBe('extracted-src-id');
            expect(result.destFolderId).toBe('extracted-dst-id');
        });

        it('should reject duplicate source+dest pair', async () => {
            vi.mocked(repo.getAllProjects).mockResolvedValue([
                makeProject({ sourceFolderId: 'src-dup', destFolderId: 'dst-dup' }),
            ]);

            await expect(createProject({
                name: 'Duplicate',
                sourceFolderId: 'src-dup',
                destFolderId: 'dst-dup',
            })).rejects.toThrow('đã tồn tại');
        });
    });

    describe('updateProject', () => {
        it('should merge updates with existing project', async () => {
            vi.mocked(repo.getProjectById).mockResolvedValue(makeProject());

            await updateProject({ id: 'proj-1', name: 'Updated Name' });

            expect(repo.saveProject).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Updated Name', sourceFolderId: 'source-folder-id' })
            );
        });

        it('should throw if project not found', async () => {
            await expect(updateProject({ id: 'nonexistent' })).rejects.toThrow('Không tìm thấy dự án');
        });

        it('should throw if id is missing', async () => {
            await expect(updateProject({})).rejects.toThrow('Project ID là bắt buộc');
        });
    });

    describe('deleteProject', () => {
        it('should soft-delete by ID', async () => {
            const result = await deleteProject('proj-1');
            expect(result).toEqual({ success: true });
            expect(repo.deleteProjectDoc).toHaveBeenCalledWith('proj-1');
        });

        it('should throw if id is empty', async () => {
            await expect(deleteProject('')).rejects.toThrow('Project ID là bắt buộc');
        });
    });

    describe('resetProject', () => {
        it('should clear sync timestamps', async () => {
            vi.mocked(repo.getProjectById).mockResolvedValue(makeProject({
                nextSyncTimestamp: '2026-02-01T00:00:00Z',
                lastSyncStatus: 'success',
            }));

            await resetProject('proj-1');

            expect(repo.saveProject).toHaveBeenCalledWith(
                expect.objectContaining({
                    nextSyncTimestamp: null,
                    lastSyncStatus: 'pending',
                })
            );
        });

        it('should throw if project not found', async () => {
            await expect(resetProject('nonexistent')).rejects.toThrow('Không tìm thấy dự án');
        });
    });

    describe('getProjectStatsMap', () => {
        it('should aggregate session stats by project', async () => {
            const now = new Date();
            const todaySession: SyncSession = {
                id: 'sess-1',
                projectId: 'proj-1',
                projectName: 'Project 1',
                runId: 'run-1',
                timestamp: now.toISOString(),
                executionDurationSeconds: 10,
                status: 'success',
                filesCount: 5,
                totalSizeSynced: 1000,
            };

            vi.mocked(repo.getSyncSessions).mockResolvedValue([todaySession]);

            const result = await getProjectStatsMap();
            expect(result['proj-1']).toBeDefined();
            expect(result['proj-1'].todayFiles).toBe(5);
            expect(result['proj-1'].last7DaysFiles).toBe(5);
        });

        it('should return empty object on error', async () => {
            vi.mocked(repo.getSyncSessions).mockRejectedValue(new Error('DB error'));

            const result = await getProjectStatsMap();
            expect(result).toEqual({});
        });
    });
});
