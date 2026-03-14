// ==========================================
// SyncLogFilterBar — Time, search, status, synced-only filters
// ==========================================

import { Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Props {
    daysFilter: string;
    onDaysFilterChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
    syncedOnly: boolean;
    onSyncedOnlyChange: (value: boolean) => void;
}

export function SyncLogFilterBar({
    daysFilter,
    onDaysFilterChange,
    statusFilter,
    onStatusFilterChange,
    search,
    onSearchChange,
    syncedOnly,
    onSyncedOnlyChange,
}: Props) {
    return (
        <Card className="p-4">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium">Thời gian:</span>
                    <RadioGroup defaultValue="1" value={daysFilter} onValueChange={onDaysFilterChange} className="flex gap-2">
                        {[
                            { value: '1', label: '1 ngày' },
                            { value: '3', label: '3 ngày' },
                            { value: '7', label: '7 ngày' },
                            { value: '-1', label: 'Tất cả' },
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
                        <Input
                            placeholder="Tìm theo tên dự án hoặc Run ID..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Lọc trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="success">Thành công</SelectItem>
                            <SelectItem value="error">Lỗi</SelectItem>
                            <SelectItem value="interrupted">Gián đoạn</SelectItem>
                            <SelectItem value="running">Đang Sync</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                        <Switch id="synced-filter" checked={syncedOnly} onCheckedChange={onSyncedOnlyChange} />
                        <Label htmlFor="synced-filter" className="text-sm cursor-pointer select-none">Synced</Label>
                    </div>
                </div>
            </div>
        </Card>
    );
}
