// ==========================================
// eravnProjects Backend - Dashboard Controller
// ==========================================

import { Router, Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService.js';
import logger from '../logger.js';

const router = Router();

// GET /api/dashboard
router.get('/', async (req: Request, res: Response) => {
    try {
        const data = await dashboardService.getDashboardData();
        res.json(data);
    } catch (e) {
        logger.error('GET /dashboard failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
