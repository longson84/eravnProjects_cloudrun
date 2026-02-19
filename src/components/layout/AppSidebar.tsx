// ==========================================
// App Sidebar Navigation
// ==========================================

import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderSync,
    ScrollText,
    Settings,
    Zap,
    Moon,
    Sun,
    Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderSync, label: 'Dự án' },
    { to: '/logs', icon: ScrollText, label: 'Sync Logs' },
    { to: '/settings', icon: Settings, label: 'Cài đặt' },
];

interface AppSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
    const { state, setTheme } = useAppContext();

    const cycleTheme = () => {
        const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(state.theme);
        setTheme(themes[(currentIndex + 1) % themes.length]);
    };

    const ThemeIcon = state.theme === 'dark' ? Moon : state.theme === 'light' ? Sun : Monitor;

    return (
        <aside
            className={cn(
                "flex flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-300 h-screen sticky top-0",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 h-16">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
                    <Zap className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate">eravnProjects</span>
                        <span className="text-xs text-muted-foreground truncate">Sync Manager</span>
                    </div>
                )}
            </div>

            <Separator />

            {/* Navigation */}
            <ScrollArea className="flex-1 py-4">
                <nav className="flex flex-col gap-1 px-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground/70",
                                    isCollapsed && "justify-center px-2"
                                )
                            }
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t">
                <div className={cn("flex gap-1", isCollapsed ? "flex-col items-center" : "items-center")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={cycleTheme}
                        className="h-8 w-8 shrink-0"
                        title={`Theme: ${state.theme}`}
                    >
                        <ThemeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="h-8 w-8 shrink-0"
                        title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn("transition-transform", isCollapsed && "rotate-180")}
                        >
                            <path d="m11 17-5-5 5-5" />
                            <path d="m18 17-5-5 5-5" />
                        </svg>
                    </Button>
                </div>
            </div>
        </aside>
    );
}
