// ==========================================
// Tests for Sync Log Service
// ==========================================
// Tests log filtering, search, details, and continue sync

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../repositories/firestoreRepository.js', () => ({
    getSyncSessions: vi.fn(),
    getFileLogsBySession: vi.fn(),
}));

vi.mock('../../services/syncService.js', () => ({
    syncProjectById: vi.fn(),
}));

import { getSyncLogs, getSyncLogDetails, continueSyncProject } from '../../services/syncLogService.js';
import * as repo from '../../repositories/firestoreRepository.js';
import { syncProjectById } from '../../services/syncService.js';
import type { SyncSession, FileLog } from '../../types.js';

const makeSyncSession = (overrides: Partial<SyncSession> = {}): SyncSession => ({
    id: 'sess-1',
    projectId: 'proj-1',
    projectName: 'Test Project',
    runId: '260221-120000',
    timestamp: new Date().toISOString(),
    executionDurationSeconds: 30,
    status: 'success',
    filesCount: 5,
    totalSizeSynced: 1000,
    failedFilesCount: 0,
    triggeredBy: 'manual',
    ...overrides,
});

describe('SyncLogService', () => {
    beforeEach(() => {
        vi.mocked(repo.getSyncSessions).mockResolvedValue([]);
        vi.mocked(repo.getFileLogsBySession).mockResolvedValue([]);
        vi.mocked(syncProjectById).mockResolvedValue({
            success: true,
            runId: 'run-new',
            message: 'Synced 0 files',
            stats: { filesCount: 0, totalSizeSynced: 0, failedCount: 0, status: 'success' },
        });
    });

    describe('getSyncLogs', () => {
        it('should return all logs with no filters', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({ id: 's1' }),
                makeSyncSession({ id: 's2', status: 'error' }),
            ]);

            const logs = await getSyncLogs({});

            expect(logs).toHaveLength(2);
            expect(logs[0].sessionId).toBe('s1');
        });

        it('should filter by status', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({ id: 's1', status: 'success' }),
                makeSyncSession({ id: 's2', status: 'error' }),
                makeSyncSession({ id: 's3', status: 'interrupted' }),
            ]);

            const logs = await getSyncLogs({ status: 'error' });
            expect(logs).toHaveLength(1);
            expect(logs[0].status).toBe('error');
        });

        it('should pass through "all" status filter', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({ id: 's1', status: 'success' }),
                makeSyncSession({ id: 's2', status: 'error' }),
            ]);

            const logs = await getSyncLogs({ status: 'all' });
            expect(logs).toHaveLength(2);
        });

        it('should filter by search term on projectName', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({ id: 's1', projectName: 'Alpha Project' }),
                makeSyncSession({ id: 's2', projectName: 'Beta Project' }),
            ]);

            const logs = await getSyncLogs({ search: 'alpha' });
            expect(logs).toHaveLength(1);
            expect(logs[0].projectName).toBe('Alpha Project');
        });

        it('should filter by search term on runId', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({ id: 's1', runId: 'run-abc' }),
                makeSyncSession({ id: 's2', runId: 'run-xyz' }),
            ]);

            const logs = await getSyncLogs({ search: 'xyz' });
            expect(logs).toHaveLength(1);
        });

        it('should apply days filter', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([]);

            await getSyncLogs({ days: 7 });

            expect(repo.getSyncSessions).toHaveBeenCalledWith(
                expect.objectContaining({
                    startDate: expect.any(Date),
                    limit: 100,
                })
            );
        });

        it('should map session data to SyncLogEntry format', async () => {
            vi.mocked(repo.getSyncSessions).mockResolvedValue([
                makeSyncSession({
                    id: 's1',
                    errorMessage: 'Test error',
                    continueId: 'run-prev',
                }),
            ]);

            const logs = await getSyncLogs({});
            expect(logs[0]).toHaveProperty('sessionId', 's1');
            expect(logs[0]).toHaveProperty('error', 'Test error');
            expect(logs[0]).toHaveProperty('continueId', 'run-prev');
            expect(logs[0]).toHaveProperty('duration');
        });
    });

    describe('getSyncLogDetails', () => {
        it('should return file logs for a session', async () => {
            const fileLogs: FileLog[] = [
                {
                    id: 'fl-1',
                    sessionId: 'sess-1',
                    fileName: 'test.pdf',
                    sourceLink: 'https://drive.google.com/file/d/src-1/view',
                    destLink: 'https://drive.google.com/file/d/dst-1/view',
                    sourcePath: '/test.pdf',
                    createdDate: '2026-02-21T00:00:00Z',
                    modifiedDate: '2026-02-21T00:00:00Z',
                    fileSize: 500,
                    status: 'success',
                },
            ];
            vi.mocked(repo.getFileLogsBySession).mockResolvedValue(fileLogs);

            const result = await getSyncLogDetails('sess-1');
            expect(result).toHaveLength(1);
            expect(result[0].fileName).toBe('test.pdf');
        });
    });

    describe('continueSyncProject', () => {
        it('should trigger sync for the project', async () => {
            const result = await continueSyncProject('sess-1', 'proj-1');
            expect(result).toBe(true);
            expect(syncProjectById).toHaveBeenCalledWith('proj-1', { triggeredBy: 'manual' });
        });

        it('should throw on sync failure', async () => {
            vi.mocked(syncProjectById).mockRejectedValue(new Error('Sync failed'));

            await expect(continueSyncProject('sess-1', 'proj-1')).rejects.toThrow('Sync failed');
        });
    });
});
