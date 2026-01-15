import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billService } from './billService';
import {
    addDoc,
    getDocs,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// Mock data
const mockBill = {
    userId: 'test-user',
    title: 'Test Bill',
    amount: 100,
    currency: 'USD' as const,
    dueDate: new Date(),
    category: 'Utility',
    isPaid: false,
    frequency: 'monthly' as const,
    autoDeduct: false
};

describe('billService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addBill', () => {
        it('successfully adds a bill', async () => {
            // Mock addDoc to return a ref with an ID
            (addDoc as any).mockResolvedValue({ id: 'new-bill-id' });

            const result = await billService.addBill(mockBill);

            expect(addDoc).toHaveBeenCalled();
            expect(result.id).toBe('new-bill-id');
            expect(result.title).toBe('Test Bill');
        });

        it('throws error when addDoc fails', async () => {
            (addDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(billService.addBill(mockBill)).rejects.toThrow('Firestore error');
        });
    });

    describe('addBillDeterministic', () => {
        it('returns existing bill if ID already exists', async () => {
            // Mock getDoc to return exists() = true
            const mockSnapshot = {
                exists: () => true,
                id: 'existing-id',
                data: () => ({ ...mockBill })
            };
            (getDoc as any).mockResolvedValue(mockSnapshot);

            const result = await billService.addBillDeterministic('existing-id', mockBill);

            expect(getDoc).toHaveBeenCalled();
            expect(setDoc).not.toHaveBeenCalled();
            expect(result.id).toBe('existing-id');
        });

        it('creates new bill if ID does not exist', async () => {
            // Mock getDoc to return exists() = false
            const mockSnapshot = {
                exists: () => false
            };
            (getDoc as any).mockResolvedValue(mockSnapshot);
            (setDoc as any).mockResolvedValue(undefined);

            const result = await billService.addBillDeterministic('new-id', mockBill);

            expect(getDoc).toHaveBeenCalled();
            expect(setDoc).toHaveBeenCalled();
            expect(result.id).toBe('new-id');
        });
    });

    describe('getBills', () => {
        it('fetches and formats bills correctly', async () => {
            const mockDate = new Date();
            const mockDocs = [
                {
                    id: 'bill-1',
                    data: () => ({
                        ...mockBill,
                        dueDate: { toDate: () => mockDate } // Mock Timestamp
                    })
                }
            ];
            const mockQuerySnapshot = {
                docs: mockDocs
            };
            (getDocs as any).mockResolvedValue(mockQuerySnapshot);

            const results = await billService.getBills('test-user');

            expect(getDocs).toHaveBeenCalled();
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('bill-1');
            expect(results[0].dueDate).toBeInstanceOf(Date);
        });
    });

    describe('updateBill', () => {
        it('calls updateDoc with correct parameters', async () => {
            (updateDoc as any).mockResolvedValue(undefined);

            await billService.updateBill('bill-1', { isPaid: true });

            expect(updateDoc).toHaveBeenCalled();
            const updateCall = (updateDoc as any).mock.calls[0];
            expect(updateCall[1]).toEqual({ isPaid: true });
        });
    });

    describe('deleteBill', () => {
        it('calls deleteDoc with correct ref', async () => {
            (deleteDoc as any).mockResolvedValue(undefined);

            await billService.deleteBill('bill-1');

            expect(deleteDoc).toHaveBeenCalled();
        });
    });
});
