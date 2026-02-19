import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Clock, Database, RotateCcw, CheckCircle2, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAppContext } from '@/context/AppContext';
import { gasService } from '@/services/gasService';
import type { AppSettings } from '@/types/types';
import { useSettings, useUpdateSettings, useResetDatabase } from '@/hooks/useSettings';

export function SettingsPage() {
    const { state, setTheme } = useAppContext();
    const { data: settings, isLoading } = useSettings();
    const updateSettingsMutation = useUpdateSettings();
    const resetDatabaseMutation = useResetDatabase();

    const [form, setForm] = useState<AppSettings>({
        syncCutoffSeconds: 300,
        defaultScheduleCron: '0 */6 * * *',
        webhookUrl: '',
        firebaseProjectId: '',
        enableNotifications: false,
        maxRetries: 3,
        batchSize: 450,
        enableAutoSchedule: true
    });
    
    useEffect(() => {
        if (settings) {
            setForm(settings);
            setScheduleMinutes(cronToMinutes(settings.defaultScheduleCron));
        }
    }, [settings]);

    const [saved, setSaved] = useState(false);
    
    // Reset DB States
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);

    // Cron Helpers
    const cronToMinutes = (cron: string): number => {
        if (!cron) return 360; // Default 6 hours
        // Match */N * * * * (Minutes)
        const minMatch = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
        if (minMatch) return parseInt(minMatch[1], 10);
        
        // Match 0 */N * * * (Hours)
        const hourMatch = cron.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
        if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

        return 360; // Fallback
    };

    const minutesToCron = (minutes: number): string => {
        if (minutes < 60) {
            return `*/${minutes} * * * *`;
        }
        const hours = Math.floor(minutes / 60);
        return `0 */${hours} * * *`;
    };

    const [scheduleMinutes, setScheduleMinutes] = useState(360);

    const handleSave = async () => {
        try {
            // Validate schedule minutes (min 5)
            let finalMinutes = scheduleMinutes;
            if (finalMinutes < 5) {
                finalMinutes = 5;
                setScheduleMinutes(5);
            }

            // Update form with latest minutes value converted to cron
            const updatedForm = {
                ...form,
                defaultScheduleCron: minutesToCron(finalMinutes)
            };
            
            await updateSettingsMutation.mutateAsync(updatedForm);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    const handleReset = () => {
        if (settings) {
            setForm({ ...settings });
            setScheduleMinutes(cronToMinutes(settings.defaultScheduleCron));
        }
    };

    const update = (key: keyof AppSettings, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

    const handleResetDatabase = async () => {
        if (resetConfirmText !== 'I understand') return;
        
        try {
            await resetDatabaseMutation.mutateAsync();
            setIsResetDialogOpen(false);
            setResetConfirmText('');
            // Reload to clear any stale state
            window.location.reload();
        } catch (error) {
            console.error('Reset failed:', error);
            alert('Reset failed. Check console for details.');
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
                    <p className="text-muted-foreground mt-1">Cấu hình hệ thống đồng bộ</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw className="w-4 h-4" />Reset</Button>
                    <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="gap-2">
                        {saved ? <><CheckCircle2 className="w-4 h-4" />Đã lưu</> : updateSettingsMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Đang lưu...</> : <><Save className="w-4 h-4" />Lưu cài đặt</>}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Cấu hình Sync</CardTitle>
                        <CardDescription>Các thông số điều khiển quá trình đồng bộ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cutoff">Sync Cutoff (giây)</Label>
                            <Input id="cutoff" type="number" value={form.syncCutoffSeconds} onChange={e => update('syncCutoffSeconds', Number(e.target.value))} />
                            <p className="text-xs text-muted-foreground">Thời gian tối đa cho mỗi phiên sync. Sau thời gian này, hệ thống sẽ thực hiện Safe Exit.</p>
                        </div>
                        <Separator />
                        <div className="grid gap-2">
                            <Label htmlFor="schedule">Lịch chạy mặc định (Phút)</Label>
                            <Input 
                                id="schedule" 
                                type="number" 
                                min="5"
                                value={scheduleMinutes} 
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setScheduleMinutes(val);
                                    update('defaultScheduleCron', minutesToCron(val));
                                }} 
                            />
                            <p className="text-xs text-muted-foreground">
                                Chu kỳ chạy đồng bộ (tính bằng phút, tối thiểu 5 phút). 
                                {scheduleMinutes >= 60 && ` (~${(scheduleMinutes / 60).toFixed(1)} giờ)`}
                            </p>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Tự động chạy theo lịch</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Khi bật, trigger thời gian sẽ tự động chạy Sync All theo chu kỳ trên.
                                </p>
                            </div>
                            <Switch
                                checked={form.enableAutoSchedule ?? true}
                                onCheckedChange={v => update('enableAutoSchedule', v)}
                            />
                        </div>
                        <Separator />
                        <div className="grid gap-2">
                            <Label htmlFor="retries">Số lần retry tối đa</Label>
                            <Input id="retries" type="number" value={form.maxRetries} onChange={e => update('maxRetries', Number(e.target.value))} />
                            <p className="text-xs text-muted-foreground">Áp dụng khi gặp lỗi Drive API 429 (Too many requests)</p>
                        </div>
                        <Separator />
                        <div className="grid gap-2">
                            <Label htmlFor="batch">Batch size</Label>
                            <Input id="batch" type="number" value={form.batchSize} onChange={e => update('batchSize', Number(e.target.value))} />
                            <p className="text-xs text-muted-foreground">Số file tối đa ghi vào Firestore trong một lần batch write</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Thông báo</CardTitle>
                            <CardDescription>Cấu hình webhook và thông báo</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div><Label>Bật thông báo</Label><p className="text-xs text-muted-foreground mt-0.5">Gửi thông báo qua Google Chat sau mỗi phiên sync</p></div>
                                <Switch checked={form.enableNotifications} onCheckedChange={v => update('enableNotifications', v)} />
                            </div>
                            <Separator />
                            <div className="grid gap-2">
                                <Label htmlFor="webhook">Google Chat Webhook URL</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="webhook" 
                                        value={form.webhookUrl} 
                                        onChange={e => update('webhookUrl', e.target.value)} 
                                        placeholder="https://chat.googleapis.com/v1/spaces/..." 
                                        className="font-mono text-xs flex-1" 
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="icon"
                                        onClick={async () => {
                                            if (!form.webhookUrl) return;
                                            setIsTestingWebhook(true);
                                            try {
                                                await gasService.testWebhook(form.webhookUrl);
                                                alert('Gửi test thành công! Hãy kiểm tra Google Chat.');
                                            } catch (e) {
                                                alert('Gửi thất bại: ' + (e as Error).message);
                                            } finally {
                                                setIsTestingWebhook(false);
                                            }
                                        }}
                                        disabled={!form.webhookUrl || isTestingWebhook}
                                        title="Gửi tin nhắn test"
                                    >
                                        {isTestingWebhook ? <Clock className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-primary" />Firebase</CardTitle>
                            <CardDescription>Kết nối Firestore database</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="fbProject">Firebase Project ID</Label>
                                <Input id="fbProject" value={form.firebaseProjectId} onChange={e => update('firebaseProjectId', e.target.value)} placeholder="my-project-id" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Giao diện</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div><Label>Dark Mode</Label><p className="text-xs text-muted-foreground mt-0.5">Hiện tại: {state.theme}</p></div>
                                <div className="flex gap-1">
                                    {(['light', 'dark', 'system'] as const).map(t => (
                                        <Button key={t} variant={state.theme === t ? 'default' : 'outline'} size="sm" onClick={() => setTheme(t)} className="capitalize">{t}</Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />Danger Zone</CardTitle>
                            <CardDescription>Các thao tác nguy hiểm không thể hoàn tác</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-destructive">Reset Database</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Xóa toàn bộ Projects, Sync Sessions và File Logs.</p>
                                </div>
                                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Reset DB
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Xác nhận Reset Database
                        </DialogTitle>
                        <DialogDescription className="space-y-2 pt-2">
                            <p>Hành động này sẽ <strong>xóa vĩnh viễn</strong> tất cả dữ liệu trong hệ thống bao gồm:</p>
                            <ul className="list-disc list-inside text-sm">
                                <li>Tất cả các Dự án (Projects)</li>
                                <li>Lịch sử Sync (Sessions)</li>
                                <li>Log chi tiết files</li>
                            </ul>
                            <p className="text-destructive font-medium">Hành động này không thể hoàn tác!</p>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="confirm">Nhập "I understand" để xác nhận</Label>
                            <Input 
                                id="confirm" 
                                value={resetConfirmText} 
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                placeholder="I understand"
                                className="border-destructive/50 focus-visible:ring-destructive"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={resetDatabaseMutation.isPending}>Hủy</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleResetDatabase} 
                            disabled={resetConfirmText !== 'I understand' || resetDatabaseMutation.isPending}
                        >
                            {resetDatabaseMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
