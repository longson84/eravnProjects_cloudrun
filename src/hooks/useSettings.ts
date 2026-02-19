import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { AppSettings } from '@/types/types';

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: gasService.getSettings,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (settings: Partial<AppSettings>) => gasService.updateSettings(settings),
        onSuccess: (newSettings) => {
            queryClient.setQueryData(['settings'], newSettings);
            // Optionally invalidate if you want to refetch
            // queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}

export function useResetDatabase() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => gasService.resetDatabase(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            // Settings might be reset too? If so, invalidate settings.
            // Usually resetDatabase clears data, but settings might persist or reset to default.
            // Assuming settings might be reset or irrelevant.
        },
    });
}
