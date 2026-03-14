// ==========================================
// Sync Log Utilities — Shared helpers
// ==========================================

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Timer, Loader2 } from 'lucide-react';

export const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
};

export const fmtSize = (b?: number) => {
    if (!b) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(0)} MB`;
};

export const statusBadge = (s: string) => {
    if (s === 'success') return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Thành công</Badge>;
    if (s === 'error') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Lỗi</Badge>;
    if (s === 'running') return <Badge variant="default" className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Đang Sync</Badge>;
    return <Badge variant="warning"><Timer className="w-3 h-3 mr-1" />Gián đoạn</Badge>;
};

export const currentBadge = (c?: string) => {
    if (!c) return <span className="text-xs text-muted-foreground">—</span>;
    if (c === 'success' || c === 'error' || c === 'interrupted' || c === 'running') return statusBadge(c);
    return <span className="text-xs text-muted-foreground">{c}</span>;
};
