// ==========================================
// eravnProjects - Firestore Repository Layer
// ==========================================
// Handles all CRUD operations with Firestore via REST API

/**
 * Get Firestore base URL for the configured project
 */
function getFirestoreUrl() {
  
  var settings = getSettingsFromCache_();
  var projectId = settings.firebaseProjectId || CONFIG.FIRESTORE_PROJECT_ID;
  return CONFIG.FIRESTORE_BASE_URL + projectId + '/databases/(default)/documents/';

}

/**
 * Make authenticated request to Firestore REST API
 */
function firestoreRequest_(method, path, payload) {
  var url = getFirestoreUrl() + path;
  var maxRetries = CONFIG.MAX_RETRIES;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    var options = {
      method: method,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      contentType: 'application/json',
      muteHttpExceptions: true,
    };
    if (payload) options.payload = JSON.stringify(payload);

    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code < 400) {
      return JSON.parse(response.getContentText());
    }

    // Retry on transient errors: 429 (Rate Limit), 500, 503
    var isRetryable = (code === 429 || code === 500 || code === 503);
    if (isRetryable && attempt < maxRetries) {
      Logger.log('Firestore [' + code + '] retry ' + (attempt + 1) + '/' + maxRetries + ' for ' + path);
      exponentialBackoff(attempt);
    } else {
      Logger.log('Firestore error [' + code + ']: ' + response.getContentText());
      throw new Error('Firestore request failed with code ' + code);
    }
  }
}

// ==========================================
// Projects Collection
// ==========================================

function getAllProjects() {
  var result = firestoreRequest_('GET', 'projects');
  if (!result.documents) return [];
  return result.documents.map(docToProject_);
}

function getProjectById(projectId) {
  var result = firestoreRequest_('GET', 'projects/' + projectId);
  return docToProject_(result);
}

/**
 * Create or Update a project (Upsert)
 * The Service layer is responsible for setting IDs, timestamps, and default values.
 */
function saveProject(project) {
  if (!project.id) throw new Error('Cannot save project without ID');
  var doc = projectToDoc_(project);
  firestoreRequest_('PATCH', 'projects/' + project.id, doc);
  return project;
}

function deleteProjectDoc(projectId) {
  // Soft delete implementation
  var doc = {
    fields: {
      isDeleted: { booleanValue: true },
      deletedAt: { stringValue: getCurrentTimestamp() },
      status: { stringValue: 'paused' } // Optionally pause it to be safe
    }
  };
  var updateMask = 'updateMask.fieldPaths=isDeleted&updateMask.fieldPaths=deletedAt&updateMask.fieldPaths=status';
  firestoreRequest_('PATCH', 'projects/' + projectId + '?' + updateMask, doc);
  return { success: true };
}



// ==========================================
// Sync Sessions Collection
// ==========================================

function saveSyncSession(session) {
  var doc = sessionToDoc_(session);
  firestoreRequest_('PATCH', 'syncSessions/' + session.id, doc);
  return session;
}

function getSyncSessionsByProject(projectId) {
  var result = firestoreRequest_('POST',
    ':runQuery',
    { structuredQuery: { from: [{ collectionId: 'syncSessions' }], where: { fieldFilter: { field: { fieldPath: 'projectId' }, op: 'EQUAL', value: { stringValue: projectId } } }, orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }], limit: 50 } }
  );
  return result.filter(function(r) { return r.document; }).map(function(r) { return docToSession_(r.document); });
}

/**
 * Get pending sync sessions (error or interrupted, and not yet completed)
 * Used for "Continue" sync logic
 */
function getPendingSyncSessions(projectId) {
  // We fetch recent 20 sessions and filter in memory because Firestore composite queries are complex via REST
  var sessions = getSyncSessionsByProject(projectId); // Already sorted by timestamp DESC
  
  // Filter for sessions that are:
  // 1. Status is error or interrupted
  // 2. Current status is NOT success (meaning they haven't been fully resolved yet)
  return sessions.filter(function(s) {
    var isFailed = s.status === 'error' || s.status === 'interrupted';
    var isNotResolved = (s.current || s.status) !== 'success';
    return isFailed && isNotResolved;
  });
}

function getSyncSessionById(sessionId) {
  var result = firestoreRequest_('GET', 'syncSessions/' + sessionId);
  return docToSession_(result);
}

