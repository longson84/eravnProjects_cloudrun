// ==========================================
// eravnProjects Backend - System Controller
// ==========================================

import { Router, Request, Response } from 'express';
import * as repo from '../repositories/firestoreRepository.js';
import logger from '../logger.js';

const router = Router();

// POST /api/system/reset-database
router.post('/reset-database', async (req: Request, res: Response) => {
    try {
        const result = await repo.resetDatabase();
        res.json({ success: result });
    } catch (e) {
        logger.error('POST /system/reset-database failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// GET /api/system/heartbeats
router.get('/heartbeats', async (req: Request, res: Response) => {
    try {
        const heartbeats = await repo.getAllProjectHeartbeats();
        res.json(heartbeats);
    } catch (e) {
        logger.error('GET /system/heartbeats failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

// GET /api/system/check-firestore
router.get('/check-firestore', async (req: Request, res: Response) => {
    try {
        const result = await repo.checkFirestoreConnectivity();
        res.json(result);
    } catch (e) {
        logger.error('GET /system/check-firestore failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
