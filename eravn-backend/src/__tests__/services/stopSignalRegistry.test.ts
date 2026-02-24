import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestStop, shouldStop, clearStop } from '../../services/stopSignalRegistry.js';
import { db } from '../../repositories/firestoreRepository.js';

// Mock Firestore db
vi.mock('../../repositories/firestoreRepository.js', () => ({
    db: {
        collection: vi.fn(),
    },
}));

describe('StopSignalRegistry (Firestore Integration)', () => {
    const projectId = 'test-project-123';

    // Tạo các mock objects cho Firestore Chain: db.collection().doc().get/set/delete
    const mockDoc = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    };

    const mockCollection = {
        doc: vi.fn(() => mockDoc),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (db.collection as any).mockReturnValue(mockCollection);
    });

    it('requestStop should write a document to stopSignals collection', async () => {
        mockDoc.set.mockResolvedValue({} as any);

        await requestStop(projectId);

        expect(db.collection).toHaveBeenCalledWith('stopSignals');
        expect(mockCollection.doc).toHaveBeenCalledWith(projectId);
        expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            requestedAt: expect.any(String)
        }));
    });

    it('shouldStop should return true if document exists', async () => {
        mockDoc.get.mockResolvedValue({ exists: true } as any);

        const result = await shouldStop(projectId);

        expect(result).toBe(true);
        expect(mockDoc.get).toHaveBeenCalled();
    });

    it('shouldStop should return false if document does not exist', async () => {
        mockDoc.get.mockResolvedValue({ exists: false } as any);

        const result = await shouldStop(projectId);

        expect(result).toBe(false);
    });

    it('clearStop should delete the document from Firestore', async () => {
        mockDoc.delete.mockResolvedValue({} as any);

        await clearStop(projectId);

        expect(db.collection).toHaveBeenCalledWith('stopSignals');
        expect(mockCollection.doc).toHaveBeenCalledWith(projectId);
        expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('shouldStop should return false and log error on database failure', async () => {
        mockDoc.get.mockRejectedValue(new Error('Firestore down'));

        const result = await shouldStop(projectId);

        expect(result).toBe(false); // An toàn: lỗi DB thì mặc định là không dừng
    });
});
