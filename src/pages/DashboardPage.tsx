import { useQuery } from '@tanstack/react-query';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    FileCheck2,
    FolderSync,
    ScrollText,
    Timer,
    TrendingUp,
    XCircle,
} from 'lucide-react';

import { gasService } from '@/services/gasService';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardData, SyncSession } from '@/types/types';
import React from 'react';

// --- Type Definitions ---

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

// --- Helper Functions ---

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(0)} giây`;
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        return `${m} phút`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
};

const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours > 24) return `${Math.floor(diffHours / 24)} ngày trước`;
    if (diffHours > 0) return `${diffHours} giờ trước`;

    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin > 0) return `${diffMin} phút trước`;

    return 'Vài giây trước';
};

const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
        case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'interrupted': return <Timer className="w-4 h-4 text-amber-500" />;
        default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
};


// --- Skeleton Components ---

const StatCardSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
        </CardContent>
    </Card>
);

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-7">
            <Card className="lg:col-span-4">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
            <Card className="lg:col-span-3">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);

// --- UI Components ---

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color, bgColor }) => (
    <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className={`p-2 rounded-lg ${bgColor}`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${bgColor}`} />
    </Card>
);

// --- Main Dashboard Page Component ---

export function DashboardPage() {
    const { data, isLoading, isError, error } = useQuery<DashboardData, Error>({
        queryKey: ['dashboardData'],
        queryFn: gasService.getDashboardData,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-96">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Lỗi tải dữ liệu Dashboard</AlertTitle>
                    <AlertDescription>
                        Không thể tải dữ liệu từ Google Apps Script. Vui lòng thử lại sau.
                        <pre className="mt-2 text-xs bg-muted p-2 rounded">{error?.message}</pre>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!data) {
        return (
             <div className="flex items-center justify-center h-96">
                <Alert className="max-w-lg">
                    <Activity className="h-4 w-4" />
                    <AlertTitle>Không có dữ liệu</AlertTitle>
                    <AlertDescription>
                        Chưa có dữ liệu đồng bộ nào được ghi nhận.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const statCards: StatCardProps[] = [
        {
            title: 'Tổng dự án',
            value: data.projectSummary.totalProjects,
            subtitle: `${data.projectSummary.activeProjects} đang hoạt động`,
            icon: FolderSync,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Hoạt động hôm nay',
            value: `${data.syncProgress.today.files.toLocaleString()} files`,
            subtitle: `${data.syncProgress.today.projects} dự án • ${formatBytes(data.syncProgress.today.size, 0)} • ${formatDuration(data.syncProgress.today.duration)}`,
            icon: FileCheck2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            title: 'Hoạt động 7 ngày',
            value: `${data.syncProgress.last7Days.files.toLocaleString()} files`,
            subtitle: `${data.syncProgress.last7Days.projects} dự án • ${formatBytes(data.syncProgress.last7Days.size, 0)} • ${formatDuration(data.syncProgress.last7Days.duration)}`,
            icon: TrendingUp,
            color: 'text-violet-500',
            bgColor: 'bg-violet-500/10',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Tổng quan hoạt động đồng bộ và hiệu suất hệ thống
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {statCards.map((card) => <StatCard key={card.title} {...card} />)}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Hiệu suất đồng bộ (10 ngày)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.syncChart}>
                                    <defs>
                                        <linearGradient id="colorFiles" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                        </linearGradient>
                                         <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val: string) => val.split('-').slice(1).join('/')}
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                    />
                                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: 'Files', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val: number) => formatDuration(val)} label={{ value: 'Thời gian', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            color: 'hsl(var(--popover-foreground))',
                                        }}
                                        formatter={(value, name) => {
                                            if (name === 'duration') return [formatDuration(value as number), 'Thời gian'];
                                            if (name === 'filesCount') return [(value as number).toLocaleString(), 'Files'];
                                            return [value, name];
                                        }}
                                    />
                                    <Legend />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="filesCount"
                                        stroke="hsl(var(--chart-1))"
                                        fillOpacity={1}
                                        fill="url(#colorFiles)"
                                        name="Số file"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="duration"
                                        stroke="hsl(var(--chart-2))"
                                        fill="url(#colorDuration)"
                                        name="Thời gian"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-primary" />
                            Phiên đồng bộ gần đây
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.recentSyncs.length > 0 ? [...data.recentSyncs]
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .map((session: SyncSession) => (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(session.status)}
                                        <div>
                                            <p className="text-sm font-medium">{session.projectName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {session.filesCount} files • {formatBytes(session.totalSizeSynced)} • {formatDuration(session.executionDurationSeconds)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                session.status === 'success' ? 'success' :
                                                session.status === 'error' ? 'destructive' : 'warning'
                                            }
                                        >
                                            {session.status === 'success' ? 'Thành công' :
                                             session.status === 'error' ? 'Lỗi' : 'Gián đoạn'}
                                        </Badge>
                                        {session.current && (
                                            <Badge
                                                variant={
                                                    session.current === 'success' ? 'success' :
                                                    session.current === 'error' ? 'destructive' : 'warning'
                                                }
                                            >
                                                {session.current === 'success' ? 'Thành công' :
                                                 session.current === 'error' ? 'Lỗi' : 'Gián đoạn'}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {formatTime(session.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-muted-foreground py-8">
                                    Không có phiên đồng bộ nào gần đây.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
