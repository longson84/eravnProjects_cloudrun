// ==========================================
// GAS Service - google.script.run Wrapper
// ==========================================
// Wraps google.script.run calls in Promises.
// Falls back to mock data in local development.

import type { Project, FileLog, AppSettings, ProjectHeartbeat, DashboardData, SyncLogEntry } from '@/types/types';
import {
    mockProjects,
    mockSyncSessions,
    mockFileLogs,
    mockSettings,
} from '@/data/mockData';

/** Check if running inside GAS environment */
const isGasEnvironment = (): boolean => {
    return typeof (window as any).google !== 'undefined' &&
        typeof (window as any).google.script !== 'undefined';
};

/** Generic GAS runner that wraps google.script.run in a Promise */
function gasRun<T>(functionName: string, ...args: any[]): Promise<T> {
    if (!isGasEnvironment()) {
        console.warn(`[DEV] GAS not available. Using mock for: ${functionName}`);
        return getMockResponse<T>(functionName, ...args);
    }

    return new Promise((resolve, reject) => {
        (window as any).google.script.run
            .withSuccessHandler((result: T) => resolve(result))
            .withFailureHandler((error: Error) => reject(error))
        [functionName](...args);
    });
}

/** Mock response handler for local development */
async function getMockResponse<T>(functionName: string, ...args: any[]): Promise<T> {
    // Simulate network delay
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
        
        // Logs Mocks
        getSyncLogs: () => {
            const filters = args[0] || { days: 1, status: 'all', search: '' };
            let filtered = [...mockSyncSessions];
            
            // Filter by days
            if (filters.days !== -1) {
                const now = new Date();
                const cutoff = new Date(now.setDate(now.getDate() - filters.days));
                filtered = filtered.filter(s => new Date(s.timestamp) >= cutoff);
            }

            // Filter by status
            if (filters.status && filters.status !== 'all') {
                filtered = filtered.filter(s => s.status === filters.status);
            }

            // Filter by search
            if (filters.search) {
                const term = filters.search.toLowerCase();
                filtered = filtered.filter(s => 
                    s.projectName.toLowerCase().includes(term) || 
                    s.runId.toLowerCase().includes(term)
                );
            }

            // Flatten to SyncLogEntry
            return filtered.map((s): SyncLogEntry => ({
                sessionId: s.id,
                projectId: s.projectId,
                projectName: s.projectName,
                runId: s.runId,
                startTime: s.timestamp,
                endTime: s.timestamp, // Mock
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
        continueSync: () => {
            const [sessionId] = args;
            const session = mockSyncSessions.find(s => s.id === sessionId);
            if (session) {
                // In Continue logic, we don't necessarily flag "retried".
                // We just trigger a new sync which picks up where left off.
                // But for mock purposes, let's create a new session that continues this one.
                const newSession = { 
                    ...session, 
                    id: `sess-${Date.now()}`, 
                    runId: `run-${Date.now()}`, 
                    timestamp: new Date().toISOString(), 
                    status: 'success' as const, 
                    errorMessage: undefined,
                    triggeredBy: 'manual',
                    continueId: sessionId // Link to the old session
                };
                mockSyncSessions.unshift(newSession);
                return true;
            }
            return false;
        },

        getProjectHeartbeats: () => mockProjects.map(p => ({
            projectId: p.id,
            lastCheckTimestamp: new Date().toISOString(),
            lastStatus: p.lastSyncStatus || 'success',
        })),
        // Dashboard mocks
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
        resetDatabase: () => {
            mockProjects.length = 0;
            mockSyncSessions.length = 0;
            mockFileLogs.length = 0;
            return true;
        },
        resetProject: () => {
             const [projectId] = args;
             const project = mockProjects.find(p => p.id === projectId);
             if (project) {
                 // Reset stats
                 project.lastSyncTimestamp = null;
                 project.lastSyncStatus = null;
                 project.filesCount = 0;
                 project.totalSize = 0;
                 if (project.stats) {
                    project.stats.todayFiles = 0;
                    project.stats.last7DaysFiles = 0;
                 }
                 return { success: true };
             }
             return { success: false };
        },
        testWebhook: () => {
            const [url] = args;
            if (!url) throw new Error('URL is required');
            return true;
        }
    };

    const handler = handlers[functionName];
    if (handler) {
        return handler() as T;
    }

    console.error(`[DEV] No mock handler for: ${functionName}`);
    throw new Error(`Unknown function: ${functionName}`);
}

// ==========================================
// Exported API Functions
// ==========================================

export const gasService = {
    // Projects
    getProjects: () => gasRun<Project[]>('getProjects'),
    getProject: (id: string) => gasRun<Project | null>('getProject', id),
    createProject: (project: Partial<Project>) => gasRun<Project>('createProject', project),
    updateProject: (project: Partial<Project>) => gasRun<Project>('updateProject', project),
    deleteProject: (id: string) => gasRun<{ success: boolean }>('deleteProject', id),

    // Sync
    runSyncAll: () => gasRun<{ success: boolean; message: string }>('runSyncAll'),
    runSyncProject: (projectId: string) => gasRun<{ success: boolean; message: string; stats?: { filesCount: number; totalSizeSynced: number; failedCount: number; status: string } }>('runSyncProject', projectId),

    // Settings
    getSettings: () => gasRun<AppSettings>('getSettings'),
    updateSettings: (settings: Partial<AppSettings>) => gasRun<AppSettings>('updateSettings', settings),

    // Logs
    getSyncLogs: (filters: { days: number; status?: string; search?: string }) => gasRun<SyncLogEntry[]>('getSyncLogs', filters),
    getSyncLogDetails: (sessionId: string, projectId: string) => gasRun<FileLog[]>('getSyncLogDetails', sessionId, projectId),
    continueSync: (sessionId: string, projectId: string) => gasRun<boolean>('continueSync', sessionId, projectId),

    // Heartbeat
    getProjectHeartbeats: () => gasRun<ProjectHeartbeat[]>('getProjectHeartbeats'),

    // Dashboard
    getDashboardData: () => gasRun<DashboardData>('getDashboardData'),

    // System
    resetDatabase: () => gasRun<boolean>('resetDatabase'),
    resetProject: (projectId: string) => gasRun<{ success: boolean }>('resetProject', projectId),
    testWebhook: (url: string) => gasRun<boolean>('testWebhook', url),
};
