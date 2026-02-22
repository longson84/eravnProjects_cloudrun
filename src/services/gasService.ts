// ==========================================
// API Client - REST API Wrapper (replaces gasService.ts)
// ==========================================
// Uses Axios to communicate with the Node.js backend.
// Falls back to mock data when VITE_API_URL is not set.

import axios from 'axios';
import type { Project, FileLog, AppSettings, ProjectHeartbeat, DashboardData, SyncLogEntry } from '@/types/types';
import {
    mockProjects,
    mockSyncSessions,
    mockFileLogs,
    mockSettings,
} from '@/data/mockData';

// ==========================================
// Axios Instance
// ==========================================

const API_URL = import.meta.env.VITE_API_URL || '';
// Ensure baseURL ends with /api if using the real backend
const BASE_URL = API_URL ? (API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`) : '';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 600000, // 10 minutes (sync tasks can be very long)
    headers: {
        'Content-Type': 'application/json',
    },
});

/** Check if API URL is configured */
const isApiConfigured = (): boolean => !!API_URL;

// ==========================================
// Mock Response Handler (for local dev without backend)
// ==========================================

async function getMockResponse<T>(functionName: string, ...args: any[]): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    const handlers: Record<string, () => any> = {
        getProjects: () => mockProjects,
        getProject: () => mockProjects.find(p => p.id === args[0]) || null,
        createProject: () => ({ ...args[0], id: `proj-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
        updateProject: () => ({ ...args[0], updatedAt: new Date().toISOString() }),
        deleteProject: () => ({ success: true }),
        runSyncAll: () => ({ success: true, message: 'Sync all started' }),
        runSyncProject: () => ({ success: true, message: `Sync started for project ${args[0]}` }),
        getSettings: () => mockSettings,
        updateSettings: () => ({ ...mockSettings, ...args[0] }),
        getSyncLogs: () => {
            const filters = args[0] || { days: 1, status: 'all', search: '' };
            let filtered = [...mockSyncSessions];
            if (filters.days !== -1) {
                const now = new Date();
                const cutoff = new Date(now.setDate(now.getDate() - filters.days));
                filtered = filtered.filter(s => new Date(s.timestamp) >= cutoff);
            }
            if (filters.status && filters.status !== 'all') {
                filtered = filtered.filter(s => s.status === filters.status);
            }
            if (filters.search) {
                const term = filters.search.toLowerCase();
                filtered = filtered.filter(s =>
                    s.projectName.toLowerCase().includes(term) ||
                    s.runId.toLowerCase().includes(term)
                );
            }
            return filtered.map((s): SyncLogEntry => ({
                sessionId: s.id,
                projectId: s.projectId,
                projectName: s.projectName,
                runId: s.runId,
                startTime: s.timestamp,
                endTime: s.timestamp,
                duration: s.executionDurationSeconds,
                status: s.status,
                current: s.current,
                continueId: s.continueId,
                filesCount: s.filesCount,
                totalSize: s.totalSizeSynced,
                error: s.errorMessage,
                triggeredBy: 'manual'
            }));
        },
        getSyncLogDetails: () => {
            const [sessionId] = args;
            return mockFileLogs.filter(l => l.sessionId === sessionId);
        },
        continueSync: () => true,
        stopSync: () => true,
        getProjectHeartbeats: () => mockProjects.map(p => ({
            projectId: p.id,
            lastCheckTimestamp: new Date().toISOString(),
            lastStatus: p.lastSyncStatus || 'success',
        })),
        getDashboardData: () => ({
            projectSummary: { totalProjects: mockProjects.length, activeProjects: mockProjects.filter(p => p.status === 'active').length },
            syncProgress: {
                today: { files: 120, size: 12345678, duration: 3600, sessions: 10 },
                last7Days: { files: 840, size: 86419746, duration: 25200, sessions: 70 },
            },
            syncChart: [
                { date: '2023-05-20', filesCount: 50, duration: 1800 },
                { date: '2023-05-21', filesCount: 65, duration: 2200 },
                { date: '2023-05-22', filesCount: 80, duration: 2500 },
                { date: '2023-05-23', filesCount: 70, duration: 2300 },
                { date: '2023-05-24', filesCount: 90, duration: 2800 },
                { date: '2023-05-25', filesCount: 110, duration: 3200 },
                { date: '2023-05-26', filesCount: 100, duration: 3000 },
            ],
            recentSyncs: mockSyncSessions.slice(0, 10),
        }),
        resetDatabase: () => true,
        resetProject: () => ({ success: true }),
        testWebhook: () => true,
    };

    const handler = handlers[functionName];
    if (handler) return handler() as T;
    throw new Error(`Unknown mock function: ${functionName}`);
}

