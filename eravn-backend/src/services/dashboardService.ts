// ==========================================
// eravnProjects Backend - Dashboard Service
// ==========================================
// Aggregated data for the frontend dashboard (ported from DashboardService.gs)

import logger from '../logger.js';
import * as projectService from './projectService.js';
import * as repo from '../repositories/firestoreRepository.js';
import type { DashboardData, SyncProgressStats, SyncChartData } from '../types.js';

/**
 * Bundles all dashboard data into a single object
 */
export async function getDashboardData(): Promise<DashboardData> {
    const [projectSummary, syncProgress, syncChart, recentSyncs] = await Promise.all([
        getProjectSummary(),
        getSyncProgress(),
        getSyncChart(),
        repo.getRecentSyncSessions(10),
    ]);

    return { projectSummary, syncProgress, syncChart, recentSyncs };
}

async function getProjectSummary(): Promise<{ totalProjects: number; activeProjects: number }> {
    try {
        const projects = await projectService.getAllProjects();
        const activeProjects = projects.filter(p => p.status === 'active').length;
        return { totalProjects: projects.length, activeProjects };
    } catch (e) {
        logger.error('Error in getProjectSummary', { error: (e as Error).message });
        return { totalProjects: 0, activeProjects: 0 };
    }
}

async function getSyncProgress(): Promise<{ today: SyncProgressStats; last7Days: SyncProgressStats }> {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentSessions = await repo.getSyncSessions({ startDate: sevenDaysAgo });

        const todayStats: SyncProgressStats = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };
        const last7DaysStats: SyncProgressStats = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };

        const todayProjects = new Set<string>();
        const last7DaysProjects = new Set<string>();

        for (const session of recentSessions) {
            last7DaysStats.files += session.filesCount;
            last7DaysStats.size += session.totalSizeSynced || 0;
            last7DaysStats.duration += session.executionDurationSeconds || 0;
            last7DaysStats.sessions++;
            if (session.projectId) last7DaysProjects.add(session.projectId);

            if (session.timestamp >= todayStart) {
                todayStats.files += session.filesCount;
                todayStats.size += session.totalSizeSynced || 0;
                todayStats.duration += session.executionDurationSeconds || 0;
                todayStats.sessions++;
                if (session.projectId) todayProjects.add(session.projectId);
            }
        }

        todayStats.projects = todayProjects.size;
        last7DaysStats.projects = last7DaysProjects.size;

        return { today: todayStats, last7Days: last7DaysStats };
    } catch (e) {
        logger.error('Error in getSyncProgress', { error: (e as Error).message });
        const empty: SyncProgressStats = { files: 0, size: 0, duration: 0, sessions: 0, projects: 0 };
        return { today: empty, last7Days: empty };
    }
}

async function getSyncChart(): Promise<SyncChartData[]> {
    try {
        const now = new Date();
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

        const recentSessions = await repo.getSyncSessions({ startDate: tenDaysAgo });

        const dailyData: Record<string, SyncChartData> = {};

        // Initialize 10 days
        for (let i = 9; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split('T')[0];
            dailyData[dateString] = { date: dateString, filesCount: 0, duration: 0 };
        }

        for (const session of recentSessions) {
            const dateString = session.timestamp.split('T')[0];
            if (dailyData[dateString]) {
                dailyData[dateString].filesCount += session.filesCount;
                dailyData[dateString].duration += session.executionDurationSeconds;
            }
        }

        return Object.values(dailyData);
    } catch (e) {
        logger.error('Error in getSyncChart', { error: (e as Error).message });
        return [];
    }
}
