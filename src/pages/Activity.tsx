import { useState } from "react";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import TransactionItem from "../components/Common/TransactionItem";
import { Card, CardContent, Typography, Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Divider, List } from "@mui/material";
import { Add, CallReceived, CallMade, Category as CategoryIconMD } from "@mui/icons-material";
import { transactionService, type Transaction } from "../services/transactionService";
import { auth } from "../config/firebase";
import { toast } from "react-hot-toast";
import { useFinance } from "../context/FinanceContext";
import { currencyService, type Currency } from "../services/currencyService";
import { categoryService, findSuggestion } from "../services/categoryService";
import { useEffect as useStandardEffect } from "react";
import CategoryIcon, { getMaterialIcon } from "../components/Common/CategoryIcon";

export default function Activity() {
    const { transactions, wallets, categories, loading, errors, availableCurrencies, exchangeRates, baseCurrency } = useFinance();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newTx, setNewTx] = useState({
        title: '',
        subtitle: '',
        amount: '',
        flow: 'expense' as Transaction['flow'],
        categoryId: '',
        walletId: '',
        destinationWalletId: '', // For transfers
        currency: 'USD' as Currency
    });

    const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
    const [newCategory, setNewCategory] = useState({
        name: '',
        icon: 'payments',
        color: '#10b981',
        bgColor: '#ecfdf5',
        flow: 'expense' as Transaction['flow']
    });

    // Smart Suggest Logic
    useStandardEffect(() => {
        const suggestion = findSuggestion(newCategory.name);
        if (suggestion) {
            setNewCategory(prev => ({
                ...prev,
                icon: suggestion.icon,
                color: suggestion.color,
                bgColor: suggestion.bg
            }));
        }
    }, [newCategory.name]);

    const handleAdd = async () => {
        if (!auth.currentUser || submitting) return;
        if (!newTx.title || !newTx.amount) {
            toast.error("Please fill in required fields");
            return;
        }

        setSubmitting(true);
        try {
            // Handle wallet-to-wallet transfer
            if (newTx.flow === 'transfer') {
                if (!newTx.walletId || !newTx.destinationWalletId) {
                    toast.error("Please select both source and destination wallets");
                    setSubmitting(false);
                    return;
                }

                if (newTx.walletId === newTx.destinationWalletId) {
                    toast.error("Source and destination wallets must be different");
                    setSubmitting(false);
                    return;
                }

                const sourceWallet = wallets.find(w => w.id === newTx.walletId);
                const destWallet = wallets.find(w => w.id === newTx.destinationWalletId);

                if (!sourceWallet || !destWallet) {
                    toast.error("Selected wallets not found");
                    setSubmitting(false);
                    return;
                }

                const transferAmount = parseFloat(newTx.amount.replace(/[^0-9.]/g, "") || "0");
                const sourceCurrency = sourceWallet.currency || 'USD';
                let sourceAmount = transferAmount;

                // Convert to source wallet currency if needed
                if (newTx.currency !== sourceCurrency) {
                    const amountUSD = currencyService.convertToUSD(transferAmount, newTx.currency, exchangeRates);
                    sourceAmount = currencyService.convertFromUSD(amountUSD, sourceCurrency, exchangeRates);
                }

                // Check source wallet balance
                if (sourceWallet.balance < sourceAmount) {
                    toast.error(
                        `Insufficient balance in ${sourceWallet.name}. Available: ${currencyService.format(sourceWallet.balance, sourceCurrency)}, Need: ${currencyService.format(sourceAmount, sourceCurrency)}`
                    );
                    setSubmitting(false);
                    return;
                }

                // Create expense transaction from source wallet
                await transactionService.addTransactionWithWallet({
                    userId: auth.currentUser.uid,
                    title: `Transfer to ${destWallet.name}`,
                    subtitle: newTx.subtitle || 'Wallet Transfer',
                    amount: -sourceAmount,
                    flow: 'expense',
                    categoryId: newTx.categoryId || 'transfer',
                    currency: sourceCurrency,
                    date: new Date(),
                    walletId: newTx.walletId
                }, exchangeRates);

                // Create income transaction to destination wallet
                const destCurrency = destWallet.currency || 'USD';
                let destAmount = transferAmount;

                // Convert to destination wallet currency if needed
                if (newTx.currency !== destCurrency) {
                    const amountUSD = currencyService.convertToUSD(transferAmount, newTx.currency, exchangeRates);
                    destAmount = currencyService.convertFromUSD(amountUSD, destCurrency, exchangeRates);
                }

                await transactionService.addTransactionWithWallet({
                    userId: auth.currentUser.uid,
                    title: `Transfer from ${sourceWallet.name}`,
                    subtitle: newTx.subtitle || 'Wallet Transfer',
                    amount: destAmount,
                    flow: 'income',
                    categoryId: newTx.categoryId || 'transfer',
                    currency: destCurrency,
                    date: new Date(),
                    walletId: newTx.destinationWalletId
                }, exchangeRates);

                toast.success("Transfer completed!");
                setOpen(false);
                setNewTx({ title: '', subtitle: '', amount: '', flow: 'expense', categoryId: '', walletId: '', destinationWalletId: '', currency: 'USD' });
                setSubmitting(false);
                return;
            }

            // Parse amount and ensure sign matches flow
            let amountValue = Math.abs(parseFloat(newTx.amount.replace(/[^0-9.]/g, "") || "0"));
            if (newTx.flow === 'expense') {
                amountValue = -amountValue;
            }

            // Validate wallet balance for expenses
            if (newTx.flow === 'expense' && newTx.walletId) {
                const selectedWallet = wallets.find(w => w.id === newTx.walletId);
                if (selectedWallet) {
                    const walletCurrency = selectedWallet.currency || 'USD';
                    let expenseAmount = Math.abs(amountValue);

                    // Convert expense to wallet currency if needed
                    if (newTx.currency !== walletCurrency) {
                        const amountUSD = currencyService.convertToUSD(expenseAmount, newTx.currency, exchangeRates);
                        expenseAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                    }

                    if (selectedWallet.balance < expenseAmount) {
                        toast.error(
                            `Insufficient balance in ${selectedWallet.name}. Available: ${currencyService.format(selectedWallet.balance, walletCurrency)}, Required: ${currencyService.format(expenseAmount, walletCurrency)}`
                        );
                        setSubmitting(false);
                        return;
                    }
                }
            }

            await transactionService.addTransactionWithWallet({
                userId: auth.currentUser.uid,
                title: newTx.title,
                subtitle: newTx.subtitle,
                amount: amountValue,
                flow: newTx.flow,
                categoryId: newTx.categoryId,
                currency: newTx.currency,
                date: new Date(),
                walletId: newTx.walletId || undefined
            }, exchangeRates);

            toast.success("Transaction recorded!");
            setOpen(false);
            setNewTx({ title: '', subtitle: '', amount: '', flow: 'expense', categoryId: '', walletId: '', destinationWalletId: '', currency: 'USD' });
        } catch {
            toast.error("Failed to add transaction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.name) {
            toast.error("Please enter a category name");
            return;
        }

        try {
            await categoryService.addCategory(auth.currentUser!.uid, {
                ...newCategory,
                flow: newCategory.flow === 'transfer' ? 'expense' : newCategory.flow
            });
            toast.success("Category created!");
            setOpenCategoryDialog(false);
            setNewCategory({ name: '', icon: 'payments', color: '#10b981', bgColor: '#ecfdf5', flow: newCategory.flow });
        } catch {
            toast.error("Failed to create category");
        }
    };

    return (
        <MainLayout>
            <PageHeader
                title="Activity"
                subtitle="Your recent financial activities."
                action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<CategoryIconMD />}
                            onClick={() => setOpenCategoryDialog(true)}
                            size="small"
                        >
                            Categories
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setOpen(true)}
                            size="small"
                            sx={{ borderRadius: 2, bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                        >
                            Add New
                        </Button>
                    </Box>
                }
            />

            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">Transactions</Typography>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : errors.transactions ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="error" gutterBottom>
                                Error loading transactions:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                                {errors.transactions}
                            </Typography>
                        </Box>
                    ) : transactions.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                            No transactions found.
                        </Typography>
                    ) : (
                        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                            {transactions.map((item, index) => {
                                const category = categories.find(c => c.id === item.categoryId);

                                return (
                                    <TransactionItem
                                        key={item.id}
                                        title={item.title}
                                        subtitle={item.subtitle || category?.name || 'General'}
                                        amount={(() => {
                                            const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                            const formatted = currencyService.format(Math.abs(num), item.currency || 'USD');
                                            return num > 0 ? `+${formatted}` : `-${formatted}`;
                                        })()}
                                        secondaryAmount={(() => {
                                            const baseCur = baseCurrency || 'USD';
                                            if (item.currency === baseCur) return undefined;
                                            const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                            const amountUSD = currencyService.convertToUSD(Math.abs(num), item.currency || 'USD', exchangeRates);
                                            const amountBase = currencyService.convertFromUSD(amountUSD, baseCur, exchangeRates);
                                            return currencyService.format(amountBase, baseCur);
                                        })()}
                                        date={item.date.toLocaleDateString()}
                                        icon={category ? getMaterialIcon(category.icon) : (item.flow === 'income' ? <CallReceived /> : <CallMade />)}
                                        iconColor={category?.color || (item.flow === 'income' ? '#10b981' : '#ef4444')}
                                        iconBgColor={category?.bgColor || (item.flow === 'income' ? '#ecfdf5' : '#fef2f2')}
                                        isLast={index === transactions.length - 1}
                                    />
                                );
                            })}
                        </List>
                    )}
                </CardContent>
            </Card>

            {/* Add Transaction Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Stack direction="row" spacing={2}>
                            <FormControl fullWidth required>
                                <InputLabel>Currency</InputLabel>
                                <Select
                                    value={newTx.currency}
                                    label="Currency"
                                    onChange={(e) => setNewTx({ ...newTx, currency: e.target.value as Currency })}
                                >
                                    {Object.entries(availableCurrencies).map(([code, name]) => (
                                        <MenuItem key={code} value={code}>
                                            {code} ({currencyService.getSymbol(code)}) - {name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Amount"
                                type="text"
                                value={newTx.amount}
                                onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </Stack>
                        <TextField
                            label="Title"
                            placeholder="e.g. Apple Store"
                            fullWidth
                            value={newTx.title}
                            onChange={(e) => setNewTx({ ...newTx, title: e.target.value })}
                        />
                        <TextField
                            label="Subtitle (Description)"
                            placeholder="e.g. Electronics"
                            fullWidth
                            value={newTx.subtitle}
                            onChange={(e) => setNewTx({ ...newTx, subtitle: e.target.value })}
                        />
                        <Stack spacing={1}>
                            <InputLabel shrink sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Transaction Flow</InputLabel>
                            <ToggleButtonGroup
                                value={newTx.flow}
                                exclusive
                                onChange={(_, val) => {
                                    if (val) setNewTx({ ...newTx, flow: val, categoryId: '', walletId: '', destinationWalletId: '' });
                                }}
                                fullWidth
                                size="small"
                                color="primary"
                            >
                                <ToggleButton value="income" sx={{ py: 1 }}>Income</ToggleButton>
                                <ToggleButton value="expense" sx={{ py: 1 }}>Expense</ToggleButton>
                                <ToggleButton value="transfer" sx={{ py: 1 }}>Transfer</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>

                        {newTx.flow === 'transfer' ? (
                            <>
                                <FormControl fullWidth required>
                                    <InputLabel>From Wallet</InputLabel>
                                    <Select
                                        value={newTx.walletId}
                                        label="From Wallet"
                                        onChange={(e) => setNewTx({ ...newTx, walletId: e.target.value })}
                                    >
                                        {wallets.map(w => (
                                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth required>
                                    <InputLabel>To Wallet</InputLabel>
                                    <Select
                                        value={newTx.destinationWalletId}
                                        label="To Wallet"
                                        onChange={(e) => setNewTx({ ...newTx, destinationWalletId: e.target.value })}
                                    >
                                        {wallets.filter(w => w.id !== newTx.walletId).map(w => (
                                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </>
                        ) : (
                            <>
                                <FormControl fullWidth required>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={newTx.categoryId}
                                        label="Category"
                                        onChange={(e) => setNewTx({ ...newTx, categoryId: e.target.value })}
                                    >
                                        {categories.filter(c => c.flow === newTx.flow).map(cat => (
                                            <MenuItem key={cat.id} value={cat.id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CategoryIcon category={cat} size="small" />
                                                    {cat.name}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                        <Divider />
                                        <MenuItem onClick={() => { setOpenCategoryDialog(true); setNewCategory({ ...newCategory, flow: newTx.flow }); }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#06b6d4' }}>
                                                <Add fontSize="small" />
                                                Quick Create Category
                                            </Box>
                                        </MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Target Wallet</InputLabel>
                                    <Select
                                        value={newTx.walletId}
                                        label="Target Wallet"
                                        onChange={(e) => setNewTx({ ...newTx, walletId: e.target.value })}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {wallets.map(w => (
                                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        {submitting ? 'Adding...' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Category Dialog */}
            <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <ToggleButtonGroup
                            value={newCategory.flow}
                            exclusive
                            onChange={(_, val) => val && setNewCategory({ ...newCategory, flow: val })}
                            fullWidth
                        >
                            <ToggleButton value="income">Income</ToggleButton>
                            <ToggleButton value="expense">Expense</ToggleButton>
                        </ToggleButtonGroup>

                        <TextField
                            fullWidth
                            label="Category Name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="e.g. Health, Gift, Bonus"
                        />

                        <FormControl fullWidth>
                            <InputLabel>Icon</InputLabel>
                            <Select
                                value={newCategory.icon}
                                label="Icon"
                                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                            >
                                <MenuItem value="payments">Payment</MenuItem>
                                <MenuItem value="restaurant">Food</MenuItem>
                                <MenuItem value="shopping_bag">Shopping</MenuItem>
                                <MenuItem value="home">Home</MenuItem>
                                <MenuItem value="directions_car">Auto</MenuItem>
                                <MenuItem value="bolt">Utility</MenuItem>
                                <MenuItem value="work">Work</MenuItem>
                                <MenuItem value="trending_up">Investment</MenuItem>
                            </Select>
                        </FormControl>

                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                Pick a Color
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {[
                                    { color: '#10b981', bg: '#ecfdf5' },
                                    { color: '#ef4444', bg: '#fef2f2' },
                                    { color: '#3b82f6', bg: '#eff6ff' },
                                    { color: '#f59e0b', bg: '#fffbeb' },
                                    { color: '#8b5cf6', bg: '#f5f3ff' },
                                    { color: '#ec4899', bg: '#fdf2f8' }
                                ].map((item) => (
                                    <Box
                                        key={item.color}
                                        onClick={() => setNewCategory({ ...newCategory, color: item.color, bgColor: item.bg })}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: item.color,
                                            cursor: 'pointer',
                                            border: newCategory.color === item.color ? '2px solid black' : 'none',
                                            transform: newCategory.color === item.color ? 'scale(1.1)' : 'none',
                                            transition: 'transform 0.2s'
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddCategory} disabled={!newCategory.name}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </MainLayout>
    );
}
