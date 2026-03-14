// ==========================================
// SyncLogTable — Main sync sessions table
// ==========================================

import {
    ChevronDown,
    ChevronRight,
    RefreshCw,
    Loader2,
    Square,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SyncLogEntry, FileLog } from '@/types/types';
import { formatBytes, statusBadge, currentBadge } from './syncLogUtils';
import { FileDetailPanel } from './FileDetailPanel';

interface Props {
    sessions: SyncLogEntry[];
    isLoading: boolean;
    isAdmin: boolean;
    expandedSession: { sessionId: string; projectId: string } | null;
    onExpand: (sessionId: string, projectId: string) => void;
    fileLogs?: FileLog[];
    loadingDetails: boolean;
    continuedSessions: Set<string>;
    onContinue: (e: React.MouseEvent, session: SyncLogEntry) => void;
    onStop: (e: React.MouseEvent, session: SyncLogEntry) => void;
    canContinue: (session: SyncLogEntry) => boolean;
    continuePending: boolean;
    getDuration: (session: SyncLogEntry) => number;
    formatTime: (d: string) => string;
}

export function SyncLogTable({
    sessions,
    isLoading,
    isAdmin,
    expandedSession,
    onExpand,
    fileLogs,
    loadingDetails,
    continuedSessions,
    onContinue,
    onStop,
    canContinue,
    continuePending,
    getDuration,
    formatTime,
}: Props) {
    const isExpanded = (session: SyncLogEntry) =>
        expandedSession?.sessionId === session.sessionId && expandedSession?.projectId === session.projectId;

    return (
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
                            <TableRow>
                                <TableCell colSpan={13} className="text-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : sessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                                    Không tìm thấy phiên nào
                                </TableCell>
                            </TableRow>
                        ) : sessions.map((session) => (
                            <>
                                <TableRow
                                    key={`${session.sessionId}-${session.projectId}`}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => onExpand(session.sessionId, session.projectId)}
                                >
                                    <TableCell>
                                        {isExpanded(session) ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {session.projectName}
                                        {session.continueId && (
                                            <Badge variant="outline" className="ml-2 text-[10px] h-4">Continue</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {session.runId}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatTime(session.startTime)}</TableCell>
                                    <TableCell className="text-center font-medium text-emerald-600">{session.filesCount}</TableCell>
                                    <TableCell className="text-center font-medium text-destructive">{session.failedCount || 0}</TableCell>
                                    <TableCell className="text-center">{getDuration(session)}s</TableCell>
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
                                        {session.continueId || (continuedSessions.has(session.sessionId) ? (
                                            <span className="text-blue-500 italic">Đang tiếp tục...</span>
                                        ) : '-')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {isAdmin && session.status === 'running' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 text-xs"
                                                    onClick={(e) => onStop(e, session)}
                                                >
                                                    <Square className="w-3 h-3 mr-1" />
                                                    Dừng
                                                </Button>
                                            )}
                                            {canContinue(session) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={(e) => onContinue(e, session)}
                                                    disabled={continuePending}
                                                >
                                                    {continuePending ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-3 h-3 mr-1" />
                                                    )}
                                                    Continue
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                {isExpanded(session) && (
                                    <TableRow>
                                        <TableCell colSpan={13} className="p-0 bg-muted/10">
                                            <FileDetailPanel
                                                error={session.error}
                                                fileLogs={fileLogs}
                                                isLoading={loadingDetails}
                                                formatTime={formatTime}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
