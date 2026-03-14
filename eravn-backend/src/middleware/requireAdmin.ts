// ==========================================
// Admin Auth Middleware - HMAC Token Verification
// ==========================================
// Stateless token: base64(timestamp).hmac(timestamp, secret)
// No storage needed — survives Cloud Run restarts

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CONFIG } from '../config.js';
import logger from '../logger.js';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Generate a signed admin token.
 * Format: base64(timestamp).hmac_sha256(timestamp, ADMIN_PASSPHRASE)
 */
export function generateAdminToken(): string {
    const timestamp = Date.now().toString();
    const signature = crypto
        .createHmac('sha256', CONFIG.ADMIN_PASSPHRASE)
        .update(timestamp)
        .digest('hex');
    return `${Buffer.from(timestamp).toString('base64')}.${signature}`;
}

/**
 * Verify an admin token's signature and TTL.
 */
function verifyAdminToken(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [encodedTimestamp, signature] = parts;

    let timestamp: string;
    try {
        timestamp = Buffer.from(encodedTimestamp, 'base64').toString('utf8');
    } catch {
        return false;
    }

    // Check TTL
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (isNaN(tokenAge) || tokenAge < 0 || tokenAge > TOKEN_TTL_MS) {
        return false;
    }

    // Verify HMAC signature (timing-safe comparison)
    const expectedSignature = crypto
        .createHmac('sha256', CONFIG.ADMIN_PASSPHRASE)
        .update(timestamp)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Express middleware: requires a valid admin token in Authorization header.
 * Usage: router.post('/path', requireAdmin, handler)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Yêu cầu xác thực admin' });
        return;
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    if (!CONFIG.ADMIN_PASSPHRASE) {
        logger.warn('ADMIN_PASSPHRASE not configured — rejecting admin request');
        res.status(500).json({ error: 'Admin passphrase chưa được cấu hình trên server' });
        return;
    }

    if (!verifyAdminToken(token)) {
        logger.warn('Invalid or expired admin token', { path: req.path });
        res.status(401).json({ error: 'Token admin không hợp lệ hoặc đã hết hạn' });
        return;
    }

    next();
}
