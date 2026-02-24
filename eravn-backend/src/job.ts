// ==========================================
// eravnProjects - Cloud Run Job Entry Point
// ==========================================
// Entry point cho Cloud Run Jobs.
// Khác với app.ts (Express server), file này:
// - KHÔNG start HTTP server
// - Chạy sync logic → log kết quả → exit
// ==========================================

import logger from './logger.js';
import { syncAllProjects } from './services/syncService.js';

async function main(): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 [Cloud Run Job] Starting sync job...');
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   GCP Project: ${process.env.GCP_PROJECT_ID || '(not set)'}`);

    try {
        const result = await syncAllProjects({ triggeredBy: 'scheduled' });

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        logger.info(`✅ [Cloud Run Job] Completed in ${durationSeconds}s`);
        logger.info(`   Run ID: ${result.runId}`);
        logger.info(`   Sessions: ${result.sessionsCount}`);
        logger.info(`   Success: ${result.success}`);

        if (result.message) {
            logger.info(`   Message: ${result.message}`);
        }

        // Exit code 0 = success → Cloud Run Jobs đánh dấu execution thành công
        process.exit(0);
    } catch (error) {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        logger.error(`❌ [Cloud Run Job] FAILED after ${durationSeconds}s: ${(error as Error).message}`);

        // Exit code 1 = failure → Cloud Run Jobs sẽ retry nếu cấu hình maxRetries > 0
        process.exit(1);
    }
}

// Chạy main function
main();
