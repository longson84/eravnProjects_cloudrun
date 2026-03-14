// ==========================================
// PassphraseDialog — Admin unlock dialog
// ==========================================

import { useState } from 'react';
import { Lock, LockOpen, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnlock: (passphrase: string) => Promise<boolean>;
}

export function PassphraseDialog({ open, onOpenChange, onUnlock }: Props) {
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState(false);

    const handleUnlock = async () => {
        const success = await onUnlock(passphrase);
        if (success) {
            onOpenChange(false);
            setPassphrase('');
            setError(false);
        } else {
            setError(true);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setPassphrase('');
            setError(false);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Mở khóa Quản trị
                    </DialogTitle>
                    <DialogDescription>
                        Nhập mã quản trị để có thể tạo, sửa, xóa dự án.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="passphrase">Mã quản trị</Label>
                        <Input
                            id="passphrase"
                            type="password"
                            placeholder="Nhập mã..."
                            value={passphrase}
                            onChange={(e) => { setPassphrase(e.target.value); setError(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
                            className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Mã không đúng
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleUnlock} disabled={!passphrase}>
                        <LockOpen className="w-4 h-4 mr-2" />
                        Mở khóa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
