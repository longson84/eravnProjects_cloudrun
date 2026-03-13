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

import { sendSyncSummary, sendWebhookNotification, testWebhook, formatBytes } from '../../services/webhookService.js';
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
            firebaseProjectId: 'test',
            enableNotifications: true,
            maxRetries: 3,
            batchSize: 450,
            timezone: 'Asia/Ho_Chi_Minh',
        });
        vi.mocked(axios.post).mockResolvedValue({ status: 200 });
    });

    describe('formatBytes', () => {
        it('should format 0 bytes', () => {
            expect(formatBytes(0)).toBe('0 B');
        });

        it('should format bytes < 1KB', () => {
            expect(formatBytes(512)).toBe('512 B');
        });

        it('should format KB', () => {
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1536)).toBe('1.5 KB');
        });

        it('should format MB', () => {
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
        });

        it('should format GB', () => {
            expect(formatBytes(1073741824)).toBe('1 GB');
        });
    });

    describe('sendSyncSummary', () => {
        it('should send card notification with per-project summary', async () => {
            const sessions = [
                mockSession(),
                mockSession({ id: 'sess-2', projectName: 'Project B', status: 'error', errorMessage: 'Test error', filesCount: 0, totalSizeSynced: 0 }),
            ];

            await sendSyncSummary(sessions, 'run-1');

            expect(axios.post).toHaveBeenCalledOnce();
            const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
            expect(payload.cards).toBeDefined();
            expect(payload.cards[0].header.title).toContain('🔴'); // Has errors
            expect(payload.cards[0].header.title).toContain('Cloud Run Job');

            // Verify summary section
            const summaryWidgets = payload.cards[0].sections[0].widgets;
            expect(summaryWidgets).toHaveLength(4); // projects, files, size, duration

            // Verify per-project detail section
            const detailSection = payload.cards[0].sections[1];
            expect(detailSection.header).toContain('Chi tiết');
            const detailText = detailSection.widgets[0].textParagraph.text;
            // Only projects with files > 0 should appear in the project listing
            expect(detailText).toContain('Test Project'); // 5 files
            // Project B (0 files) should NOT have its own listing line with file/size/duration stats
            expect(detailText).not.toMatch(/✅.*Project B|❌.*Project B|⚠️.*Project B/);
            // But Project B should still appear in error details
            expect(detailText).toContain('Chi tiết lỗi');
            expect(detailText).toContain('Project B: Test error');
            // Logs link should be present
            expect(detailText).toContain('sync.era.com.vn/logs');
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

        it('should include formatted size and duration in per-project details', async () => {
            const session = mockSession({ totalSizeSynced: 2 * 1024 * 1024, executionDurationSeconds: 95 });
            await sendSyncSummary([session], 'run-1');

            const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
            const detailText = payload.cards[0].sections[1].widgets[0].textParagraph.text;
            expect(detailText).toContain('2 MB');
            expect(detailText).toContain('1m 35s');
        });

        it('should skip when no webhook URL', async () => {
            vi.mocked(getSettings).mockResolvedValue({
                webhookUrl: '',
                syncCutoffSeconds: 300,
                firebaseProjectId: 'test',
                enableNotifications: true,
                maxRetries: 3,
                batchSize: 450,
                timezone: 'Asia/Ho_Chi_Minh',
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
                firebaseProjectId: 'test',
                enableNotifications: true,
                maxRetries: 3,
                batchSize: 450,
                timezone: 'Asia/Ho_Chi_Minh',
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
