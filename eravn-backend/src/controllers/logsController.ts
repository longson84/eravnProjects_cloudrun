// ==========================================
// eravnProjects Backend - Logs Controller
// ==========================================

import { Router, Request, Response } from 'express';
import * as syncLogService from '../services/syncLogService.js';
import logger from '../logger.js';

const router = Router();

// GET /api/logs?days=7&status=all&search=
router.get('/', async (req: Request, res: Response) => {
    try {
        const filters = {
            days: parseInt(req.query.days as string) || 7,
            status: (req.query.status as string) || 'all',
            search: (req.query.search as string) || '',
        };
        const logs = await syncLogService.getSyncLogs(filters);
        res.json(logs);
    } catch (e) {
        logger.error('GET /logs failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// GET /api/logs/:sessionId/details
router.get('/:sessionId/details', async (req: Request, res: Response) => {
    try {
        const details = await syncLogService.getSyncLogDetails(req.params.sessionId as string);
        res.json(details);
    } catch (e) {
        logger.error('GET /logs/:sessionId/details failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// POST /api/logs/:sessionId/continue
router.post('/:sessionId/continue', async (req: Request, res: Response) => {
    try {
        const result = await syncLogService.continueSyncProject(
            req.params.sessionId as string,
            req.body.projectId
        );
        res.json({ success: result });
    } catch (e) {
        logger.error('POST /logs/:sessionId/continue failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
