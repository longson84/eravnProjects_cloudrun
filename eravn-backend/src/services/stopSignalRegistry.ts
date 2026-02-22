// ==========================================
// eravnProjects Backend - Stop Signal Registry
// ==========================================
// In-memory registry for stop sync signals.
// Works when Cloud Run is configured with max-instances=1.

const stopSignals = new Map<string, boolean>();

/** Request a sync stop for a project */
export function requestStop(projectId: string): void {
    stopSignals.set(projectId, true);
}

/** Check if a stop was requested for a project */
export function shouldStop(projectId: string): boolean {
    return stopSignals.has(projectId);
}

/** Clear the stop signal after sync has stopped */
export function clearStop(projectId: string): void {
    stopSignals.delete(projectId);
}
