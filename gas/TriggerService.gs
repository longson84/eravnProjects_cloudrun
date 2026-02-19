/**
 * Trigger Service
 * Manages time-based triggers for background sync
 */

var TriggerService = {
  /**
   * Setup sync trigger based on minutes
   * Enforces minimum 5 minutes interval
   * @param {number} minutes - Schedule interval in minutes
   */
  setupSyncTrigger: function(minutes) {
    // 1. Delete existing triggers for syncAllProjects
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'syncAllProjects') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    // 2. Validate minutes (min 5)
    if (!minutes || minutes < 5) {
      minutes = 5;
    }

    // 3. Create new trigger
    // Google Apps Script limitations: everyMinutes supports 1, 5, 10, 15, 30
    // For other values, we approximate or use hourly
    
    var builder = ScriptApp.newTrigger('syncAllProjects').timeBased();
    
    if (minutes < 60) {
      // Find nearest standard interval: 5, 10, 15, 30
      if (minutes <= 5) {
        builder.everyMinutes(5);
      } else if (minutes <= 10) {
        builder.everyMinutes(10);
      } else if (minutes <= 15) {
        builder.everyMinutes(15);
      } else {
        builder.everyMinutes(30);
      }
    } else {
      // For hours, we can use everyHours(n)
      var hours = Math.round(minutes / 60);
      if (hours < 1) hours = 1;
      builder.everyHours(hours);
    }
    
    builder.create();
    
    Logger.log('Created sync trigger for every ' + minutes + ' minutes (approx)');
  },

  /**
   * Disable sync trigger: remove all triggers for syncAllProjects
   */
  disableSyncTrigger: function() {
    var triggers = ScriptApp.getProjectTriggers();
    var removed = 0;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'syncAllProjects') {
        ScriptApp.deleteTrigger(triggers[i]);
        removed++;
      }
    }
    Logger.log('Disabled syncAllProjects triggers. Removed: ' + removed);
  }
};
