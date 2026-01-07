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
import { Add, AccountBalance, Payments, CheckCircle, Download, CreditCard, Savings, Wallet as WalletIcon, AttachMoney } from "@mui/icons-material";
import { getMaterialIcon } from "../components/Common/CategoryIcon";
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
    const { wallets, bills, categories, loading, errors, baseCurrency, availableCurrencies, exchangeRates, loadMoreBills, hasMoreBills } = useFinance();
    const [walletOpen, setWalletOpen] = useState(false);
    const [billOpen, setBillOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

        setSubmitting(true);
        try {
            await walletService.addWallet({
                userId: auth.currentUser.uid,
                name: newWallet.name,
                balance: parseFloat(newWallet.balance),
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

        const selectedDate = new Date(newBill.dueDate);
        if (isNaN(selectedDate.getTime())) {
            toast.error("Please enter a valid due date");
            return;
        }

        setSubmitting(true);
        try {
            await billService.addBill({
                userId: auth.currentUser.uid,
                title: newBill.title,
                amount: parseFloat(newBill.amount),
                currency: newBill.currency,
                dueDate: selectedDate,
                category: newBill.category,
                isPaid: false,
                frequency: newBill.frequency,
                walletId: newBill.walletId || undefined,
                autoDeduct: newBill.autoDeduct
            });
            toast.success("Bill scheduled!");
            setBillOpen(false);
            setNewBill({ title: '', amount: '', dueDate: '', category: 'Utility', currency: 'USD', frequency: 'monthly', walletId: '', autoDeduct: false });
        } catch {
            toast.error("Failed to schedule bill");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayBill = async (billId: string, amount: number, currency: Currency, title: string) => {
        if (!auth.currentUser || submitting || wallets.length === 0) {
            toast.error("Create a wallet first!");
            return;
        }

        setSubmitting(true);
        try {
            // Get the wallet (default to first wallet)
            const wallet = wallets[0];
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
                    `Insufficient balance in ${wallet.name}. Available: ${currencyService.format(wallet.balance, walletCurrency)}, Need: ${currencyService.format(billAmount, walletCurrency)}`
                );
                setSubmitting(false);
                return;
            }

            // 1. Mark bill as paid
            await billService.updateBill(billId, { isPaid: true });

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
                        {loading ? (
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
                                            <Tooltip title={currencyService.format(wallet.balance, walletCurrency)} arrow placement="bottom">
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
                            {loading ? (
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
                                            {displayedBills.map((bill, index) => (
                                                <Box key={bill.id}>
                                                    <ListItem
                                                        secondaryAction={
                                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                                                {bill.isPaid ? (
                                                                    <Chip icon={<CheckCircle />} label="Paid" color="success" size="small" variant="outlined" />
                                                                ) : ((() => {
                                                                    const billDate = new Date(bill.dueDate);
                                                                    const today = new Date();
                                                                    today.setHours(0, 0, 0, 0);
                                                                    billDate.setHours(0, 0, 0, 0);
                                                                    return billDate < today;
                                                                })()) ? (
                                                                    <Chip label="Overdue" color="error" size="small" variant="outlined" />
                                                                ) : (
                                                                    <Chip label="Pending" color="warning" size="small" variant="outlined" />
                                                                )}

                                                                {!bill.isPaid && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        onClick={() => handlePayBill(bill.id!, bill.amount, bill.currency || 'USD', bill.title)}
                                                                        disabled={submitting}
                                                                        sx={{ bgcolor: '#06b6d4' }}
                                                                    >
                                                                        Pay
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={bill.title}
                                                            secondary={`Due: ${bill.dueDate.toLocaleDateString()} • ${currencyService.format(bill.amount, bill.currency || 'USD')}`}
                                                            primaryTypographyProps={{ fontWeight: 'bold' }}
                                                        />
                                                    </ListItem>
                                                    {index < displayedBills.length - 1 && <Divider />}
                                                </Box>
                                            ))}
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
                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Action</TableCell>
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
                                                            <TableRow key={bill.id} hover sx={{ '& td': { py: 2 } }}>
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
                                                                                bgcolor: (catObj as any).bgColor || '#f1f5f9',
                                                                                color: (catObj as any).color || '#64748b',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}
                                                                        >
                                                                            {getMaterialIcon((catObj as any).icon || 'receipt_long')}
                                                                        </Box>
                                                                        <Typography variant="body2">{bill.category}</Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip label={bill.frequency} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography fontWeight="600">
                                                                        {currencyService.format(bill.amount, bill.currency || 'USD')}
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
                                                                    {!bill.isPaid && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="contained"
                                                                            onClick={() => handlePayBill(bill.id!, bill.amount, bill.currency || 'USD', bill.title)}
                                                                            disabled={submitting}
                                                                            sx={{ bgcolor: '#06b6d4', minWidth: 'auto', px: 2 }}
                                                                        >
                                                                            Pay
                                                                        </Button>
                                                                    )}
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
                            type="number"
                            fullWidth
                            value={newWallet.balance}
                            onChange={(e) => setNewWallet({ ...newWallet, balance: e.target.value })}
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
            <Dialog open={billOpen} onClose={() => setBillOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Schedule a Bill</DialogTitle>
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
                            type="number"
                            fullWidth
                            value={newBill.amount}
                            onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
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
                    <Button onClick={() => setBillOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddBill}
                        disabled={submitting}
                        sx={{ bgcolor: '#06b6d4' }}
                    >
                        Schedule
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
