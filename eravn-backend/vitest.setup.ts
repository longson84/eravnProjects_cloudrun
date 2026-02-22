// ==========================================
// Vitest Global Setup
// ==========================================
// Mock environment variables before any test imports

// Set required environment variables for tests
process.env.GCP_PROJECT_ID = 'test-project-id';
process.env.GCP_DATABASE_ID = '(default)';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.WEBHOOK_URL = 'https://test-webhook.example.com';
process.env.PORT = '8080';
process.env.SYNC_CUTOFF_SECONDS = '300';
process.env.MAX_RETRIES = '3';
process.env.BATCH_SIZE = '450';
process.env.SYNC_CONCURRENCY = '5';
process.env.CORS_ORIGINS = 'http://localhost:5173';
