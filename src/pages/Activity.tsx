import { useState, useEffect } from "react";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import TransactionItem from "../components/Common/TransactionItem";
import { Card, CardContent, Typography, Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Divider, List, useTheme, useMediaQuery, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, TablePagination } from "@mui/material";
import { Add, CallReceived, CallMade, Category as CategoryIconMD, Download } from "@mui/icons-material";
import { transactionService, type Transaction } from "../services/transactionService";
import { auth } from "../config/firebase";
import { toast } from "react-hot-toast";
import { useFinance } from "../context/FinanceContext";
import { currencyService, type Currency } from "../services/currencyService";
import { categoryService, findSuggestion } from "../services/categoryService";
import CategoryIcon, { getMaterialIcon } from "../components/Common/CategoryIcon";
import { TransactionItemSkeleton, TransactionTableRowSkeleton } from "../components/Common/Skeletons";
import ExportDialog from "../components/Common/ExportDialog";



export default function Activity() {
    const { transactions, wallets, categories, loading, isInitialLoading, errors, availableCurrencies, exchangeRates, baseCurrency, loadMoreTransactions, hasMoreTransactions } = useFinance();
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmEditOpen, setConfirmEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const MAX_AMOUNT = 1000000000; // 1 Billion limit

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

    const [visibleTx, setVisibleTx] = useState(5);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');

    const filteredTransactions = transactions.filter(tx => {
        const category = categories.find(c => c.id === tx.categoryId);
        const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || tx.categoryId === filterCategory || (category?.name === filterCategory);
        const matchesType = filterType === 'all' || tx.flow === filterType;

        return matchesSearch && matchesCategory && matchesType;
    });

    const displayedTransactions = isMobile ? filteredTransactions.slice(0, visibleTx) : filteredTransactions;

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedTransactions = !isMobile ? filteredTransactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage) : [];

    const [exportDialogOpen, setExportDialogOpen] = useState(false);

    const handleExport = async (options: import('../components/Common/ExportDialog').ExportOptions) => {
        const { exportService } = await import('../services/exportService');

        // Filter transactions based on options
        const filtered = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            const start = new Date(options.startDate);
            const end = new Date(options.endDate);
            // Set end date to end of day
            end.setHours(23, 59, 59, 999);

            const matchesDate = txDate >= start && txDate <= end;
            const matchesCategory = options.category === 'all' || tx.subtitle === options.category || (categories.find(c => c.id === tx.categoryId)?.name === options.category);

            const matchesType = options.type === 'all' || tx.flow === options.type;

            const matchesSearch = !options.search ||
                tx.title.toLowerCase().includes(options.search.toLowerCase()) ||
                (tx.subtitle && tx.subtitle.toLowerCase().includes(options.search.toLowerCase()));

            return matchesDate && matchesCategory && matchesType && matchesSearch;
        });

        if (options.format === 'pdf') {
            exportService.exportTransactionsToPDF(filtered, {
                dateRange: { start: new Date(options.startDate), end: new Date(options.endDate) },
                category: options.category,
                type: options.type,
                search: options.search
            });
        } else {
            exportService.exportTransactionsToExcel(filtered);
        }
    };


    useEffect(() => {
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

        const amountNum = Math.abs(parseFloat(newTx.amount.replace(/[^0-9.]/g, "") || "0"));
        if (amountNum > MAX_AMOUNT) {
            toast.error(`Amount exceeds maximum limit of ${currencyService.formatClean(MAX_AMOUNT, newTx.currency)}`);
            return;
        }

        setConfirmOpen(true);
    };

    const handleConfirmAdd = async () => {
        if (!auth.currentUser) return;
        setConfirmOpen(false);
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
                        `Insufficient balance in ${sourceWallet.name}. Available: ${currencyService.formatClean(sourceWallet.balance, sourceCurrency)}, Need: ${currencyService.formatClean(sourceAmount, sourceCurrency)}`
                    );
                    setSubmitting(false);
                    return;
                }

                // Create expense transaction from source wallet
                await transactionService.addTransactionWithWallet({
                    userId: auth.currentUser!.uid,
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
                    userId: auth.currentUser!.uid,
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
                            `Insufficient balance in ${selectedWallet.name}. Available: ${currencyService.formatClean(selectedWallet.balance, walletCurrency)}, Required: ${currencyService.formatClean(expenseAmount, walletCurrency)}`
                        );
                        setSubmitting(false);
                        return;
                    }
                }
            }

            await transactionService.addTransactionWithWallet({
                userId: auth.currentUser!.uid,
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

    const handleEdit = (tx: Transaction) => {
        setEditingTransaction(tx);
        setNewTx({
            title: tx.title,
            subtitle: tx.subtitle || '',
            amount: Math.abs(tx.amount).toString(),
            flow: tx.flow,
            categoryId: tx.categoryId,
            walletId: tx.walletId || '',
            destinationWalletId: '',
            currency: tx.currency
        });
        setOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingTransaction || !auth.currentUser || submitting) return;

        const amountNum = Math.abs(parseFloat(newTx.amount.replace(/[^0-9.]/g, "") || "0"));
        if (amountNum > MAX_AMOUNT) {
            toast.error(`Amount exceeds maximum limit of ${currencyService.formatClean(MAX_AMOUNT, newTx.currency)}`);
            return;
        }

        setConfirmEditOpen(true);
    };

    const handleConfirmUpdate = async () => {
        if (!editingTransaction || !auth.currentUser || submitting) return;

        const amountNum = Math.abs(parseFloat(newTx.amount.replace(/[^0-9.]/g, "") || "0"));

        setConfirmEditOpen(false);
        setSubmitting(true);
        try {
            let amountValue = amountNum;
            if (newTx.flow === 'expense') {
                amountValue = -amountValue;
            }

            await transactionService.updateTransaction(editingTransaction.id!, {
                title: newTx.title,
                subtitle: newTx.subtitle,
                amount: amountValue,
                flow: newTx.flow,
                categoryId: newTx.categoryId,
                currency: newTx.currency,
                walletId: newTx.walletId || undefined
            });

            toast.success("Transaction updated!");
            setOpen(false);
            setEditingTransaction(null);
            setNewTx({ title: '', subtitle: '', amount: '', flow: 'expense', categoryId: '', walletId: '', destinationWalletId: '', currency: 'USD' });
        } catch {
            toast.error("Failed to update transaction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (tx: Transaction) => {
        setDeletingTransaction(tx);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingTransaction || !auth.currentUser || submitting) return;
        setSubmitting(true);
        try {
            await transactionService.deleteTransactionWithWallet(deletingTransaction.id!, exchangeRates);
            toast.success("Transaction deleted!");
            setDeleteConfirmOpen(false);
            setDeletingTransaction(null);
        } catch {
            toast.error("Failed to delete transaction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.name || !auth.currentUser) {
            toast.error("Please enter a category name");
            return;
        }

        try {
            await categoryService.addCategory(auth.currentUser.uid, {
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

            <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' }, gap: 3, mb: 4 }}>
                        <Typography variant="h6" fontWeight="bold">Transactions</Typography>

                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', lg: 'auto' } }}>
                            <TextField
                                placeholder="Search title or subtitle..."
                                size="small"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: { xs: '100%', sm: 250 } }}
                            />

                            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="all">All Categories</MenuItem>
                                    {categories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="income">Income</MenuItem>
                                    <MenuItem value="expense">Expense</MenuItem>
                                    <MenuItem value="transfer">Transfer</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setExportDialogOpen(true)}
                                startIcon={<Download sx={{ fontSize: 16 }} />}
                                sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#06b6d4', color: '#06b6d4', height: 40, width: { xs: '100%', sm: 'auto' } }}
                            >
                                Export Report
                            </Button>
                        </Box>
                    </Box>

                    {isInitialLoading ? (
                        isMobile ? (
                            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                                <TransactionItemSkeleton />
                            </List>
                        ) : (
                            <TableContainer component={Paper} elevation={0}>
                                <Table sx={{ minWidth: 650 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell>Wallet</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TransactionTableRowSkeleton />
                                        <TransactionTableRowSkeleton />
                                        <TransactionTableRowSkeleton />
                                        <TransactionTableRowSkeleton />
                                        <TransactionTableRowSkeleton />
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )
                    ) : loading ? (
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
                        <Box>
                            {isMobile ? (
                                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                                    {displayedTransactions.map((item, index) => {
                                        const category = categories.find(c => c.id === item.categoryId);

                                        return (
                                            <TransactionItem
                                                key={item.id}
                                                title={item.title}
                                                subtitle={item.subtitle || category?.name || 'General'}
                                                walletName={wallets.find(w => w.id === item.walletId)?.name}
                                                amount={(() => {
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const formatted = currencyService.formatClean(Math.abs(num), item.currency || 'USD');
                                                    return num > 0 ? `+${formatted}` : `-${formatted}`;
                                                })()}
                                                secondaryAmount={(() => {
                                                    const baseCur = baseCurrency || 'USD';
                                                    if (item.currency === baseCur) return undefined;
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const amountUSD = currencyService.convertToUSD(Math.abs(num), item.currency || 'USD', exchangeRates);
                                                    const amountBase = currencyService.convertFromUSD(amountUSD, baseCur, exchangeRates);
                                                    return currencyService.formatClean(amountBase, baseCur);
                                                })()}
                                                date={item.date.toLocaleDateString()}
                                                icon={category ? getMaterialIcon(category.icon) : (item.flow === 'income' ? <CallMade /> : <CallReceived />)}
                                                iconColor={category?.color || (item.flow === 'income' ? '#10b981' : '#ef4444')}
                                                iconBgColor={category?.bgColor || (item.flow === 'income' ? '#ecfdf5' : '#fef2f2')}
                                                isLast={index === displayedTransactions.length - 1}
                                                onEdit={() => handleEdit(item)}
                                                onDelete={() => handleDeleteClick(item)}
                                            />
                                        );
                                    })}
                                </List>
                            ) : (
                                <Box>
                                    <TableContainer component={Paper} elevation={0}>
                                        <Table sx={{ minWidth: 650 }} aria-label="transaction table">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell>Category</TableCell>
                                                    <TableCell>Wallet</TableCell>
                                                    <TableCell align="right">Amount</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {paginatedTransactions.map((item) => {
                                                    const category = categories.find(c => c.id === item.categoryId);
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const amountFormatted = currencyService.formatClean(Math.abs(num), item.currency || 'USD');
                                                    const isIncome = num > 0;

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                        >
                                                            <TableCell component="th" scope="row">
                                                                {item.date.toLocaleDateString()}
                                                                <Typography variant="caption" color="text.secondary" display="block">
                                                                    {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="500">{item.title}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    {category ? (
                                                                        <CategoryIcon category={category} size="small" />
                                                                    ) : (
                                                                        <Avatar sx={{
                                                                            width: 24,
                                                                            height: 24,
                                                                            bgcolor: item.flow === 'income' ? '#ecfdf5' : '#fef2f2',
                                                                            color: item.flow === 'income' ? '#10b981' : '#ef4444'
                                                                        }}>
                                                                            {item.flow === 'income' ? <CallMade sx={{ fontSize: 16 }} /> : <CallReceived sx={{ fontSize: 16 }} />}
                                                                        </Avatar>
                                                                    )}
                                                                    <Typography variant="body2">{category?.name || 'General'}</Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {wallets.find(w => w.id === item.walletId)?.name || (
                                                                        <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>None</Box>
                                                                    )}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight="600"
                                                                    sx={{ color: isIncome ? '#10b981' : '#ef4444' }}
                                                                >
                                                                    {isIncome ? '+' : '-'}{amountFormatted}
                                                                </Typography>
                                                                {item.currency !== baseCurrency && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {(() => {
                                                                            const amountUSD = currencyService.convertToUSD(Math.abs(num), item.currency || 'USD', exchangeRates);
                                                                            const amountBase = currencyService.convertFromUSD(amountUSD, baseCurrency || 'USD', exchangeRates);
                                                                            return `≈ ${currencyService.formatClean(amountBase, baseCurrency || 'USD')}`;
                                                                        })()}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                                    <Button size="small" onClick={() => handleEdit(item)} sx={{ color: '#06b6d4' }}>Edit</Button>
                                                                    <Button size="small" onClick={() => handleDeleteClick(item)} sx={{ color: '#ef4444' }}>Delete</Button>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25]}
                                        component="div"
                                        count={filteredTransactions.length}
                                        rowsPerPage={rowsPerPage}
                                        page={page}
                                        onPageChange={handleChangePage}
                                        onRowsPerPageChange={handleChangeRowsPerPage}
                                    />
                                    {hasMoreTransactions && (
                                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Button
                                                onClick={loadMoreTransactions}
                                                variant="outlined"
                                                size="small"
                                                sx={{ borderRadius: 4, textTransform: 'none', borderColor: '#06b6d4', color: '#06b6d4' }}
                                            >
                                                Load More Transactions from Server
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Mobile View More Button */}
                            {isMobile && filteredTransactions.length > visibleTx && (
                                <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        onClick={() => setVisibleTx(prev => prev + 5)}
                                        size="small"
                                        sx={{ textTransform: 'none', color: '#06b6d4' }}
                                    >
                                        View More ({filteredTransactions.length - visibleTx} more)
                                    </Button>
                                </Box>
                            )}

                            {/* Pagination / Load More */}
                            {hasMoreTransactions && (
                                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        onClick={loadMoreTransactions}
                                        variant="outlined"
                                        size="small"
                                        sx={{ borderRadius: 4, textTransform: 'none', borderColor: '#06b6d4', color: '#06b6d4' }}
                                    >
                                        Load More from Server
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Transaction Dialog */}
            <Dialog open={open} onClose={() => { setOpen(false); setEditingTransaction(null); }} fullWidth maxWidth="xs">
                <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
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
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, "");
                                    const dotCount = (val.match(/\./g) || []).length;
                                    if (dotCount > 1) return;
                                    setNewTx({ ...newTx, amount: val });
                                }}
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
                    <Button onClick={() => { setOpen(false); setEditingTransaction(null); }} disabled={submitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={editingTransaction ? handleUpdate : handleAdd}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        {submitting ? 'Processing...' : (editingTransaction ? 'Update' : 'Add')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm Transaction</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {newTx.flow === 'income' ? 'add' : 'record'} this {newTx.flow} of <strong>{currencyService.formatClean(parseFloat(newTx.amount) || 0, newTx.currency)}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAdd}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => !submitting && setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#ef4444', fontWeight: 'bold' }}>Delete Transaction</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{deletingTransaction?.title}</strong>? This will reverse its impact on your wallet balance.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmDelete}
                        disabled={submitting}
                        color="error"
                    >
                        {submitting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Confirmation Dialog */}
            <Dialog open={confirmEditOpen} onClose={() => setConfirmEditOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm Changes</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to save changes to <strong>{editingTransaction?.title}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmEditOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmUpdate}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Save Changes
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
            {/* Export Dialog */}
            <ExportDialog
                open={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onExport={handleExport}
                categories={categories}
            />
        </MainLayout >
    );
}
