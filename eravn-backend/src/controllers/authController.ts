// ==========================================
// eravnProjects Backend - Auth Controller
// ==========================================
// Simple passphrase verification for admin mode
// Returns a signed HMAC token on success

import { Router, Request, Response } from 'express';
import { CONFIG } from '../config.js';
import { generateAdminToken } from '../middleware/requireAdmin.js';
import logger from '../logger.js';

const router = Router();

// POST /api/auth/verify — Verify admin passphrase and return token
router.post('/verify', (req: Request, res: Response) => {
    try {
        const { passphrase } = req.body || {};

        if (!passphrase || typeof passphrase !== 'string') {
            res.status(400).json({ error: 'Passphrase là bắt buộc' });
            return;
        }

        if (!CONFIG.ADMIN_PASSPHRASE) {
            logger.warn('ADMIN_PASSPHRASE not configured in environment');
            res.status(500).json({ error: 'Admin passphrase chưa được cấu hình trên server' });
            return;
        }

        if (passphrase === CONFIG.ADMIN_PASSPHRASE) {
            const token = generateAdminToken();
            logger.info('Admin mode unlocked via passphrase');
            res.json({ success: true, token });
        } else {
            logger.warn('Invalid admin passphrase attempt');
            res.status(401).json({ error: 'Sai mật khẩu admin' });
        }
    } catch (e) {
        logger.error('POST /auth/verify failed', { error: (e as Error).message });
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
