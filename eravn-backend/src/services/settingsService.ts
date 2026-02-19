// ==========================================
// eravnProjects Backend - Settings Service
// ==========================================
// In-memory cached settings with TTL (per user feedback)

import { CONFIG } from '../config.js';
import logger from '../logger.js';
import * as repo from '../repositories/firestoreRepository.js';
import type { AppSettings } from '../types.js';

// ==========================================
// In-Memory Cache (per user requirement)
// ==========================================
let settingsCache: AppSettings | null = null;
let cacheTimestamp: number = 0;

/**
 * Get settings with in-memory cache (avoids Firestore read on every request)
 * Cache invalidated on write or when TTL expires
 */
export async function getSettings(): Promise<AppSettings> {
    const now = Date.now();
    if (settingsCache && (now - cacheTimestamp) < CONFIG.SETTINGS_CACHE_TTL) {
        return settingsCache;
    }

    logger.info('Settings cache miss, loading from Firestore');
    settingsCache = await repo.getSettingsFromDb();
    cacheTimestamp = now;
    return settingsCache;
}

/**
 * Update settings and invalidate cache
 */
export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await getSettings();
    const merged: AppSettings = { ...current, ...settings };
    const saved = await repo.saveSettingsToDb(merged);

    // Invalidate cache immediately so next read gets fresh data
    settingsCache = saved;
    cacheTimestamp = Date.now();

    logger.info('Settings updated and cache refreshed');
    return saved;
}

/**
 * Force cache invalidation (useful for debugging)
 */
export function invalidateSettingsCache(): void {
    settingsCache = null;
    cacheTimestamp = 0;
}
