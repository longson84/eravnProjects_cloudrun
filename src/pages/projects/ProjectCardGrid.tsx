// ==========================================
// ProjectCardGrid — Grid view of project cards
// ==========================================

import {
    ExternalLink,
    Play,
    Pause,
    Pencil,
    Trash2,
    RefreshCw,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    Square,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Project } from '@/types/types';
import { getSyncStatusText } from './projectUtils';

interface Props {
    projects: Project[];
    isAdmin: boolean;
    syncingId: string | null;
    stopSyncPending: boolean;
    onSync: (projectId: string) => void;
    onStop: (projectId: string) => void;
    onToggleStatus: (project: Project) => void;
    onEdit: (project: Project) => void;
    onReset: (projectId: string) => void;
    onDelete: (projectId: string) => void;
    formatDate: (dateStr: string | null) => string;
    formatDateShort: (dateStr: string) => string;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Hoạt động</Badge>;
        case 'paused':
            return <Badge variant="warning"><Pause className="w-3 h-3 mr-1" />Tạm dừng</Badge>;
        case 'error':
            return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Lỗi</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

export function ProjectCardGrid({
    projects,
    isAdmin,
    syncingId,
    stopSyncPending,
    onSync,
    onStop,
    onToggleStatus,
    onEdit,
    onReset,
    onDelete,
    formatDate,
    formatDateShort,
}: Props) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
                const syncStatus = getSyncStatusText(project.lastSyncStatus || null);
                return (
                    <Card key={project.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-200">
                        {/* Status indicator stripe */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${project.status === 'active' ? 'bg-emerald-500' :
                            project.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />

                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <CardTitle className="text-base truncate">{project.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                                </div>
                                {getStatusBadge(project.status)}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Folder links */}
                            <div className="space-y-2">
                                <div className="flex items-center text-xs">
                                    <span className="text-muted-foreground w-16 shrink-0">Nguồn:</span>
                                    <a
                                        href={project.sourceFolderLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline truncate flex items-center gap-1 min-w-0 flex-1"
                                    >
                                        {project.sourceFolderId}
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                </div>
                                <div className="flex items-center text-xs">
                                    <span className="text-muted-foreground w-16 shrink-0">Đích:</span>
                                    <a
                                        href={project.destFolderLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline truncate flex items-center gap-1 min-w-0 flex-1"
                                    >
                                        {project.destFolderId}
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                </div>

                                {project.syncStartDate && (
                                    <div className="flex items-center text-xs pt-1">
                                        <span className="text-muted-foreground w-16 shrink-0">Sync từ:</span>
                                        <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDateShort(project.syncStartDate)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Stats */}
                            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                    <span>Sync hôm nay:</span>
                                    <span className="font-medium text-foreground">{project.stats?.todayFiles || 0} files</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Sync 7 ngày:</span>
                                    <span className="font-medium text-foreground">{project.stats?.last7DaysFiles || 0} files</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t mt-1">
                                    <div className="flex items-center gap-1">
                                        <span>Lần sync gần nhất:</span>
                                    </div>
                                    <span>{formatDate(project.lastSyncTimestamp)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Kết quả lần sync gần nhất:</span>
                                    <span className={`font-medium ${syncStatus.className}`}>
                                        {syncStatus.text}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Lần sync thành công gần nhất:</span>
                                    <span>{formatDate(project.lastSuccessSyncTimestamp || null)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Lần sync tiếp theo sẽ từ:</span>
                                    <span>{formatDate(project.nextSyncTimestamp || null)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            {isAdmin && (
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => onSync(project.id)}
                                        disabled={syncingId === project.id || project.status === 'paused' || project.isRunning === true}
                                    >
                                        {syncingId === project.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        Sync
                                    </Button>
                                    {project.isRunning === true && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => onStop(project.id)}
                                            disabled={stopSyncPending}
                                        >
                                            {stopSyncPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Square className="w-3.5 h-3.5" />
                                            )}
                                            Dừng
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onToggleStatus(project)}
                                        title={project.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                                        disabled={project.isRunning === true}
                                    >
                                        {project.status === 'active' ? (
                                            <Pause className="w-3.5 h-3.5" />
                                        ) : (
                                            <Play className="w-3.5 h-3.5" />
                                        )}
                                        Pause
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(project)}
                                        disabled={project.isRunning === true}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onReset(project.id)}
                                        title="Reset lịch sử sync"
                                        disabled={project.isRunning === true}
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reset
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(project.id)}
                                        className="text-destructive hover:text-destructive"
                                        disabled={project.isRunning === true}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
