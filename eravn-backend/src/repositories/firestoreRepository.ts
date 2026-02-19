// ==========================================
// eravnProjects Backend - Firestore Repository
// ==========================================
// Uses @google-cloud/firestore SDK (replaces REST API from GAS)

import { Firestore, FieldValue } from '@google-cloud/firestore';
import { CONFIG } from '../config.js';
import logger from '../logger.js';
import type {
    Project,
    SyncSession,
    FileLog,
    AppSettings,
    ProjectHeartbeat,
} from '../types.js';

// Initialize Firestore (uses ADC on Cloud Run, or GOOGLE_APPLICATION_CREDENTIALS locally)
const db = new Firestore({
    projectId: CONFIG.GCP_PROJECT_ID || undefined,
});

// ==========================================
// Projects Collection
// ==========================================

export async function getAllProjects(): Promise<Project[]> {
    const snapshot = await db.collection('projects').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Project;
}

export async function saveProject(project: Project): Promise<Project> {
    if (!project.id) throw new Error('Cannot save project without ID');
    const { id, ...data } = project;
    await db.collection('projects').doc(id).set(data, { merge: true });
    return project;
}

export async function deleteProjectDoc(projectId: string): Promise<{ success: boolean }> {
    await db.collection('projects').doc(projectId).update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        status: 'paused',
    });
    return { success: true };
}

// ==========================================
// Sync Sessions Collection
// ==========================================

export async function saveSyncSession(session: SyncSession): Promise<SyncSession> {
    const { id, ...data } = session;
    await db.collection('syncSessions').doc(id).set(data);
    return session;
}

export async function getSyncSessionsByProject(projectId: string, limit = 50): Promise<SyncSession[]> {
    const snapshot = await db.collection('syncSessions')
        .where('projectId', '==', projectId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncSession));
}

export async function getPendingSyncSessions(projectId: string): Promise<SyncSession[]> {
    const sessions = await getSyncSessionsByProject(projectId, 20);
    return sessions.filter(s => {
        const isFailed = s.status === 'error' || s.status === 'interrupted';
        const isNotResolved = (s.current || s.status) !== 'success';
        return isFailed && isNotResolved;
    });
}

export async function getSyncSessionById(sessionId: string): Promise<SyncSession | null> {
    const doc = await db.collection('syncSessions').doc(sessionId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SyncSession;
}

export async function updateSyncSession(sessionId: string, updates: Partial<SyncSession>): Promise<boolean> {
    await db.collection('syncSessions').doc(sessionId).update(updates);
    return true;
}

export async function getSyncSessions(options: {
    startDate?: Date;
    limit?: number;
}): Promise<SyncSession[]> {
    let query = db.collection('syncSessions')
        .orderBy('timestamp', 'desc')
        .limit(options.limit || 100);

    if (options.startDate) {
        query = query.where('timestamp', '>=', options.startDate.toISOString()) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncSession));
}

export async function getRecentSyncSessions(limit = 20): Promise<SyncSession[]> {
    const snapshot = await db.collection('syncSessions')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncSession));
}

// ==========================================
// File Logs - Batch Write
// ==========================================

export async function batchSaveFileLogs(sessionId: string, fileLogs: Partial<FileLog>[]): Promise<void> {
    // Firestore batch write - max 500 per batch
    for (let i = 0; i < fileLogs.length; i += CONFIG.BATCH_SIZE) {
        const chunk = fileLogs.slice(i, i + CONFIG.BATCH_SIZE);
        const batch = db.batch();

        for (const log of chunk) {
            const logId = log.id || require('uuid').v4();
            const docRef = db.collection('fileLogs').doc(logId);
            batch.set(docRef, {
                ...log,
                id: logId,
                sessionId,
            });
        }

        await batch.commit();
        logger.info(`Batch saved ${chunk.length} file logs for session ${sessionId}`);
    }
}

export async function getFileLogsBySession(sessionId: string): Promise<FileLog[]> {
    const snapshot = await db.collection('fileLogs')
        .where('sessionId', '==', sessionId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileLog));
}

// ==========================================
// Settings
// ==========================================

export async function getSettingsFromDb(): Promise<AppSettings> {
    try {
        const doc = await db.collection('settings').doc('global').get();
        if (doc.exists) {
            return doc.data() as AppSettings;
        }
        return getDefaultSettings();
    } catch (e) {
        logger.warn('Error reading settings from Firestore, using defaults', { error: (e as Error).message });
        return getDefaultSettings();
    }
}

export async function saveSettingsToDb(settings: AppSettings): Promise<AppSettings> {
    await db.collection('settings').doc('global').set(settings);
    return settings;
}

export function getDefaultSettings(): AppSettings {
    return {
        syncCutoffSeconds: CONFIG.SYNC_CUTOFF_SECONDS,
        defaultScheduleCron: '0 */6 * * *',
        webhookUrl: CONFIG.WEBHOOK_URL,
        firebaseProjectId: CONFIG.GCP_PROJECT_ID,
        enableNotifications: true,
        enableAutoSchedule: true,
        maxRetries: CONFIG.MAX_RETRIES,
        batchSize: CONFIG.BATCH_SIZE,
    };
}

// ==========================================
// Heartbeat (Firestore-based, replaces PropertiesService)
// ==========================================

export async function saveProjectHeartbeat(projectId: string, status: string): Promise<void> {
    try {
        await db.collection('heartbeats').doc(projectId).set({
            lastCheckTimestamp: new Date().toISOString(),
            lastStatus: status,
        });
    } catch (e) {
        logger.warn(`Heartbeat save failed for ${projectId}`, { error: (e as Error).message });
    }
}

export async function getAllProjectHeartbeats(): Promise<ProjectHeartbeat[]> {
    try {
        const snapshot = await db.collection('heartbeats').get();
        return snapshot.docs.map(doc => ({
            projectId: doc.id,
            ...doc.data(),
        } as ProjectHeartbeat));
    } catch (e) {
        logger.warn('Heartbeat read failed', { error: (e as Error).message });
        return [];
    }
}

// ==========================================
// Dangerous Operations (Reset DB)
// ==========================================

export async function resetDatabase(): Promise<boolean> {
    const collections = ['projects', 'syncSessions', 'fileLogs', 'heartbeats'];

    for (const collectionName of collections) {
        await deleteAllDocumentsInCollection(collectionName);
    }

    return true;
}

async function deleteAllDocumentsInCollection(collectionName: string): Promise<void> {
    const batchSize = 100;
    const collectionRef = db.collection(collectionName);

    let snapshot = await collectionRef.limit(batchSize).get();
    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        logger.info(`Deleted ${snapshot.size} docs from ${collectionName}`);
        snapshot = await collectionRef.limit(batchSize).get();
    }
}

// Export the db instance for advanced queries
export { db };
