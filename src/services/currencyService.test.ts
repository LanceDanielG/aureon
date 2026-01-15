import { describe, it, expect } from 'vitest';
import { currencyService } from '../services/currencyService';

describe('currencyService', () => {
    describe('format', () => {
        it('formats USD currency correctly', () => {
            const result = currencyService.format(1234.56, 'USD');
            expect(result).toContain('1,234.56');
            expect(result).toContain('$');
        });

        it('formats PHP currency correctly', () => {
            const result = currencyService.format(1000, 'PHP');
            expect(result).toContain('1,000');
            expect(result).toContain('₱');
        });

        it('handles zero values', () => {
            const result = currencyService.format(0, 'USD');
            expect(result).toContain('0');
        });

        it('handles negative values', () => {
            const result = currencyService.format(-500, 'USD');
            expect(result).toContain('500');
        });
    });

    describe('formatClean', () => {
        it('hides .00 for whole numbers', () => {
            const result = currencyService.formatClean(100, 'USD');
            expect(result).not.toContain('.00');
        });

        it('shows decimals for non-whole numbers', () => {
            const result = currencyService.formatClean(100.50, 'USD');
            expect(result).toMatch(/\.50?$/);
        });
    });

    describe('convertToUSD', () => {
        const mockRates = {
            PHP: 56,
            EUR: 0.85,
            GBP: 0.73
        };

        it('converts PHP to USD', () => {
            const result = currencyService.convertToUSD(560, 'PHP', mockRates);
            expect(result).toBe(10);
        });

        it('returns same value for USD', () => {
            const result = currencyService.convertToUSD(100, 'USD', mockRates);
            expect(result).toBe(100);
        });

        it('converts EUR to USD', () => {
            const result = currencyService.convertToUSD(85, 'EUR', mockRates);
            expect(result).toBe(100);
        });
    });

    describe('convertFromUSD', () => {
        const mockRates = {
            PHP: 56,
            EUR: 0.85
        };

        it('converts USD to PHP', () => {
            const result = currencyService.convertFromUSD(10, 'PHP', mockRates);
            expect(result).toBe(560);
        });

        it('returns same value for USD', () => {
            const result = currencyService.convertFromUSD(100, 'USD', mockRates);
            expect(result).toBe(100);
        });
    });
});
