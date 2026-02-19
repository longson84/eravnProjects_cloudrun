// ==========================================
// Project Service - Business Logic Layer
// ==========================================
// Handles business rules, validation, and orchestrates data operations for Projects.

var ProjectService = {
  
  /**
   * Get all active (not deleted) projects
   */
  getAllProjects: function() {
    var all = getAllProjects();
    // Filter out soft-deleted projects
    return all.filter(function(p) { return !p.isDeleted; });
  },

  /**
   * Get a project by ID
   */
  getProjectById: function(id) {
    if (!id) throw new Error('Project ID is required');
    var p = getProjectById(id);
    if (p && p.isDeleted) return null; // Treat deleted project as not found
    return p;
  },

  /**
   * Create a new project with validation and default values
   */
  createProject: function(projectData) {
    // 1. Validation
    if (!projectData.name) throw new Error('Tên dự án là bắt buộc');
    
    if (!projectData.sourceFolderId && !projectData.sourceFolderLink) {
      throw new Error('Source folder là bắt buộc');
    }
    
    if (!projectData.destFolderId && !projectData.destFolderLink) {
      throw new Error('Destination folder là bắt buộc');
    }

    // 2. Data Processing / Business Logic
    // Extract folder IDs from links if needed
    if (projectData.sourceFolderLink && !projectData.sourceFolderId) {
      projectData.sourceFolderId = extractFolderIdFromLink(projectData.sourceFolderLink);
    }
    if (projectData.destFolderLink && !projectData.destFolderId) {
      projectData.destFolderId = extractFolderIdFromLink(projectData.destFolderLink);
    }

    // Check for duplicates (same source + dest pair)
    var existingProjects = this.getAllProjects();
    var isDuplicate = existingProjects.some(function(p) {
      return p.sourceFolderId === projectData.sourceFolderId && 
             p.destFolderId === projectData.destFolderId;
    });
    
    if (isDuplicate) {
      throw new Error('Dự án với cặp thư mục Source và Destination này đã tồn tại!');
    }

    // 3. Set Default Values (Business Rules)
    var newProject = {
      id: generateId(), // Generate ID here or let repo do it, but explicit is better in Service
      name: projectData.name,
      description: projectData.description || '',
      sourceFolderId: projectData.sourceFolderId,
      sourceFolderLink: projectData.sourceFolderLink,
      destFolderId: projectData.destFolderId,
      destFolderLink: projectData.destFolderLink,
      syncStartDate: projectData.syncStartDate || null,
      
      // Initial State
      status: 'active',
      filesCount: 0,
      totalSize: 0,
      lastSyncTimestamp: null,
      lastSuccessSyncTimestamp: null,
      nextSyncTimestamp: null, // New field for controlling sync checkpoint
      lastSyncStatus: null,
      
      // Timestamps
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    // 4. Persist
    return saveProject(newProject);
  },

  /**
   * Update an existing project
   */
  updateProject: function(projectData) {
    if (!projectData.id) throw new Error('Project ID là bắt buộc');

    // Get existing project to ensure it exists and merge if necessary
    // For now, we trust the input but ensure updatedAt is refreshed
    
    // Logic: You might want to prevent updating certain fields like ID or createdAt
    projectData.updatedAt = getCurrentTimestamp();
    
    // In a stricter system, we might fetch -> merge -> save.
    // Here we pass through to Repo for PATCH behavior, assuming Repo handles merge or overwrite.
    // Based on existing Repo logic: it sends a PATCH to Firestore.
    
    return saveProject(projectData);
  },

  /**
   * Delete a project
   */
  deleteProject: function(id) {
    if (!id) throw new Error('Project ID là bắt buộc');
    return deleteProjectDoc(id);
  },

  /**
   * Reset a project to force full resync
   * Sets nextSyncTimestamp to null and clears error status
   */
  resetProject: function(id) {
    if (!id) throw new Error('Project ID là bắt buộc');
    var project = getProjectById(id);
    if (!project) throw new Error('Không tìm thấy dự án');
    
    project.nextSyncTimestamp = null;
    project.lastSyncStatus = 'active'; // Clear error/interrupted status
    project.updatedAt = getCurrentTimestamp();
    
    return saveProject(project);
  },

  /**
   * Get project statistics for Today and Last 7 Days.
   * Returns a map: { projectId: { todayFiles: N, last7DaysFiles: M } }
   */
  getProjectStatsMap: function() {
    try {
      var now = new Date();
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      var sevenDaysAgoStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
      var recentSessions = firestoreRequest_('POST', ':runQuery', {
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
      .filter(function(r) { return r.document; })
      .map(function(r) { return docToSession_(r.document); });
  
      var stats = {};
  
      recentSessions.forEach(function(session) {
        if (!stats[session.projectId]) {
          stats[session.projectId] = { todayFiles: 0, last7DaysFiles: 0 };
        }
  
        stats[session.projectId].last7DaysFiles += session.filesCount;
  
        if (session.timestamp >= todayStart) {
          stats[session.projectId].todayFiles += session.filesCount;
        }
      });
  
      return stats;
    } catch (e) {
      Logger.log('Error in getProjectStatsMap: ' + e.message);
      return {};
    }
  }
};

/**
 * Helper to extract ID from Drive Link (moved from Code.gs or kept as util)
 * Assuming this logic was inline or in Utils.gs. If it was inline in Code.gs, we define it here or use Utils.
 * Checking codebase, it seems to be used in Code.gs. We should ensure it's available.
 */
// Removed duplicate function extractFolderIdFromLink. It is already defined in Utils.gs.