function updateSyncSession(sessionId, updates) {
  // Partial update
  var fields = {};
  if (updates.hasOwnProperty('status')) fields.status = { stringValue: updates.status };
   if (updates.hasOwnProperty('current')) fields.current = { stringValue: updates.current };
   if (updates.hasOwnProperty('continueId')) fields.continueId = { stringValue: updates.continueId };
  // Add more fields as needed

  var doc = { fields: fields };
  // Use mask to ensure partial update behavior if needed, 
  // but PATCH in Firestore REST API usually merges if fields are specified.
  // To be safe and explicit with what we are updating:
  var updateMask = Object.keys(fields).map(function(k) { return 'updateMask.fieldPaths=' + k; }).join('&');
  
  var path = 'syncSessions/' + sessionId;
  if (updateMask) {
    path += '?' + updateMask;
  }
  
  firestoreRequest_('PATCH', path, doc);
  return true;
}

/**
 * Get sync sessions with flexible filtering options
 * @param {Object} options { startDate: Date, limit: number }
 */
function getSyncSessions(options) {
  options = options || {};
  var limit = options.limit || 100;
  
  var query = {
    from: [{ collectionId: 'syncSessions' }],
    orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
    limit: limit
  };

  // Add date filter if provided
  if (options.startDate) {
    query.where = {
      fieldFilter: {
        field: { fieldPath: 'timestamp' },
        op: 'GREATER_THAN_OR_EQUAL',
        value: { stringValue: options.startDate.toISOString() }
      }
    };
  }

  var result = firestoreRequest_('POST', ':runQuery', { structuredQuery: query });
  
  // Handle empty results or errors gracefully
  if (!result || !Array.isArray(result)) return [];
  
  return result
    .filter(function(r) { return r.document; })
    .map(function(r) { return docToSession_(r.document); });
}

function getRecentSyncSessions(limit) {
  limit = limit || 20;
  var result = firestoreRequest_('POST',
    ':runQuery',
    { structuredQuery: { from: [{ collectionId: 'syncSessions' }], orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }], limit: limit } }
  );
  return result.filter(function(r) { return r.document; }).map(function(r) { return docToSession_(r.document); });
}

// ==========================================
// File Logs - Batch Write
// ==========================================

function batchSaveFileLogs(sessionId, fileLogs) {
  var settings = getSettingsFromCache_();
  var projectId = settings.firebaseProjectId || CONFIG.FIRESTORE_PROJECT_ID;
  
  // Construct Base Path for API Call (Full URL)
  var dbRoot = CONFIG.FIRESTORE_BASE_URL + projectId + '/databases/(default)';
  var docRoot = dbRoot + '/documents';
  var batchUrl = docRoot + ':batchWrite';

  // Construct Relative Path for Payload (Must start with "projects/...")
  var relativeDocRoot = 'projects/' + projectId + '/databases/(default)/documents';
  
  // Firestore batch write - max 500 per batch (Firestore limit)
  // We use CONFIG.BATCH_SIZE which should be <= 500
  
  // Split into batches FIRST
  for (var i = 0; i < fileLogs.length; i += CONFIG.BATCH_SIZE) {
    var chunk = fileLogs.slice(i, i + CONFIG.BATCH_SIZE);
    
    // Map chunk to Firestore Write operations
    var writes = chunk.map(function(log) {
      log.id = log.id || generateId();
      log.sessionId = sessionId;
      return {
        update: {
          name: relativeDocRoot + '/fileLogs/' + log.id,
          fields: fileLogToFields_(log),
        },
      };
    });

    // Send Batch Request with Retry Logic
    var maxRetries = CONFIG.MAX_RETRIES;
    var success = false;
    
    for (var attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        var payload = { writes: writes };
        var options = {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        };

        var response = UrlFetchApp.fetch(batchUrl, options);
        var code = response.getResponseCode();
        
        if (code < 400) {
          success = true;
          break; 
        } else {
           Logger.log('Firestore Batch Save Error [' + code + ']: ' + response.getContentText());
           // Retry only on transient errors
           if (code === 429 || code === 500 || code === 503) {
             exponentialBackoff(attempt);
           } else {
             throw new Error('Batch save failed with code ' + code + ': ' + response.getContentText());
           }
        }
      } catch (e) {
        Logger.log('Batch save exception (Attempt ' + (attempt + 1) + '): ' + e.message);
        if (attempt === maxRetries) throw e;
        exponentialBackoff(attempt);
      }
    }
  }
}

