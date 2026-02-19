/**
 * Sync Log Service
 * Handles retrieving and managing sync logs from Firestore via Repository.
 */

// Global exports for Frontend
function getSyncLogs(filters) {
  return SyncLogService.getSyncLogs(filters);
}

function getSyncLogDetails(sessionId, projectId) {
  return SyncLogService.getSyncLogDetails(sessionId, projectId);
}

function continueSync(sessionId, projectId) {
  return SyncLogService.continueSyncProject(sessionId, projectId);
}

var SyncLogService = {
  /**
   * Get sync logs with filters
   * @param {Object} filters { days: number, status?: string, search?: string }
   */
  getSyncLogs: function(filters) {
    var options = {
      limit: 100
    };

    // 1. Calculate Start Date
    if (filters.days && filters.days > 0) {
      var cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.days);
      options.startDate = cutoffDate;
    }
    
    // 2. Fetch from Repository
    // This uses the new getSyncSessions method in FirestoreRepository
    var sessions = getSyncSessions(options);
    var logs = [];

    // 3. Filter in memory (Status & Search) and Map to View Model
    if (sessions && sessions.length > 0) {
      sessions.forEach(function(data) {
        
        // Apply Status Filter
        if (filters.status && filters.status !== 'all' && data.status !== filters.status) {
            return;
        }
        
        // Apply Search Filter
        if (filters.search) {
            var term = filters.search.toLowerCase();
            var match = (data.projectName || '').toLowerCase().indexOf(term) > -1 || 
                        (data.runId || '').toLowerCase().indexOf(term) > -1;
            if (!match) return;
        }
        
        // Map to Log Entry
        logs.push({
            sessionId: data.id,
            projectId: data.projectId,
            projectName: data.projectName,
            runId: data.runId,
            startTime: data.timestamp,
            endTime: data.timestamp, 
            duration: data.executionDurationSeconds,
            status: data.status,
            current: data.current, // New field
            filesCount: data.filesCount,
            failedCount: data.failedFilesCount || 0,
            totalSize: data.totalSizeSynced,
            error: data.errorMessage,
            continueId: data.continueId || null, // New field
            triggeredBy: data.triggeredBy || 'manual'
        });
      });
    }
    
    return logs;
  },

  /**
   * Get detailed file logs for a session
   */
  getSyncLogDetails: function(sessionId, projectId) {
    // Calls Repository directly
    return getFileLogsBySession(sessionId);
  },

  /**
   * Continue a sync project (formerly Retry)
   * Triggers a new sync which will automatically pick up from where it left off
   * if the last session was interrupted/error.
   */
  continueSyncProject: function(sessionId, projectId) {
    try {
      // Just trigger a new sync. 
      // The new syncSingleProject_ logic will automatically detect if the last session 
      // (which is likely this one or a subsequent failed one) needs "Continue".
      
      // We pass 'manual' or 'continue' as triggeredBy? 
      // Spec says: "Người dùng bấm nút Continue... tương tự như retry hiện tại".
      
      // Use the global function defined in Code.gs or SyncService.gs
      if (typeof syncProjectById === 'function') {
         syncProjectById(projectId, { triggeredBy: 'manual' });
      } else {
         throw new Error('Sync function not available');
      }

      return true;
    } catch (e) {
      Logger.log('Continue sync failed: ' + e);
      throw e;
    }
  }
};
