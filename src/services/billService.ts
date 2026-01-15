import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "../config/firebase";
import { type Currency } from "./currencyService";

export interface Bill {
    id?: string;
    userId: string;
    title: string;
    amount: number;
    currency: Currency;
    dueDate: Date;
    category: string;
    isPaid: boolean;
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    walletId?: string; // For automatic deduction
    autoDeduct: boolean; // Enable automatic deduction
    lastGeneratedDueDate?: Date | Timestamp; // Track last generation for recurring bills
    parentBillId?: string; // ID of the parent bill layout for recurring instances
    createdAt: Timestamp;
}

const COLLECTION_NAME = "bills";

export const billService = {
    // Create
    async addBill(bill: Omit<Bill, 'id' | 'createdAt'>) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...bill,
                createdAt: Timestamp.now(),
            });
            return { id: docRef.id, ...bill };
        } catch (error) {
            console.error("Error adding bill: ", error);
            throw error;
        }
    },

    // Create with deterministic ID to prevent duplicates (for recurring instances)
    async addBillDeterministic(id: string, bill: Omit<Bill, 'id' | 'createdAt'>) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            // Check if it already exists first (optional but safer for logging)
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Bill;
            }

            await setDoc(docRef, {
                ...bill,
                createdAt: Timestamp.now(),
            });
            return { id: id, ...bill };
        } catch (error) {
            console.error("Error adding deterministic bill: ", error);
            throw error;
        }
    },

    // Read (Get all for a user)
    async getBills(userId: string) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "==", userId),
                orderBy("dueDate", "asc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dueDate: doc.data().dueDate instanceof Timestamp ? doc.data().dueDate.toDate() : new Date(doc.data().dueDate),
            } as Bill));
        } catch (error) {
            console.error("Error getting bills: ", error);
            throw error;
        }
    },

    // Update (e.g., mark as paid)
    async updateBill(id: string, data: Partial<Bill>) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating bill: ", error);
            throw error;
        }
    },

    // Delete
    async deleteBill(id: string) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error deleting bill: ", error);
            throw error;
        }
    }
};
