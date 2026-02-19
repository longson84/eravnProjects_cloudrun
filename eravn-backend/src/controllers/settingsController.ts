// ==========================================
// eravnProjects Backend - Settings Controller
// ==========================================

import { Router, Request, Response } from 'express';
import * as settingsService from '../services/settingsService.js';
import * as webhookService from '../services/webhookService.js';
import logger from '../logger.js';

const router = Router();

// GET /api/settings
router.get('/', async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.getSettings();
        res.json(settings);
    } catch (e) {
        logger.error('GET /settings failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.updateSettings(req.body);
        res.json(settings);
    } catch (e) {
        logger.error('PUT /settings failed', { error: (e as Error).message });
        res.status(400).json({ error: (e as Error).message });
    }
});

// POST /api/settings/test-webhook
router.post('/test-webhook', async (req: Request, res: Response) => {
    try {
        const result = await webhookService.testWebhook(req.body.url);
        res.json({ success: result });
    } catch (e) {
        logger.error('POST /settings/test-webhook failed', { error: (e as Error).message });
        res.status(400).json({ error: (e as Error).message });
    }
});

export default router;
