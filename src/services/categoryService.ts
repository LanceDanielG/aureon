import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Category {
    id: string;
    name: string;
    icon: string; // Icon name from Material Icons
    color: string;
    bgColor: string;
    flow: 'income' | 'expense';
    userId?: string; // Optional if it's a global/default category
    createdAt?: Timestamp;
}

const COLLECTION_NAME = "categories";

export const categoryService = {
    async getCategories(userId: string) {
        try {
            // Get both global (no userId) and user-specific categories
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "in", [null, userId]),
                orderBy("name", "asc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Category));
        } catch (error) {
            console.error("Error fetching categories:", error);
            throw error;
        }
    },

    // Standard default categories if DB is empty or for seeding
    getDefaultCategories(): Omit<Category, 'id'>[] {
        return [
            { name: 'Salary', icon: 'payments', color: '#10b981', bgColor: '#ecfdf5', flow: 'income' },
            { name: 'Freelance', icon: 'work', color: '#3b82f6', bgColor: '#eff6ff', flow: 'income' },
            { name: 'Investment', icon: 'trending_up', color: '#8b5cf6', bgColor: '#f5f3ff', flow: 'income' },
            { name: 'Food', icon: 'restaurant', color: '#f59e0b', bgColor: '#fffbeb', flow: 'expense' },
            { name: 'Shopping', icon: 'shopping_bag', color: '#3b82f6', bgColor: '#eff6ff', flow: 'expense' },
            { name: 'Rent', icon: 'home', color: '#ef4444', bgColor: '#fef2f2', flow: 'expense' },
            { name: 'Utilities', icon: 'bolt', color: '#06b6d4', bgColor: '#ecfeff', flow: 'expense' },
            { name: 'Entertainment', icon: 'sports_esports', color: '#ec4899', bgColor: '#fdf2f8', flow: 'expense' },
            { name: 'Transport', icon: 'directions_car', color: '#64748b', bgColor: '#f1f5f9', flow: 'expense' },
        ];
    },

    async addCategory(userId: string, category: Omit<Category, 'id'>) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...category,
                userId,
                createdAt: Timestamp.now()
            });
            return { id: docRef.id, ...category };
        } catch (error) {
            console.error("Error adding category:", error);
            throw error;
        }
    }
};

export const SMART_SUGGESTIONS: Record<string, { icon: string, color: string, bg: string }> = {
    'food': { icon: 'restaurant', color: '#f59e0b', bg: '#fffbeb' },
    'coffee': { icon: 'restaurant', color: '#f59e0b', bg: '#fffbeb' },
    'dinner': { icon: 'restaurant', color: '#f59e0b', bg: '#fffbeb' },
    'taxi': { icon: 'directions_car', color: '#64748b', bg: '#f1f5f9' },
    'uber': { icon: 'directions_car', color: '#64748b', bg: '#f1f5f9' },
    'grab': { icon: 'directions_car', color: '#64748b', bg: '#f1f5f9' },
    'shopping': { icon: 'shopping_bag', color: '#3b82f6', bg: '#eff6ff' },
    'clothes': { icon: 'shopping_bag', color: '#3b82f6', bg: '#eff6ff' },
    'salary': { icon: 'payments', color: '#10b981', bg: '#ecfdf5' },
    'bonus': { icon: 'payments', color: '#10b981', bg: '#ecfdf5' },
    'rent': { icon: 'home', color: '#ef4444', bg: '#fef2f2' },
    'electric': { icon: 'bolt', color: '#06b6d4', bg: '#ecfeff' },
    'water': { icon: 'bolt', color: '#06b6d4', bg: '#ecfeff' },
    'game': { icon: 'sports_esports', color: '#ec4899', bg: '#fdf2f8' },
};

export const findSuggestion = (name: string) => {
    const lowerName = name.toLowerCase().trim();
    for (const [key, suggestion] of Object.entries(SMART_SUGGESTIONS)) {
        if (lowerName.includes(key)) return suggestion;
    }
    return null;
};
