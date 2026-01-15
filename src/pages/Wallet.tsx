import { useState } from "react";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import GradientCard from "../components/Common/GradientCard";
import {
    Box, Typography, Card, CardContent, Grid, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    List, ListItem, ListItemText, Chip, Divider, CircularProgress,
    MenuItem, Select, InputLabel, FormControl, useTheme, useMediaQuery,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, Tooltip
} from "@mui/material";
import { Add, AccountBalance, Payments, CheckCircle, Download, CreditCard, Savings, Wallet as WalletIcon, AttachMoney, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { getMaterialIcon } from "../components/Common/CategoryIcon";
import { WalletCardSkeleton, BillTableRowSkeleton } from "../components/Common/Skeletons";

import ExportDialog from "../components/Common/ExportDialog";
import { useFinance } from "../context/FinanceContext";
import { walletService } from "../services/walletService";
import { billService, type Bill } from "../services/billService";
import { transactionService } from "../services/transactionService";
import { auth } from "../config/firebase";
import { toast } from "react-hot-toast";
import { currencyService, type Currency } from "../services/currencyService";

const getWalletIcon = (iconName: string) => {
    switch (iconName) {
        case 'CreditCard': return <CreditCard />;
        case 'Savings': return <Savings />;
        case 'Wallet': return <WalletIcon />;
        case 'AttachMoney': return <AttachMoney />;
        case 'AccountBalance':
        default: return <AccountBalance />;
    }
};

export default function Wallet() {
    const { wallets, bills, categories, loading, isInitialLoading, errors, baseCurrency, availableCurrencies, exchangeRates, loadMoreBills, hasMoreBills } = useFinance();
    const [walletOpen, setWalletOpen] = useState(false);
    const [confirmWalletOpen, setConfirmWalletOpen] = useState(false);

    const [billOpen, setBillOpen] = useState(false);
    const [confirmPayOpen, setConfirmPayOpen] = useState(false);
    const [confirmBillOpen, setConfirmBillOpen] = useState(false);
    const [confirmEditBillOpen, setConfirmEditBillOpen] = useState(false);
    const [deleteBillOpen, setDeleteBillOpen] = useState(false);
    const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
    const [pendingPayData, setPendingPayData] = useState<{ id: string, amount: number, currency: Currency, title: string, walletId?: string } | null>(null);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [submitting, setSubmitting] = useState(false);
    // New Dialog states for past-date and duplicate warnings
    const [pastDateWarningOpen, setPastDateWarningOpen] = useState(false);
    const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);

    const MAX_AMOUNT = 1000000000; // 1 Billion limit

    const [newWallet, setNewWallet] = useState({ name: '', balance: '', icon: 'AccountBalance', currency: 'USD' as Currency, color: '#06b6d4' });
    const [visibleWallets, setVisibleWallets] = useState(3);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const displayedWallets = isMobile ? wallets.slice(0, visibleWallets) : wallets;


    const [billSearch, setBillSearch] = useState('');
    const [billCategory, setBillCategory] = useState('All');
    const [billStatus, setBillStatus] = useState('All');
    const [billFrequency, setBillFrequency] = useState('All');

    const filteredBills = bills.filter(bill => {
        const matchesSearch = bill.title.toLowerCase().includes(billSearch.toLowerCase()) ||
            (bill.category || '').toLowerCase().includes(billSearch.toLowerCase());
        const matchesCategory = billCategory === 'All' || bill.category === billCategory;

        // Status logic
        const now = new Date();
        const dueDate = new Date(bill.dueDate);
        const isOverdue = !bill.isPaid && dueDate < now;
        const status = bill.isPaid ? 'Paid' : (isOverdue ? 'Overdue' : 'Pending');
        const matchesStatus = billStatus === 'All' || status === billStatus;

        const matchesFrequency = billFrequency === 'All' || bill.frequency === billFrequency;

        return matchesSearch && matchesCategory && matchesStatus && matchesFrequency;
    });

    const [visibleBills, setVisibleBills] = useState(3);
    const displayedBills = isMobile ? filteredBills.slice(0, visibleBills) : filteredBills;

    // Pagination for desktop table
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedBills = !isMobile ? filteredBills.slice(page * rowsPerPage, (page + 1) * rowsPerPage) : [];

    const [exportDialogOpen, setExportDialogOpen] = useState(false);

    const handleExport = async (options: import('../components/Common/ExportDialog').ExportOptions) => {
        const { exportService } = await import('../services/exportService');

        // Filter bills based on options
        const filtered = bills.filter(bill => {
            const dueDate = new Date(bill.dueDate);
            const start = new Date(options.startDate);
            const end = new Date(options.endDate);
            end.setHours(23, 59, 59, 999);

            const matchesDate = dueDate >= start && dueDate <= end;
            const matchesCategory = options.category === 'all' || bill.category === options.category;

            return matchesDate && matchesCategory;
        });

        if (options.format === 'pdf') {
            exportService.exportBillsToPDF(filtered, {
                dateRange: { start: new Date(options.startDate), end: new Date(options.endDate) },
                category: options.category
            });
        } else {
            exportService.exportBillsToExcel(filtered);
        }
    };

    const [newBill, setNewBill] = useState({
        title: '',
        amount: '',
        dueDate: '',
        category: 'Utility',
        currency: 'USD' as Currency,
        frequency: 'monthly' as Bill['frequency'],
        walletId: '',
        autoDeduct: false
    });


    const handleAddWallet = async () => {
        if (!auth.currentUser || submitting) return;
        if (!newWallet.name || !newWallet.balance) {
            toast.error("Please fill in all fields");
            return;
        }

        setConfirmWalletOpen(true);
    };

    const handleConfirmAddWallet = async () => {
        if (!auth.currentUser || submitting) return;
        setConfirmWalletOpen(false);
        setSubmitting(true);
        try {
            await walletService.addWallet({
                userId: auth.currentUser.uid,
                name: newWallet.name,
                balance: parseFloat(newWallet.balance.replace(/[^0-9.]/g, "") || "0"),
                color: newWallet.color,
                icon: newWallet.icon,
                currency: newWallet.currency
            });
            toast.success("Wallet created!");
            setWalletOpen(false);
            setNewWallet({ name: '', balance: '', icon: 'AccountBalance', currency: 'USD', color: '#06b6d4' });
        } catch {
            toast.error("Failed to create wallet");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddBill = async () => {
        if (!auth.currentUser || submitting) return;
        if (!newBill.title || !newBill.amount || !newBill.dueDate) {
            toast.error("Please fill in all fields");
            return;
        }

        const amountNum = parseFloat(newBill.amount.replace(/[^0-9.]/g, "") || "0");
        if (amountNum <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }

        if (amountNum > MAX_AMOUNT) {
            toast.error(`Amount exceeds maximum limit of ${currencyService.formatClean(MAX_AMOUNT, newBill.currency)}`);
            return;
        }

        const selectedDate = new Date(newBill.dueDate);
        if (isNaN(selectedDate.getTime())) {
            toast.error("Please enter a valid due date");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = selectedDate < today;

        // Duplicate Check (Same title and amount within same month)
        const isDuplicate = bills.some(b =>
            b.title.toLowerCase() === newBill.title.toLowerCase() &&
            b.amount === amountNum &&
            new Date(b.dueDate).getMonth() === selectedDate.getMonth() &&
            new Date(b.dueDate).getFullYear() === selectedDate.getFullYear() &&
            b.id !== editingBill?.id
        );

        // Show warnings via dialogs if needed
        if (isPastDate) {
            setPastDateWarningOpen(true);
            return;
        }

        if (isDuplicate) {
            setDuplicateWarningOpen(true);
            return;
        }

        setConfirmBillOpen(true);
    };

    const handlePastDateConfirm = () => {
        setPastDateWarningOpen(false);
        const selectedDate = new Date(newBill.dueDate);
        const amountNum = parseFloat(newBill.amount.replace(/[^0-9.]/g, "") || "0");
        const isDuplicate = bills.some(b =>
            b.title.toLowerCase() === newBill.title.toLowerCase() &&
            b.amount === amountNum &&
            new Date(b.dueDate).getMonth() === selectedDate.getMonth() &&
            new Date(b.dueDate).getFullYear() === selectedDate.getFullYear() &&
            b.id !== editingBill?.id
        );
        if (isDuplicate) {
            setDuplicateWarningOpen(true);
        } else {
            setConfirmBillOpen(true);
        }
    };

    const handleDuplicateConfirm = () => {
        setDuplicateWarningOpen(false);
        setConfirmBillOpen(true);
    };

    const handleConfirmBill = async () => {
        if (!auth.currentUser) return;
        setConfirmBillOpen(false);
        setSubmitting(true);
        try {
            await billService.addBill({
                userId: auth.currentUser.uid,
                title: newBill.title,
                amount: parseFloat(newBill.amount),
                currency: newBill.currency,
                dueDate: new Date(newBill.dueDate),
                category: newBill.category,
                isPaid: false,
                frequency: newBill.frequency,
                walletId: newBill.walletId || undefined,
                autoDeduct: newBill.autoDeduct
            });
            toast.success("Bill scheduled!");
            setBillOpen(false);
            setEditingBill(null);
            setNewBill({ title: '', amount: '', dueDate: '', category: 'Utility', currency: 'USD', frequency: 'monthly', walletId: '', autoDeduct: false });
        } catch {
            toast.error("Failed to schedule bill");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBillClick = (bill: Bill) => {
        setDeletingBill(bill);
        setDeleteBillOpen(true);
    };

    const handleConfirmDeleteBill = async () => {
        if (!deletingBill || !auth.currentUser || submitting) return;
        setSubmitting(true);
        try {
            await billService.deleteBill(deletingBill.id!);
            toast.success("Bill deleted!");
            setDeleteBillOpen(false);
            setDeletingBill(null);
        } catch {
            toast.error("Failed to delete bill");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditBill = (bill: Bill) => {
        setEditingBill(bill);
        setNewBill({
            title: bill.title,
            amount: bill.amount.toString(),
            dueDate: bill.dueDate.toISOString().split('T')[0],
            category: bill.category,
            currency: bill.currency,
            frequency: bill.frequency,
            walletId: bill.walletId || '',
            autoDeduct: bill.autoDeduct
        });
        setBillOpen(true);
    };

    const handleUpdateBill = async () => {
        if (!editingBill || !auth.currentUser || submitting) return;

        const amountNum = parseFloat(newBill.amount.replace(/[^0-9.]/g, "") || "0");
        if (amountNum <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }

        if (amountNum > MAX_AMOUNT) {
            toast.error(`Amount exceeds maximum limit of ${currencyService.formatClean(MAX_AMOUNT, newBill.currency)}`);
            return;
        }

        setConfirmEditBillOpen(true);
    };

    const handleConfirmUpdateBill = async () => {
        if (!editingBill || !auth.currentUser || submitting) return;
        setConfirmEditBillOpen(false);
        setSubmitting(true);
        try {
            const amountNum = parseFloat(newBill.amount.replace(/[^0-9.]/g, "") || "0");
            await billService.updateBill(editingBill.id!, {
                title: newBill.title,
                amount: amountNum,
                currency: newBill.currency,
                dueDate: new Date(newBill.dueDate),
                category: newBill.category,
                frequency: newBill.frequency,
                walletId: newBill.walletId || undefined,
                autoDeduct: newBill.autoDeduct
            });
            toast.success("Bill updated!");
            setBillOpen(false);
            setEditingBill(null);
            setNewBill({ title: '', amount: '', dueDate: '', category: 'Utility', currency: 'USD', frequency: 'monthly', walletId: '', autoDeduct: false });
        } catch {
            toast.error("Failed to update bill");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayBillClick = (billId: string, amount: number, currency: Currency, title: string, walletId?: string) => {
        setPendingPayData({ id: billId, amount, currency, title, walletId });
        setConfirmPayOpen(true);
    };

    const handleConfirmPay = async () => {
        if (!pendingPayData || !auth.currentUser) return;
        setConfirmPayOpen(false);
        setSubmitting(true);
        const { id, amount, currency, title, walletId: assignedWalletId } = pendingPayData;
        try {
            // Get the wallet (prioritize assigned wallet, default to first wallet)
            const wallet = wallets.find(w => w.id === assignedWalletId) || wallets[0];
            if (!wallet) throw new Error("Wallet not found");

            const walletCurrency = wallet.currency || 'USD';
            let billAmount = amount;

            // Convert bill amount to wallet currency if needed
            if (currency !== walletCurrency) {
                const amountUSD = currencyService.convertToUSD(amount, currency, exchangeRates);
                billAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
            }

            // Check if wallet has sufficient balance
            if (wallet.balance < billAmount) {
                toast.error(
                    `Insufficient balance in ${wallet.name}. Available: ${currencyService.formatClean(wallet.balance, walletCurrency)}, Need: ${currencyService.formatClean(billAmount, walletCurrency)}`
                );
                setSubmitting(false);
                return;
            }

            // 1. Mark bill as paid
            await billService.updateBill(id, { isPaid: true });

            // 2. Create transaction
            await transactionService.addTransactionWithWallet({
                userId: auth.currentUser.uid,
                title: `Paid: ${title}`,
                subtitle: "Automated Bill Payment",
                amount: -billAmount,
                flow: 'expense',
                categoryId: 'bills',
                currency: walletCurrency,
                date: new Date(),
                walletId: wallet.id
            }, exchangeRates);

            toast.success("Bill paid and wallet updated!");
        } catch {
            toast.error("Payment failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <PageHeader
                title="My Finance"
                subtitle="Manage your cards, wallets and scheduled bills."
                action={
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Payments />}
                            onClick={() => setBillOpen(true)}
                            sx={{ color: '#06b6d4', borderColor: '#06b6d4' }}
                        >
                            Schedule Bill
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setWalletOpen(true)}
                            sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                        >
                            Add Wallet
                        </Button>
                    </Box>
                }
            />

            <Grid container spacing={4}>
                {/* Wallets Section */}
                <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Your Wallets</Typography>
                    <Grid container spacing={2}>
                        {isInitialLoading ? (
                            Array.from(new Array(3)).map((_, i) => (
                                <Grid size={{ xs: 12, md: 4, lg: 3 }} key={i}>
                                    <WalletCardSkeleton />
                                </Grid>
                            ))
                        ) : loading ? (
                            <Box sx={{ p: 4, width: '100%', textAlign: 'center' }}><CircularProgress size={24} /></Box>
                        ) : errors.wallets ? (
                            <Box sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                                <Typography color="error" variant="body2">{errors.wallets}</Typography>
                            </Box>
                        ) : wallets.length === 0 ? (
                            <Grid size={{ xs: 12 }}>
                                <Card sx={{ p: 4, textAlign: 'center', border: '1px dashed grey', bgcolor: 'transparent' }}>
                                    <Typography color="text.secondary">No wallets yet. Create one to start tracking!</Typography>
                                </Card>
                            </Grid>
                        ) : displayedWallets.map(wallet => {
                            const walletCurrency = wallet.currency || 'USD';
                            const isDifferentFromBase = walletCurrency !== baseCurrency;

                            return (
                                <Grid size={{ xs: 12, md: 4, lg: 3 }} key={wallet.id}>
                                    <GradientCard
                                        variant="ocean"
                                        customColor={wallet.color}
                                        sx={{
                                            height: 160,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 20px -10px rgba(0,0,0,0.3)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="h6">{wallet.name}</Typography>
                                            {getWalletIcon(wallet.icon)}
                                        </Box>
                                        <Box sx={{ overflow: 'hidden', minWidth: 0 }}>
                                            <Tooltip title={currencyService.formatClean(wallet.balance, walletCurrency)} arrow placement="bottom">
                                                <Typography
                                                    variant="h4"
                                                    fontWeight="bold"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'help'
                                                    }}
                                                >
                                                    {currencyService.formatCompact(wallet.balance, walletCurrency)}
                                                </Typography>
                                            </Tooltip>
                                            {isDifferentFromBase && (
                                                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontStyle: 'italic', mt: -0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    ≈ {currencyService.formatCompact(
                                                        currencyService.convertFromUSD(
                                                            currencyService.convertToUSD(wallet.balance, walletCurrency, exchangeRates),
                                                            baseCurrency,
                                                            exchangeRates
                                                        ),
                                                        baseCurrency
                                                    )}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ opacity: 0.7 }}>**** **** **** {wallet.id?.slice(-4)}</Typography>
                                        </Box>
                                    </GradientCard>
                                </Grid>
                            );
                        })}

                        {/* Mobile View More Button */}
                        {isMobile && wallets.length > visibleWallets && (
                            <Grid size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
                                <Button
                                    onClick={() => setVisibleWallets(prev => prev + 3)}
                                    color="primary"
                                    sx={{ textTransform: 'none' }}
                                >
                                    View More ({wallets.length - visibleWallets} remaining)
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Grid>

                {/* Bills Section - Full Width Below Wallets */}
                <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Scheduled Bills</Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                            <TextField
                                placeholder="Search bills..."
                                size="small"
                                value={billSearch}
                                onChange={(e) => setBillSearch(e.target.value)}
                                sx={{ bgcolor: 'background.paper', borderRadius: 1, minWidth: 200 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Select
                                    value={billCategory}
                                    onChange={(e) => setBillCategory(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="All">All Categories</MenuItem>
                                    {[...new Set(bills.map(b => b.category))].filter(Boolean).map(cat => (
                                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Select
                                    value={billStatus}
                                    onChange={(e) => setBillStatus(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="All">All Status</MenuItem>
                                    <MenuItem value="Paid">Paid</MenuItem>
                                    <MenuItem value="Pending">Pending</MenuItem>
                                    <MenuItem value="Overdue">Overdue</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'background.paper', borderRadius: 1 }}>
                                <Select
                                    value={billFrequency}
                                    onChange={(e) => setBillFrequency(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="All">All Frequencies</MenuItem>
                                    {[...new Set(bills.map(b => b.frequency))].filter(Boolean).map(freq => (
                                        <MenuItem key={freq} value={freq}>{freq}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Button
                                size="small"
                                onClick={() => setExportDialogOpen(true)}
                                startIcon={<Download />}
                                sx={{ textTransform: 'none', color: '#06b6d4', height: 40 }}
                            >
                                Export
                            </Button>
                        </Box>
                    </Box>
                    {/* Responsive Bills View */}
                    <Card sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 0 }}>
                            {isInitialLoading ? (
                                <TableContainer>
                                    <Table sx={{ minWidth: 600 }}>
                                        <TableHead sx={{ bgcolor: 'rgba(241, 245, 249, 0.5)' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Due Date</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Frequency</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Wallet</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <BillTableRowSkeleton />
                                            <BillTableRowSkeleton />
                                            <BillTableRowSkeleton />
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : loading ? (
                                <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                            ) : errors.bills ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="error" variant="body2" gutterBottom>
                                        Error loading bills: {errors.bills}
                                    </Typography>
                                    {errors.bills.includes('index') && (
                                        <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                                            Check the browser console for a link to create the required Firestore index.
                                        </Typography>
                                    )}
                                </Box>
                            ) : bills.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No scheduled bills found.
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    {isMobile ? (
                                        <List>
                                            {displayedBills.map((bill, index) => {
                                                const billDate = new Date(bill.dueDate);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                billDate.setHours(0, 0, 0, 0);
                                                const isOverdue = !bill.isPaid && billDate < today;

                                                return (
                                                    <Box key={bill.id}>
                                                        <ListItem
                                                            sx={{
                                                                opacity: bill.isPaid ? 0.5 : 1,
                                                                borderLeft: isOverdue ? '4px solid #ef4444' : 'none',
                                                                bgcolor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                                                flexDirection: 'column',
                                                                alignItems: 'stretch',
                                                                py: 2
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                <Box>
                                                                    <Typography fontWeight="bold">{bill.title}</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Due: {bill.dueDate.toLocaleDateString()} • {currencyService.formatClean(bill.amount, bill.currency || 'USD')} • Wallet: {wallets.find(w => w.id === bill.walletId)?.name || 'None'}
                                                                    </Typography>
                                                                </Box>
                                                                {bill.isPaid ? (
                                                                    <Chip icon={<CheckCircle />} label="Paid" color="success" size="small" variant="outlined" />
                                                                ) : isOverdue ? (
                                                                    <Chip label="Overdue" color="error" size="small" variant="filled" />
                                                                ) : (
                                                                    <Chip label="Pending" color="warning" size="small" variant="filled" />
                                                                )}
                                                            </Box>
                                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1.5, width: '100%' }}>
                                                                <Tooltip title="Edit">
                                                                    <Button size="small" onClick={() => handleEditBill(bill)} sx={{ minWidth: 'auto', p: 1, color: '#06b6d4' }}>
                                                                        <EditIcon fontSize="small" />
                                                                    </Button>
                                                                </Tooltip>
                                                                <Tooltip title="Delete">
                                                                    <Button size="small" onClick={() => handleDeleteBillClick(bill)} sx={{ minWidth: 'auto', p: 1, color: '#ef4444' }}>
                                                                        <DeleteIcon fontSize="small" />
                                                                    </Button>
                                                                </Tooltip>
                                                                <Box sx={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                                                                    {!bill.isPaid && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="contained"
                                                                            onClick={() => handlePayBillClick(bill.id!, bill.amount, bill.currency || 'USD', bill.title, bill.walletId)}
                                                                            disabled={submitting}
                                                                            sx={{ bgcolor: '#06b6d4', minWidth: 'auto', px: 2 }}
                                                                        >
                                                                            Pay
                                                                        </Button>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </ListItem>
                                                        {index < displayedBills.length - 1 && <Divider />}
                                                    </Box>
                                                );
                                            })}
                                        </List>
                                    ) : (
                                        <TableContainer>
                                            <Table sx={{ minWidth: 600 }}>
                                                <TableHead sx={{ bgcolor: 'rgba(241, 245, 249, 0.5)' }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Due Date</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>Frequency</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>Wallet</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }} align="right">Action</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {paginatedBills.map((bill) => {
                                                        const isOverdue = !bill.isPaid && (() => {
                                                            const d = new Date(bill.dueDate);
                                                            d.setHours(0, 0, 0, 0);
                                                            const t = new Date();
                                                            t.setHours(0, 0, 0, 0);
                                                            return d < t;
                                                        })();
                                                        const catObj = categories.find(c => c.name === bill.category) || { name: bill.category, icon: 'receipt_long', color: '#64748b', bgColor: '#f1f5f9' };

                                                        return (
                                                            <TableRow
                                                                key={bill.id}
                                                                hover
                                                                sx={{
                                                                    '& td': { py: 2 },
                                                                    opacity: bill.isPaid ? 0.5 : 1,
                                                                    borderLeft: isOverdue ? '4px solid #ef4444' : 'none',
                                                                    bgcolor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                                                }}
                                                            >
                                                                <TableCell>
                                                                    {bill.dueDate.toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight="500">{bill.title}</Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Box
                                                                            sx={{
                                                                                width: 24,
                                                                                height: 24,
                                                                                borderRadius: '50%',
                                                                                bgcolor: catObj.bgColor || '#f1f5f9',
                                                                                color: catObj.color || '#64748b',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}
                                                                        >
                                                                            {getMaterialIcon(catObj.icon || 'receipt_long')}
                                                                        </Box>
                                                                        <Typography variant="body2">{bill.category}</Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip label={bill.frequency} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2">{wallets.find(w => w.id === bill.walletId)?.name || 'None'}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography fontWeight="600">
                                                                        {currencyService.formatClean(bill.amount, bill.currency || 'USD')}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {bill.isPaid ? (
                                                                        <Chip label="Paid" color="success" size="small" variant="filled" />
                                                                    ) : isOverdue ? (
                                                                        <Chip label="Overdue" color="error" size="small" variant="filled" />
                                                                    ) : (
                                                                        <Chip label="Pending" color="warning" size="small" variant="filled" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                                                                        <Tooltip title="Edit">
                                                                            <Button size="small" onClick={() => handleEditBill(bill)} sx={{ minWidth: 'auto', p: 1, color: '#06b6d4' }}>
                                                                                <EditIcon fontSize="small" />
                                                                            </Button>
                                                                        </Tooltip>
                                                                        <Tooltip title="Delete">
                                                                            <Button size="small" onClick={() => handleDeleteBillClick(bill)} sx={{ minWidth: 'auto', p: 1, color: '#ef4444' }}>
                                                                                <DeleteIcon fontSize="small" />
                                                                            </Button>
                                                                        </Tooltip>
                                                                        <Box sx={{ width: 56, display: 'flex', justifyContent: 'center' }}>
                                                                            {!bill.isPaid && (
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="contained"
                                                                                    onClick={() => handlePayBillClick(bill.id!, bill.amount, bill.currency || 'USD', bill.title, bill.walletId)}
                                                                                    disabled={submitting}
                                                                                    sx={{ bgcolor: '#06b6d4', minWidth: 'auto', px: 2 }}
                                                                                >
                                                                                    Pay
                                                                                </Button>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}

                                    {!isMobile && (
                                        <TablePagination
                                            rowsPerPageOptions={[5, 10, 25]}
                                            component="div"
                                            count={filteredBills.length}
                                            rowsPerPage={rowsPerPage}
                                            page={page}
                                            onPageChange={handleChangePage}
                                            onRowsPerPageChange={handleChangeRowsPerPage}
                                        />
                                    )}

                                    {/* Mobile View More Button for Bills */}
                                    {isMobile && filteredBills.length > visibleBills && (
                                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Button
                                                onClick={() => setVisibleBills(prev => prev + 3)}
                                                color="primary"
                                                size="small"
                                                sx={{ textTransform: 'none' }}
                                            >
                                                View More Bills ({filteredBills.length - visibleBills} remaining)
                                            </Button>
                                        </Box>
                                    )}

                                    {/* Server Side Pagination */}
                                    {hasMoreBills && (
                                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Button
                                                onClick={loadMoreBills}
                                                variant="outlined"
                                                size="small"
                                                sx={{ borderRadius: 4, textTransform: 'none', borderColor: '#06b6d4', color: '#06b6d4' }}
                                            >
                                                Load More Bills from Server
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Wallet Dialog */}
            <Dialog open={walletOpen} onClose={() => setWalletOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Add New Wallet</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Wallet Name"
                            fullWidth
                            value={newWallet.name}
                            onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={newWallet.currency}
                                label="Currency"
                                onChange={(e) => setNewWallet({ ...newWallet, currency: e.target.value as Currency })}
                            >
                                {Object.entries(availableCurrencies).map(([code, name]) => (
                                    <MenuItem key={code} value={code}>
                                        {code} ({currencyService.getSymbol(code)}) - {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Initial Balance"
                            type="text"
                            fullWidth
                            value={newWallet.balance}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                const dotCount = (val.match(/\./g) || []).length;
                                if (dotCount > 1) return;
                                setNewWallet({ ...newWallet, balance: val });
                            }}
                        />
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                Wallet Color
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {[
                                    '#06b6d4', // Cyan
                                    '#10b981', // Emerald
                                    '#ef4444', // Red
                                    '#f59e0b', // Amber
                                    '#8b5cf6', // Violet
                                    '#ec4899', // Pink
                                    '#3b82f6', // Blue
                                    '#6366f1',  // Indigo
                                    '#1f2937'  // Dark Gray
                                ].map((color) => (
                                    <Box
                                        key={color}
                                        onClick={() => setNewWallet({ ...newWallet, color })}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: color,
                                            cursor: 'pointer',
                                            border: newWallet.color === color ? '2px solid black' : 'none',
                                            transform: newWallet.color === color ? 'scale(1.1)' : 'none',
                                            transition: 'transform 0.2s',
                                            boxShadow: newWallet.color === color ? 3 : 1
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                Wallet Icon
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {[
                                    { name: 'AccountBalance', component: <AccountBalance /> },
                                    { name: 'CreditCard', component: <CreditCard /> },
                                    { name: 'Savings', component: <Savings /> },
                                    { name: 'Wallet', component: <WalletIcon /> },
                                    { name: 'AttachMoney', component: <AttachMoney /> }
                                ].map((icon) => (
                                    <Box
                                        key={icon.name}
                                        onClick={() => setNewWallet({ ...newWallet, icon: icon.name })}
                                        sx={{
                                            p: 1,
                                            borderRadius: '50%',
                                            bgcolor: newWallet.icon === icon.name ? 'action.selected' : 'transparent',
                                            cursor: 'pointer',
                                            border: newWallet.icon === icon.name ? `2px solid ${newWallet.color}` : '1px solid #e5e7eb',
                                            color: newWallet.icon === icon.name ? newWallet.color : 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {icon.component}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setWalletOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddWallet}
                        disabled={submitting}
                        sx={{ bgcolor: '#06b6d4' }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bill Dialog */}
            <Dialog open={billOpen} onClose={() => { setBillOpen(false); setEditingBill(null); }} fullWidth maxWidth="xs">
                <DialogTitle>{editingBill ? 'Edit Bill' : 'Schedule a Bill'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Bill Title"
                            fullWidth
                            value={newBill.title}
                            onChange={(e) => setNewBill({ ...newBill, title: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={newBill.currency}
                                label="Currency"
                                onChange={(e) => setNewBill({ ...newBill, currency: e.target.value as Currency })}
                            >
                                {Object.entries(availableCurrencies).map(([code, name]) => (
                                    <MenuItem key={code} value={code}>
                                        {code} ({currencyService.getSymbol(code)}) - {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Amount"
                            type="text"
                            fullWidth
                            value={newBill.amount}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                const dotCount = (val.match(/\./g) || []).length;
                                if (dotCount > 1) return;
                                setNewBill({ ...newBill, amount: val });
                            }}
                        />
                        <TextField
                            label="Due Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={newBill.dueDate}
                            onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Frequency</InputLabel>
                            <Select
                                value={newBill.frequency}
                                label="Frequency"
                                onChange={(e) => setNewBill({ ...newBill, frequency: e.target.value as Bill['frequency'] })}
                            >
                                <MenuItem value="once">One-time</MenuItem>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="biweekly">Bi-weekly (Every 15 days)</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Auto-Deduct Wallet (Optional)</InputLabel>
                                <Select
                                    value={newBill.walletId}
                                    label="Auto-Deduct Wallet (Optional)"
                                    onChange={(e) => {
                                        const walletId = e.target.value;
                                        setNewBill({
                                            ...newBill,
                                            walletId: walletId,
                                            autoDeduct: walletId ? true : false
                                        });
                                    }}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {wallets.map(w => (
                                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        {newBill.walletId && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                                Bill will be automatically deducted from {wallets.find(w => w.id === newBill.walletId)?.name} on the due date
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => { setBillOpen(false); setEditingBill(null); }} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={editingBill ? handleUpdateBill : handleAddBill}
                        disabled={submitting}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        {editingBill ? 'Update Bill' : 'Schedule Bill'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Wallet Confirmation Dialog */}
            <Dialog open={confirmWalletOpen} onClose={() => setConfirmWalletOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm New Wallet</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to create a new wallet named <strong>{newWallet.name}</strong> with a starting balance of <strong>{currencyService.formatClean(parseFloat(newWallet.balance) || 0, newWallet.currency)}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmWalletOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAddWallet}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Bill Dialog */}
            <Dialog open={confirmBillOpen} onClose={() => setConfirmBillOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm Scheduled Bill</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to schedule <strong>{newBill.title}</strong> for <strong>{currencyService.formatClean(parseFloat(newBill.amount) || 0, newBill.currency)}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmBillOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmBill}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Pay Dialog */}
            <Dialog open={confirmPayOpen} onClose={() => setConfirmPayOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm Bill Payment</DialogTitle>
                <DialogContent>
                    {pendingPayData && (
                        <Typography>
                            Are you sure you want to pay <strong>{pendingPayData.title}</strong> of <strong>{currencyService.formatClean(pendingPayData.amount, pendingPayData.currency)}</strong> from your primary wallet?
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmPayOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmPay}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Confirm Payment
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Bill Confirmation Dialog */}
            <Dialog open={confirmEditBillOpen} onClose={() => setConfirmEditBillOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirm Changes</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to save changes to <strong>{editingBill?.title}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setConfirmEditBillOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmUpdateBill}
                        sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Bill Confirmation */}
            <Dialog open={deleteBillOpen} onClose={() => !submitting && setDeleteBillOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#ef4444', fontWeight: 'bold' }}>Delete Scheduled Bill</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the scheduled bill <strong>{deletingBill?.title}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDeleteBillOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmDeleteBill}
                        disabled={submitting}
                        color="error"
                    >
                        {submitting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Past Date Warning Dialog */}
            <Dialog open={pastDateWarningOpen} onClose={() => setPastDateWarningOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#f59e0b', fontWeight: 'bold' }}>Past Due Date</DialogTitle>
                <DialogContent>
                    <Typography>
                        The due date you selected is in the past. Are you sure you want to schedule this bill?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setPastDateWarningOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handlePastDateConfirm} sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
                        Continue
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Duplicate Warning Dialog */}
            <Dialog open={duplicateWarningOpen} onClose={() => setDuplicateWarningOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: '#f59e0b', fontWeight: 'bold' }}>Possible Duplicate</DialogTitle>
                <DialogContent>
                    <Typography>
                        A bill titled "<strong>{newBill.title}</strong>" with the same amount already exists for this month. Continue anyway?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDuplicateWarningOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleDuplicateConfirm} sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
                        Continue
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Export Dialog */}
            <ExportDialog
                open={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onExport={handleExport}
                categories={[{ id: 'Utility', name: 'Utility' }, { id: 'Subscription', name: 'Subscription' }, { id: 'Rent', name: 'Rent' }, { id: 'Insurance', name: 'Insurance' }]}
            />
        </MainLayout >
    );
}
