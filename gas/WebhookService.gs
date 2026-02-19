// ==========================================
// eravnProjects - Webhook Service (Infrastructure Layer)
// ==========================================
// Google Chat webhook integration for notifications

/**
 * Send sync summary notification to Google Chat
 * @param {Array} sessions - Array of sync session results
 * @param {string} runId - Current run ID
 */
function sendSyncSummary(sessions, runId) {
  var settings = getSettingsFromCache_();
  if (!settings.webhookUrl) return;

  var successCount = sessions.filter(function(s) { return s.status === 'success'; }).length;
  var errorCount = sessions.filter(function(s) { return s.status === 'error'; }).length;
  var interruptedCount = sessions.filter(function(s) { return s.status === 'interrupted'; }).length;
  var totalFiles = sessions.reduce(function(sum, s) { return sum + s.filesCount; }, 0);

  var statusEmoji = errorCount > 0 ? '🔴' : interruptedCount > 0 ? '🟡' : '🟢';

  var card = {
    cards: [{
      header: {
        title: statusEmoji + ' eravnProjects Sync Report',
        subtitle: runId,
        imageUrl: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
      },
      sections: [{
        widgets: [
          { keyValue: { topLabel: 'Tổng dự án', content: String(sessions.length), bottomLabel: successCount + ' thành công | ' + errorCount + ' lỗi | ' + interruptedCount + ' ngắt' } },
          { keyValue: { topLabel: 'Files đã sync', content: String(totalFiles) } },
        ],
      }],
    }],
  };

  // Add error details if any
  if (errorCount > 0) {
    var errorDetails = sessions
      .filter(function(s) { return s.status === 'error'; })
      .map(function(s) { return '• ' + s.projectName + ': ' + (s.errorMessage || 'Unknown error'); })
      .join('\n');

    card.cards[0].sections.push({
      header: '⚠️ Chi tiết lỗi',
      widgets: [{ textParagraph: { text: errorDetails } }],
    });
  }

  try {
    UrlFetchApp.fetch(settings.webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(card),
    });
  } catch (e) {
    Logger.log('Webhook send failed: ' + e.message);
  }
}

/**
 * Send a simple text notification
 */
function sendWebhookNotification(message) {
  var settings = getSettingsFromCache_();
  if (!settings.webhookUrl) return;

  try {
    UrlFetchApp.fetch(settings.webhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ text: message }),
    });
  } catch (e) {
    Logger.log('Webhook send failed: ' + e.message);
  }
}

/**
 * Test webhook connection
 * @param {string} url - The webhook URL to test
 * @return {boolean} - True if successful
 */
function testWebhook(url) {
  if (!url) throw new Error('URL is empty');
  
  try {
    UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({ 
        text: '🔔 Test notification from eravnProjects\nNếu bạn thấy tin nhắn này, kết nối đã thành công! 🚀' 
      }),
    });
    return true;
  } catch (e) {
    throw new Error('Gửi thất bại: ' + e.message);
  }
}
