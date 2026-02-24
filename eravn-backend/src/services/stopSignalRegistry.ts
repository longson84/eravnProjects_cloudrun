// ==========================================
// eravnProjects Backend - Stop Signal Registry
// ==========================================
// Firestore-based registry for stop sync signals.
// Cho phép gửi stop signal cross-instance (Service ↔ Job).

import { db } from '../repositories/firestoreRepository.js';
import logger from '../logger.js';

const COLLECTION = 'stopSignals';

/** Request a sync stop for a project */
export async function requestStop(projectId: string, projectName: string = 'Unknown'): Promise<void> {
    try {
        await db.collection(COLLECTION).doc(projectId).set({
            requestedAt: new Date().toISOString(),
        });
        logger.info(`${projectName}: Stop signal activated (Written to Firestore)`);
    } catch (e) {
        logger.error(`${projectName}: Failed to activate stop signal, error: ${(e as Error).message}`);
        throw e;
    }
}

/** Check if a stop was requested for a project */
export async function shouldStop(projectId: string, projectName: string = 'Unknown'): Promise<boolean> {
    try {
        const doc = await db.collection(COLLECTION).doc(projectId).get();
        return doc.exists;
    } catch (e) {
        logger.error(`${projectName}: Failed to check stop signal, error: ${(e as Error).message}`);
        return false; // An toàn: nếu lỗi, không dừng
    }
}

/** Clear the stop signal after sync has stopped */
export async function clearStop(projectId: string, projectName: string = 'Unknown'): Promise<void> {
    try {
        await db.collection(COLLECTION).doc(projectId).delete();
        logger.info(`${projectName}: Stop signal cleared from Firestore`);
    } catch (e) {
        logger.error(`${projectName}: Failed to clear stop signal, error: ${(e as Error).message}`);
    }
}
