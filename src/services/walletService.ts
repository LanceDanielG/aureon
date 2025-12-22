import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "../config/firebase";
import { type Currency } from "./currencyService";

export interface Wallet {
    id?: string;
    userId: string;
    name: string;
    balance: number;
    color: string; // Hex or theme color name
    icon: string;
    currency: Currency;
    createdAt: Timestamp;
}

const COLLECTION_NAME = "wallets";

export const walletService = {
    // Create
    async addWallet(wallet: Omit<Wallet, 'id' | 'createdAt'>) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...wallet,
                createdAt: Timestamp.now(),
            });
            return { id: docRef.id, ...wallet };
        } catch (error) {
            console.error("Error adding wallet: ", error);
            throw error;
        }
    },

    // Read (Get all for a user)
    async getWallets(userId: string) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Wallet));
        } catch (error) {
            console.error("Error getting wallets: ", error);
            throw error;
        }
    },

    // Update
    async updateWallet(id: string, data: Partial<Wallet>) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating wallet: ", error);
            throw error;
        }
    },

    // Delete
    async deleteWallet(id: string) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting wallet: ", error);
            throw error;
        }
    }
};
