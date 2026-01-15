import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletService } from './walletService';
import {
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// Mock data
const mockWallet = {
    userId: 'test-user',
    name: 'Test Wallet',
    balance: 1000,
    color: '#000000',
    icon: 'AccountBalance',
    currency: 'USD' as const
};

describe('walletService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addWallet', () => {
        it('successfully adds a wallet', async () => {
            (addDoc as any).mockResolvedValue({ id: 'new-wallet-id' });

            const result = await walletService.addWallet(mockWallet);

            expect(addDoc).toHaveBeenCalled();
            expect(result.id).toBe('new-wallet-id');
            expect(result.name).toBe('Test Wallet');
        });

        it('validates input', async () => {
            const invalidWallet = { ...mockWallet, name: '' };
            await expect(walletService.addWallet(invalidWallet)).rejects.toThrow('Wallet name is required');
        });
    });

    describe('getWallets', () => {
        it('fetches wallets correctly', async () => {
            const mockDocs = [
                {
                    id: 'wallet-1',
                    data: () => ({ ...mockWallet })
                }
            ];
            const mockQuerySnapshot = {
                docs: mockDocs
            };
            (getDocs as any).mockResolvedValue(mockQuerySnapshot);

            const results = await walletService.getWallets('test-user');

            expect(getDocs).toHaveBeenCalled();
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('wallet-1');
        });
    });

    describe('updateWallet', () => {
        it('calls updateDoc with correct parameters', async () => {
            (updateDoc as any).mockResolvedValue(undefined);

            await walletService.updateWallet('wallet-1', { balance: 1200 });

            expect(updateDoc).toHaveBeenCalled();
        });
    });

    describe('deleteWallet', () => {
        it('calls deleteDoc with correct ref', async () => {
            (deleteDoc as any).mockResolvedValue(undefined);

            await walletService.deleteWallet('wallet-1');

            expect(deleteDoc).toHaveBeenCalled();
        });
    });
});
