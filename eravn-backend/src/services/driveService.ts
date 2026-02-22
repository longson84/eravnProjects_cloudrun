// ==========================================
// eravnProjects Backend - Drive Service
// ==========================================
// Google Drive API v3 wrapper using googleapis library

import { google } from 'googleapis';
import { CONFIG } from '../config.js';
import logger from '../logger.js';
import { exponentialBackoff } from '../utils.js';
import type { DriveFile } from '../types.js';

// Initialize Google Drive API with OAuth2 Refresh Token
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
    logger.error('MISSING OAuth2 credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.');
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
oauth2Client.setCredentials({ refresh_token: refreshToken });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// VERIFICATION: Log the authenticated user email to Cloud Run logs
(async () => {
    try {
        const about = await drive.about.get({ fields: 'user' });
        logger.info(`AUTHENTICATED AS: ${about.data.user?.emailAddress || 'Unknown'}`);
    } catch (e: any) {
        logger.error(`FAILED TO IDENTIFY AUTH USER: ${e.message}`);
    }
})();

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

            // Log the error for debugging
            const isRateLimited =
                status === 429 ||
                message.includes('429') ||
                message.includes('Rate Limit');

            const isTransientError =
                isRateLimited ||
                status === 500 ||
                status === 502 ||
                status === 503 ||
                status === 504 ||
                message.includes('socket hang up') ||
                message.includes('ECONNRESET') ||
                message.includes('ETIMEDOUT') ||
                message.includes('Empty response');

            if (isTransientError && attempt < CONFIG.MAX_RETRIES) {
                const reason = isRateLimited ? 'Rate Limited' : 'Transient Network Error';
                logger.warn(`Drive API ${reason} (${status || message}). Retry ${attempt + 1}/${CONFIG.MAX_RETRIES}`);
                await exponentialBackoff(attempt);
            } else {
                // For non-transient errors or max retries reached, throw the actual error
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded');
}
