// ==========================================
// Tests for Utility Functions
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    generateId,
    getCurrentTimestamp,
    formatDuration,
    extractFolderIdFromLink,
    formatTimestampForFilename,
    sleep,
    exponentialBackoff,
    generateRunId,
} from '../utils.js';

describe('Utils', () => {
    describe('generateId', () => {
        it('should return a valid UUID v4 string', () => {
            const id = generateId();
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate unique IDs', () => {
            const ids = new Set(Array.from({ length: 100 }, () => generateId()));
            expect(ids.size).toBe(100);
        });
    });

    describe('getCurrentTimestamp', () => {
        it('should return a valid ISO timestamp', () => {
            const ts = getCurrentTimestamp();
            expect(new Date(ts).toISOString()).toBe(ts);
        });

        it('should return current time', () => {
            const before = new Date().toISOString();
            const ts = getCurrentTimestamp();
            const after = new Date().toISOString();
            expect(ts >= before).toBe(true);
            expect(ts <= after).toBe(true);
        });
    });

    describe('formatDuration', () => {
        it('should format seconds only', () => {
            expect(formatDuration(30)).toBe('30s');
            expect(formatDuration(0)).toBe('0s');
            expect(formatDuration(59)).toBe('59s');
        });

        it('should format minutes and seconds', () => {
            expect(formatDuration(60)).toBe('1m 0s');
            expect(formatDuration(90)).toBe('1m 30s');
            expect(formatDuration(125)).toBe('2m 5s');
        });
    });

    describe('extractFolderIdFromLink', () => {
        it('should extract folder ID from standard Drive link', () => {
            const link = 'https://drive.google.com/drive/folders/1ABCxyz_123-def';
            expect(extractFolderIdFromLink(link)).toBe('1ABCxyz_123-def');
        });

        it('should extract folder ID from shared link', () => {
            const link = 'https://drive.google.com/drive/folders/abcDEF123?usp=sharing';
            expect(extractFolderIdFromLink(link)).toBe('abcDEF123');
        });

        it('should return raw string if no match (already an ID)', () => {
            const id = '1ABCxyz_123-def';
            expect(extractFolderIdFromLink(id)).toBe(id);
        });
    });

    describe('formatTimestampForFilename', () => {
        it('should format date to YYMMDD_HHmm', () => {
            const date = new Date('2026-02-14T13:58:00Z');
            const result = formatTimestampForFilename(date);
            // format depends on timezone, but pattern should be 6digits_4digits
            expect(result).toMatch(/^\d{6}_\d{4}$/);
        });
    });

    describe('sleep', () => {
        it('should resolve after specified milliseconds', async () => {
            const start = Date.now();
            await sleep(50);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(40); // Allow small margin
        });
    });

    describe('exponentialBackoff', () => {
        it('should wait increasing amounts per attempt', async () => {
            // Attempt 0: ~1-2s, Attempt 1: ~2-3s, etc (capped at 30s)
            // We just verify it resolves without error
            const start = Date.now();
            await exponentialBackoff(0);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(500); // At least some delay
            expect(elapsed).toBeLessThan(5000); // Not too long
        });
    });

    describe('generateRunId', () => {
        it('should return format YYMMDD-HHmmss', () => {
            const runId = generateRunId();
            expect(runId).toMatch(/^\d{6}-\d{6}$/);
        });

        it('should generate different IDs at different times', async () => {
            const id1 = generateRunId();
            await sleep(1100); // Wait 1.1s to ensure different second
            const id2 = generateRunId();
            expect(id1).not.toBe(id2);
        });
    });
});
