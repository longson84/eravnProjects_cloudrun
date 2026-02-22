// ==========================================
// Tests for Webhook Service
// ==========================================
// Tests notification formatting, error handling, and webhook connectivity

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

vi.mock('../../services/settingsService.js', () => ({
    getSettings: vi.fn(),
}));

import { sendSyncSummary, sendWebhookNotification, testWebhook } from '../../services/webhookService.js';
import { getSettings } from '../../services/settingsService.js';
import axios from 'axios';
import type { SyncSession } from '../../types.js';

const mockSession = (overrides: Partial<SyncSession> = {}): SyncSession => ({
    id: 'sess-1',
    projectId: 'proj-1',
    projectName: 'Test Project',
    runId: '260221-120000',
    timestamp: '2026-02-21T12:00:00Z',
    executionDurationSeconds: 10,
    status: 'success',
    filesCount: 5,
    totalSizeSynced: 1000,
    ...overrides,
});

describe('WebhookService', () => {
    beforeEach(() => {
        vi.mocked(getSettings).mockResolvedValue({
            webhookUrl: 'https://chat.googleapis.com/webhook/test',
            syncCutoffSeconds: 300,
            defaultScheduleCron: '',
            firebaseProjectId: 'test',
            enableNotifications: true,
            maxRetries: 3,
            batchSize: 450,
        });
        vi.mocked(axios.post).mockResolvedValue({ status: 200 });
    });

    describe('sendSyncSummary', () => {
        it('should send card notification with session stats', async () => {
            const sessions = [mockSession(), mockSession({ id: 'sess-2', status: 'error', errorMessage: 'Test error' })];

            await sendSyncSummary(sessions, 'run-1');

            expect(axios.post).toHaveBeenCalledOnce();
            const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
            expect(payload.cards).toBeDefined();
            expect(payload.cards[0].header.title).toContain('🔴'); // Has errors
        });

        it('should show green emoji when all success', async () => {
            await sendSyncSummary([mockSession()], 'run-1');

            const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
            expect(payload.cards[0].header.title).toContain('🟢');
        });

        it('should show yellow emoji when interrupted', async () => {
            await sendSyncSummary([mockSession({ status: 'interrupted' })], 'run-1');

            const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
            expect(payload.cards[0].header.title).toContain('🟡');
        });

        it('should skip when no webhook URL', async () => {
            vi.mocked(getSettings).mockResolvedValue({
                webhookUrl: '',
                syncCutoffSeconds: 300,
                defaultScheduleCron: '',
                firebaseProjectId: 'test',
                enableNotifications: true,
                maxRetries: 3,
                batchSize: 450,
            });

            await sendSyncSummary([mockSession()], 'run-1');
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should not throw on webhook failure', async () => {
            vi.mocked(axios.post).mockRejectedValue(new Error('Network error'));

            // Should not throw
            await expect(sendSyncSummary([mockSession()], 'run-1')).resolves.toBeUndefined();
        });
    });

    describe('sendWebhookNotification', () => {
        it('should send text message', async () => {
            await sendWebhookNotification('Hello!');

            expect(axios.post).toHaveBeenCalledWith(
                'https://chat.googleapis.com/webhook/test',
                { text: 'Hello!' }
            );
        });

        it('should skip when no webhook URL', async () => {
            vi.mocked(getSettings).mockResolvedValue({
                webhookUrl: '',
                syncCutoffSeconds: 300,
                defaultScheduleCron: '',
                firebaseProjectId: 'test',
                enableNotifications: true,
                maxRetries: 3,
                batchSize: 450,
            });

            await sendWebhookNotification('Hello!');
            expect(axios.post).not.toHaveBeenCalled();
        });
    });

    describe('testWebhook', () => {
        it('should return true on success', async () => {
            const result = await testWebhook('https://test.com/webhook');
            expect(result).toBe(true);
        });

        it('should throw on empty URL', async () => {
            await expect(testWebhook('')).rejects.toThrow('URL is empty');
        });

        it('should throw on HTTP error', async () => {
            vi.mocked(axios.post).mockRejectedValue(new Error('Connection refused'));
            await expect(testWebhook('https://invalid.com')).rejects.toThrow('Gửi thất bại');
        });
    });
});
