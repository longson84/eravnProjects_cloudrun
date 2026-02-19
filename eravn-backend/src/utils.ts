// ==========================================
// eravnProjects Backend - Utility Functions
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

/**
 * Generate a unique ID (UUID v4)
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

/**
 * Extract folder ID from Google Drive link
 */
export function extractFolderIdFromLink(link: string): string {
    const match = link.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : link;
}

/**
 * Format timestamp for file versioning (YYMMDD_HHmm)
 * Example: 2026-02-14 13:58 -> 260214_1358
 */
export function formatTimestampForFilename(date: Date): string {
    return format(date, 'yyMMdd_HHmm');
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter
 * @param attempt - Current retry attempt (0-based)
 */
export async function exponentialBackoff(attempt: number): Promise<void> {
    const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
    await sleep(Math.min(waitTime, 30000));
}

/**
 * Generate a run ID in format YYMMDD-HHmmss (Vietnam timezone)
 */
export function generateRunId(): string {
    const now = new Date();
    // Use UTC+7 (Vietnam timezone)
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return format(vnTime, 'yyMMdd-HHmmss');
}
