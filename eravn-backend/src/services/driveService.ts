// ==========================================
// eravnProjects Backend - Drive Service
// ==========================================
// Google Drive API v3 wrapper using googleapis library

import { google, drive_v3 } from 'googleapis';
import { CONFIG } from '../config.js';
import logger from '../logger.js';
import { exponentialBackoff } from '../utils.js';
import type { DriveFile } from '../types.js';

// Initialize Google Drive API with ADC
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

/**
 * List files modified/created after a given timestamp in a folder
 */
export async function listModifiedFiles(folderId: string, sinceTimestamp: string): Promise<DriveFile[]> {
    const query = `(modifiedTime > '${sinceTimestamp}' or createdTime > '${sinceTimestamp}') and '${folderId}' in parents and trashed = false`;
    const files: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
        const response = await retryDriveCall(async () => {
            return drive.files.list({
                q: query,
                fields: `nextPageToken,${CONFIG.DRIVE_FIELDS}`,
                pageSize: 100,
                pageToken,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
        });

        if (response.data.files) {
            files.push(...(response.data.files as DriveFile[]));
        }
        pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return files;
}

/**
 * List all subfolders in a folder
 */
export async function listSubFolders(folderId: string): Promise<DriveFile[]> {
    const query = `mimeType = '${CONFIG.FOLDER_MIME_TYPE}' and '${folderId}' in parents and trashed = false`;
    const folders: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
        const response = await retryDriveCall(async () => {
            return drive.files.list({
                q: query,
                fields: 'nextPageToken,files(id,name,mimeType)',
                pageSize: 100,
                pageToken,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
        });

        if (response.data.files) {
            folders.push(...(response.data.files as DriveFile[]));
        }
        pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return folders;
}

/**
 * Copy a file to destination folder
 */
export async function copyFileToDest(
    fileId: string,
    destFolderId: string,
    fileName: string
): Promise<DriveFile> {
    const response = await retryDriveCall(async () => {
        return drive.files.copy({
            fileId,
            requestBody: {
                name: fileName,
                parents: [destFolderId],
            },
            supportsAllDrives: true,
            fields: 'id,name,webViewLink',
        });
    });
    return response.data as DriveFile;
}

/**
 * Create a folder in destination
 */
export async function createFolder(
    folderName: string,
    parentFolderId: string
): Promise<DriveFile> {
    const response = await retryDriveCall(async () => {
        return drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: CONFIG.FOLDER_MIME_TYPE,
                parents: [parentFolderId],
            },
            supportsAllDrives: true,
            fields: 'id,name',
        });
    });
    return response.data as DriveFile;
}

/**
 * Find or create a subfolder by name in parent
 */
export async function findOrCreateFolder(
    folderName: string,
    parentFolderId: string
): Promise<DriveFile> {
    const escapedName = folderName.replace(/'/g, "\\'");
    const query = `mimeType = '${CONFIG.FOLDER_MIME_TYPE}' and name = '${escapedName}' and '${parentFolderId}' in parents and trashed = false`;

    const response = await retryDriveCall(async () => {
        return drive.files.list({
            q: query,
            fields: 'files(id,name)',
            pageSize: 1,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
    });

    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0] as DriveFile;
    }

    return createFolder(folderName, parentFolderId);
}

/**
 * Find files by name in a folder
 */
export async function findFilesByName(
    fileName: string,
    parentFolderId: string
): Promise<DriveFile[]> {
    const escapedName = fileName.replace(/'/g, "\\'");
    const query = `name = '${escapedName}' and '${parentFolderId}' in parents and trashed = false`;

    const response = await retryDriveCall(async () => {
        return drive.files.list({
            q: query,
            fields: CONFIG.DRIVE_FIELDS,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
    });

    return (response.data.files || []) as DriveFile[];
}

/**
 * Retry wrapper for Drive API calls (handles 429/rate limit/transient errors)
 */
async function retryDriveCall<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            const message = e?.message || '';
            const status = e?.response?.status || e?.code;
            const isRateLimited =
                status === 429 ||
                message.includes('429') ||
                message.includes('Rate Limit') ||
                message.includes('Empty response');

            if (isRateLimited && attempt < CONFIG.MAX_RETRIES) {
                logger.warn(`Drive API rate limited. Retry ${attempt + 1}/${CONFIG.MAX_RETRIES}`);
                await exponentialBackoff(attempt);
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded');
}
