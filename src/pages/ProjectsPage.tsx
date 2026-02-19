// ==========================================
// Projects Page - Project Management
// ==========================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    FolderSync,
    ExternalLink,
    Play,
    Pause,
    Pencil,
    Trash2,
    RefreshCw,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2,
    LayoutGrid,
    List,
    Calendar,
    CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Project } from '@/types/types';
import { 
    useProjects, 
    useCreateProject, 
    useUpdateProject, 
    useDeleteProject, 
    useSyncProject, 
    useSyncAllProjects, 
    useResetProject 
} from '@/hooks/useProjects';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';

export function ProjectsPage() {
    const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
    const { data: settings } = useSettings();
    
    const createProjectMutation = useCreateProject();
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();
    const syncProjectMutation = useSyncProject();
    const syncAllMutation = useSyncAllProjects();
    const resetProjectMutation = useResetProject();
    const updateSettingsMutation = useUpdateSettings();

    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    
    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const navigate = useNavigate();
    const [syncResult, setSyncResult] = useState<{
        open: boolean;
        success: boolean;
        message: string;
        stats?: {
            filesCount: number;
            totalSizeSynced: number;
            failedCount: number;
            status: string;
        };
    }>({ open: false, success: false, message: '' });

    // Load view mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('projects_view_mode');
        if (savedMode === 'grid' || savedMode === 'list') {
            setViewMode(savedMode);
        }
    }, []);

    const handleManualSyncConfirmation = async (action: () => Promise<void>) => {
        const confirmed = window.confirm(
            "Khi chủ động sync ở đây, lịch sync định kỳ sẽ tắt. Nếu bạn muốn bật lại sync định kỳ, hãy bật lại trong Settings. Nhấn OK để tiếp tục"
        );
        if (!confirmed) return;

        if (settings?.enableAutoSchedule) {
            try {
                await updateSettingsMutation.mutateAsync({ ...settings, enableAutoSchedule: false });
            } catch (error) {
                console.error("Failed to disable auto schedule:", error);
            }
        }
        
        await action();
    };

    // Save view mode when changed
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('projects_view_mode', mode);
    };

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sourceFolderLink: '',
        destFolderLink: '',
        syncStartDate: new Date().toISOString().split('T')[0], // Default to today YYYY-MM-DD
    });

    const filteredProjects = projects.filter(
        (p) =>
            !p.isDeleted &&
            (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()))
    );

    const extractFolderId = (link: string): string => {
        const match = link.match(/folders\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : link;
    };

    const validateFolderLink = (link: string): boolean => {
        return /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/.test(link) || /^[a-zA-Z0-9_-]{10,}$/.test(link);
    };

    const resetForm = () => {
        setFormData({ 
            name: '', 
            description: '', 
            sourceFolderLink: '', 
            destFolderLink: '',
            syncStartDate: new Date().toISOString().split('T')[0]
        });
        setEditingProject(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (project: Project) => {
        setFormData({
            name: project.name,
            description: project.description,
            sourceFolderLink: project.sourceFolderLink,
            destFolderLink: project.destFolderLink,
            syncStartDate: project.syncStartDate || '',
        });
        setEditingProject(project);
        setIsCreateOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.sourceFolderLink || !formData.destFolderLink) return;
        if (!validateFolderLink(formData.sourceFolderLink) || !validateFolderLink(formData.destFolderLink)) return;

        try {
            const projectData: Partial<Project> = {
                name: formData.name,
                description: formData.description,
                sourceFolderLink: formData.sourceFolderLink,
                sourceFolderId: extractFolderId(formData.sourceFolderLink),
                destFolderLink: formData.destFolderLink,
                destFolderId: extractFolderId(formData.destFolderLink),
                syncStartDate: formData.syncStartDate || undefined, // undefined if empty string
                status: 'active',
            };

            if (editingProject) {
                await updateProjectMutation.mutateAsync({ ...editingProject, ...projectData });
            } else {
                await createProjectMutation.mutateAsync(projectData);
            }

            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            console.error('Failed to save project:', error);
            // Optional: Show error toast here if needed
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
            await deleteProjectMutation.mutateAsync(id);
        }
    };

    const handleReset = async (projectId: string) => {
        if (confirm('Thao tác này sẽ reset lịch sử sync của dự án')) {
            try {
                await resetProjectMutation.mutateAsync(projectId);
            } catch (error) {
                console.error('Failed to reset project:', error);
                alert('Reset dự án thất bại: ' + (error as Error).message);
            }
        }
    };

    const formatBytes = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const handleSync = async (projectId: string) => {
        setSyncingId(projectId);
        try {
            const result = await syncProjectMutation.mutateAsync(projectId);
            
            setSyncResult({
                open: true,
                success: result.success,
                message: result.message,
                stats: result.stats
            });
        } catch (e) {
            setSyncResult({
                open: true,
                success: false,
                message: 'Sync failed: ' + (e as Error).message
            });
        } finally {
            setSyncingId(null);
        }
    };

    const handleSyncAll = async () => {
        try {
            const result = await syncAllMutation.mutateAsync();

            setSyncResult({
                open: true,
                success: result.success,
                message: result.message,
            });
        } catch (e) {
            setSyncResult({
                open: true,
                success: false,
                message: 'Sync All failed: ' + (e as Error).message
            });
        }
    };

    const handleToggleStatus = async (project: Project) => {
        const newStatus = project.status === 'active' ? 'paused' : 'active';
        await updateProjectMutation.mutateAsync({ ...project, status: newStatus });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Chưa có';
        return new Date(dateStr).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'numeric', year: '2-digit'
        });
    };

    const formatDateShort = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: 'numeric', month: 'numeric', year: '2-digit'
        });
    };

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dự án</h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý các cặp thư mục đồng bộ Source → Destination
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-muted rounded-md p-1 border">
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewModeChange('grid')}
                            title="Dạng lưới"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewModeChange('list')}
                            title="Dạng danh sách"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleManualSyncConfirmation(handleSyncAll)}
                        disabled={syncAllMutation.isPending || isProjectsLoading || filteredProjects.length === 0}
                        title="Chạy Sync All cho tất cả dự án (manual)"
                    >
                        {syncAllMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Sync All
                    </Button>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenCreate} className="gap-2">
                                <Plus className="w-4 h-4" /> Thêm dự án
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px]">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
                                </DialogTitle>
                                <DialogDescription>
                                    Cấu hình cặp thư mục Source và Destination cho đồng bộ tự động.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Tên dự án *</Label>
                                    <Input
                                        id="name"
                                        placeholder="VD: Dự án Vinhomes Grand Park"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Mô tả</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Mô tả ngắn gọn về dự án..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="syncStartDate" className="flex items-center gap-2">
                                        Ngày bắt đầu đồng bộ
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">Chỉ đồng bộ các file được tạo hoặc sửa đổi từ ngày này trở đi. Bỏ trống để đồng bộ toàn bộ lịch sử.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </Label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="syncStartDate"
                                            type="date"
                                            className="pl-9"
                                            value={formData.syncStartDate}
                                            onChange={(e) => setFormData({ ...formData, syncStartDate: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Mặc định là hôm nay. Chỉ nên chỉnh sửa nếu bạn muốn đồng bộ dữ liệu cũ hơn.
                                    </p>
                                </div>
                                <Separator />
                                <div className="grid gap-2">
                                    <Label htmlFor="sourceLink">
                                        Source Folder Link *
                                        <span className="text-xs text-muted-foreground ml-2">(Link hoặc ID thư mục đối tác)</span>
                                    </Label>
                                    <Input
                                        id="sourceLink"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={formData.sourceFolderLink}
                                        onChange={(e) => setFormData({ ...formData, sourceFolderLink: e.target.value })}
                                        className={formData.sourceFolderLink && !validateFolderLink(formData.sourceFolderLink) ? 'border-red-500' : ''}
                                    />
                                    {formData.sourceFolderLink && !validateFolderLink(formData.sourceFolderLink) && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Link không hợp lệ
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="destLink">
                                        Destination Folder Link *
                                        <span className="text-xs text-muted-foreground ml-2">(Link thư mục nội bộ)</span>
                                    </Label>
                                    <Input
                                        id="destLink"
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        value={formData.destFolderLink}
                                        onChange={(e) => setFormData({ ...formData, destFolderLink: e.target.value })}
                                        className={formData.destFolderLink && !validateFolderLink(formData.destFolderLink) ? 'border-red-500' : ''}
                                    />
                                    {formData.destFolderLink && !validateFolderLink(formData.destFolderLink) && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Link không hợp lệ
                                        </p>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }} disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!formData.name || !formData.sourceFolderLink || !formData.destFolderLink || createProjectMutation.isPending || updateProjectMutation.isPending}
                                >
                                    {createProjectMutation.isPending || updateProjectMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        editingProject ? 'Cập nhật' : 'Tạo dự án'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm dự án..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Content */}
            {isProjectsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-12">
                    <FolderSync className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Chưa có dự án nào</h3>
                    <p className="text-sm text-muted-foreground mt-1">Thêm dự án mới để bắt đầu đồng bộ</p>
                </Card>
            ) : viewMode === 'grid' ? (
                // GRID VIEW
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProjects.map((project) => (
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
                                        <span className={`font-medium ${
                                            project.lastSyncStatus === 'success' ? 'text-green-600' : 
                                            project.lastSyncStatus === 'error' ? 'text-destructive' : 
                                            project.lastSyncStatus === 'interrupted' ? 'text-orange-500' : ''
                                        }`}>
                                            {
                                                project.lastSyncStatus === 'success' ? 'Thành công' :
                                                project.lastSyncStatus === 'error' ? 'Lỗi' :
                                                project.lastSyncStatus === 'interrupted' ? 'Gián đoạn' : 
                                                project.lastSyncStatus || '-'
                                            }
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
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => handleManualSyncConfirmation(() => handleSync(project.id))}
                                        disabled={syncingId === project.id || project.status === 'paused'}
                                    >
                                        {syncingId === project.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        Sync
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleStatus(project)}
                                        title={project.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
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
                                        onClick={() => handleOpenEdit(project)}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReset(project.id)}
                                        title="Reset lịch sử sync"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reset
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(project.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                // LIST VIEW (Table)
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Dự án</TableHead>
                                {/* <TableHead>Source / Destination</TableHead> */}
                                <TableHead className="w-[130px]">Sync từ</TableHead>
                                <TableHead className="w-[120px]">Hôm nay</TableHead>
                                <TableHead className="w-[120px]">7 ngày</TableHead>
                                <TableHead className="w-[150px]">Sync gần nhất</TableHead>
                                <TableHead className="w-[120px]">Kết quả</TableHead>
                                <TableHead className="w-[200px]">Thành công gần nhất</TableHead>
                                <TableHead className="w-[150px]">Sync tiếp theo</TableHead>
                                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell>
                                        <div className="font-medium">{project.name}</div>
                                    </TableCell>
                                    {/* <TableCell>
                                        <div className="flex flex-col gap-1 text-xs max-w-[200px]">
                                            <a href={project.sourceFolderLink} target="_blank" className="flex items-center gap-1 text-muted-foreground hover:text-primary truncate">
                                                <span className="font-semibold">Nguồn:</span> {project.sourceFolderId}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <a href={project.destFolderLink} target="_blank" className="flex items-center gap-1 text-muted-foreground hover:text-primary truncate">
                                                <span className="font-semibold">Đích:</span> {project.destFolderId}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </TableCell> */}
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
                                        <span className={`font-medium ${
                                            project.lastSyncStatus === 'success' ? 'text-green-600' : 
                                            project.lastSyncStatus === 'error' ? 'text-destructive' : 
                                            project.lastSyncStatus === 'interrupted' ? 'text-orange-500' : ''
                                        }`}>
                                            {
                                                project.lastSyncStatus === 'success' ? 'Thành công' :
                                                project.lastSyncStatus === 'error' ? 'Lỗi' :
                                                project.lastSyncStatus === 'interrupted' ? 'Gián đoạn' : 
                                                project.lastSyncStatus || '-'
                                            }
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs whitespace-nowrap">
                                        {formatDate(project.lastSuccessSyncTimestamp || null)}
                                    </TableCell>
                                    <TableCell className="text-xs whitespace-nowrap">
                                        {formatDate(project.nextSyncTimestamp || null)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleManualSyncConfirmation(() => handleSync(project.id))}
                                                disabled={syncingId === project.id || project.status === 'paused'}
                                                title="Sync"
                                            >
                                                {syncingId === project.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleOpenEdit(project)}
                                                title="Chỉnh sửa"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleReset(project.id)}
                                                title="Reset lịch sử sync"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(project.id)}
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Sync Result Dialog */}
            <Dialog open={syncResult.open} onOpenChange={(open) => setSyncResult(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {syncResult.success ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            {syncResult.success ? 'Sync hoàn tất' : 'Sync thất bại'}
                        </DialogTitle>
                        <DialogDescription>
                            {syncResult.message}
                        </DialogDescription>
                    </DialogHeader>

                    {syncResult.stats && (
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Files synced</span>
                                <span className="text-2xl font-bold">{syncResult.stats.filesCount}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Total Size</span>
                                <span className="text-2xl font-bold">{formatBytes(syncResult.stats.totalSizeSynced)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Errors</span>
                                <span className={`text-2xl font-bold ${syncResult.stats.failedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {syncResult.stats.failedCount}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge variant={syncResult.stats.status === 'success' ? 'default' : 'destructive'} className="w-fit">
                                    {syncResult.stats.status}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSyncResult(prev => ({ ...prev, open: false }))}>
                            Đóng
                        </Button>
                        <Button onClick={() => {
                            setSyncResult(prev => ({ ...prev, open: false }));
                            navigate('/logs');
                        }}>
                            Xem chi tiết
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
