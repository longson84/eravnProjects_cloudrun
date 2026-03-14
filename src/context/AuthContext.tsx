// ==========================================
// Auth Context - Admin Mode via Backend Verification
// ==========================================
// Mặc định: mọi người chỉ XEM
// Nhập đúng passphrase → backend verify → nhận token → mở khóa Admin Mode
// Token + trạng thái lưu trong sessionStorage → đóng tab = mất quyền

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { gasService } from '@/services/gasService';

const STORAGE_KEY = 'admin_unlocked';
const TOKEN_KEY = 'admin_token';

interface AuthContextType {
    isAdmin: boolean;
    unlockAdmin: (passphrase: string) => Promise<boolean>;
    lockAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    });

    const unlockAdmin = useCallback(async (passphrase: string): Promise<boolean> => {
        try {
            const token = await gasService.verifyPassphrase(passphrase);
            if (token) {
                setIsAdmin(true);
                sessionStorage.setItem(STORAGE_KEY, 'true');
                sessionStorage.setItem(TOKEN_KEY, token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    const lockAdmin = useCallback(() => {
        setIsAdmin(false);
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
    }, []);

    return (
        <AuthContext.Provider value={{ isAdmin, unlockAdmin, lockAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
