import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
    startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears
} from "date-fns";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp,
    limit,
    where
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import type { Transaction } from "../services/transactionService";
import type { Wallet } from "../services/walletService";
import type { Bill } from "../services/billService";
import { type Category, categoryService } from "../services/categoryService";
import { currencyService, type Currency } from "../services/currencyService";
import { processDueBills, hasDueBills } from "../services/billProcessingService";
import { showBillNotifications } from "../services/notificationService";
import { cacheService } from "../services/cacheService";


export type DashboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface FinanceContextType {
    transactions: Transaction[];
    wallets: Wallet[];
    bills: Bill[];
    categories: Category[];
    loading: boolean;
    errors: {
        transactions: string | null;
        wallets: string | null;
        bills: string | null;
        categories: string | null;
    };
    stats: {
        totalBalance: number;
        income: number;
        expenses: number;
        profit: number;
        incomeChange: number;
        expensesChange: number;
        balanceChange: number;
    };
    dashboardTimeframe: DashboardTimeframe;
    setDashboardTimeframe: (timeframe: DashboardTimeframe) => void;
    baseCurrency: Currency;
    setBaseCurrency: (currency: Currency) => void;
    availableCurrencies: Record<string, string>;
    exchangeRates: Record<string, number>;
    loadMoreTransactions: () => void;
    hasMoreTransactions: boolean;
    loadMoreBills: () => void;
    hasMoreBills: boolean;
    refreshData: () => void;
    isInitialLoading: boolean;
}


const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

