// ==========================================
// eravnProjects - API/Controller Layer
// ==========================================
// Entry point and public functions for google.script.run

/**
 * Web App entry point - serves the React UI
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('eravnProjects - Sync Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==========================================
// Project API
// ==========================================

function getProjects() {
  var projects = ProjectService.getAllProjects();
  var stats = ProjectService.getProjectStatsMap();
  
  return projects.map(function(p) {
    if (stats[p.id]) {
      p.stats = stats[p.id];
    } else {
      p.stats = { todayFiles: 0, last7DaysFiles: 0 };
    }
    return p;
  });
}

function getProject(projectId) {
  return ProjectService.getProjectById(projectId);
}

function createProject(projectData) {
  return ProjectService.createProject(projectData);
}

function updateProject(projectData) {
  return ProjectService.updateProject(projectData);
}

function deleteProject(projectId) {
  return ProjectService.deleteProject(projectId);
}

function resetProject(projectId) {
  return ProjectService.resetProject(projectId);
}

// ==========================================
// Sync API
// ==========================================

function runSyncAll() {
  return syncAllProjects({ triggeredBy: 'manual' });
}

function runSyncProject(projectId) {
  return syncProjectById(projectId);
}

// ==========================================
// Settings API
// ==========================================

function getSettings() {
  return getSettingsFromDb();
}

function updateSettings(settingsData) {
  var savedSettings = saveSettingsToDb(settingsData);
  
  // Update or remove time-based trigger based on settings
  try {
    if (typeof TriggerService !== 'undefined') {
      // If auto schedule is enabled, (re)create trigger with current cron
      if (savedSettings.enableAutoSchedule) {
        // Parse minutes from cron string
        var cron = savedSettings.defaultScheduleCron;
        var minutes = 360; // Default 6 hours
        
        if (cron) {
          // Match *\/N * * * * (Minutes)
          var minMatch = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
          if (minMatch) {
            minutes = parseInt(minMatch[1], 10);
          } else {
            // Match 0 *\/N * * * (Hours)
            var hourMatch = cron.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
            if (hourMatch) {
              minutes = parseInt(hourMatch[1], 10) * 60;
            }
          }
        }
        
        if (TriggerService.setupSyncTrigger) {
          TriggerService.setupSyncTrigger(minutes);
        }
      } else {
        // Auto schedule disabled: remove existing triggers
        if (TriggerService.disableSyncTrigger) {
          TriggerService.disableSyncTrigger();
        }
      }
    } else {
      Logger.log('TriggerService not found, skipping trigger update');
    }
  } catch (e) {
    Logger.log('Error updating trigger: ' + e.message);
    // Don't fail the settings save if trigger fails
  }
  
  return savedSettings;
}

// ==========================================
// Logs API
// ==========================================

/*
function getSyncSessions(limit) {
  return getRecentSyncSessions(limit);
}

function getSessionsByProject(projectId) {
  return getSyncSessionsByProject(projectId);
}

function getFileLogs(sessionId) {
  return getFileLogsBySession(sessionId);
}
*/

// ==========================================
// Heartbeat API
// ==========================================

function getProjectHeartbeats() {
  return getAllProjectHeartbeats();
}

// ==========================================
// System API
// ==========================================

function resetDatabase() {
  return resetDatabase_();
}
