// ==========================================
// Integration Tests for API Routes
// ==========================================
// Tests Express controllers with mocked service layer using supertest

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock all services BEFORE importing app
vi.mock('../../services/projectService.js', () => ({
    getAllProjects: vi.fn(),
    getProjectById: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    resetProject: vi.fn(),
    getProjectStatsMap: vi.fn(),
}));

vi.mock('../../services/syncService.js', () => ({
    syncAllProjects: vi.fn(),
    syncProjectById: vi.fn(),
}));

vi.mock('../../services/settingsService.js', () => ({
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    invalidateSettingsCache: vi.fn(),
}));

vi.mock('../../services/syncLogService.js', () => ({
    getSyncLogs: vi.fn(),
    getSyncLogDetails: vi.fn(),
    continueSyncProject: vi.fn(),
}));

vi.mock('../../services/dashboardService.js', () => ({
    getDashboardData: vi.fn(),
}));

vi.mock('../../services/webhookService.js', () => ({
    testWebhook: vi.fn(),
    sendSyncSummary: vi.fn(),
    sendWebhookNotification: vi.fn(),
}));

vi.mock('../../repositories/firestoreRepository.js', () => ({
    checkFirestoreConnectivity: vi.fn(),
    resetDatabase: vi.fn(),
    getAllProjectHeartbeats: vi.fn(),
    getSettingsFromDb: vi.fn().mockResolvedValue({
        syncCutoffSeconds: 300,
        defaultScheduleCron: '',
        webhookUrl: '',
        firebaseProjectId: 'test',
        enableNotifications: false,
        maxRetries: 3,
        batchSize: 450,
    }),
    saveSettingsToDb: vi.fn(),
}));

// Mock googleapis to prevent initialization errors
vi.mock('googleapis', () => {
    class MockOAuth2 {
        setCredentials = vi.fn();
    }
    return {
        google: {
            auth: { OAuth2: MockOAuth2 },
            drive: vi.fn().mockReturnValue({
                about: { get: vi.fn().mockResolvedValue({ data: { user: {} } }) },
                files: { list: vi.fn(), copy: vi.fn(), create: vi.fn() },
            }),
        },
    };
});

import app from '../../app.js';
import * as projectService from '../../services/projectService.js';
import * as syncService from '../../services/syncService.js';
import * as settingsService from '../../services/settingsService.js';
import * as syncLogService from '../../services/syncLogService.js';
import * as dashboardService from '../../services/dashboardService.js';
import type { Project, AppSettings, DashboardData } from '../../types.js';

