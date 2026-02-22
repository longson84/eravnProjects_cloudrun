// ==========================================
// eravnProjects Backend - Shared Type Definitions
// ==========================================
// Mirrors the frontend types for backend use

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
    lastSyncStatus: 'success' | 'interrupted' | 'error' | 'pending' | 'running' | null;
    filesCount: number;
    totalSize: number;
    createdAt: string;
    updatedAt: string;
    syncStartDate?: string;
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
    status: 'success' | 'interrupted' | 'error' | 'warning' | 'running';
    current?: string;
    filesCount: number;
    failedFilesCount?: number;
    totalSizeSynced: number;
    errorMessage?: string;
    triggeredBy?: 'manual' | 'scheduled';
    retryOf?: string | null;
    continueId?: string | null;
}

/** Flattened log entry for UI display */
export interface SyncLogEntry {
    sessionId: string;
    projectId: string;
    projectName: string;
    runId: string;
    startTime: string;
    endTime: string;
    duration: number;
    status: 'success' | 'interrupted' | 'error' | 'running';
    current?: string;
    continueId?: string;
    filesCount: number;
    failedCount?: number;
    totalSize: number;
    error?: string;
    triggeredBy?: 'manual' | 'scheduled';
}

/** File sync log (child of SyncSession) */
export interface FileLog {
    id: string;
    sessionId: string;
    fileName: string;
    sourceLink: string;
    destLink: string;
    sourcePath: string;
    sourceFileId?: string;
    createdDate: string;
    modifiedDate: string;
    fileSize?: number;
    status: 'success' | 'error' | 'skipped';
    errorMessage?: string;
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

/** Heartbeat status */
export interface ProjectHeartbeat {
    projectId: string;
    lastCheckTimestamp: string;
    lastStatus: string;
}

/** Statistics for a specific period */
export interface SyncProgressStats {
    files: number;
    size: number;
    duration: number;
    sessions: number;
    projects: number;
}

/** Chart data point */
export interface SyncChartData {
    date: string;
    filesCount: number;
    duration: number;
}

/** Dashboard data */
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

/** Drive file object from Google Drive API */
export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    createdTime?: string;
    size?: string;
    parents?: string[];
    webViewLink?: string;
}
