// ==========================================
// ProjectListTable — Table/list view of projects
// ==========================================

import {
    Pencil,
    Trash2,
    RefreshCw,
    RotateCcw,
    Loader2,
    Calendar,
    Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Project } from '@/types/types';
import { getSyncStatusText } from './projectUtils';

interface Props {
    projects: Project[];
    isAdmin: boolean;
    syncingId: string | null;
    stopSyncPending: boolean;
    onSync: (projectId: string) => void;
    onStop: (projectId: string) => void;
    onEdit: (project: Project) => void;
    onReset: (projectId: string) => void;
    onDelete: (projectId: string) => void;
    formatDate: (dateStr: string | null) => string;
    formatDateShort: (dateStr: string) => string;
}

export function ProjectListTable({
    projects,
    isAdmin,
    syncingId,
    stopSyncPending,
    onSync,
    onStop,
    onEdit,
    onReset,
    onDelete,
    formatDate,
    formatDateShort,
}: Props) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Dự án</TableHead>
                        <TableHead className="w-[130px]">Sync từ</TableHead>
                        <TableHead className="w-[120px]">Hôm nay</TableHead>
                        <TableHead className="w-[120px]">7 ngày</TableHead>
                        <TableHead className="w-[150px]">Sync gần nhất</TableHead>
                        <TableHead className="w-[120px]">Kết quả</TableHead>
                        <TableHead className="w-[200px]">Thành công gần nhất</TableHead>
                        <TableHead className="w-[150px]">Sync tiếp theo</TableHead>
                        {isAdmin && <TableHead className="w-[100px] text-right">Thao tác</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map((project) => {
                        const syncStatus = getSyncStatusText(project.lastSyncStatus || null);
                        return (
                            <TableRow key={project.id}>
                                <TableCell>
                                    <div className="font-medium">{project.name}</div>
                                </TableCell>
                                <TableCell>
                                    {project.syncStartDate ? (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDateShort(project.syncStartDate)}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {project.stats?.todayFiles || 0} files
                                </TableCell>
                                <TableCell className="text-xs">
                                    {project.stats?.last7DaysFiles || 0} files
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                    {formatDate(project.lastSyncTimestamp)}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                    <span className={`font-medium ${syncStatus.className}`}>
                                        {syncStatus.text}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                    {formatDate(project.lastSuccessSyncTimestamp || null)}
                                </TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                    {formatDate(project.nextSyncTimestamp || null)}
                                </TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => onSync(project.id)}
                                                disabled={syncingId === project.id || project.status === 'paused' || project.isRunning === true}
                                                title="Sync"
                                            >
                                                {syncingId === project.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                            </Button>
                                            {project.isRunning === true && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => onStop(project.id)}
                                                    disabled={stopSyncPending}
                                                    title="Dừng Sync"
                                                >
                                                    {stopSyncPending ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => onEdit(project)}
                                                title="Chỉnh sửa"
                                                disabled={project.isRunning === true}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => onReset(project.id)}
                                                title="Reset lịch sử sync"
                                                disabled={project.isRunning === true}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => onDelete(project.id)}
                                                title="Xóa"
                                                disabled={project.isRunning === true}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
