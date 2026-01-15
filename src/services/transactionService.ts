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
import { validationUtils } from "../utils/validationUtils";

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
        // Input Validation
        if (!validationUtils.isValidString(transaction.userId)) throw new Error("Invalid User ID");
        if (!validationUtils.isValidString(transaction.title)) throw new Error("Title is required");
        if (!validationUtils.isValidNumber(transaction.amount)) throw new Error("Invalid Amount");
        if (!transaction.categoryId) throw new Error("Category is required");

        // Sanitize
        transaction.title = validationUtils.sanitizeString(transaction.title);
        transaction.subtitle = validationUtils.sanitizeString(transaction.subtitle);

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
        // ... implementation as before ...
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

    // NEW: Atomic payment that also marks the bill as paid
    async payBillAtomic(billId: string, transaction: Omit<Transaction, 'id' | 'createdAt'>, exchangeRates?: Record<string, number>) {
        if (!transaction.walletId) throw new Error("Wallet ID is required for atomic bill payment");

        try {
            await runTransaction(db, async (firestoreTransaction) => {
                const billDocRef = doc(db, "bills", billId);
                const billDoc = await firestoreTransaction.get(billDocRef);

                if (!billDoc.exists()) throw new Error("Bill does not exist!");
                if (billDoc.data().isPaid) throw new Error("Bill is already paid!");

                const walletDocRef = doc(db, "wallets", transaction.walletId!);
                const walletDoc = await firestoreTransaction.get(walletDocRef);

                if (!walletDoc.exists()) throw new Error("Wallet does not exist!");

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

                // 3. Mark the Bill as paid
                firestoreTransaction.update(billDocRef, { isPaid: true });
            });
        } catch (error) {
            console.error("PayBillAtomic failed: ", error);
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
    },

    // Atomic delete that reverses wallet balance update
    async deleteTransactionWithWallet(id: string, exchangeRates?: Record<string, number>) {
        try {
            await runTransaction(db, async (firestoreTransaction) => {
                const txDocRef = doc(db, COLLECTION_NAME, id);
                const txDoc = await firestoreTransaction.get(txDocRef);

                if (!txDoc.exists()) {
                    throw new Error("Transaction does not exist!");
                }

                const txData = txDoc.data() as Transaction;
                const walletId = txData.walletId;

                // If no wallet associated, just delete the transaction
                if (!walletId) {
                    firestoreTransaction.delete(txDocRef);
                    return;
                }

                const walletDocRef = doc(db, "wallets", walletId);
                const walletDoc = await firestoreTransaction.get(walletDocRef);

                if (walletDoc.exists()) {
                    const walletData = walletDoc.data();
                    const currentBalance = walletData.balance || 0;
                    const walletCurrency = walletData.currency || 'USD';

                    // Reverse the transaction amount
                    // If it was an expense (-amount), adding it back restores balance
                    // If it was an income (+amount), subtracting it restores balance
                    let amountToReverse = -txData.amount;

                    // Convert to wallet's currency if they differ
                    if (txData.currency !== walletCurrency && exchangeRates) {
                        const amountUSD = currencyService.convertToUSD(-txData.amount, txData.currency, exchangeRates);
                        amountToReverse = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                    }

                    const newBalance = currentBalance + amountToReverse;
                    firestoreTransaction.update(walletDocRef, { balance: newBalance });
                }

                // Delete the Transaction record
                firestoreTransaction.delete(txDocRef);
            });
        } catch (error) {
            console.error("Atomic delete failed: ", error);
            throw error;
        }
    }
};
