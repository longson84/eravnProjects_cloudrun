// ==========================================
// Sync Logs Page - Orchestrator
// ==========================================
// State management & event handlers live here.
// All rendering is delegated to child components.

import { useState, useEffect } from 'react';
import { useSyncLogs, useSyncLogDetails, useContinueSync } from '@/hooks/useSyncLogs';
import { useSettings } from '@/hooks/useSettings';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { StopSyncModal } from '@/components/StopSyncModal';
import type { SyncLogEntry } from '@/types/types';

// Sub-components
import { SyncLogStatsCards } from './synclogs/SyncLogStatsCards';
import { SyncLogFilterBar } from './synclogs/SyncLogFilterBar';
import { SyncLogTable } from './synclogs/SyncLogTable';

export function SyncLogsPage() {
    // ==========================================
    // Filter state
    // ==========================================
    const [daysFilter, setDaysFilter] = useState('1');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [syncedOnly, setSyncedOnly] = useState(false);

    // ==========================================
    // Expansion & continuation tracking
    // ==========================================
    const [expandedSession, setExpandedSession] = useState<{ sessionId: string; projectId: string } | null>(null);
    const [continuedSessions, setContinuedSessions] = useState<Set<string>>(new Set());
    const [stopModal, setStopModal] = useState<{ isOpen: boolean; projectId: string; projectName: string }>({
        isOpen: false, projectId: '', projectName: '',
    });

    // ==========================================
    // Data hooks
    // ==========================================
    const { data: sessions = [], isLoading } = useSyncLogs({
        days: parseInt(daysFilter),
        status: statusFilter,
        search,
    });

    const expandedSessionStatus = sessions.find(
        s => s.sessionId === expandedSession?.sessionId && s.projectId === expandedSession?.projectId
    )?.status;

    const { data: fileLogs, isLoading: loadingDetails } = useSyncLogDetails(
        expandedSession?.sessionId || '',
        expandedSession?.projectId || '',
        !!expandedSession,
        expandedSessionStatus,
    );

    const continueMutation = useContinueSync();
    const { data: settings } = useSettings();
    const { data: projects = [] } = useProjects();
    const { isAdmin } = useAuth();

    // ==========================================
    // Timezone & formatters
    // ==========================================
    const timezone = settings?.timezone || 'Asia/Ho_Chi_Minh';
    const formatTime = (d: string) =>
        new Date(d).toLocaleString('vi-VN', {
            timeZone: timezone,
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'numeric', year: '2-digit',
        });

    // ==========================================
    // Derived data
    // ==========================================
    const sortedSessions = [...sessions]
        .filter(s => !syncedOnly || s.filesCount > 0)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const totalFiles = sortedSessions.reduce((a, s) => a + s.filesCount, 0);
    const avgDur = sortedSessions.length
        ? Math.round(sortedSessions.reduce((a, s) => a + s.duration, 0) / sortedSessions.length)
        : 0;

    // ==========================================
    // Live duration timer for running sessions
    // ==========================================
    const [now, setNow] = useState(Date.now());
    const hasRunning = sessions.some(s => s.status === 'running');

    useEffect(() => {
        if (!hasRunning) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [hasRunning]);

    const getDuration = (session: SyncLogEntry) => {
        if (session.status === 'running') {
            return Math.round((now - new Date(session.startTime).getTime()) / 1000);
        }
        return session.duration;
    };

    // ==========================================
    // Handlers
    // ==========================================
    const handleExpand = (sessionId: string, projectId: string) => {
        if (expandedSession?.sessionId === sessionId && expandedSession?.projectId === projectId) {
            setExpandedSession(null);
        } else {
            setExpandedSession({ sessionId, projectId });
        }
    };

    const handleContinue = (e: React.MouseEvent, session: SyncLogEntry) => {
        e.stopPropagation();
        setContinuedSessions(prev => new Set(prev).add(session.sessionId));
        continueMutation.mutate({ sessionId: session.sessionId, projectId: session.projectId });
    };

    const handleStop = (e: React.MouseEvent, session: SyncLogEntry) => {
        e.stopPropagation();
        setStopModal({ isOpen: true, projectId: session.projectId, projectName: session.projectName });
    };

    const canContinue = (session: SyncLogEntry) => {
        if (!isAdmin) return false;
        if (session.status !== 'error' && session.status !== 'interrupted') return false;
        if (session.continueId) return false;
        if (continuedSessions.has(session.sessionId)) return false;
        const project = projects.find(p => p.id === session.projectId);
        if (project?.isDeleted) return false;
        return true;
    };

    // ==========================================
    // Render
    // ==========================================
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sync Logs</h1>
                <p className="text-muted-foreground mt-1">Lịch sử các phiên đồng bộ và chi tiết file</p>
            </div>

            <SyncLogStatsCards
                sessionCount={sessions.length}
                totalFiles={totalFiles}
                avgDuration={avgDur}
            />

            <SyncLogFilterBar
                daysFilter={daysFilter}
                onDaysFilterChange={setDaysFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                search={search}
                onSearchChange={setSearch}
                syncedOnly={syncedOnly}
                onSyncedOnlyChange={setSyncedOnly}
            />

            <SyncLogTable
                sessions={sortedSessions}
                isLoading={isLoading}
                isAdmin={isAdmin}
                expandedSession={expandedSession}
                onExpand={handleExpand}
                fileLogs={fileLogs}
                loadingDetails={loadingDetails}
                continuedSessions={continuedSessions}
                onContinue={handleContinue}
                onStop={handleStop}
                canContinue={canContinue}
                continuePending={continueMutation.isPending}
                getDuration={getDuration}
                formatTime={formatTime}
            />

            <StopSyncModal
                isOpen={stopModal.isOpen}
                onClose={() => setStopModal(prev => ({ ...prev, isOpen: false }))}
                projectId={stopModal.projectId}
                projectName={stopModal.projectName}
            />
        </div>
    );
}
