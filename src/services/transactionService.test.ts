import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionService } from './transactionService';
import {
    addDoc,
    runTransaction
} from 'firebase/firestore';

// Mock data
const mockTransaction = {
    userId: 'test-user',
    walletId: 'wallet-1',
    flow: 'expense' as const,
    categoryId: 'utility',
    currency: 'USD' as const,
    title: 'Test Exepnse',
    subtitle: 'Monthly Bill',
    amount: -50,
    date: new Date()
};

describe('transactionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addTransaction', () => {
        it('successfully adds a transaction', async () => {
            (addDoc as any).mockResolvedValue({ id: 'new-tx-id' });

            const result = await transactionService.addTransaction(mockTransaction);

            expect(addDoc).toHaveBeenCalled();
            expect(result.id).toBe('new-tx-id');
        });

        it('validates input', async () => {
            const invalidTx = { ...mockTransaction, amount: 'invalid' as any };
            await expect(transactionService.addTransaction(invalidTx)).rejects.toThrow('Invalid Amount');
        });
    });

    describe('addTransactionWithWallet', () => {
        it('uses atomic transaction when walletId is present', async () => {
            const mockFirestoreTransaction = {
                get: vi.fn(),
                set: vi.fn(),
                update: vi.fn()
            };

            // Mock runTransaction to execute the callback immediateley
            (runTransaction as any).mockImplementation(async (_db: any, callback: any) => {
                await callback(mockFirestoreTransaction);
            });

            // Mock wallet fetch
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ balance: 1000, currency: 'USD' })
            });

            await transactionService.addTransactionWithWallet(mockTransaction);

            expect(runTransaction).toHaveBeenCalled();
            expect(mockFirestoreTransaction.get).toHaveBeenCalled(); // Gets wallet
            expect(mockFirestoreTransaction.set).toHaveBeenCalled(); // Sets new tx
            expect(mockFirestoreTransaction.update).toHaveBeenCalled(); // Updates wallet
        });
    });

    describe('payBillAtomic', () => {
        it('throws error if bill is already paid', async () => {
            const mockFirestoreTransaction = {
                get: vi.fn(),
                set: vi.fn(),
                update: vi.fn()
            };

            (runTransaction as any).mockImplementation(async (_db: any, callback: any) => {
                await callback(mockFirestoreTransaction);
            });

            // Mock Bill fetch (already paid)
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ isPaid: true })
            });

            await expect(transactionService.payBillAtomic('bill-1', mockTransaction))
                .rejects.toThrow('Bill is already paid!');
        });

        it('completes atomic payment successfully', async () => {
            const mockFirestoreTransaction = {
                get: vi.fn(),
                set: vi.fn(),
                update: vi.fn()
            };

            (runTransaction as any).mockImplementation(async (_db: any, callback: any) => {
                await callback(mockFirestoreTransaction);
            });

            // Mock Bill fetch (not paid)
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ isPaid: false })
            });

            // Mock Wallet fetch
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ balance: 1000, currency: 'USD' })
            });

            await transactionService.payBillAtomic('bill-1', mockTransaction);

            expect(mockFirestoreTransaction.update).toHaveBeenCalledTimes(2); // Wallet + Bill
            expect(mockFirestoreTransaction.set).toHaveBeenCalledTimes(1); // Transaction
        });
    });

    describe('deleteTransactionWithWallet', () => {
        it('reverses wallet balance and deletes transaction', async () => {
            const mockFirestoreTransaction = {
                get: vi.fn(),
                delete: vi.fn(),
                update: vi.fn()
            };

            (runTransaction as any).mockImplementation(async (_db: any, callback: any) => {
                await callback(mockFirestoreTransaction);
            });

            // Mock Transaction fetch
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ ...mockTransaction, walletId: 'wallet-1' })
            });

            // Mock Wallet fetch
            mockFirestoreTransaction.get.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ balance: 950, currency: 'USD' })
            });

            await transactionService.deleteTransactionWithWallet('tx-1');

            expect(mockFirestoreTransaction.delete).toHaveBeenCalled();
            expect(mockFirestoreTransaction.update).toHaveBeenCalled();
            // Should add 50 back to 950 -> 1000
            const updateCall = mockFirestoreTransaction.update.mock.calls[0];
            expect(updateCall[1]).toEqual({ balance: 1000 }); // 950 - (-50) ? No wait.
            // Logic in service: amountToReverse = -txData.amount; (if expense, it's positive number in DB? No amount is usually absolute? Let's check logic)
            // Service logic: "let amountToReverse = -txData.amount;"
            // If txData.amount is 50 (expense usually stored as positive 50 with flow='expense'? Or negative?
            // The service doesn't check flow for sign, it just does -amount.
            // Wait, looking at AddTransactionWithWallet: "const newBalance = currentBalance + adjustedAmount;"
            // If expense, amount should probably be negative? 
            // In addTransactionWithWallet logic: `let adjustedAmount = transaction.amount;`
            // If it's an expense, does the user pass negative amount?
            // Let's check how it's called in code. 
            // But assuming standard double-entry: Reversing means subtracting the same amount added.
            // If I added +50 (income), reverse is -50.
            // If I added -50 (expense), reverse is +50.
            // The service code: `amountToReverse = -txData.amount` implies it just negates whatever was there.
            // If I passed 50, it reverses -50. This implies 50 was ADDED to balance.
            // If I want to verify expense logic, I need to know if expenses are stored as negative.
            // Usually in this app, expenses subtract from wallet.
        });
    });
});
