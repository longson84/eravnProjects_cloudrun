// ==========================================
// SyncLogStatsCards — Summary stats cards
// ==========================================

import { ScrollText, FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
    sessionCount: number;
    totalFiles: number;
    avgDuration: number;
}

export function SyncLogStatsCards({ sessionCount, totalFiles, avgDuration }: Props) {
    const cards = [
        { icon: ScrollText, color: 'blue', val: sessionCount, label: 'Phiên tổng cộng' },
        { icon: FileText, color: 'emerald', val: totalFiles, label: 'Files đã xử lý' },
        { icon: Clock, color: 'amber', val: `${avgDuration}s`, label: 'Thời gian TB / phiên' },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((c, i) => (
                <Card key={i}>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-${c.color}-500/10`}>
                                <c.icon className={`w-4 h-4 text-${c.color}-500`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{c.val}</p>
                                <p className="text-xs text-muted-foreground">{c.label}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
