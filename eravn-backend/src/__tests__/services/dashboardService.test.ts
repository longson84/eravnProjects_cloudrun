// ==========================================
// Tests for Dashboard Service
// ==========================================
// Tests stats aggregation, chart data, and error fallback

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../repositories/firestoreRepository.js', () => ({
    getSyncSessions: vi.fn(),
    getRecentSyncSessions: vi.fn(),
}));

vi.mock('../../services/projectService.js', () => ({
    getAllProjects: vi.fn(),
}));

import { getDashboardData } from '../../services/dashboardService.js';
import * as repo from '../../repositories/firestoreRepository.js';
import * as projectService from '../../services/projectService.js';
import type { Project, SyncSession } from '../../types.js';

describe('DashboardService', () => {
    beforeEach(() => {
        vi.mocked(projectService.getAllProjects).mockResolvedValue([
            { id: '1', name: 'P1', status: 'active' } as Project,
            { id: '2', name: 'P2', status: 'active' } as Project,
            { id: '3', name: 'P3', status: 'paused' } as Project,
        ]);

        const now = new Date();
        const todaySession: SyncSession = {
            id: 's1',
            projectId: '1',
            projectName: 'P1',
            runId: 'run-1',
            timestamp: now.toISOString(),
            executionDurationSeconds: 30,
            status: 'success',
            filesCount: 10,
            totalSizeSynced: 5000,
        };

        const oldSession: SyncSession = {
            id: 's2',
            projectId: '2',
            projectName: 'P2',
            runId: 'run-2',
            timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            executionDurationSeconds: 45,
            status: 'success',
            filesCount: 8,
            totalSizeSynced: 3000,
        };

        vi.mocked(repo.getSyncSessions).mockResolvedValue([todaySession, oldSession]);
        vi.mocked(repo.getRecentSyncSessions).mockResolvedValue([todaySession, oldSession]);
    });

    describe('getDashboardData', () => {
        it('should return complete dashboard data structure', async () => {
            const data = await getDashboardData();

            expect(data).toHaveProperty('projectSummary');
            expect(data).toHaveProperty('syncProgress');
            expect(data).toHaveProperty('syncChart');
            expect(data).toHaveProperty('recentSyncs');
        });

        it('should calculate project summary correctly', async () => {
            const data = await getDashboardData();

            expect(data.projectSummary.totalProjects).toBe(3);
            expect(data.projectSummary.activeProjects).toBe(2);
        });

        it('should separate today vs last 7 days stats', async () => {
            const data = await getDashboardData();

            // Today should have only the today session
            expect(data.syncProgress.today.files).toBe(10);
            expect(data.syncProgress.today.sessions).toBe(1);

            // Last 7 days should have both sessions
            expect(data.syncProgress.last7Days.files).toBe(18); // 10 + 8
            expect(data.syncProgress.last7Days.sessions).toBe(2);
        });

        it('should generate 10-day chart data', async () => {
            const data = await getDashboardData();

            expect(data.syncChart).toHaveLength(10);
            // Each entry should have date, filesCount, duration
            for (const entry of data.syncChart) {
                expect(entry).toHaveProperty('date');
                expect(entry).toHaveProperty('filesCount');
                expect(entry).toHaveProperty('duration');
            }
        });

        it('should handle errors gracefully in project summary', async () => {
            vi.mocked(projectService.getAllProjects).mockRejectedValue(new Error('DB error'));

            const data = await getDashboardData();
            expect(data.projectSummary).toEqual({ totalProjects: 0, activeProjects: 0 });
        });

        it('should handle errors gracefully in sync progress', async () => {
            vi.mocked(repo.getSyncSessions).mockRejectedValue(new Error('DB error'));

            const data = await getDashboardData();
            const empty = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };
            expect(data.syncProgress.today).toEqual(empty);
            expect(data.syncProgress.last7Days).toEqual(empty);
        });
    });
});
