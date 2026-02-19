// ==========================================
// eravnProjects - Drive Service (Infrastructure Layer)
// ==========================================
// Google Drive API v3 wrapper for file operations

/**
 * List files modified/created after a given timestamp in a folder
 * @param {string} folderId - Source folder ID
 * @param {string} sinceTimestamp - ISO timestamp cutoff
 * @returns {Array} Array of file objects
 */
function listModifiedFiles(folderId, sinceTimestamp) {
  var query = "(modifiedTime > '" + sinceTimestamp + "' or createdTime > '" + sinceTimestamp + "') and '" + folderId + "' in parents and trashed = false";
  var files = [];
  var pageToken = null;

  do {
    var response = retryDriveCall_(function() {
      return Drive.Files.list({
        q: query,
        fields: 'nextPageToken,' + CONFIG.DRIVE_FIELDS,
        pageSize: 100,
        pageToken: pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    });

    if (response.files) {
      files = files.concat(response.files);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * List all subfolders in a folder
 * @param {string} folderId
 * @returns {Array} Array of folder objects
 */
function listSubFolders(folderId) {
  var query = "mimeType = '" + CONFIG.FOLDER_MIME_TYPE + "' and '" + folderId + "' in parents and trashed = false";
  var folders = [];
  var pageToken = null;

  do {
    var response = retryDriveCall_(function() {
      return Drive.Files.list({
        q: query,
        fields: 'nextPageToken,files(id,name,mimeType)',
        pageSize: 100,
        pageToken: pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    });

    if (response.files) {
      folders = folders.concat(response.files);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return folders;
}

/**
 * Copy a file to destination folder
 * @param {string} fileId - Source file ID
 * @param {string} destFolderId - Destination folder ID
 * @param {string} fileName - Name for the copy
 * @returns {Object} Copied file object
 */
function copyFileToDest(fileId, destFolderId, fileName) {
  return retryDriveCall_(function() {
    return Drive.Files.copy(
      { name: fileName, parents: [destFolderId] },
      fileId,
      { supportsAllDrives: true, fields: 'id,name,webViewLink' }
    );
  });
}

/**
 * Create a folder in destination
 * @param {string} folderName
 * @param {string} parentFolderId
 * @returns {Object} Created folder
 */
function createFolder(folderName, parentFolderId) {
  return retryDriveCall_(function() {
    return Drive.Files.create(
      { name: folderName, mimeType: CONFIG.FOLDER_MIME_TYPE, parents: [parentFolderId] },
      null,
      { supportsAllDrives: true, fields: 'id,name' }
    );
  });
}

/**
 * Find or create a subfolder by name in parent
 * @param {string} folderName
 * @param {string} parentFolderId
 * @returns {Object} Found or created folder
 */
function findOrCreateFolder(folderName, parentFolderId) {
  var query = "mimeType = '" + CONFIG.FOLDER_MIME_TYPE + "' and name = '" + folderName.replace(/'/g, "\\'") + "' and '" + parentFolderId + "' in parents and trashed = false";

  var response = retryDriveCall_(function() {
    return Drive.Files.list({
      q: query,
      fields: 'files(id,name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  });

  if (response.files && response.files.length > 0) {
    return response.files[0];
  }

  return createFolder(folderName, parentFolderId);
}

/**
 * Find files by name in a folder
 * @param {string} fileName
 * @param {string} parentFolderId
 * @returns {Array} Array of file objects
 */
function findFilesByName(fileName, parentFolderId) {
  var query = "name = '" + fileName.replace(/'/g, "\\'") + "' and '" + parentFolderId + "' in parents and trashed = false";
  
  return retryDriveCall_(function() {
    var response = Drive.Files.list({
      q: query,
      fields: CONFIG.DRIVE_FIELDS,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return response.files || [];
  });
}

/**
 * Trash a file (Soft delete)
 * @param {string} fileId
 */
function trashFile(fileId) {
  return retryDriveCall_(function() {
    Drive.Files.update({ trashed: true }, fileId, { supportsAllDrives: true });
  });
}

/**
 * Retry wrapper for Drive API calls (handles 429 errors)
 * @param {Function} fn - Function to execute
 * @returns {*} Result of the function
 */
function retryDriveCall_(fn) {
  var maxRetries = CONFIG.MAX_RETRIES;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (e) {
      var isRateLimited = e.message && (
        e.message.indexOf('429') !== -1 || 
        e.message.indexOf('Rate Limit') !== -1 ||
        e.message.indexOf('Empty response') !== -1
      );
      if (isRateLimited && attempt < maxRetries) {
        Logger.log('Drive API rate limited. Retry ' + (attempt + 1) + '/' + maxRetries);
        exponentialBackoff(attempt);
      } else {
        throw e;
      }
    }
  }
}
