import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { SyncLogFilters } from '@/types/types';

export function useSyncLogs(filters: SyncLogFilters) {
    return useQuery({
        queryKey: ['syncLogs', filters],
        queryFn: () => gasService.getSyncLogs(filters),
        staleTime: 60 * 1000, // 1 minute
        placeholderData: keepPreviousData,
    });
}

export function useSyncLogDetails(sessionId: string, projectId: string, enabled: boolean) {
    return useQuery({
        queryKey: ['syncLogDetails', sessionId, projectId],
        queryFn: () => gasService.getSyncLogDetails(sessionId, projectId),
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
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
