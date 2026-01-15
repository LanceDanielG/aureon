import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Firebase
vi.mock('../config/firebase', () => ({
    db: {},
    auth: {
        currentUser: { uid: 'test-user-id' }
    }
}));

vi.mock('firebase/firestore', () => {
    class MockTimestamp {
        seconds: number;
        nanoseconds: number;
        constructor(seconds: number, nanoseconds: number) {
            this.seconds = seconds;
            this.nanoseconds = nanoseconds;
        }
        toDate() { return new Date(this.seconds * 1000); }
        toMillis() { return this.seconds * 1000; }
        static now() { return new MockTimestamp(Math.floor(Date.now() / 1000), 0); }
        static fromDate(date: Date) { return new MockTimestamp(Math.floor(date.getTime() / 1000), 0); }
    }

    return {
        getFirestore: vi.fn(),
        collection: vi.fn(),
        addDoc: vi.fn(),
        getDocs: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        doc: vi.fn(),
        setDoc: vi.fn(),
        getDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        runTransaction: vi.fn(),
        Timestamp: MockTimestamp
    };
});

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    },
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));
