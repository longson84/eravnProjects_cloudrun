// ==========================================
// eravnProjects Backend - Configuration
// ==========================================

export const CONFIG = {
    PORT: parseInt(process.env.PORT || '8080', 10),
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || '',
    GCP_DATABASE_ID: process.env.GCP_DATABASE_ID || '(default)',

    // Security
    CRON_SECRET: process.env.CRON_SECRET || '',

    // Webhook
    WEBHOOK_URL: process.env.WEBHOOK_URL || '',

    // Sync
    SYNC_CUTOFF_SECONDS: parseInt(process.env.SYNC_CUTOFF_SECONDS || '300', 10),
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '450', 10),
    SYNC_CONCURRENCY: parseInt(process.env.SYNC_CONCURRENCY || '5', 10),

    // CORS
    CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),

    // Drive
    FOLDER_MIME_TYPE: 'application/vnd.google-apps.folder',
    DRIVE_FIELDS: 'files(id,name,mimeType,modifiedTime,createdTime,size,parents)',

    // Settings cache TTL (milliseconds)
    SETTINGS_CACHE_TTL: parseInt(process.env.SETTINGS_CACHE_TTL || '300000', 10), // 5 minutes
} as const;
