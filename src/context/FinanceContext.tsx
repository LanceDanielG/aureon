import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
        monthlyIncome: number;
        monthlyExpenses: number;
        profit: number;
    };
    baseCurrency: Currency;
    setBaseCurrency: (currency: Currency) => void;
    availableCurrencies: Record<string, string>;
    exchangeRates: Record<string, number>;
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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
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

    useEffect(() => {
        let unsubTransactions: () => void = () => { };
        let unsubWallets: () => void = () => { };
        let unsubBills: () => void = () => { };
        let unsubCategories: () => void = () => { };

        const authUnsubscribe = auth.onAuthStateChanged((user) => {
            // Cleanup existing listeners if any
            unsubTransactions();
            unsubWallets();
            unsubBills();
            unsubCategories();

            if (user) {
                setLoading(true);

                // 1. Transactions Listener
                const txQuery = query(
                    collection(db, "transactions"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc"),
                    limit(50)
                );

                unsubTransactions = onSnapshot(txQuery, { includeMetadataChanges: false }, (querySnapshot) => {
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
                        return { id: doc.id, ...rawData, date: txDate } as Transaction;
                    });
                    setTransactions(data);
                    setErrors(prev => ({ ...prev, transactions: null }));
                    setLoading(false);
                }, (err) => {
                    console.error("FIREBASE ERROR (Transactions):", err.message);
                    setErrors(prev => ({ ...prev, transactions: err.message }));
                    setLoading(false);
                });

                // 2. Wallets Listener
                const walletQuery = query(
                    collection(db, "wallets"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc"),
                    limit(20)
                );
                unsubWallets = onSnapshot(walletQuery, (qs) => {
                    setWallets(qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
                    setErrors(prev => ({ ...prev, wallets: null }));
                }, (err) => {
                    console.error("FIREBASE ERROR (Wallets):", err.message);
                    setErrors(prev => ({ ...prev, wallets: err.message }));
                });

                // 3. Bills Listener
                const billQuery = query(
                    collection(db, "bills"),
                    where("userId", "==", user.uid),
                    limit(50)
                );
                unsubBills = onSnapshot(billQuery, (qs) => {
                    const fetchedBills = qs.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        dueDate: doc.data().dueDate instanceof Timestamp ? doc.data().dueDate.toDate() : new Date(doc.data().dueDate),
                    } as Bill));

                    // Sort by dueDate client-side to avoid index requirement
                    setBills(fetchedBills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()));
                    setErrors(prev => ({ ...prev, bills: null }));
                }, (err) => {
                    console.error("FIREBASE ERROR (Bills):", err.message);
                    setErrors(prev => ({ ...prev, bills: err.message }));
                });

                // 4. Categories Listener
                const catQuery = query(
                    collection(db, "categories"),
                    where("userId", "==", user.uid),
                    orderBy("name", "asc")
                );

                unsubCategories = onSnapshot(catQuery, (qs) => {
                    const userCategories = qs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                    const defaultCategories = categoryService.getDefaultCategories().map((cat, index) => ({
                        id: `default-${index}`,
                        ...cat
                    } as Category));

                    // Merge: take defaults, then override with specifically named user categories if needed
                    // (Or just combine them for a rich selection)
                    setCategories([...defaultCategories, ...userCategories]);
                    setErrors(prev => ({ ...prev, categories: null }));
                }, (err) => {
                    console.error("FIREBASE ERROR (Categories):", err.message);
                    setErrors(prev => ({ ...prev, categories: err.message }));
                });

            } else {
                setTransactions([]);
                setWallets([]);
                setBills([]);
                setCategories([]);
                setErrors({ transactions: null, wallets: null, bills: null, categories: null });
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            unsubTransactions();
            unsubWallets();
            unsubBills();
            unsubCategories();
        };
    }, []);

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

    // Memoize calculations
    const stats = useMemo(() => {
        // Normalize all balances to the selected baseCurrency
        const totalBalanceBase = wallets.reduce((sum, w) => {
            const valUSD = currencyService.convertToUSD(w.balance, w.currency || 'USD', exchangeRates);
            return sum + currencyService.convertFromUSD(valUSD, baseCurrency, exchangeRates);
        }, 0);

        const incomeBase = transactions
            .filter(t => t.flow === 'income')
            .reduce((sum, t) => {
                const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.-]+/g, "") || "0");
                const valUSD = currencyService.convertToUSD(val, t.currency || 'USD', exchangeRates);
                return sum + currencyService.convertFromUSD(valUSD, baseCurrency, exchangeRates);
            }, 0);

        const expensesBase = transactions
            .filter(t => t.flow === 'expense')
            .reduce((sum, t) => {
                const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.-]+/g, "") || "0");
                const valUSD = currencyService.convertToUSD(val, t.currency || 'USD', exchangeRates);
                return sum + Math.abs(currencyService.convertFromUSD(valUSD, baseCurrency, exchangeRates));
            }, 0);

        return {
            totalBalance: totalBalanceBase,
            monthlyIncome: incomeBase,
            monthlyExpenses: expensesBase,
            profit: incomeBase - expensesBase
        };
    }, [wallets, transactions, exchangeRates, baseCurrency]);

    return (
        <FinanceContext.Provider value={{ transactions, wallets, bills, categories, loading, errors, stats, baseCurrency, setBaseCurrency, availableCurrencies, exchangeRates }}>
            {children}
        </FinanceContext.Provider>
    );
};
