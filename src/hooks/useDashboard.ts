import { useQuery } from '@tanstack/react-query';
import { gasService } from '@/services/gasService';
import type { DashboardData } from '@/types/types';

export function useDashboardData() {
    return useQuery<DashboardData, Error>({
        queryKey: ['dashboardData'],
        queryFn: gasService.getDashboardData,
        staleTime: 30_000,
        refetchInterval: 30_000,
    });
}
