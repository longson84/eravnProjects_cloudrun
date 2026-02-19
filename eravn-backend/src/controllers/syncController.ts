// ==========================================
// eravnProjects Backend - Sync Controller
// ==========================================
// Protected endpoint for Cloud Scheduler + manual sync

import { Router, Request, Response } from 'express';
import { CONFIG } from '../config.js';
import * as syncService from '../services/syncService.js';
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
        logger.info(`Sync all projects triggered by: ${triggeredBy}`);
        const result = await syncService.syncAllProjects({ triggeredBy });
        res.json(result);
    } catch (e) {
        logger.error('POST /sync/all failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/sync/:projectId — Sync a single project
router.post('/:projectId', async (req: Request, res: Response) => {
    try {
        const result = await syncService.syncProjectById(req.params.projectId as string, {
            triggeredBy: 'manual',
        });
        res.json(result);
    } catch (e) {
        logger.error('POST /sync/:projectId failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
