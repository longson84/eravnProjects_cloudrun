import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { Project } from '@/types/types';

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: gasService.getProjects,
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Auto-refresh every 5s when any project has isRunning=true
        refetchInterval: (query) => {
            const data = query.state.data;
            if (Array.isArray(data) && data.some((p: any) => p.isRunning === true)) {
                return 5_000; // 5 seconds if any project is running
            }
            return 30_000; // 30 seconds if no project is running
        },
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (project: Partial<Project>) => gasService.createProject(project),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (project: Partial<Project>) => gasService.updateProject(project),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => gasService.deleteProject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useResetProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => gasService.resetProject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
        },
    });
}

export function useSyncProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => gasService.runSyncProject(id),
        onMutate: (id: string) => {
            // Optimistic update: mark project as running immediately in local cache
            // This gives instant UI feedback (disabled buttons, Stop button appears)
            // without touching DB, so Continue Mode detection is preserved in backend
            queryClient.setQueryData(['projects'], (old: any) =>
                Array.isArray(old)
                    ? old.map((p: any) => p.id === id ? { ...p, isRunning: true } : p)
                    : old
            );
        },
        onSuccess: () => {
            // After API returns, refetch to get real DB state (isRunning set by syncSingleProject)
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            }, 10_000);
        },
        onError: (_err: unknown, id: string) => {
            // Rollback optimistic update on error
            queryClient.setQueryData(['projects'], (old: any) =>
                Array.isArray(old)
                    ? old.map((p: any) => p.id === id ? { ...p, isRunning: false } : p)
                    : old
            );
        },
    });
}

export function useSyncAllProjects() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => gasService.runSyncAll(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        },
    });
}

export function useStopSync() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => gasService.stopSync(projectId),
        onSuccess: () => {
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            }, 1000);
        },
    });
}
