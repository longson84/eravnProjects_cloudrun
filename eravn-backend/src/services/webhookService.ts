// ==========================================
// eravnProjects Backend - Webhook Service
// ==========================================
// Google Chat webhook notifications (ported from WebhookService.gs)

import axios from 'axios';
import logger from '../logger.js';
import { getSettings } from './settingsService.js';
import type { SyncSession } from '../types.js';

/**
 * Format bytes to human-readable string (KB/MB/GB)
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(k, idx);
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[idx]}`;
}

/**
 * Format duration in seconds to human-readable (e.g. "1m 23s")
 */
function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/**
 * Format timestamp to local time string (HH:mm DD/MM)
 */
function formatTime(timestamp: string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
    const d = new Date(timestamp);
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        hour12: false,
    }).formatToParts(d);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}`;
}

/**
 * Send sync summary notification to Google Chat — Cloud Run Job only
 * Includes a per-project summary table with project name, files, size, and duration
 */
export async function sendSyncSummary(sessions: SyncSession[], runId: string): Promise<void> {
    const settings = await getSettings();
    if (!settings.webhookUrl) return;

    const successCount = sessions.filter(s => s.status === 'success').length;
    const errorCount = sessions.filter(s => s.status === 'error').length;
    const interruptedCount = sessions.filter(s => s.status === 'interrupted').length;
    const totalFiles = sessions.reduce((sum, s) => sum + s.filesCount, 0);
    const totalSize = sessions.reduce((sum, s) => sum + s.totalSizeSynced, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.executionDurationSeconds, 0);
    const timezone = settings.timezone || 'Asia/Ho_Chi_Minh';

    const statusEmoji = errorCount > 0 ? '🔴' : interruptedCount > 0 ? '🟡' : '🟢';

    // Build per-project detail lines
    const projectLines = sessions.map(s => {
        const emoji = s.status === 'success' ? '✅' : s.status === 'error' ? '❌' : '⚠️';
        const time = formatTime(s.timestamp, timezone);
        const size = formatBytes(s.totalSizeSynced);
        const duration = formatDuration(s.executionDurationSeconds);
        return `${emoji} <b>${s.projectName}</b>\n     📄 ${s.filesCount} files  |  📦 ${size}  |  ⏱ ${duration}  |  🕐 ${time}`;
    }).join('\n\n');

    // Error details
    const errorDetails = errorCount > 0
        ? '\n\n⚠️ <b>Chi tiết lỗi:</b>\n' + sessions
            .filter(s => s.status === 'error')
            .map(s => `• ${s.projectName}: ${s.errorMessage || 'Unknown error'}`)
            .join('\n')
        : '';

    const card = {
        cards: [{
            header: {
                title: `${statusEmoji} Sync Report — Cloud Run Job`,
                subtitle: `Run ID: ${runId}`,
                imageUrl: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
            },
            sections: [
                {
                    widgets: [
                        {
                            keyValue: {
                                topLabel: 'Tổng dự án',
                                content: String(sessions.length),
                                bottomLabel: `${successCount} thành công | ${errorCount} lỗi | ${interruptedCount} ngắt`,
                            },
                        },
                        { keyValue: { topLabel: 'Tổng files đã sync', content: String(totalFiles) } },
                        { keyValue: { topLabel: 'Tổng dung lượng', content: formatBytes(totalSize) } },
                        { keyValue: { topLabel: 'Tổng thời gian', content: formatDuration(totalDuration) } },
                    ],
                },
                {
                    header: '📋 Chi tiết theo dự án',
                    widgets: [
                        { textParagraph: { text: projectLines + errorDetails } },
                    ],
                },
            ],
        }],
    };

    try {
        await axios.post(settings.webhookUrl, card);
        logger.info(`Webhook sent for runId: ${runId}`);
    } catch (e) {
        logger.error(`Webhook send failed: ${(e as Error).message}`);
    }
}

/**
 * Send a simple text notification
 */
export async function sendWebhookNotification(message: string): Promise<void> {
    const settings = await getSettings();
    if (!settings.webhookUrl) return;

    try {
        await axios.post(settings.webhookUrl, { text: message });
    } catch (e) {
        logger.error(`Webhook send failed: ${(e as Error).message}`);
    }
}

/**
 * Test webhook connection
 */
export async function testWebhook(url: string): Promise<boolean> {
    if (!url) throw new Error('URL is empty');

    try {
        await axios.post(url, {
            text: '🔔 Test notification from eravnProjects\nNếu bạn thấy tin nhắn này, kết nối đã thành công! 🚀',
        });
        return true;
    } catch (e) {
        throw new Error('Gửi thất bại: ' + (e as Error).message);
    }
}
