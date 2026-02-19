// ==========================================
// eravnProjects - Dashboard Service
// ==========================================
// Provides aggregated data for the frontend dashboard.

/**
 * Bundles all dashboard data into a single object to optimize API calls.
 * @returns {object} A single object containing all data for the dashboard.
 */
function getDashboardData() {
  return {
    projectSummary: getDashboardProjectSummary_(),
    syncProgress: getDashboardSyncProgress_(),
    syncChart: getDashboardSyncChart_(),
    recentSyncs: getDashboardRecentSyncs_(10),
  };
}

/**
 * Get summary stats for projects.
 * @private
 * @returns {{totalProjects: number, activeProjects: number}}
 */
function getDashboardProjectSummary_() {
  try {
    const projects = ProjectService.getAllProjects();
    const activeProjects = projects.filter(p => p.status === 'active').length;
    return {
      totalProjects: projects.length,
      activeProjects: activeProjects,
    };
  } catch (e) {
    Logger.log('Error in getDashboardProjectSummary: ' + e.message);
    return { totalProjects: 0, activeProjects: 0 };
  }
}

/**
 * Get aggregated sync progress for today and the last 7 days.
 * @private
 * @returns {{today: object, last7Days: object}}
 */
function getDashboardSyncProgress_() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgoStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Query sessions from the last 7 days, which includes today's sessions
    const recentSessions = firestoreRequest_('POST', ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: 'syncSessions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'timestamp' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { stringValue: sevenDaysAgoStart },
          },
        },
      },
    })
    .filter(r => r.document)
    .map(r => docToSession_(r.document));

    const todayStats = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };
    const last7DaysStats = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };

    const todayProjects = new Set();
    const last7DaysProjects = new Set();

    recentSessions.forEach(session => {
      const sessionSize = session.totalSizeSynced || 0;
      const sessionDuration = session.executionDurationSeconds || 0;

      // Aggregate for last 7 days
      last7DaysStats.files += session.filesCount;
      last7DaysStats.size += sessionSize;
      last7DaysStats.duration += sessionDuration;
      last7DaysStats.sessions++;
      if (session.projectId) last7DaysProjects.add(session.projectId);

      // Aggregate for today
      if (session.timestamp >= todayStart) {
        todayStats.files += session.filesCount;
        todayStats.size += sessionSize;
        todayStats.duration += sessionDuration;
        todayStats.sessions++;
        if (session.projectId) todayProjects.add(session.projectId);
      }
    });

    todayStats.projects = todayProjects.size;
    last7DaysStats.projects = last7DaysProjects.size;

    return {
      today: todayStats,
      last7Days: last7DaysStats,
    };
  } catch (e) {
    Logger.log('Error in getDashboardSyncProgress: ' + e.message);
    const emptyStats = { files: 0, size: 0, duration: 0, sessions: 0 };
    return { today: emptyStats, last7Days: emptyStats };
  }
}


/**
 * Get data for the sync chart over the last 10 days.
 * @private
 * @returns {Array<{date: string, filesCount: number, duration: number}>}
 */
function getDashboardSyncChart_() {
  try {
    const now = new Date();
    const tenDaysAgoStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const recentSessions = firestoreRequest_('POST', ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: 'syncSessions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'timestamp' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { stringValue: tenDaysAgoStart },
          },
        },
      },
    })
    .filter(r => r.document)
    .map(r => docToSession_(r.document));

    const dailyData = {};

    // Initialize data for the last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyData[dateString] = { date: dateString, filesCount: 0, duration: 0 };
    }

    recentSessions.forEach(session => {
      const dateString = session.timestamp.split('T')[0];
      if (dailyData[dateString]) {
        dailyData[dateString].filesCount += session.filesCount;
        dailyData[dateString].duration += session.executionDurationSeconds;
      }
    });

    return Object.values(dailyData);
  } catch (e) {
    Logger.log('Error in getDashboardSyncChart: ' + e.message);
    return [];
  }
}

/**
 * Get the most recent sync sessions.
 * This is a wrapper for the existing function for consistency.
 * @private
 * @param {number} limit - The number of sessions to return.
 * @returns {Array<object>}
 */
function getDashboardRecentSyncs_(limit) {
  try {
    // This function already exists in FirestoreRepository, so we just call it.
    return getRecentSyncSessions(limit || 20);
  } catch (e) {
    Logger.log('Error in getDashboardRecentSyncs: ' + e.message);
    return [];
  }
}
