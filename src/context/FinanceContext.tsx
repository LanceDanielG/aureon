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
    const [errors, setErrors] = useState<{
        transactions: string | null;
        wallets: string | null;
        bills: string | null;
        categories: string | null;
    }>({ transactions: null, wallets: null, bills: null, categories: null });

    const [user, setUser] = useState(auth.currentUser);

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
            } else {
                setLoading(true);
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
            setHasMoreTransactions(data.length >= transactionLimit);
            setErrors(prev => ({ ...prev, transactions: null }));
            setLoading(false);
        }, (err) => {
            console.error("FIREBASE ERROR (Transactions):", err.message);
            setErrors(prev => ({ ...prev, transactions: err.message }));
            setLoading(false);
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
            setWallets(qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
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

            const sortedBills = fetchedBills.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
            setBills(sortedBills);
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
            setCategories([...defaultCategories, ...userCategories]);
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
                showBillNotifications(bills);
                return;
            }

            try {
                isProcessingBills.current = true;
                const result = await processDueBills(bills, wallets, auth.currentUser.uid, exchangeRates);

                if (result.processed > 0 || result.recurring > 0) {
                    console.log(`Bill processing complete: ${result.processed} paid, ${result.recurring} recurring created, ${result.failed} failed`);
                }

                // Show notifications after processing
                showBillNotifications(bills);
            } catch (error) {
                console.error("Error processing bills:", error);
            } finally {
                // Add a small delay before allowing next run to let Firebase updates settle
                setTimeout(() => {
                    isProcessingBills.current = false;
                }, 2000);
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
            hasMoreBills
        }}>
            {children}
        </FinanceContext.Provider>
    );
};
