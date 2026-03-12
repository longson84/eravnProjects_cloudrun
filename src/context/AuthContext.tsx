// ==========================================
// Auth Context - Admin Mode via Passphrase
// ==========================================
// Mặc định: mọi người chỉ XEM
// Nhập đúng passphrase → mở khóa Admin Mode (tạo/sửa/xóa)
// Trạng thái lưu trong sessionStorage → đóng tab = mất quyền

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const ADMIN_PASSPHRASE = '123987456';
const STORAGE_KEY = 'admin_unlocked';

interface AuthContextType {
    isAdmin: boolean;
    unlockAdmin: (passphrase: string) => boolean;
    lockAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    });

    const unlockAdmin = useCallback((passphrase: string): boolean => {
        if (passphrase === ADMIN_PASSPHRASE) {
            setIsAdmin(true);
            sessionStorage.setItem(STORAGE_KEY, 'true');
            return true;
        }
        return false;
    }, []);

    const lockAdmin = useCallback(() => {
        setIsAdmin(false);
        sessionStorage.removeItem(STORAGE_KEY);
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
