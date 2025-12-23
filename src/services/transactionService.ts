import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp,
    runTransaction
} from "firebase/firestore";
import { db } from "../config/firebase";
import { currencyService, type Currency } from "./currencyService";

export interface Transaction {
    id?: string;
    userId: string;
    walletId?: string; // Associated wallet
    flow: 'income' | 'expense' | 'transfer';
    categoryId: string;
    currency: Currency;
    title: string;
    subtitle: string;
    amount: number; // Stored as plain number
    date: Date;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "transactions";

export const transactionService = {
    // Create
    async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...transaction,
                createdAt: Timestamp.now(),
            });
            return { id: docRef.id, ...transaction };
        } catch (error) {
            console.error("Error adding transaction: ", error);
            throw error;
        }
    },

    // Atomic transaction that updates a wallet balance
    async addTransactionWithWallet(transaction: Omit<Transaction, 'id' | 'createdAt'>, exchangeRates?: Record<string, number>) {
        if (!transaction.walletId) {
            return this.addTransaction(transaction);
        }

        try {
            await runTransaction(db, async (firestoreTransaction) => {
                const walletDocRef = doc(db, "wallets", transaction.walletId!);
                const walletDoc = await firestoreTransaction.get(walletDocRef);

                if (!walletDoc.exists()) {
                    throw new Error("Wallet does not exist!");
                }

                const walletData = walletDoc.data();
                const currentBalance = walletData.balance || 0;
                const walletCurrency = walletData.currency || 'USD';

                // Convert transaction amount to wallet's currency if they differ
                let adjustedAmount = transaction.amount;
                if (transaction.currency !== walletCurrency && exchangeRates) {
                    const amountUSD = currencyService.convertToUSD(transaction.amount, transaction.currency, exchangeRates);
                    adjustedAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                }

                const newBalance = currentBalance + adjustedAmount;

                // 1. Create the Transaction record
                const txDocRef = doc(collection(db, COLLECTION_NAME));
                firestoreTransaction.set(txDocRef, {
                    ...transaction,
                    createdAt: Timestamp.now(),
                });

                // 2. Update the Wallet balance
                firestoreTransaction.update(walletDocRef, { balance: newBalance });
            });
        } catch (error) {
            console.error("Atomic transaction failed: ", error);
            throw error;
        }
    },

    // Read (Get all for a user)
    async getTransactions() {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                let txDate = new Date();
                try {
                    if (data.date instanceof Timestamp) {
                        txDate = data.date.toDate();
                    } else if (data.date) {
                        txDate = new Date(data.date);
                    }
                } catch {
                    console.error("Manual record date error:", doc.id);
                }

                return {
                    id: doc.id,
                    ...data,
                    date: txDate,
                } as Transaction;
            });
        } catch (error) {
            console.error("Error getting transactions: ", error);
            throw error;
        }
    },

    // Update
    async updateTransaction(id: string, data: Partial<Transaction>) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating transaction: ", error);
            throw error;
        }
    },

    // Delete
    async deleteTransaction(id: string) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting transaction: ", error);
            throw error;
        }
    }
};