describe('API Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Health Check', () => {
        it('GET /health should return ok', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeTruthy();
        });
    });

    describe('Projects API', () => {
        const mockProject: Project = {
            id: 'proj-1',
            name: 'Test Project',
            description: 'Test',
            sourceFolderId: 'src-id',
            sourceFolderLink: '',
            destFolderId: 'dst-id',
            destFolderLink: '',
            status: 'active',
            filesCount: 0,
            totalSize: 0,
            lastSyncTimestamp: null,
            lastSuccessSyncTimestamp: null,
            nextSyncTimestamp: null,
            lastSyncStatus: null,
            createdAt: '2026-02-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
        };

        it('GET /api/projects should return project list (array)', async () => {
            vi.mocked(projectService.getAllProjects).mockResolvedValue([mockProject]);
            vi.mocked(projectService.getProjectStatsMap).mockResolvedValue({});

            const res = await request(app).get('/api/projects');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Test Project');
        });

        it('POST /api/projects should create a project (201)', async () => {
            vi.mocked(projectService.createProject).mockResolvedValue(mockProject);

            const res = await request(app)
                .post('/api/projects')
                .send({ name: 'New Project', sourceFolderId: 'src', destFolderId: 'dst' });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('proj-1');
        });

        it('POST /api/projects should return 400 on validation error', async () => {
            vi.mocked(projectService.createProject).mockRejectedValue(new Error('Tên dự án là bắt buộc'));

            const res = await request(app).post('/api/projects').send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Tên dự án');
        });

        it('GET /api/projects/:id should return a single project', async () => {
            vi.mocked(projectService.getProjectById).mockResolvedValue(mockProject);

            const res = await request(app).get('/api/projects/proj-1');

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('proj-1');
        });

        it('GET /api/projects/:id should return 404 for missing project', async () => {
            vi.mocked(projectService.getProjectById).mockResolvedValue(null);

            const res = await request(app).get('/api/projects/nonexistent');

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });

        it('PUT /api/projects/:id should update project', async () => {
            vi.mocked(projectService.updateProject).mockResolvedValue({ ...mockProject, name: 'Updated' });

            const res = await request(app)
                .put('/api/projects/proj-1')
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });

        it('DELETE /api/projects/:id should delete project', async () => {
            vi.mocked(projectService.deleteProject).mockResolvedValue({ success: true });

            const res = await request(app).delete('/api/projects/proj-1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Sync API', () => {
        it('POST /api/sync/all should require CRON_SECRET', async () => {
            // CRON_SECRET is set in vitest.setup.ts = 'test-cron-secret'
            const res = await request(app)
                .post('/api/sync/all')
                .send({ triggeredBy: 'manual' });

            expect(res.status).toBe(401);
        });

        it('POST /api/sync/all should succeed with valid CRON_SECRET', async () => {
            // Controller now calls getAllProjects + updateProject before fire-and-forget
            vi.mocked(projectService.getAllProjects).mockResolvedValue([
                { id: 'proj-1', name: 'Test', status: 'active' } as any,
            ]);
            vi.mocked(projectService.updateProject).mockResolvedValue({} as any);

            vi.mocked(syncService.syncAllProjects).mockResolvedValue({
                success: true,
                runId: 'run-1',
                sessionsCount: 2,
            });

            const res = await request(app)
                .post('/api/sync/all')
                .set('Authorization', 'Bearer test-cron-secret')
                .send({ triggeredBy: 'manual' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.status).toBe('processing');
        });

        it('POST /api/sync/:projectId should sync a single project', async () => {
            // Controller now calls updateProject before fire-and-forget
            vi.mocked(projectService.updateProject).mockResolvedValue({} as any);

            vi.mocked(syncService.syncProjectById).mockResolvedValue({
                success: true,
                runId: 'run-1',
                message: 'Synced 5 files',
                stats: { filesCount: 5, totalSizeSynced: 1000, failedCount: 0, status: 'success' },
            });

            const res = await request(app).post('/api/sync/proj-1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.status).toBe('processing');
        });
    });

    describe('Settings API', () => {
        const mockSettings: AppSettings = {
            syncCutoffSeconds: 300,
            defaultScheduleCron: '',
            webhookUrl: '',
            firebaseProjectId: 'test',
            enableNotifications: false,
            maxRetries: 3,
            batchSize: 450,
        };

        it('GET /api/settings should return settings directly', async () => {
            vi.mocked(settingsService.getSettings).mockResolvedValue(mockSettings);

            const res = await request(app).get('/api/settings');

            expect(res.status).toBe(200);
            expect(res.body.syncCutoffSeconds).toBe(300);
            expect(res.body.maxRetries).toBe(3);
        });

        it('PUT /api/settings should update settings', async () => {
            vi.mocked(settingsService.updateSettings).mockResolvedValue({ ...mockSettings, maxRetries: 5 });

            const res = await request(app)
                .put('/api/settings')
                .send({ maxRetries: 5 });

            expect(res.status).toBe(200);
            expect(res.body.maxRetries).toBe(5);
        });
    });

    describe('Dashboard API', () => {
        it('GET /api/dashboard should return dashboard data directly', async () => {
            const mockData: DashboardData = {
                projectSummary: { totalProjects: 2, activeProjects: 2 },
                syncProgress: {
                    today: { files: 10, size: 5000, duration: 30, sessions: 1, projects: 1 },
                    last7Days: { files: 50, size: 25000, duration: 150, sessions: 5, projects: 2 },
                },
                syncChart: [],
                recentSyncs: [],
            };
            vi.mocked(dashboardService.getDashboardData).mockResolvedValue(mockData);

            const res = await request(app).get('/api/dashboard');

            expect(res.status).toBe(200);
            expect(res.body.projectSummary.totalProjects).toBe(2);
            expect(res.body.syncProgress.today.files).toBe(10);
        });
    });

    describe('Logs API', () => {
        it('GET /api/logs should return sync logs array', async () => {
            vi.mocked(syncLogService.getSyncLogs).mockResolvedValue([]);

            const res = await request(app).get('/api/logs');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/logs/:sessionId/details should return file logs', async () => {
            vi.mocked(syncLogService.getSyncLogDetails).mockResolvedValue([]);

            const res = await request(app).get('/api/logs/sess-1/details');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
