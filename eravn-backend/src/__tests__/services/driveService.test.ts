// ==========================================
// Tests for Drive Service
// ==========================================
// Tests retry logic, rate limiting, backoff, and Drive API wrapper functions

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis before importing driveService
const mockDriveFilesList = vi.fn();
const mockDriveFilesCopy = vi.fn();
const mockDriveFilesCreate = vi.fn();
const mockDriveAboutGet = vi.fn().mockResolvedValue({ data: { user: { emailAddress: 'test@test.com' } } });

vi.mock('googleapis', () => {
    // Must use a proper class so `new google.auth.OAuth2(...)` works
    class MockOAuth2 {
        setCredentials = vi.fn();
    }

    return {
        google: {
            auth: {
                OAuth2: MockOAuth2,
            },
            drive: vi.fn().mockReturnValue({
                files: {
                    list: (...args: any[]) => mockDriveFilesList(...args),
                    copy: (...args: any[]) => mockDriveFilesCopy(...args),
                    create: (...args: any[]) => mockDriveFilesCreate(...args),
                },
                about: {
                    get: (...args: any[]) => mockDriveAboutGet(...args),
                },
            }),
        },
    };
});

import {
    listModifiedFiles,
    listSubFolders,
    copyFileToDest,
    createFolder,
    findOrCreateFolder,
    findFilesByName,
} from '../../services/driveService.js';

describe('DriveService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listModifiedFiles', () => {
        it('should return files modified after timestamp', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: {
                    files: [
                        { id: 'f1', name: 'file1.pdf', mimeType: 'application/pdf' },
                        { id: 'f2', name: 'file2.docx', mimeType: 'application/docx' },
                    ],
                    nextPageToken: undefined,
                },
            });

            const result = await listModifiedFiles('folder-id', '2026-01-01T00:00:00Z');

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('file1.pdf');
            expect(mockDriveFilesList).toHaveBeenCalledOnce();
        });

        it('should handle pagination', async () => {
            mockDriveFilesList
                .mockResolvedValueOnce({
                    data: {
                        files: [{ id: 'f1', name: 'page1.pdf', mimeType: 'application/pdf' }],
                        nextPageToken: 'token-2',
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        files: [{ id: 'f2', name: 'page2.pdf', mimeType: 'application/pdf' }],
                        nextPageToken: undefined,
                    },
                });

            const result = await listModifiedFiles('folder-id', '2026-01-01T00:00:00Z');

            expect(result).toHaveLength(2);
            expect(mockDriveFilesList).toHaveBeenCalledTimes(2);
        });

        it('should return empty array when no files', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: { files: [], nextPageToken: undefined },
            });

            const result = await listModifiedFiles('folder-id', '2026-01-01T00:00:00Z');
            expect(result).toHaveLength(0);
        });
    });

    describe('listSubFolders', () => {
        it('should return subfolders', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: {
                    files: [
                        { id: 'sf1', name: 'SubFolder1', mimeType: 'application/vnd.google-apps.folder' },
                    ],
                    nextPageToken: undefined,
                },
            });

            const result = await listSubFolders('parent-folder-id');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('SubFolder1');
        });
    });

    describe('copyFileToDest', () => {
        it('should copy file to destination folder', async () => {
            mockDriveFilesCopy.mockResolvedValue({
                data: { id: 'copy-id', name: 'file.pdf', webViewLink: 'https://drive.google.com/file/d/copy-id/view' },
            });

            const result = await copyFileToDest('original-id', 'dest-folder-id', 'file.pdf');

            expect(result.id).toBe('copy-id');
            expect(mockDriveFilesCopy).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'original-id',
                    requestBody: expect.objectContaining({ parents: ['dest-folder-id'] }),
                })
            );
        });
    });

    describe('createFolder', () => {
        it('should create a folder in parent', async () => {
            mockDriveFilesCreate.mockResolvedValue({
                data: { id: 'new-folder-id', name: 'NewFolder' },
            });

            const result = await createFolder('NewFolder', 'parent-id');

            expect(result.id).toBe('new-folder-id');
            expect(result.name).toBe('NewFolder');
        });
    });

    describe('findOrCreateFolder', () => {
        it('should return existing folder if found', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: {
                    files: [{ id: 'existing-id', name: 'ExistingFolder' }],
                },
            });

            const result = await findOrCreateFolder('ExistingFolder', 'parent-id');
            expect(result.id).toBe('existing-id');
            expect(mockDriveFilesCreate).not.toHaveBeenCalled();
        });

        it('should create folder if not found', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: { files: [] },
            });
            mockDriveFilesCreate.mockResolvedValue({
                data: { id: 'created-id', name: 'NewFolder' },
            });

            const result = await findOrCreateFolder('NewFolder', 'parent-id');
            expect(result.id).toBe('created-id');
            expect(mockDriveFilesCreate).toHaveBeenCalledOnce();
        });
    });

    describe('findFilesByName', () => {
        it('should find files matching name in folder', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: {
                    files: [{ id: 'f1', name: 'report.pdf', mimeType: 'application/pdf' }],
                },
            });

            const result = await findFilesByName('report.pdf', 'folder-id');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('report.pdf');
        });

        it('should return empty array if no match', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: { files: [] },
            });

            const result = await findFilesByName('nonexistent.pdf', 'folder-id');
            expect(result).toHaveLength(0);
        });

        it('should escape single quotes in filename', async () => {
            mockDriveFilesList.mockResolvedValue({
                data: { files: [] },
            });

            await findFilesByName("file's name.pdf", 'folder-id');

            // Verify the query contains escaped quote
            expect(mockDriveFilesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringContaining("\\'"),
                })
            );
        });
    });

    describe('retry logic (via API calls)', () => {
        it('should retry on 429 rate limit error', async () => {
            const rateLimitError = new Error('Rate Limit Exceeded');
            (rateLimitError as any).response = { status: 429 };

            mockDriveFilesList
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({
                    data: { files: [{ id: 'f1', name: 'file.pdf' }], nextPageToken: undefined },
                });

            const result = await listModifiedFiles('folder-id', '2026-01-01T00:00:00Z');
            expect(result).toHaveLength(1);
            expect(mockDriveFilesList).toHaveBeenCalledTimes(2);
        });

        it('should retry on 500 server error', async () => {
            const serverError = new Error('Internal Server Error');
            (serverError as any).response = { status: 500 };

            mockDriveFilesList
                .mockRejectedValueOnce(serverError)
                .mockResolvedValueOnce({
                    data: { files: [], nextPageToken: undefined },
                });

            const result = await listModifiedFiles('folder-id', '2026-01-01T00:00:00Z');
            expect(result).toHaveLength(0);
            expect(mockDriveFilesList).toHaveBeenCalledTimes(2);
        });

        it('should throw on non-transient error (e.g. 403)', async () => {
            const permError = new Error('Forbidden');
            (permError as any).response = { status: 403 };

            mockDriveFilesList.mockRejectedValue(permError);

            await expect(listModifiedFiles('folder-id', '2026-01-01T00:00:00Z'))
                .rejects.toThrow('Forbidden');
        });
    });
});
