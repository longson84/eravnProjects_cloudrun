// ==========================================
// App Context - Global State Management
// ==========================================

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction } from '@/types/types';

const initialState: AppState = {
    theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as AppState['theme']) || 'dark',
};

function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        default:
            return state;
    }
}

interface AppContextType {
    state: AppState;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Apply theme
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (state.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(state.theme);
        }

        localStorage.setItem('theme', state.theme);
    }, [state.theme]);

    const setTheme = (theme: 'light' | 'dark' | 'system') => {
        dispatch({ type: 'SET_THEME', payload: theme });
    };

    return (
        <AppContext.Provider value={{
            state,
            setTheme,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
