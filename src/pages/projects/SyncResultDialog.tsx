// ==========================================
// SyncResultDialog — Shows sync completion status
// ==========================================

import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes } from './projectUtils';

export interface SyncResultState {
    open: boolean;
    success: boolean;
    message: string;
    stats?: {
        filesCount: number;
        totalSizeSynced: number;
        failedCount: number;
        status: string;
    };
}

interface Props {
    syncResult: SyncResultState;
    onClose: () => void;
    onViewDetails: () => void;
}

export function SyncResultDialog({ syncResult, onClose, onViewDetails }: Props) {
    return (
        <Dialog open={syncResult.open} onOpenChange={(open) => { if (!open) onClose(); }}>
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
                    <Button variant="outline" onClick={onClose}>
                        Đóng
                    </Button>
                    <Button onClick={onViewDetails}>
                        Xem chi tiết
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
