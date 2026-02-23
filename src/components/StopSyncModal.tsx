import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Square, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStopSync } from '@/hooks/useProjects';
import { gasService } from '@/services/gasService';
import { useQueryClient } from '@tanstack/react-query';

interface StopSyncModalProps {
    isOpen: boolean;
    onClose: (stopped: boolean) => void;
    projectId: string;
    projectName: string;
}

type ModalState = 'confirm' | 'stopping' | 'stopped' | 'error';

export function StopSyncModal({ isOpen, onClose, projectId, projectName }: StopSyncModalProps) {
    const [modalState, setModalState] = useState<ModalState>('confirm');
    const [errorMessage, setErrorMessage] = useState('');
    const stopMutation = useStopSync();
    const queryClient = useQueryClient();

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setModalState('confirm');
            setErrorMessage('');
        }
    }, [isOpen]);

    // Polling logic when in 'stopping' state
    useEffect(() => {
        let interval: any;

        if (modalState === 'stopping' && projectId) {
            interval = setInterval(async () => {
                try {
                    const project = await gasService.getProject(projectId);
                    if (project && project.isRunning === false) {
                        setModalState('stopped');
                        // Invalidate queries to update background UI
                        queryClient.invalidateQueries({ queryKey: ['projects'] });
                        queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error('Polling project status failed:', e);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [modalState, projectId, queryClient]);

    const handleConfirm = async () => {
        setModalState('stopping');
        try {
            await stopMutation.mutateAsync(projectId);
        } catch (e) {
            setModalState('error');
            setErrorMessage((e as Error).message || 'Không thể gửi lệnh dừng.');
        }
    };

    const handleClose = () => {
        onClose(modalState === 'stopped');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing by clicking outside or ESC when stopping
            if (modalState === 'stopping') return;
            if (!open) handleClose();
        }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => {
                if (modalState === 'stopping') e.preventDefault();
            }} onEscapeKeyDown={(e) => {
                if (modalState === 'stopping') e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {modalState === 'confirm' && <Square className="w-5 h-5 text-destructive" />}
                        {modalState === 'stopping' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        {modalState === 'stopped' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {modalState === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        <span>Dừng đồng bộ dự án</span>
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        {projectName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {modalState === 'confirm' && (
                        <p className="text-sm text-muted-foreground">
                            Bạn có chắc muốn dừng tiến trình sync này? Tiến trình sẽ dừng an toàn sau khi hoàn tất file hiện tại.
                        </p>
                    )}
                    {modalState === 'stopping' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-medium">Đang dừng tiến trình an toàn...</p>
                                <p className="text-xs text-muted-foreground mt-1">Vui lòng chờ trong giây lát (thường mất 5-10 giây)</p>
                            </div>
                        </div>
                    )}
                    {modalState === 'stopped' && (
                        <div className="flex flex-col items-center gap-3 py-2 text-emerald-600">
                            <CheckCircle2 className="w-10 h-10" />
                            <p className="text-sm font-semibold">Đã dừng thành công!</p>
                            <p className="text-xs text-muted-foreground">Dự án đã sẵn sàng để tiếp tục hoặc đồng bộ lại.</p>
                        </div>
                    )}
                    {modalState === 'error' && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {errorMessage}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    {modalState === 'confirm' && (
                        <>
                            <Button variant="ghost" onClick={handleClose}>Hủy</Button>
                            <Button variant="destructive" onClick={handleConfirm}>Dừng ngay</Button>
                        </>
                    )}
                    {modalState === 'error' && (
                        <Button variant="outline" onClick={handleClose}>Đóng</Button>
                    )}
                    {modalState === 'stopped' && (
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleClose}>Đóng & Cập nhật</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
