// ==========================================
// ProjectFormDialog — Create/Edit project
// ==========================================

import { useState, useEffect } from 'react';
import {
    AlertCircle,
    CalendarDays,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Project } from '@/types/types';
import { extractFolderId, validateFolderLink } from './projectUtils';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingProject: Project | null;
    onSubmit: (data: Partial<Project>) => Promise<void>;
    isPending: boolean;
}

export function ProjectFormDialog({ open, onOpenChange, editingProject, onSubmit, isPending }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sourceFolderLink: '',
        destFolderLink: '',
        syncStartDate: new Date().toISOString().split('T')[0],
    });

    // Sync form data when editingProject changes or dialog opens
    useEffect(() => {
        if (open) {
            if (editingProject) {
                setFormData({
                    name: editingProject.name,
                    description: editingProject.description,
                    sourceFolderLink: editingProject.sourceFolderLink,
                    destFolderLink: editingProject.destFolderLink,
                    syncStartDate: editingProject.syncStartDate || '',
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    sourceFolderLink: '',
                    destFolderLink: '',
                    syncStartDate: new Date().toISOString().split('T')[0],
                });
            }
        }
    }, [open, editingProject]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.sourceFolderLink || !formData.destFolderLink) return;
        if (!validateFolderLink(formData.sourceFolderLink) || !validateFolderLink(formData.destFolderLink)) return;

        const projectData: Partial<Project> = {
            name: formData.name,
            description: formData.description,
            sourceFolderLink: formData.sourceFolderLink,
            sourceFolderId: extractFolderId(formData.sourceFolderLink),
            destFolderLink: formData.destFolderLink,
            destFolderId: extractFolderId(formData.destFolderLink),
            syncStartDate: formData.syncStartDate || undefined,
            status: 'active',
        };

        await onSubmit(projectData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.sourceFolderLink || !formData.destFolderLink || isPending}
                    >
                        {isPending ? (
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
    );
}
