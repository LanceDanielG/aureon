export type Currency = string;

// Fallback rates in case API fails
const DEFAULT_RATES: Record<string, number> = {
    USD: 1,
    PHP: 56,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 150,
};

let cachedRates: Record<string, number> = { ...DEFAULT_RATES };
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const currencyService = {
    async getAllRates(): Promise<Record<string, number>> {
        const now = Date.now();
        if (now - lastFetch < CACHE_DURATION) {
            return cachedRates;
        }

        try {
            const response = await fetch('https://api.frankfurter.app/latest?from=USD');
            const data = await response.json();
            if (data.rates) {
                cachedRates = { ...data.rates, USD: 1 };
                lastFetch = now;
            }
            return cachedRates;
        } catch (error) {
            console.error("Failed to fetch exchange rates:", error);
            return cachedRates;
        }
    },

    async getSupportedCurrencies(): Promise<Record<string, string>> {
        try {
            const response = await fetch('https://api.frankfurter.app/currencies');
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch supported currencies:", error);
            return {
                USD: "United States Dollar",
                PHP: "Philippine Peso",
                EUR: "Euro",
                GBP: "British Pound",
                JPY: "Japanese Yen"
            };
        }
    },

    convertToUSD(amount: number, from: Currency, rates: Record<string, number> = cachedRates): number {
        if (from === 'USD') return amount;
        const rate = rates[from] || 1;
        return amount / rate;
    },

    convertFromUSD(amountUSD: number, to: Currency, rates: Record<string, number> = cachedRates): number {
        if (to === 'USD') return amountUSD;
        const rate = rates[to] || 1;
        return amountUSD * rate;
    },

    format(amount: number, currency: Currency): string {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch {
            return `${currency} ${amount.toFixed(2)}`;
        }
    },

    // Format without unnecessary .00 decimals
    formatClean(amount: number, currency: Currency): string {
        try {
            const hasDecimals = amount % 1 !== 0;
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: hasDecimals ? 2 : 0,
                maximumFractionDigits: 2
            }).format(amount);
        } catch {
            const hasDecimals = amount % 1 !== 0;
            return `${currency} ${hasDecimals ? amount.toFixed(2) : Math.round(amount)}`;
        }
    },

    getSymbol(currency: Currency): string {
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            });
            const parts = formatter.formatToParts(0);
            const symbolPart = parts.find(part => part.type === 'currency');
            return symbolPart ? symbolPart.value : currency;
        } catch {
            return currency;
        }
    },

    formatWithCode(amount: number, currency: Currency): string {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                currencyDisplay: 'code',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch {
            return `${currency} ${amount.toFixed(2)}`;
        }
    },

    formatForPDF(amount: number, currency: Currency): string {
        // Standard PDF fonts (Helvetica) only support WinAnsi encoding.
        // Safe symbols: $ (USD), £ (GBP), ¥ (JPY), € (EUR)
        // Unsafe: ₱ (PHP), ₹ (INR), etc.
        const safeCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        if (safeCurrencies.includes(currency)) {
            return this.format(amount, currency);
        }
        return this.formatWithCode(amount, currency);
    },

    formatCompact(amount: number, currency: Currency, maxLength: number = 9): string {
        // First try the clean format (no .00 decimals)
        const cleanFormat = this.formatClean(amount, currency);

        // If it fits within the max length, use the clean format
        if (cleanFormat.length <= maxLength) {
            return cleanFormat;
        }

        // Otherwise, use compact format
        const symbol = this.getSymbol(currency);
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : '';

        const formatValue = (value: number): string => {
            // Round to 2 decimal places first
            const rounded = Math.round(value * 100) / 100;
            // If it's a whole number, no decimals
            if (rounded === Math.floor(rounded)) {
                return Math.floor(rounded).toString();
            }
            // If one decimal place is enough (e.g., 2.50 -> 2.5)
            if (Math.round(rounded * 10) / 10 === rounded) {
                return rounded.toFixed(1);
            }
            // Otherwise show 2 decimals
            return rounded.toFixed(2);
        };

        if (absAmount >= 1_000_000_000_000) {
            return `${sign}${symbol}${formatValue(absAmount / 1_000_000_000_000)}T`;
        } else if (absAmount >= 1_000_000_000) {
            return `${sign}${symbol}${formatValue(absAmount / 1_000_000_000)}B`;
        } else if (absAmount >= 1_000_000) {
            return `${sign}${symbol}${formatValue(absAmount / 1_000_000)}M`;
        } else if (absAmount >= 1_000) {
            return `${sign}${symbol}${formatValue(absAmount / 1_000)}K`;
        }
        // For amounts under 1000, show without decimals
        return `${sign}${symbol}${Math.round(absAmount)}`;
    }
};
