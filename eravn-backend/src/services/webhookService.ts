// ==========================================
// eravnProjects Backend - Webhook Service
// ==========================================
// Google Chat webhook notifications (ported from WebhookService.gs)

import axios from 'axios';
import logger from '../logger.js';
import { getSettings } from './settingsService.js';
import type { SyncSession } from '../types.js';

/**
 * Send sync summary notification to Google Chat
 */
export async function sendSyncSummary(sessions: SyncSession[], runId: string): Promise<void> {
    const settings = await getSettings();
    if (!settings.webhookUrl) return;

    const successCount = sessions.filter(s => s.status === 'success').length;
    const errorCount = sessions.filter(s => s.status === 'error').length;
    const interruptedCount = sessions.filter(s => s.status === 'interrupted').length;
    const totalFiles = sessions.reduce((sum, s) => sum + s.filesCount, 0);

    const statusEmoji = errorCount > 0 ? '🔴' : interruptedCount > 0 ? '🟡' : '🟢';

    const card = {
        cards: [{
            header: {
                title: `${statusEmoji} eravnProjects Sync Report`,
                subtitle: runId,
                imageUrl: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
            },
            sections: [{
                widgets: [
                    {
                        keyValue: {
                            topLabel: 'Tổng dự án',
                            content: String(sessions.length),
                            bottomLabel: `${successCount} thành công | ${errorCount} lỗi | ${interruptedCount} ngắt`,
                        },
                    },
                    { keyValue: { topLabel: 'Files đã sync', content: String(totalFiles) } },
                ],
            }],
        }],
    };

    // Add error details
    if (errorCount > 0) {
        const errorDetails = sessions
            .filter(s => s.status === 'error')
            .map(s => `• ${s.projectName}: ${s.errorMessage || 'Unknown error'}`)
            .join('\n');

        card.cards[0].sections.push({
            header: '⚠️ Chi tiết lỗi',
            widgets: [{ textParagraph: { text: errorDetails } }],
        } as any);
    }

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
