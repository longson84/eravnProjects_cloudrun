import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { SyncLogFilters } from '@/types/types';

export function useSyncLogs(filters: SyncLogFilters) {
    return useQuery({
        queryKey: ['syncLogs', filters],
        queryFn: () => gasService.getSyncLogs(filters),
        staleTime: 60 * 1000, // 1 minute
        placeholderData: keepPreviousData,
        // Auto-refresh every 15s when there are running sessions
        refetchInterval: (query) => {
            const data = query.state.data;
            if (Array.isArray(data) && data.some((s: any) => s.status === 'running')) {
                return 15_000;
            }
            return false;
        },
    });
}

export function useSyncLogDetails(sessionId: string, projectId: string, enabled: boolean, sessionStatus?: string) {
    return useQuery({
        queryKey: ['syncLogDetails', sessionId, projectId],
        queryFn: () => gasService.getSyncLogDetails(sessionId, projectId),
        enabled,
        staleTime: sessionStatus === 'running' ? 0 : 5 * 60 * 1000, // No stale when running
        // Auto-refresh every 15s when session is running
        refetchInterval: enabled && sessionStatus === 'running' ? 15_000 : false,
    });
}

export function useContinueSync() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, projectId }: { sessionId: string; projectId: string }) =>
            gasService.continueSync(sessionId, projectId),
        onSuccess: () => {
            // Invalidate sync logs to refresh the list (show new session, update old session status)
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
        },
    });
}
