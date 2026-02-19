// ==========================================
// App Layout - Main Shell
// ==========================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <TooltipProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
                <main className="flex-1 overflow-auto">
                    {/* <div className="container mx-auto p-6 max-w-7xl"> */}
                    <div className="w-full p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
