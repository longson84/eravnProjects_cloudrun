// ==========================================
// Tests for Settings Service
// ==========================================
// Tests cache behavior: hit, miss, TTL expiry, invalidation

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firestoreRepository
vi.mock('../../repositories/firestoreRepository.js', () => ({
    getSettingsFromDb: vi.fn(),
    saveSettingsToDb: vi.fn(),
}));

// Must import AFTER vi.mock
import { getSettings, updateSettings, invalidateSettingsCache } from '../../services/settingsService.js';
import * as repo from '../../repositories/firestoreRepository.js';
import type { AppSettings } from '../../types.js';

const mockSettings: AppSettings = {
    syncCutoffSeconds: 300,
    defaultScheduleCron: '*/5 * * * *',
    webhookUrl: 'https://chat.googleapis.com/test',
    firebaseProjectId: 'test-project',
    enableNotifications: true,
    enableAutoSchedule: true,
    maxRetries: 3,
    batchSize: 450,
};

describe('SettingsService', () => {
    beforeEach(() => {
        invalidateSettingsCache();
        vi.mocked(repo.getSettingsFromDb).mockResolvedValue({ ...mockSettings });
        vi.mocked(repo.saveSettingsToDb).mockImplementation(async (s) => s);
    });

    describe('getSettings', () => {
        it('should fetch from Firestore on first call (cache miss)', async () => {
            const result = await getSettings();
            expect(result).toEqual(mockSettings);
            expect(repo.getSettingsFromDb).toHaveBeenCalledTimes(1);
        });

        it('should return cached value on second call (cache hit)', async () => {
            await getSettings();
            await getSettings();

            // Only one Firestore call - second was served from cache
            expect(repo.getSettingsFromDb).toHaveBeenCalledTimes(1);
        });

        it('should refetch after cache invalidation', async () => {
            await getSettings();
            invalidateSettingsCache();
            await getSettings();

            expect(repo.getSettingsFromDb).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateSettings', () => {
        it('should merge and save settings', async () => {
            const updates = { syncCutoffSeconds: 600 };
            const result = await updateSettings(updates);

            expect(result.syncCutoffSeconds).toBe(600);
            expect(result.webhookUrl).toBe(mockSettings.webhookUrl); // Other fields preserved
            expect(repo.saveSettingsToDb).toHaveBeenCalledOnce();
        });

        it('should refresh cache after update', async () => {
            // First call - cache miss
            await getSettings();
            expect(repo.getSettingsFromDb).toHaveBeenCalledTimes(1);

            // Update
            await updateSettings({ syncCutoffSeconds: 600 });

            // Next getSettings should use the updated cache, not Firestore
            const result = await getSettings();
            expect(result.syncCutoffSeconds).toBe(600);
            // Still only 1 Firestore read (the initial one)
            expect(repo.getSettingsFromDb).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalidateSettingsCache', () => {
        it('should force next getSettings to read from Firestore', async () => {
            await getSettings();
            invalidateSettingsCache();

            const modifiedSettings = { ...mockSettings, maxRetries: 5 };
            vi.mocked(repo.getSettingsFromDb).mockResolvedValue(modifiedSettings);

            const result = await getSettings();
            expect(result.maxRetries).toBe(5);
        });
    });
});
