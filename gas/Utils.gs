// ==========================================
// eravnProjects - Utility Functions
// ==========================================

/**
 * Generate a unique ID
 * @returns {string} UUID-like string
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO 8601 timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Format duration in seconds to human readable
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds < 60) return seconds + 's';
  var minutes = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return minutes + 'm ' + secs + 's';
}

/**
 * Extract folder ID from Google Drive link
 * @param {string} link - Drive folder link or ID
 * @returns {string} Folder ID
 */
function extractFolderIdFromLink(link) {
  var match = link.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : link;
}

/**
 * Format timestamp for file versioning (YYMMDD_HHmm)
 * Example: 2026-02-14 13:58 -> 260214_1358
 * @param {string|Date} dateObj
 * @returns {string}
 */
function formatTimestampForFilename(dateObj) {
  var date = new Date(dateObj);
  return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'yyMMdd_HHmm');
}

/**
 * Sleep with exponential backoff
 * @param {number} attempt - Current retry attempt (0-based)
 */
function exponentialBackoff(attempt) {
  var waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
  Utilities.sleep(Math.min(waitTime, 30000));
}

/**
 * Configuration constants
 */
var CONFIG = {
  FIRESTORE_PROJECT_ID: '', // Set via settings
  FIRESTORE_BASE_URL: 'https://firestore.googleapis.com/v1/projects/',
  DRIVE_FIELDS: 'files(id,name,mimeType,modifiedTime,createdTime,size,parents)',
  FOLDER_MIME_TYPE: 'application/vnd.google-apps.folder',
  MAX_RETRIES: 3,
  DEFAULT_CUTOFF_SECONDS: 300,
  BATCH_SIZE: 450,
};
