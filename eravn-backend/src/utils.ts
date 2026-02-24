// ==========================================
// eravnProjects Backend - Utility Functions
// ==========================================

import { v4 as uuidv4 } from 'uuid';

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
 * Format timestamp for file versioning (YYMMDD_HHmm) using the configured timezone.
 * Example: 2026-02-14 13:58 -> 260214_1358
 * @param date - Date object
 * @param timezone - IANA timezone string, e.g. 'Asia/Ho_Chi_Minh'
 */
export function formatTimestampForFilename(date: Date, timezone: string = 'Asia/Ho_Chi_Minh'): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('year')}${get('month')}${get('day')}_${get('hour')}${get('minute')}`;
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
 * Generate a run ID in format YYMMDD-HHmmss using the configured timezone.
 * @param timezone - IANA timezone string, e.g. 'Asia/Ho_Chi_Minh'
 */
export function generateRunId(timezone: string = 'Asia/Ho_Chi_Minh'): string {
    const now = new Date();
    // Format parts using Intl.DateTimeFormat for accurate timezone conversion
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(now);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
}

/**
 * Get midnight (00:00:00) ISO string in a specific timezone for a given date string (YYYY-MM-DD).
 * Returns UTC ISO string.
 * @param dateStr - Date string in format YYYY-MM-DD
 * @param timezone - IANA timezone string
 */
export function getMidnightInTimezone(dateStr: string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
    // Create a date object at midnight UTC for the given date
    const d = new Date(`${dateStr}T12:00:00Z`); // Use noon to safely get the date parts

    // Get the actual time in that timezone when it is noon UTC
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
    });

    const parts = formatter.formatToParts(d);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    // Create a Date object representing the same values (year, month, day, hour...) but in UTC
    const dInTzAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

    // The difference is the offset (Tz - UTC)
    const offsetMs = dInTzAsUTC - d.getTime();

    // Target midnight UTC value = (Midnight YYYY-MM-DD in UTC) - offset
    const targetMidnightUTC = Date.UTC(
        parseInt(dateStr.split('-')[0]),
        parseInt(dateStr.split('-')[1]) - 1,
        parseInt(dateStr.split('-')[2]),
        0, 0, 0
    );

    return new Date(targetMidnightUTC - offsetMs).toISOString();
}

/**
 * Get today's start (midnight) in a specific timezone, returned as ISO UTC string.
 * Useful for "today" filters that need to be timezone-aware.
 * @param timezone - IANA timezone string, e.g. 'Asia/Ho_Chi_Minh'
 */
export function getTodayStartInTimezone(timezone: string = 'Asia/Ho_Chi_Minh'): string {
    const now = new Date();
    // Get the date parts in the target timezone as YYYY-MM-DD
    const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);

    return getMidnightInTimezone(dateStr, timezone);
}

/**
 * Get a date string (YYYY-MM-DD) in a specific timezone from a Date or ISO string.
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone string
 */
export function getDateStringInTimezone(date: Date | string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}