// Also keep useTransactions for backward compatibility
export const useTransactions = () => {
    const { transactions, loading, errors } = useFinance();
    return { transactions, loading, error: errors.transactions };
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dashboardTimeframe, setDashboardTimeframe] = useState<DashboardTimeframe>('monthly');
    const [user, setUser] = useState(auth.currentUser);

    // Helper to get cache key
    const getCacheKey = (key: string) => user ? `${user.uid}_${key}` : null;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionLimit, setTransactionLimit] = useState(50);

    const [hasMoreTransactions, setHasMoreTransactions] = useState(true);

    const loadMoreTransactions = () => {
        setTransactionLimit(prev => prev + 20);
    };

    const [billsLimit, setBillsLimit] = useState(50);
    const [hasMoreBills, setHasMoreBills] = useState(true);

    const loadMoreBills = () => {
        setBillsLimit(prev => prev + 20);
    };

    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1, PHP: 56 });
    const [availableCurrencies, setAvailableCurrencies] = useState<Record<string, string>>({ USD: "United States Dollar", PHP: "Philippine Peso" });
    const [baseCurrency, setBaseCurrencyState] = useState<Currency>(() => {
        return (localStorage.getItem('baseCurrency') as Currency) || 'USD';
    });

    const setBaseCurrency = (currency: Currency) => {
        setBaseCurrencyState(currency);
        localStorage.setItem('baseCurrency', currency);
    };

    const [loading, setLoading] = useState(true);
    // isInitialLoading is true only if we have no data at all (neither cached nor fresh)
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [errors, setErrors] = useState<{
        transactions: string | null;
        wallets: string | null;
        bills: string | null;
        categories: string | null;
    }>({ transactions: null, wallets: null, bills: null, categories: null });

    // Force refresh: invalidate cache and reload window (simplest way to reset all listeners/states)
    const refreshData = () => {
        if (user) {
            cacheService.invalidateAll();
            window.location.reload();
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) {
                setTransactions([]);
                setWallets([]);
                setBills([]);
                setCategories([]);
                setErrors({ transactions: null, wallets: null, bills: null, categories: null });
                setLoading(false);
                setIsInitialLoading(false);
            } else {
                // User logged in. Try to load from cache first.
                const cachedTxs = cacheService.get<Transaction[]>(`${u.uid}_transactions`);
                const cachedWallets = cacheService.get<Wallet[]>(`${u.uid}_wallets`);
                const cachedBills = cacheService.get<Bill[]>(`${u.uid}_bills`);
                const cachedCats = cacheService.get<Category[]>(`${u.uid}_categories`);

                if (cachedTxs) {
                    setTransactions(cachedTxs.map(t => {
                        const rawCreatedAt = (t as any).createdAt;
                        let createdAtTimestamp: Timestamp;

                        // Reconstruct Timestamp from stored object { seconds, nanoseconds } or string
                        if (rawCreatedAt && typeof rawCreatedAt.seconds === 'number') {
                            createdAtTimestamp = new Timestamp(rawCreatedAt.seconds, rawCreatedAt.nanoseconds);
                        } else {
                            // Fallback if missing or invalid (e.g. create a new one or parse string if it was stringified to ISO)
                            // Usually JSON.stringify(timestamp) might produce something else? 
                            // Firestore Timestamp toJSON() returns { seconds, nanoseconds }
                            createdAtTimestamp = Timestamp.now();
                        }

                        return {
                            ...t,
                            date: new Date(t.date),
                            createdAt: createdAtTimestamp
                        };
                    }));
                }

                if (cachedWallets) {
                    setWallets(cachedWallets.map(w => ({
                        ...w,
                        createdAt: (w.createdAt && (w.createdAt as any).seconds)
                            ? new Timestamp((w.createdAt as any).seconds, (w.createdAt as any).nanoseconds)
                            : Timestamp.now()
                    })));
                }

                if (cachedBills) {
                    setBills(cachedBills.map(b => ({
                        ...b,
                        dueDate: new Date(b.dueDate),
                        createdAt: (b.createdAt && (b.createdAt as any).seconds)
                            ? new Timestamp((b.createdAt as any).seconds, (b.createdAt as any).nanoseconds)
                            : Timestamp.now(),
                        lastGeneratedDueDate: b.lastGeneratedDueDate ? (
                            (b.lastGeneratedDueDate as any).seconds
                                ? new Timestamp((b.lastGeneratedDueDate as any).seconds, (b.lastGeneratedDueDate as any).nanoseconds)
                                : new Date(b.lastGeneratedDueDate as any)
                        ) : undefined
                    })));

                }
                if (cachedCats) {
                    setCategories(cachedCats.map(c => ({
                        ...c,
                        createdAt: (c.createdAt && (c.createdAt as any).seconds)
                            ? new Timestamp((c.createdAt as any).seconds, (c.createdAt as any).nanoseconds)
                            : undefined
                    })));
                }


                // If we have some cached data, we are not in "initial loading" state visually
                if (cachedTxs || cachedWallets) {
                    setLoading(false); // Don't show global spinner if we have something
                    setIsInitialLoading(false); // We have skeletons or data
                } else {
                    setLoading(true);
                    setIsInitialLoading(true);
                }
            }
        });
        return unsubscribe;
    }, []);

    // 1. Transactions Listener
    useEffect(() => {
        if (!user) return;

        const txQuery = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(transactionLimit)
        );

        const unsub = onSnapshot(txQuery, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => {
                const rawData = doc.data();
                let txDate = new Date();
                try {
                    if (rawData.date instanceof Timestamp) {
                        txDate = rawData.date.toDate();
                    } else if (rawData.date) {
                        txDate = new Date(rawData.date);
                    }
                } catch (e) {
                    console.error("Date parsing error:", doc.id, e);
                }
                return { id: doc.id, ...rawData, date: isNaN(txDate.getTime()) ? new Date() : txDate } as Transaction;
            });
            setTransactions(data);
            // Update cache
            if (data.length > 0) {
                cacheService.set(getCacheKey('transactions')!, data);
            }
            setHasMoreTransactions(data.length >= transactionLimit);
            setErrors(prev => ({ ...prev, transactions: null }));
            setLoading(false);
            setIsInitialLoading(false);
        }, (err) => {
            console.error("FIREBASE ERROR (Transactions):", err.message);
            setErrors(prev => ({ ...prev, transactions: err.message }));
            setLoading(false);
            setIsInitialLoading(false);
        });

        return unsub;
    }, [user, transactionLimit]);

    // 2. Wallets Listener
    useEffect(() => {
        if (!user) return;

        const walletQuery = query(
            collection(db, "wallets"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(50)
        );
        const unsub = onSnapshot(walletQuery, (qs) => {
            const data = qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet));
            setWallets(data);
            if (data.length > 0) cacheService.set(getCacheKey('wallets')!, data);
            setErrors(prev => ({ ...prev, wallets: null }));
        }, (err) => {
            console.error("FIREBASE ERROR (Wallets):", err.message);
            setErrors(prev => ({ ...prev, wallets: err.message }));
        });
        return unsub;
    }, [user]);

    // 3. Bills Listener
    useEffect(() => {
        if (!user) return;

        const billQuery = query(
            collection(db, "bills"),
            where("userId", "==", user.uid),
            orderBy("dueDate", "desc"),
            limit(billsLimit)
        );
        const unsub = onSnapshot(billQuery, (qs) => {
            const fetchedBills = qs.docs.map(doc => {
                const raw = doc.data();
                let d = new Date();
                if (raw.dueDate instanceof Timestamp) {
                    d = raw.dueDate.toDate();
                } else if (raw.dueDate) {
                    d = new Date(raw.dueDate);
                }
                return {
                    id: doc.id,
                    ...raw,
                    dueDate: isNaN(d.getTime()) ? new Date() : d,
                } as Bill;
            });

            // Sort: Unpaid first, then by due date (newest first)
            const sortedBills = fetchedBills.sort((a, b) => {
                // Unpaid bills come before paid bills
                if (a.isPaid !== b.isPaid) {
                    return a.isPaid ? 1 : -1;
                }
                // Within the same paid/unpaid group, sort by due date descending
                return b.dueDate.getTime() - a.dueDate.getTime();
            });
            setBills(sortedBills);
            if (sortedBills.length > 0) cacheService.set(getCacheKey('bills')!, sortedBills);
            setHasMoreBills(fetchedBills.length >= billsLimit);
            setErrors(prev => ({ ...prev, bills: null }));
        }, (err) => {
            console.error("FIREBASE ERROR (Bills):", err.message);
            let msg = err.message;
            if (msg.includes('index')) {
                msg = "Missing Firestore index for bills. Please check the browser console for the creation link.";
            }
            setErrors(prev => ({ ...prev, bills: msg }));
        });
        return unsub;
    }, [user, billsLimit]);

    // 4. Categories Listener
    useEffect(() => {
        if (!user) return;

        const catQuery = query(
            collection(db, "categories"),
            where("userId", "==", user.uid),
            orderBy("name", "asc")
        );

        const unsub = onSnapshot(catQuery, (qs) => {
            const userCategories = qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            const defaultCategories = categoryService.getDefaultCategories().map((cat, index) => ({
                id: `default-${index}`,
                ...cat
            } as Category));
            const allCategories = [...defaultCategories, ...userCategories];
            setCategories(allCategories);
            if (allCategories.length > 0) cacheService.set(getCacheKey('categories')!, allCategories);
            setErrors(prev => ({ ...prev, categories: null }));
        }, (err) => {
            console.error("FIREBASE ERROR (Categories):", err.message);
            setErrors(prev => ({ ...prev, categories: err.message }));
        });
        return unsub;
    }, [user]); // Re-run effect when limits change

    // Auto-process due bills when data is loaded
    const isProcessingBills = React.useRef(false);

    useEffect(() => {
        const processAutoBills = async () => {
            if (!auth.currentUser || loading || bills.length === 0 || wallets.length === 0 || isProcessingBills.current) {
                return;
            }

            // Check if there are any due bills to process
            if (!hasDueBills(bills)) {
                // Even if no bills to process, show notifications for overdue/upcoming
                // prevent notifications on auth pages
                const currentPath = window.location.pathname;
                if (!['/', '/login', '/register'].includes(currentPath)) {
                    showBillNotifications(bills);
                }
                return;
            }

            try {
                isProcessingBills.current = true;
                const result = await processDueBills(bills, wallets, auth.currentUser.uid, exchangeRates);

                if (result.processed > 0 || result.recurring > 0) {
                    // Log to internal analytics or keep for debugging
                }

                // Show notifications after processing
                const currentPath = window.location.pathname;
                if (!['/', '/login', '/register'].includes(currentPath)) {
                    showBillNotifications(bills);
                }
            } catch (error) {
                console.error("Error processing bills:", error);
            } finally {
                // With atomic transactions, we are safer. 
                // We keep a small delay to prevent rapid-fire triggers from snapshots 
                // while Firestore is still broadcasting the changes.
                setTimeout(() => {
                    isProcessingBills.current = false;
                }, 1000);
            }
        };

        processAutoBills();
    }, [bills, wallets, loading, exchangeRates]);

    useEffect(() => {
        const fetchRatesAndCurrencies = async () => {
            const [rates, currencies] = await Promise.all([
                currencyService.getAllRates(),
                currencyService.getSupportedCurrencies()
            ]);
            setExchangeRates(rates);
            setAvailableCurrencies(currencies);
        };
        fetchRatesAndCurrencies();
    }, []);

    // Memoize calculations with dynamic timeframe
    const stats = useMemo(() => {
        const now = new Date();
        let currentStart = startOfMonth(now);
        let currentEnd = endOfMonth(now);
        let prevStart = startOfMonth(subMonths(now, 1));
        let prevEnd = endOfMonth(subMonths(now, 1));

        switch (dashboardTimeframe) {
            case 'daily':
                currentStart = startOfDay(now);
                currentEnd = endOfDay(now);
                prevStart = startOfDay(subDays(now, 1));
                prevEnd = endOfDay(subDays(now, 1));
                break;
            case 'weekly':
                currentStart = startOfWeek(now);
                currentEnd = endOfWeek(now);
                prevStart = startOfWeek(subWeeks(now, 1));
                prevEnd = endOfWeek(subWeeks(now, 1));
                break;
            case 'monthly':
                currentStart = startOfMonth(now);
                currentEnd = endOfMonth(now);
                prevStart = startOfMonth(subMonths(now, 1));
                prevEnd = endOfMonth(subMonths(now, 1));
                break;
            case 'yearly':
                currentStart = startOfYear(now);
                currentEnd = endOfYear(now);
                prevStart = startOfYear(subYears(now, 1));
                prevEnd = endOfYear(subYears(now, 1));
                break;
        }

        const filterByDate = (txs: Transaction[], start: Date, end: Date) => {
            return txs.filter(t => t.date >= start && t.date <= end);
        };

        const calculateTotal = (txs: Transaction[], flow: 'income' | 'expense') => {
            return txs
                .filter(t => t.flow === flow)
                .reduce((sum, t) => {
                    const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.-]+/g, "") || "0");
                    const valUSD = currencyService.convertToUSD(val, t.currency || 'USD', exchangeRates);
                    const valBase = currencyService.convertFromUSD(valUSD, baseCurrency, exchangeRates);
                    return sum + Math.abs(valBase);
                }, 0);
        };

        const currentTxs = filterByDate(transactions, currentStart, currentEnd);
        const prevTxs = filterByDate(transactions, prevStart, prevEnd);

        const currentIncome = calculateTotal(currentTxs, 'income');
        const prevIncome = calculateTotal(prevTxs, 'income');
        const currentExpenses = calculateTotal(currentTxs, 'expense');
        const prevExpenses = calculateTotal(prevTxs, 'expense');

        const calculateChange = (current: number, prev: number) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return ((current - prev) / prev) * 100;
        };

        // Total Balance (Snapshot - always current total)
        const totalBalanceBase = wallets.reduce((sum, w) => {
            const valUSD = currencyService.convertToUSD(w.balance, w.currency || 'USD', exchangeRates);
            return sum + currencyService.convertFromUSD(valUSD, baseCurrency, exchangeRates);
        }, 0);

        // For balance change, ideally we'd need historical wallet balances. 
        // As a proxy, we use (Income - Expense) delta which contributes to balance change in the period.
        // OR better: we can calculate net cash flow for the period vs previous period? 
        // Let's stick to Income - Expense for "Profit/Net Flow" change

        return {
            totalBalance: totalBalanceBase,
            income: currentIncome,
            expenses: currentExpenses,
            profit: currentIncome - currentExpenses,
            incomeChange: calculateChange(currentIncome, prevIncome),
            expensesChange: calculateChange(currentExpenses, prevExpenses),
            balanceChange: calculateChange(currentIncome - currentExpenses, prevIncome - prevExpenses) // Net flow change
        };
    }, [wallets, transactions, exchangeRates, baseCurrency, dashboardTimeframe]);

    return (
        <FinanceContext.Provider value={{
            transactions,
            wallets,
            bills,
            categories,
            loading,
            errors,
            stats,
            baseCurrency,
            setBaseCurrency,
            dashboardTimeframe,
            setDashboardTimeframe,
            availableCurrencies,
            exchangeRates,
            loadMoreTransactions,
            hasMoreTransactions,
            loadMoreBills,
            hasMoreBills,
            refreshData,
            isInitialLoading
        }}>

            {children}
        </FinanceContext.Provider>
    );
};