function getFileLogsBySession(sessionId) {
  var result = firestoreRequest_('POST',
    ':runQuery',
    { structuredQuery: { from: [{ collectionId: 'fileLogs' }], where: { fieldFilter: { field: { fieldPath: 'sessionId' }, op: 'EQUAL', value: { stringValue: sessionId } } } } }
  );
  return result.filter(function(r) { return r.document; }).map(function(r) { return docToFileLog_(r.document); });
}

// ==========================================
// Settings
// ==========================================

function getSettingsFromDb() {
  // This is the old version, getting Settings from Firestore
  // try {
  //   var result = firestoreRequest_('GET', 'settings/global');
  //   return docToSettings_(result);
  // } catch (e) {
  //   return getDefaultSettings_();
  // }

  // This is the new version, getting Settings from PropertyService
  try {
    var props = PropertiesService.getScriptProperties();
    var saved = props.getProperty('APP_SETTINGS');
    if (saved) return JSON.parse(saved);
    return getDefaultSettings_();
  } catch (e) {
    return getDefaultSettings_();
  }
}

function saveSettingsToDb(settings) {
  // old version, saving to firestore
  // var doc = settingsToDoc_(settings);
  // firestoreRequest_('PATCH', 'settings/global', doc);
  // return settings;

  // This is the new version, saving Settings to PropertyService
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('APP_SETTINGS', JSON.stringify(settings));
    return settings;
  } catch (e) {
    Logger.log('Error saving settings: ' + e.message);
    throw e;
  }
}

// ==========================================
// Dangerous Operations (Reset DB)
// ==========================================

/**
 * Hard delete all data from the database
 * @returns {boolean}
 */
function resetDatabase_() {
  var collections = ['projects', 'syncSessions', 'fileLogs'];
  
  try {
    for (var i = 0; i < collections.length; i++) {
      deleteAllDocumentsInCollection_(collections[i]);
    }
    return true;
  } catch (e) {
    Logger.log('Error resetting database: ' + e.message);
    throw e;
  }
}

/**
 * Delete all documents in a collection using Batch Write
 * @param {string} collectionName
 */
