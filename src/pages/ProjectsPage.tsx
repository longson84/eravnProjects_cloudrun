// ==========================================
// Projects Page - Orchestrator
// ==========================================
// State management & event handlers live here.
// All rendering is delegated to child components.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderSync, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StopSyncModal } from '@/components/StopSyncModal';
import type { Project } from '@/types/types';
import {
    useProjects,
    useCreateProject,
    useUpdateProject,
    useDeleteProject,
    useSyncProject,
    useSyncAllProjects,
    useResetProject,
    useStopSync,
} from '@/hooks/useProjects';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';

// Sub-components
import { ProjectsPageHeader } from './projects/ProjectsPageHeader';
import { ProjectCardGrid } from './projects/ProjectCardGrid';
import { ProjectListTable } from './projects/ProjectListTable';
import { ProjectFormDialog } from './projects/ProjectFormDialog';
import { ImportCsvDialog } from './projects/ImportCsvDialog';
import { SyncResultDialog, type SyncResultState } from './projects/SyncResultDialog';
import { PassphraseDialog } from './projects/PassphraseDialog';

export function ProjectsPage() {
    const { isAdmin, unlockAdmin, lockAdmin } = useAuth();
    const navigate = useNavigate();

    // ==========================================
    // Data hooks
    // ==========================================
    const { data: projects = [], isLoading: isProjectsLoading, refetch } = useProjects();
    const { data: settings } = useSettings();

    const createProjectMutation = useCreateProject();
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();
    const syncProjectMutation = useSyncProject();
    const syncAllMutation = useSyncAllProjects();
    const resetProjectMutation = useResetProject();
    const updateSettingsMutation = useUpdateSettings();
    const stopSyncMutation = useStopSync();

    // ==========================================
    // Local state
    // ==========================================
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    // Dialog state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isPassphraseOpen, setIsPassphraseOpen] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResultState>({ open: false, success: false, message: '' });
    const [stopModal, setStopModal] = useState<{ isOpen: boolean; projectId: string; projectName: string }>({
        isOpen: false, projectId: '', projectName: '',
    });

    // ==========================================
    // Derived data
    // ==========================================
    const filteredProjects = projects.filter(
        (p) =>
            !p.isDeleted &&
            (p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.description.toLowerCase().includes(search.toLowerCase()))
    );

    const timezone = settings?.timezone || 'Asia/Ho_Chi_Minh';

    // ==========================================
    // Formatters (depend on timezone)
    // ==========================================
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Chưa có';
        return new Date(dateStr).toLocaleString('vi-VN', {
            timeZone: timezone,
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'numeric', year: '2-digit',
        });
    };

    const formatDateShort = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            timeZone: timezone,
            day: 'numeric', month: 'numeric', year: '2-digit',
        });
    };

    // ==========================================
    // Load view mode from localStorage
    // ==========================================
    useEffect(() => {
        const savedMode = localStorage.getItem('projects_view_mode');
        if (savedMode === 'grid' || savedMode === 'list') {
            setViewMode(savedMode);
        }
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('projects_view_mode', mode);
    };

    // ==========================================
    // Admin handlers
    // ==========================================
    const handleLockToggle = () => {
        if (isAdmin) {
            lockAdmin();
        } else {
            setIsPassphraseOpen(true);
        }
    };

    // ==========================================
    // Manual sync confirmation (disables auto-schedule)
    // ==========================================
    const handleManualSyncConfirmation = async (action: () => Promise<void>) => {
        if (settings?.enableAutoSchedule) {
            try {
                await updateSettingsMutation.mutateAsync({ ...settings, enableAutoSchedule: false });
            } catch (error) {
                console.error('Failed to disable auto schedule:', error);
            }
        }
        await action();
    };

    // ==========================================
    // Project actions
    // ==========================================
    const handleSubmit = async (projectData: Partial<Project>) => {
        try {
            if (editingProject) {
                await updateProjectMutation.mutateAsync({ ...editingProject, ...projectData });
            } else {
                await createProjectMutation.mutateAsync(projectData);
            }
            setIsCreateOpen(false);
            setEditingProject(null);
        } catch (error) {
            console.error('Failed to save project:', error);
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

    const handleSync = async (projectId: string) => {
        setSyncingId(projectId);
        try {
            await syncProjectMutation.mutateAsync(projectId);
            setSyncResult({
                open: true,
                success: true,
                message: 'Tiến trình sync đã bắt đầu. Bạn có thể đóng cửa sổ này và theo dõi tiến trình ở Logs.',
            });
        } catch (e) {
            setSyncResult({
                open: true,
                success: false,
                message: 'Sync failed: ' + (e as Error).message,
            });
        } finally {
            setSyncingId(null);
        }
    };

    const handleStopSync = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setStopModal({ isOpen: true, projectId: project.id, projectName: project.name });
        }
    };

    const handleSyncAll = async () => {
        try {
            const result = await syncAllMutation.mutateAsync();
            setSyncResult({ open: true, success: result.success, message: result.message });
        } catch (e) {
            setSyncResult({ open: true, success: false, message: 'Sync All failed: ' + (e as Error).message });
        }
    };

    const handleToggleStatus = async (project: Project) => {
        const newStatus = project.status === 'active' ? 'paused' : 'active';
        await updateProjectMutation.mutateAsync({ ...project, status: newStatus });
    };

    const handleOpenEdit = (project: Project) => {
        setEditingProject(project);
        setIsCreateOpen(true);
    };

    const handleOpenCreate = () => {
        setEditingProject(null);
        setIsCreateOpen(true);
    };

    const handleCreateProjectForImport = async (data: Partial<Project>) => {
        await createProjectMutation.mutateAsync(data);
    };

    // ==========================================
    // Shared action props for view components
    // ==========================================
    const viewProps = {
        projects: filteredProjects,
        isAdmin,
        syncingId,
        stopSyncPending: stopSyncMutation.isPending,
        onSync: (id: string) => handleManualSyncConfirmation(() => handleSync(id)),
        onStop: handleStopSync,
        onToggleStatus: handleToggleStatus,
        onEdit: handleOpenEdit,
        onReset: handleReset,
        onDelete: handleDelete,
        formatDate,
        formatDateShort,
    };

    // ==========================================
    // Render
    // ==========================================
    return (
        <div className="space-y-6">
            <ProjectsPageHeader
                isAdmin={isAdmin}
                onLockToggle={handleLockToggle}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onSyncAll={() => handleManualSyncConfirmation(handleSyncAll)}
                onImportOpen={() => setIsImportOpen(true)}
                onCreateOpen={handleOpenCreate}
                isSyncAllPending={syncAllMutation.isPending}
                isLoading={isProjectsLoading}
                projectCount={filteredProjects.length}
            />

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
                <ProjectCardGrid {...viewProps} />
            ) : (
                <ProjectListTable {...viewProps} />
            )}

            {/* Modals & Dialogs */}
            <StopSyncModal
                isOpen={stopModal.isOpen}
                onClose={(stopped) => {
                    setStopModal(prev => ({ ...prev, isOpen: false }));
                    if (stopped) refetch();
                }}
                projectId={stopModal.projectId}
                projectName={stopModal.projectName}
            />

            <SyncResultDialog
                syncResult={syncResult}
                onClose={() => setSyncResult(prev => ({ ...prev, open: false }))}
                onViewDetails={() => {
                    setSyncResult(prev => ({ ...prev, open: false }));
                    navigate('/logs');
                }}
            />

            <PassphraseDialog
                open={isPassphraseOpen}
                onOpenChange={setIsPassphraseOpen}
                onUnlock={unlockAdmin}
            />

            <ProjectFormDialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) setEditingProject(null);
                }}
                editingProject={editingProject}
                onSubmit={handleSubmit}
                isPending={createProjectMutation.isPending || updateProjectMutation.isPending}
            />

            <ImportCsvDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onCreateProject={handleCreateProjectForImport}
            />
        </div>
    );
}
