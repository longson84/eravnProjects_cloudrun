// ==========================================
// FileDetailPanel — Expanded file details for a session
// ==========================================

import { FileText, XCircle, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FileLog } from '@/types/types';
import { fmtSize } from './syncLogUtils';

interface Props {
    error?: string;
    fileLogs?: FileLog[];
    isLoading: boolean;
    formatTime: (d: string) => string;
}

export function FileDetailPanel({ error, fileLogs, isLoading, formatTime }: Props) {
    return (
        <div className="p-4 border-l-2 border-primary/20 ml-4 my-2 overflow-x-auto">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />Chi tiết file
            </h3>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" />{error}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : fileLogs?.length ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên file</TableHead>
                            <TableHead>Thư mục</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Modified</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fileLogs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span>{log.fileName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {log.sourcePath.replace(log.fileName, '')}
                                </TableCell>
                                <TableCell className="text-xs">{fmtSize(log.fileSize)}</TableCell>
                                <TableCell className="text-xs">
                                    {log.status === 'success' ? (
                                        <span className="text-emerald-600 font-medium">Thành công</span>
                                    ) : log.status === 'error' ? (
                                        <span className="text-destructive font-medium">Lỗi</span>
                                    ) : (
                                        <span className="text-muted-foreground">{log.status}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs">{formatTime(log.createdDate)}</TableCell>
                                <TableCell className="text-xs">{formatTime(log.modifiedDate)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground text-center py-4 text-sm">Không có file log</p>
            )}
        </div>
    );
}
