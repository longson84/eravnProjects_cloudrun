import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { Project } from '@/types/types';

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: gasService.getProjects,
        staleTime: 1000 * 60 * 5, // 5 minutes
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
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
