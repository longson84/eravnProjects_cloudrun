// ==========================================
// eravnProjects Backend - Sync Controller
// ==========================================
// Protected endpoint for Cloud Scheduler + manual sync

import { Router, Request, Response } from 'express';
import { CONFIG } from '../config.js';
import * as syncService from '../services/syncService.js';
import * as projectService from '../services/projectService.js';
import { requestStop } from '../services/stopSignalRegistry.js';
import logger from '../logger.js';

const router = Router();

/**
 * Middleware to verify CRON_SECRET for scheduled sync calls.
 * Allows manual calls without token (for admin use via authenticated sessions).
 */
function verifyCronToken(req: Request, res: Response, next: Function): void {
    // If CRON_SECRET is set, verify it
    if (CONFIG.CRON_SECRET) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${CONFIG.CRON_SECRET}`) {
            logger.warn('Unauthorized sync attempt blocked');
            res.status(401).json({ error: 'Unauthorized: Invalid or missing CRON_SECRET token' });
            return;
        }
    }
    next();
}

// POST /api/sync/all — Protected by CRON_SECRET
router.post('/all', verifyCronToken, async (req: Request, res: Response) => {
    try {
        const triggeredBy = req.body?.triggeredBy || 'scheduled';
        logger.info(`Sync all projects trigger acknowledged: ${triggeredBy}. Starting background process.`);

        // FIRE AND FORGET: Start sync in background, don't await the full result
        // syncService handles status management internally (after lock check)
        syncService.syncAllProjects({ triggeredBy }).catch(e => {
            logger.error('Background Sync All Projects FAILED:', { error: e.message });
        });

        // Return immediately so frontend doesn't timeout
        res.json({
            success: true,
            message: 'Đã bắt đầu đồng bộ toàn bộ dự án trong nền.',
            status: 'processing'
        });
    } catch (e) {
        logger.error('POST /sync/all trigger failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/sync/:projectId — Sync a single project
router.post('/:projectId', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        logger.info(`Single project sync trigger acknowledged for: ${projectId}. Starting background process.`);

        // FIRE AND FORGET: syncSingleProject manages isRunning lock and lastSyncStatus internally.
        // DO NOT set lastSyncStatus here — it would erase 'interrupted' state needed for Continue Mode.
        syncService.syncProjectById(projectId, {
            triggeredBy: 'manual',
        }).catch(e => {
            logger.error(`Background Sync Project ${projectId} FAILED:`, { error: e.message });
        });

        res.json({
            success: true,
            message: 'Quá trình đồng bộ đã bắt đầu và đang chạy trong nền.',
            status: 'processing',
        });
    } catch (e) {
        logger.error(`POST /sync/${req.params.projectId} trigger failed`, { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/sync/stop/:projectId — Request to stop a running sync
router.post('/stop/:projectId', async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const project = await projectService.getProjectById(projectId);
        const projectName = project ? project.name : 'Unknown';

        logger.info(`${projectName}: Stop sync requested from UI`);

        await requestStop(projectId, projectName);

        res.json({
            success: true,
            message: 'Đã gửi yêu cầu dừng sync. Tiến trình sẽ dừng an toàn sau khi hoàn tất file hiện tại.',
        });
    } catch (e) {
        logger.error(`POST /sync/stop/${req.params.projectId} failed`, { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
