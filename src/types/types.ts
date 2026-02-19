// ==========================================
// eravnProjects - Type Definitions
// ==========================================

/** Project configuration for a sync pair */
export interface Project {
    id: string;
    name: string;
    description: string;
    sourceFolderId: string;
    sourceFolderLink: string;
    destFolderId: string;
    destFolderLink: string;
    status: 'active' | 'paused' | 'error';
    lastSyncTimestamp: string | null;
    lastSuccessSyncTimestamp?: string | null;
    nextSyncTimestamp?: string | null;
    lastSyncStatus: 'success' | 'interrupted' | 'error' | 'pending' | null;
    filesCount: number;
    totalSize: number; // Total size of all files synced for this project
    createdAt: string;
    updatedAt: string;
    syncStartDate?: string; // Only sync files modified/created on or after this date (ISO string YYYY-MM-DD)
    isDeleted?: boolean;
    stats?: {
        todayFiles: number;
        last7DaysFiles: number;
    };
}

/** Sync session log (parent record) */
export interface SyncSession {
    id: string;
    projectId: string;
    projectName: string;
    runId: string;
    timestamp: string;
    executionDurationSeconds: number;
    status: 'success' | 'interrupted' | 'error';
    filesCount: number;
    totalSizeSynced: number; // Size of files synced in this session
    errorMessage?: string;
    current?: string;        // Current status (for continue mode)
    continueId?: string;     // ID of the session that this session continues
}

/** Flattened log entry for UI display (Project-centric) */
export interface SyncLogEntry {
    sessionId: string;
    projectId: string;
    projectName: string;
    runId: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'success' | 'interrupted' | 'error';
    current?: string;     // Current status
    continueId?: string;  // ID of the session that this session continues
    filesCount: number;
    failedCount?: number; // Added failed files count
    totalSize: number;
    error?: string;
    triggeredBy?: 'manual' | 'scheduled';
}

/** Filter criteria for fetching sync logs */
export interface SyncLogFilters {
    days: number;
    status: string;
    search: string;
}

/** Heartbeat status from PropertiesService (quota-free health check) */
export interface ProjectHeartbeat {
    projectId: string;
    lastCheckTimestamp: string;
    lastStatus: string;
}

/** File sync log (child of SyncSession) */
export interface FileLog {
    id: string;
    sessionId: string;
    fileName: string;
    sourceLink: string;
    destLink: string;
    sourcePath: string;
    createdDate: string;
    modifiedDate: string;
    fileSize?: number;
    status: 'success' | 'error' | 'skipped'; // Add status field
    errorMessage?: string; // Add error message for failed files
}

/** Global app settings */
export interface AppSettings {
    syncCutoffSeconds: number;
    defaultScheduleCron: string;
    webhookUrl: string;
    firebaseProjectId: string;
    enableNotifications: boolean;
    enableAutoSchedule?: boolean;
    maxRetries: number;
    batchSize: number;
}

// ==========================================
// Dashboard Specific Types
// ==========================================

/** Statistics for a specific period (e.g., today, last 7 days) */
export interface SyncProgressStats {
    files: number;
    size: number;
    duration: number;
    sessions: number;
    projects: number; // Added: Number of unique projects synced
}

/** Chart data point for sync performance over time */
export interface SyncChartData {
    date: string;
    filesCount: number;
    duration: number;
}

/** The main data structure for the entire dashboard */
export interface DashboardData {
    projectSummary: {
        totalProjects: number;
        activeProjects: number;
    };
    syncProgress: {
        today: SyncProgressStats;
        last7Days: SyncProgressStats;
    };
    syncChart: SyncChartData[];
    recentSyncs: SyncSession[];
}

/** App-level state */
export interface AppState {
    theme: 'light' | 'dark' | 'system';
}

/** App-level actions */
export type AppAction =
    | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' };
