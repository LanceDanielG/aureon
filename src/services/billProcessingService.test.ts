import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '../services/billProcessingService';

describe('billProcessingService', () => {
    describe('calculateNextDueDate', () => {
        it('calculates next daily due date', () => {
            const current = new Date('2026-01-13');
            const next = calculateNextDueDate(current, 'daily');
            expect(next.getDate()).toBe(14);
            expect(next.getMonth()).toBe(0); // January
        });

        it('calculates next weekly due date', () => {
            const current = new Date('2026-01-13');
            const next = calculateNextDueDate(current, 'weekly');
            expect(next.getDate()).toBe(20); // 7 days later
        });

        it('calculates next biweekly due date', () => {
            const current = new Date('2026-01-13');
            const next = calculateNextDueDate(current, 'biweekly');
            expect(next.getDate()).toBe(28); // 15 days later
        });

        it('calculates next monthly due date', () => {
            const current = new Date('2026-01-15');
            const next = calculateNextDueDate(current, 'monthly');
            expect(next.getMonth()).toBe(1); // February
            expect(next.getDate()).toBe(15);
        });

        it('handles month overflow by rolling to next valid date', () => {
            // Jan 31 + 1 month = Feb 31 which doesn't exist -> JS rolls to March 3 (or 2 in leap year)
            const current = new Date('2026-01-31');
            const next = calculateNextDueDate(current, 'monthly');
            // JS Date behavior: Feb doesn't have 31 days, so it overflows to March
            expect(next.getMonth()).toBe(2); // March (overflow behavior)
        });

        it('returns same date for once frequency', () => {
            const current = new Date('2026-01-15');
            const next = calculateNextDueDate(current, 'once');
            expect(next.getTime()).toBe(current.getTime());
        });
    });
});
