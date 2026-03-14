// ==========================================
// ProjectsPageHeader — Title, admin toggle, action buttons
// ==========================================

import {
    Plus,
    RefreshCw,
    LayoutGrid,
    List,
    Lock,
    LockOpen,
    ShieldCheck,
    Upload,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    isAdmin: boolean;
    onLockToggle: () => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    onSyncAll: () => void;
    onImportOpen: () => void;
    onCreateOpen: () => void;
    isSyncAllPending: boolean;
    isLoading: boolean;
    projectCount: number;
}

export function ProjectsPageHeader({
    isAdmin,
    onLockToggle,
    viewMode,
    onViewModeChange,
    onSyncAll,
    onImportOpen,
    onCreateOpen,
    isSyncAllPending,
    isLoading,
    projectCount,
}: Props) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dự án</h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý các cặp thư mục đồng bộ Source → Destination
                    </p>
                </div>
                {/* Admin Lock/Unlock Toggle */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isAdmin ? 'default' : 'ghost'}
                                size="icon"
                                className={`h-9 w-9 shrink-0 transition-all duration-200 ${
                                    isAdmin
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={onLockToggle}
                            >
                                {isAdmin ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isAdmin ? 'Đang ở chế độ Quản trị — Click để khóa' : 'Mở khóa Quản trị'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {isAdmin && (
                    <Badge variant="success" className="gap-1 text-xs animate-in fade-in slide-in-from-left-2 duration-200">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted rounded-md p-1 border">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewModeChange('grid')}
                        title="Dạng lưới"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewModeChange('list')}
                        title="Dạng danh sách"
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>

                {isAdmin && (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={onSyncAll}
                        disabled={isSyncAllPending || isLoading || projectCount === 0}
                        title="Chạy Sync All cho tất cả dự án (manual)"
                    >
                        {isSyncAllPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Sync All
                    </Button>
                )}

                {isAdmin && (
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={onImportOpen}
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </Button>
                )}

                {isAdmin && (
                    <Button onClick={onCreateOpen} className="gap-2">
                        <Plus className="w-4 h-4" /> Thêm dự án
                    </Button>
                )}
            </div>
        </div>
    );
}
