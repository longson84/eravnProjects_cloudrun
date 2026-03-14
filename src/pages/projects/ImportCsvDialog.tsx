// ==========================================
// ImportCsvDialog — Import projects from CSV
// ==========================================

import { useState, useRef, useCallback } from 'react';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle,
    CheckCircle2,
    ExternalLink,
    FileSpreadsheet,
    Loader2,
    Upload,
    XCircle,
    XOctagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { parseCSV, extractFolderId, type ImportRow } from './projectUtils';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateProject: (data: Partial<Project>) => Promise<void>;
}

interface ImportProgress {
    current: number;
    total: number;
    status: 'idle' | 'importing' | 'done' | 'error';
    errors: string[];
}

export function ImportCsvDialog({ open, onOpenChange, onCreateProject }: Props) {
    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [importSyncDate, setImportSyncDate] = useState(new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState<ImportProgress>({
        current: 0, total: 0, status: 'idle', errors: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const rows = parseCSV(text);
            setImportRows(rows);
            setProgress({ current: 0, total: rows.length, status: 'idle', errors: [] });
        };
        reader.readAsText(file);
        e.target.value = '';
    }, []);

    const handleConfirm = async () => {
        if (importRows.length === 0) return;

        setProgress({ current: 0, total: importRows.length, status: 'importing', errors: [] });
        const errors: string[] = [];

        for (let i = 0; i < importRows.length; i++) {
            const row = importRows[i];
            try {
                const projectData: Partial<Project> = {
                    name: row.name,
                    description: '',
                    sourceFolderLink: row.sourceFolderLink,
                    sourceFolderId: extractFolderId(row.sourceFolderLink),
                    destFolderLink: row.destFolderLink,
                    destFolderId: extractFolderId(row.destFolderLink),
                    syncStartDate: importSyncDate || undefined,
                    status: 'active',
                };
                await onCreateProject(projectData);
            } catch (err) {
                errors.push(`#${i + 1} "${row.name}": ${(err as Error).message}`);
            }
            setProgress(prev => ({ ...prev, current: i + 1, errors: [...errors] }));
        }

        setProgress(prev => ({
            ...prev,
            status: errors.length > 0 ? 'error' : 'done',
        }));
    };

    const handleRemoveRow = (index: number) => {
        setImportRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && progress.status === 'importing') return;
        if (newOpen) {
            setImportRows([]);
            setImportSyncDate(new Date().toISOString().split('T')[0]);
            setProgress({ current: 0, total: 0, status: 'idle', errors: [] });
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        Import dự án từ CSV
                    </DialogTitle>
                    <DialogDescription>
                        Tải lên file CSV gồm 3 cột: <strong>Tên Dự án</strong>, <strong>Folder From</strong>, <strong>Folder To</strong>.
                        Chọn ngày bắt đầu sync và xác nhận tạo.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Step 1: File Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">1. Chọn file CSV</Label>
                        <div
                            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click để chọn file CSV</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Hỗ trợ file .csv</p>
                        </div>
                    </div>

                    {/* Preview Table */}
                    {importRows.length > 0 && (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">2. Xem trước ({importRows.length} dự án)</Label>
                                    <Badge variant="secondary" className="text-xs">
                                        {importRows.length} dự án sẽ được tạo
                                    </Badge>
                                </div>
                                <div className="rounded-md border max-h-[280px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[40px] text-center">#</TableHead>
                                                <TableHead>Tên dự án</TableHead>
                                                <TableHead className="w-[100px]">Source</TableHead>
                                                <TableHead className="w-[100px]">Dest</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {importRows.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell className="text-sm font-medium max-w-[250px] truncate">{row.name}</TableCell>
                                                    <TableCell>
                                                        {row.sourceFolderLink ? (
                                                            <a href={row.sourceFolderLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                                                Link <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.destFolderLink ? (
                                                            <a href={row.destFolderLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                                                Link <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {progress.status === 'idle' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleRemoveRow(idx)}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                        {progress.status !== 'idle' && idx < progress.current && (
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                        {progress.status === 'importing' && idx === progress.current && (
                                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Step 2: Sync Start Date */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    3. Ngày bắt đầu sync
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-xs">Tất cả dự án import sẽ dùng chung ngày bắt đầu sync này.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Label>
                                <div className="relative max-w-[220px]">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        className="pl-9"
                                        value={importSyncDate}
                                        onChange={(e) => setImportSyncDate(e.target.value)}
                                        disabled={progress.status !== 'idle'}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Progress & Results */}
                    {progress.status === 'importing' && (
                        <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang import...
                                </span>
                                <span className="text-muted-foreground">
                                    {progress.current} / {progress.total}
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {progress.status === 'done' && (
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    Import thành công {progress.total} dự án!
                                </p>
                            </div>
                        </div>
                    )}

                    {progress.status === 'error' && (
                        <div className="space-y-2">
                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                                <XOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                        Import hoàn tất với {progress.errors.length} lỗi
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Đã tạo thành công {progress.total - progress.errors.length} / {progress.total} dự án.
                                    </p>
                                </div>
                            </div>
                            <div className="max-h-[100px] overflow-y-auto text-xs space-y-1 pl-2">
                                {progress.errors.map((err, i) => (
                                    <p key={i} className="text-destructive">• {err}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {progress.status === 'done' || progress.status === 'error' ? (
                        <Button onClick={() => handleOpenChange(false)}>
                            Đóng
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={progress.status === 'importing'}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={importRows.length === 0 || progress.status === 'importing'}
                                className="gap-2"
                            >
                                {progress.status === 'importing' ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang import...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Bắt đầu Import ({importRows.length})
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