// ==========================================
// Exported API Functions (same interface as gasService)
// ==========================================

export const gasService = {
    // Projects
    getProjects: async (): Promise<Project[]> => {
        if (!isApiConfigured()) return getMockResponse('getProjects');
        const { data } = await api.get('projects');
        return data;
    },

    getProject: async (id: string): Promise<Project | null> => {
        if (!isApiConfigured()) return getMockResponse('getProject', id);
        const { data } = await api.get(`projects/${id}`);
        return data;
    },

    createProject: async (project: Partial<Project>): Promise<Project> => {
        if (!isApiConfigured()) return getMockResponse('createProject', project);
        const { data } = await api.post('projects', project);
        return data;
    },

    updateProject: async (project: Partial<Project>): Promise<Project> => {
        if (!isApiConfigured()) return getMockResponse('updateProject', project);
        const { data } = await api.put(`projects/${project.id}`, project);
        return data;
    },

    deleteProject: async (id: string): Promise<{ success: boolean }> => {
        if (!isApiConfigured()) return getMockResponse('deleteProject', id);
        const { data } = await api.delete(`projects/${id}`);
        return data;
    },

    // Sync
    runSyncAll: async (): Promise<{ success: boolean; message: string }> => {
        if (!isApiConfigured()) return getMockResponse('runSyncAll');
        const { data } = await api.post('sync/all', { triggeredBy: 'manual' });
        return data;
    },

    runSyncProject: async (projectId: string): Promise<{ success: boolean; message: string; stats?: { filesCount: number; totalSizeSynced: number; failedCount: number; status: string } }> => {
        if (!isApiConfigured()) return getMockResponse('runSyncProject', projectId);
        const { data } = await api.post(`sync/${projectId}`);
        return data;
    },

    // Settings
    getSettings: async (): Promise<AppSettings> => {
        if (!isApiConfigured()) return getMockResponse('getSettings');
        const { data } = await api.get('settings');
        return data;
    },

    updateSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
        if (!isApiConfigured()) return getMockResponse('updateSettings', settings);
        const { data } = await api.put('settings', settings);
        return data;
    },

    // Logs
    getSyncLogs: async (filters: { days: number; status?: string; search?: string }): Promise<SyncLogEntry[]> => {
        if (!isApiConfigured()) return getMockResponse('getSyncLogs', filters);
        const { data } = await api.get('logs', { params: filters });
        return data;
    },

    getSyncLogDetails: async (sessionId: string, projectId: string): Promise<FileLog[]> => {
        if (!isApiConfigured()) return getMockResponse('getSyncLogDetails', sessionId);
        const { data } = await api.get(`logs/${sessionId}/details`);
        return data;
    },

    continueSync: async (sessionId: string, projectId: string): Promise<boolean> => {
        if (!isApiConfigured()) return getMockResponse('continueSync', sessionId, projectId);
        const { data } = await api.post(`logs/${sessionId}/continue`, { projectId });
        return data.success;
    },

    stopSync: async (projectId: string): Promise<boolean> => {
        if (!isApiConfigured()) return getMockResponse('stopSync', projectId);
        const { data } = await api.post(`sync/stop/${projectId}`);
        return data.success;
    },

    // Heartbeat
    getProjectHeartbeats: async (): Promise<ProjectHeartbeat[]> => {
        if (!isApiConfigured()) return getMockResponse('getProjectHeartbeats');
        const { data } = await api.get('system/heartbeats');
        return data;
    },

    // Dashboard
    getDashboardData: async (): Promise<DashboardData> => {
        if (!isApiConfigured()) return getMockResponse('getDashboardData');
        const { data } = await api.get('dashboard');
        return data;
    },

    // System
    resetDatabase: async (): Promise<boolean> => {
        if (!isApiConfigured()) return getMockResponse('resetDatabase');
        const { data } = await api.post('system/reset-database');
        return data.success;
    },

    resetProject: async (projectId: string): Promise<{ success: boolean }> => {
        if (!isApiConfigured()) return getMockResponse('resetProject', projectId);
        const { data } = await api.post(`projects/${projectId}/reset`);
        return data;
    },

    testWebhook: async (url: string): Promise<boolean> => {
        if (!isApiConfigured()) return getMockResponse('testWebhook', url);
        const { data } = await api.post('settings/test-webhook', { url });
        return data.success;
    },
};