function deleteAllDocumentsInCollection_(collectionName) {
  var settings = getSettingsFromCache_();
  var projectId = settings.firebaseProjectId || CONFIG.FIRESTORE_PROJECT_ID;
  var dbRoot = CONFIG.FIRESTORE_BASE_URL + projectId + '/databases/(default)/documents';
  var batchUrl = dbRoot + ':batchWrite';
  
  var pageToken = null;
  
  do {
    // List documents
    var listUrl = dbRoot + '/' + collectionName + '?pageSize=100'; // Chunk size for read
    if (pageToken) listUrl += '&pageToken=' + pageToken;
    
    var response = UrlFetchApp.fetch(listUrl, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    
    var result = JSON.parse(response.getContentText());
    var docs = result.documents || [];
    pageToken = result.nextPageToken;
    
    if (docs.length === 0) continue;
    
    // Batch Delete
    var writes = docs.map(function(doc) {
      return { delete: doc.name };
    });
    
    var payload = { writes: writes };
    var options = {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var deleteResponse = UrlFetchApp.fetch(batchUrl, options);
    if (deleteResponse.getResponseCode() >= 400) {
      throw new Error('Failed to delete batch in ' + collectionName + ': ' + deleteResponse.getContentText());
    }
    
    Logger.log('Deleted ' + docs.length + ' docs from ' + collectionName);
    
  } while (pageToken);
}

// ==========================================
// Document Converters (Firestore format <-> JS object)
// ==========================================

function docToProject_(doc) {
  var f = doc.fields || {};
  return {
    id: extractDocId_(doc.name),
    name: fv_(f.name),
    description: fv_(f.description) || '',
    sourceFolderId: fv_(f.sourceFolderId),
    sourceFolderLink: fv_(f.sourceFolderLink),
    destFolderId: fv_(f.destFolderId),
    destFolderLink: fv_(f.destFolderLink),
    syncStartDate: fv_(f.syncStartDate), // Add this field
    status: fv_(f.status) || 'active',
    isDeleted: fv_(f.isDeleted) === true || fv_(f.isDeleted) === 'true',
    deletedAt: fv_(f.deletedAt) || null,
    lastSyncTimestamp: fv_(f.lastSyncTimestamp) || null,
    lastSuccessSyncTimestamp: fv_(f.lastSuccessSyncTimestamp) || null, // Add missing field
    nextSyncTimestamp: fv_(f.nextSyncTimestamp) || null, // Add missing field
    lastSyncStatus: fv_(f.lastSyncStatus) || null,
    filesCount: Number(fv_(f.filesCount)) || 0,
    totalSize: Number(fv_(f.totalSize)) || 0, // Add new field
    createdAt: fv_(f.createdAt),
    updatedAt: fv_(f.updatedAt),
  };
}

function projectToDoc_(p) {
  return { fields: {
    name: { stringValue: p.name },
    description: { stringValue: p.description || '' },
    sourceFolderId: { stringValue: p.sourceFolderId },
    sourceFolderLink: { stringValue: p.sourceFolderLink },
    destFolderId: { stringValue: p.destFolderId },
    destFolderLink: { stringValue: p.destFolderLink },
    syncStartDate: p.syncStartDate ? { stringValue: p.syncStartDate } : { nullValue: null }, // Add this field
    status: { stringValue: p.status },
    isDeleted: { booleanValue: !!p.isDeleted },
    deletedAt: p.deletedAt ? { stringValue: p.deletedAt } : { nullValue: null },
    lastSyncTimestamp: p.lastSyncTimestamp ? { stringValue: p.lastSyncTimestamp } : { nullValue: null },
    lastSuccessSyncTimestamp: p.lastSuccessSyncTimestamp ? { stringValue: p.lastSuccessSyncTimestamp } : { nullValue: null }, // Add missing field
    nextSyncTimestamp: p.nextSyncTimestamp ? { stringValue: p.nextSyncTimestamp } : { nullValue: null }, // Add missing field
    lastSyncStatus: p.lastSyncStatus ? { stringValue: p.lastSyncStatus } : { nullValue: null },
    filesCount: { integerValue: String(p.filesCount || 0) },
    totalSize: { integerValue: String(p.totalSize || 0) }, // Add new field
    createdAt: { stringValue: p.createdAt },
    updatedAt: { stringValue: p.updatedAt || getCurrentTimestamp() },
  }};
}

function docToSession_(doc) {
  var f = doc.fields || {};
  return {
    id: extractDocId_(doc.name),
    projectId: fv_(f.projectId),
    projectName: fv_(f.projectName),
    runId: fv_(f.runId),
    timestamp: fv_(f.timestamp),
    executionDurationSeconds: Number(fv_(f.executionDurationSeconds)) || 0,
    status: fv_(f.status),
    filesCount: Number(fv_(f.filesCount)) || 0,
    failedFilesCount: Number(fv_(f.failedFilesCount)) || 0, // Add failedFilesCount
    totalSizeSynced: Number(fv_(f.totalSizeSynced)) || 0, 
    errorMessage: fv_(f.errorMessage) || undefined,
    triggeredBy: fv_(f.triggeredBy) || 'manual',
    current: fv_(f.current) || fv_(f.status), // New field: current status
    continueId: fv_(f.continueId) || null // New field: continueId
  };
}

function sessionToDoc_(s) {
  var fields = {
    projectId: { stringValue: s.projectId },
    projectName: { stringValue: s.projectName },
    runId: { stringValue: s.runId },
    timestamp: { stringValue: s.timestamp },
    executionDurationSeconds: { integerValue: String(s.executionDurationSeconds) },
    status: { stringValue: s.status },
    current: { stringValue: s.current || s.status }, // New field
    filesCount: { integerValue: String(s.filesCount) },
    totalSizeSynced: { integerValue: String(s.totalSizeSynced || 0) },
    failedFilesCount: { integerValue: String(s.failedFilesCount || 0) },
    triggeredBy: { stringValue: s.triggeredBy || 'manual' }
  };
  if (s.errorMessage) fields.errorMessage = { stringValue: s.errorMessage };
  if (s.continueId) fields.continueId = { stringValue: s.continueId }; // New field
  return { fields: fields };
}

function fileLogToFields_(log) {
  return {
    sessionId: { stringValue: log.sessionId },
    fileName: { stringValue: log.fileName },
    sourceLink: { stringValue: log.sourceLink },
    destLink: { stringValue: log.destLink },
    sourcePath: { stringValue: log.sourcePath || '' },
    createdDate: { stringValue: log.createdDate },
    modifiedDate: { stringValue: log.modifiedDate },
    fileSize: { integerValue: String(log.fileSize || 0) },
    status: { stringValue: log.status || 'success' },
    errorMessage: { stringValue: log.errorMessage || '' }
  };
}

function docToFileLog_(doc) {
  var f = doc.fields || {};
  return {
    id: extractDocId_(doc.name),
    sessionId: fv_(f.sessionId),
    fileName: fv_(f.fileName),
    sourceLink: fv_(f.sourceLink),
    destLink: fv_(f.destLink),
    sourcePath: fv_(f.sourcePath) || '',
    createdDate: fv_(f.createdDate),
    modifiedDate: fv_(f.modifiedDate),
    fileSize: Number(fv_(f.fileSize)) || 0,
    status: fv_(f.status) || 'success',
    errorMessage: fv_(f.errorMessage) || ''
  };
}

function docToSettings_(doc) {
  var f = doc.fields || {};
  return {
    syncCutoffSeconds: Number(fv_(f.syncCutoffSeconds)) || 300,
    defaultScheduleCron: fv_(f.defaultScheduleCron) || '0 */6 * * *',
    webhookUrl: fv_(f.webhookUrl) || '',
    firebaseProjectId: fv_(f.firebaseProjectId) || '',
    enableNotifications: fv_(f.enableNotifications) === 'true' || fv_(f.enableNotifications) === true,
    enableAutoSchedule: fv_(f.enableAutoSchedule) === 'true' || fv_(f.enableAutoSchedule) === true,
    maxRetries: Number(fv_(f.maxRetries)) || 3,
    batchSize: Number(fv_(f.batchSize)) || 50,
  };
}

function settingsToDoc_(s) {
  return { fields: {
    syncCutoffSeconds: { integerValue: String(s.syncCutoffSeconds) },
    defaultScheduleCron: { stringValue: s.defaultScheduleCron },
    webhookUrl: { stringValue: s.webhookUrl || '' },
    firebaseProjectId: { stringValue: s.firebaseProjectId || '' },
    enableNotifications: { booleanValue: !!s.enableNotifications },
    enableAutoSchedule: { booleanValue: !!s.enableAutoSchedule },
    maxRetries: { integerValue: String(s.maxRetries) },
    batchSize: { integerValue: String(s.batchSize) },
  }};
}

// Helpers
function fv_(field) {
  if (!field) return null;
  return field.stringValue || field.integerValue || field.booleanValue || field.nullValue || null;
}

function extractDocId_(name) {
  if (!name) return '';
  var parts = name.split('/');
  return parts[parts.length - 1];
}

function getDefaultSettings_() {
  return {
    syncCutoffSeconds: CONFIG.DEFAULT_CUTOFF_SECONDS,
    defaultScheduleCron: '0 */6 * * *',
    webhookUrl: '',
    firebaseProjectId: '',
    enableNotifications: true,
    enableAutoSchedule: true,
    maxRetries: CONFIG.MAX_RETRIES,
    batchSize: CONFIG.BATCH_SIZE,
  };
}

// Cache settings in script properties for performance
var settingsCache_ = null;
function getSettingsFromCache_() {
  if (settingsCache_) return settingsCache_;
  try {
    settingsCache_ = getSettingsFromDb();
  } catch (e) {
    settingsCache_ = getDefaultSettings_();
  }
  return settingsCache_;
}

// ==========================================
// Heartbeat (PropertiesService - Quota-Free)
// ==========================================

/**
 * Save heartbeat for a project (no Firestore quota consumed)
 * @param {string} projectId
 * @param {string} status - 'success' | 'interrupted' | 'error'
 */
function saveProjectHeartbeat_(projectId, status) {
  try {
    var props = PropertiesService.getScriptProperties();
    var heartbeat = {
      lastCheckTimestamp: getCurrentTimestamp(),
      lastStatus: status,
    };
    props.setProperty('HB_' + projectId, JSON.stringify(heartbeat));
  } catch (e) {
    Logger.log('Heartbeat save failed for ' + projectId + ': ' + e.message);
  }
}

/**
 * Get all project heartbeats from PropertiesService
 * @returns {Array} Array of { projectId, lastCheckTimestamp, lastStatus }
 */
function getAllProjectHeartbeats() {
  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    var heartbeats = [];
    for (var key in allProps) {
      if (key.indexOf('HB_') === 0) {
        var projectId = key.substring(3);
        var data = JSON.parse(allProps[key]);
        heartbeats.push({
          projectId: projectId,
          lastCheckTimestamp: data.lastCheckTimestamp,
          lastStatus: data.lastStatus,
        });
      }
    }
    return heartbeats;
  } catch (e) {
    Logger.log('Heartbeat read failed: ' + e.message);
    return [];
  }
}
