// ==========================================
// Project Utilities - Shared helpers
// ==========================================

import type { Project } from '@/types/types';

// ==========================================
// CSV Parsing
// ==========================================

export interface ImportRow {
    name: string;
    sourceFolderLink: string;
    destFolderLink: string;
}

export function parseCSV(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return []; // header + at least 1 data row

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length >= 3 && fields[0].trim()) {
            rows.push({
                name: fields[0].trim(),
                sourceFolderLink: fields[1].trim(),
                destFolderLink: fields[2].trim(),
            });
        }
    }
    return rows;
}

/** Parse a single CSV line, handling quoted fields */
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}

// ==========================================
// Google Drive Link Parsing
// ==========================================

export const extractGoogleDriveId = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // If user enters ID directly (no / or whitespace)
    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
        return trimmed;
    }

    const patterns = [
        /folders\/([a-zA-Z0-9_-]{10,})/,           // folder
        /file\/d\/([a-zA-Z0-9_-]{10,})/,           // file
        /document\/d\/([a-zA-Z0-9_-]{10,})/,       // google doc
        /spreadsheets\/d\/([a-zA-Z0-9_-]{10,})/,   // sheet
        /presentation\/d\/([a-zA-Z0-9_-]{10,})/,   // slide
        /open\?id=([a-zA-Z0-9_-]{10,})/,           // open?id=
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) return match[1];
    }

    return null;
};

export const extractFolderId = (link: string): string => {
    return extractGoogleDriveId(link) ?? link;
};

export const validateFolderLink = (link: string): boolean => {
    return extractGoogleDriveId(link) !== null;
};

// ==========================================
// Formatting
// ==========================================

export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getStatusBadgeProps = (status: string) => {
    switch (status) {
        case 'active': return { variant: 'success' as const, label: 'Hoạt động', icon: 'check' };
        case 'paused': return { variant: 'warning' as const, label: 'Tạm dừng', icon: 'pause' };
        case 'error': return { variant: 'destructive' as const, label: 'Lỗi', icon: 'x' };
        default: return { variant: 'secondary' as const, label: status, icon: null };
    }
};

export const getSyncStatusText = (status: string | null): { text: string; className: string } => {
    switch (status) {
        case 'success': return { text: 'Thành công', className: 'text-green-600' };
        case 'error': return { text: 'Lỗi', className: 'text-destructive' };
        case 'interrupted': return { text: 'Gián đoạn', className: 'text-orange-500' };
        case 'running': return { text: 'Đang sync...', className: 'text-blue-500' };
        default: return { text: status || '-', className: '' };
    }
};
