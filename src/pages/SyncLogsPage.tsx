import { useState } from 'react';
import { ScrollText, Search, Filter, ChevronDown, ChevronRight, FileText, CheckCircle2, XCircle, Timer, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSyncLogs, useSyncLogDetails, useContinueSync } from '@/hooks/useSyncLogs';
import type { SyncLogEntry } from '@/types/types';

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
};

export function SyncLogsPage() {
    const [daysFilter, setDaysFilter] = useState('1');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [expandedSession, setExpandedSession] = useState<{sessionId: string, projectId: string} | null>(null);

    const { data: sessions = [], isLoading } = useSyncLogs({
        days: parseInt(daysFilter),
        status: statusFilter,
        search
    });

    const { data: fileLogs, isLoading: loadingDetails } = useSyncLogDetails(
        expandedSession?.sessionId || '', 
        expandedSession?.projectId || '',
        !!expandedSession
    );

    const continueMutation = useContinueSync();

    const handleExpand = (sessionId: string, projectId: string) => {
        if (expandedSession?.sessionId === sessionId && expandedSession?.projectId === projectId) {
            setExpandedSession(null);
        } else {
            setExpandedSession({ sessionId, projectId });
        }
    };

    const handleContinue = (e: React.MouseEvent, session: SyncLogEntry) => {
        e.stopPropagation();
        // Allow continue even if already continued (just starts a new run)
        continueMutation.mutate({ sessionId: session.sessionId, projectId: session.projectId });
    };

    const fmt = (d: string) => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', year: '2-digit' });
    const fmtSize = (b?: number) => { if (!b) return '—'; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`; return `${(b / 1048576).toFixed(0)} MB`; };

    const sortedSessions = [...sessions].sort((a, b) => {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });

    const currentBadge = (c?: string) => {
        if (!c) return <span className="text-xs text-muted-foreground">—</span>;
        if (c === 'success' || c === 'error' || c === 'interrupted') return statusBadge(c);
        return <span className="text-xs text-muted-foreground">{c}</span>;
    };

    const canContinue = (session: SyncLogEntry) => {
        if (session.status !== 'error' && session.status !== 'interrupted') return false;
        if (session.continueId) return false;
        return true;
    };

    const statusBadge = (s: string) => {
        if (s === 'success') return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Thành công</Badge>;
        if (s === 'error') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Lỗi</Badge>;
        return <Badge variant="warning"><Timer className="w-3 h-3 mr-1" />Gián đoạn</Badge>;
    };

    const totalFiles = sortedSessions.reduce((a, s) => a + s.filesCount, 0);
    const avgDur = sortedSessions.length ? Math.round(sortedSessions.reduce((a, s) => a + s.duration, 0) / sortedSessions.length) : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sync Logs</h1>
                <p className="text-muted-foreground mt-1">Lịch sử các phiên đồng bộ và chi tiết file</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {[{ icon: ScrollText, color: 'blue', val: sessions.length, label: 'Phiên tổng cộng' }, { icon: FileText, color: 'emerald', val: totalFiles, label: 'Files đã xử lý' }, { icon: Clock, color: 'amber', val: `${avgDur}s`, label: 'Thời gian TB / phiên' }].map((c, i) => (
                    <Card key={i}><CardContent className="pt-6"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg bg-${c.color}-500/10`}><c.icon className={`w-4 h-4 text-${c.color}-500`} /></div><div><p className="text-2xl font-bold">{c.val}</p><p className="text-xs text-muted-foreground">{c.label}</p></div></div></CardContent></Card>
                ))}
            </div>

            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-medium">Thời gian:</span>
                        <RadioGroup defaultValue="1" value={daysFilter} onValueChange={setDaysFilter} className="flex gap-2">
                            {[
                                { value: "1", label: "1 ngày" },
                                { value: "3", label: "3 ngày" },
                                { value: "7", label: "7 ngày" },
                                { value: "-1", label: "Tất cả" }
                            ].map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.value} id={`r-${option.value}`} />
                                    <Label htmlFor={`r-${option.value}`}>{option.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Tìm theo tên dự án hoặc Run ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Lọc trạng thái" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="success">Thành công</SelectItem>
                                <SelectItem value="error">Lỗi</SelectItem>
                                <SelectItem value="interrupted">Ngắt</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Dự án</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Vào lúc</TableHead>
                                <TableHead className="text-center">Synced</TableHead>
                                <TableHead className="text-center">Lỗi</TableHead>
                                <TableHead className="text-center">T</TableHead>
                                <TableHead className="text-center">Size</TableHead>
                                <TableHead>Kết quả</TableHead>
                                <TableHead>Hiện tại</TableHead>
                                <TableHead>Trigger</TableHead>
                                <TableHead>Continue</TableHead>
                                <TableHead className="text-right">-</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={12} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : sortedSessions.length === 0 ? (
                                <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Không tìm thấy phiên nào</TableCell></TableRow>
                            ) : sortedSessions.map((session) => (
                                <>
                                    <TableRow key={`${session.sessionId}-${session.projectId}`} className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(session.sessionId, session.projectId)}>
                                        <TableCell>{expandedSession?.sessionId === session.sessionId && expandedSession?.projectId === session.projectId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                                        <TableCell className="font-medium">
                                            {session.projectName}
                                            {session.continueId && <Badge variant="outline" className="ml-2 text-[10px] h-4">Continue</Badge>}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {session.runId}
                                        </TableCell>
                                        <TableCell className="text-sm">{fmt(session.startTime)}</TableCell>
                                        <TableCell className="text-center font-medium text-emerald-600">{session.filesCount}</TableCell>
                                        <TableCell className="text-center font-medium text-destructive">{session.failedCount || 0}</TableCell>
                                        <TableCell className="text-center">{session.duration}s</TableCell>
                                        <TableCell className="text-center text-sm">{formatBytes(session.totalSize || 0)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {statusBadge(session.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {currentBadge(session.current)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {session.triggeredBy === 'scheduled' ? 'Schedule' : 'Manual'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                            {session.continueId || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {canContinue(session) && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-7 text-xs"
                                                    onClick={(e) => handleContinue(e, session)}
                                                    disabled={continueMutation.isPending}
                                                >
                                                    {continueMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                                    Continue
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    {expandedSession?.sessionId === session.sessionId && expandedSession?.projectId === session.projectId && (
                                        <TableRow>
                                            <TableCell colSpan={12} className="p-0 bg-muted/10">
                                                <div className="p-4 border-l-2 border-primary/20 ml-4 my-2 overflow-x-auto">
                                                    <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />Chi tiết file</h3>
                                                    {session.error && (
                                                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                                            <p className="text-sm text-destructive flex items-center gap-2"><XCircle className="w-4 h-4" />{session.error}</p>
                                                        </div>
                                                    )}
                                                    {loadingDetails ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div> : fileLogs?.length ? (
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Tên file</TableHead><TableHead>Thư mục</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Modified</TableHead></TableRow></TableHeader>
                                                            <TableBody>{fileLogs.map(log => (
                                                                <TableRow key={log.id}>
                                                                    <TableCell className="font-medium"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><span>{log.fileName}</span></div></TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">{log.sourcePath.replace(log.fileName, '')}</TableCell>
                                                                    <TableCell className="text-xs">{fmtSize(log.fileSize)}</TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {log.status === 'success' ? <span className="text-emerald-600 font-medium">Thành công</span> :
                                                                         log.status === 'error' ? <span className="text-destructive font-medium">Lỗi</span> :
                                                                         <span className="text-muted-foreground">{log.status}</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">{fmt(log.createdDate)}</TableCell>
                                                                    <TableCell className="text-xs">{fmt(log.modifiedDate)}</TableCell>
                                                                </TableRow>
                                                            ))}</TableBody>
                                                        </Table>
                                                    ) : <p className="text-muted-foreground text-center py-4 text-sm">Không có file log</p>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
