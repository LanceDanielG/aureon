import { useState } from "react";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import GradientCard from "../components/Common/GradientCard";
import {
    Box, Typography, Card, CardContent, Grid, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    List, ListItem, ListItemText, Chip, Divider, CircularProgress,
    MenuItem, Select, InputLabel, FormControl
} from "@mui/material";
import { Add, AccountBalance, Payments, CheckCircle } from "@mui/icons-material";
import { useFinance } from "../context/FinanceContext";
import { walletService } from "../services/walletService";
import { billService, type Bill } from "../services/billService";
import { transactionService } from "../services/transactionService";
import { auth } from "../config/firebase";
import { toast } from "react-hot-toast";
import { currencyService, type Currency } from "../services/currencyService";

export default function Wallet() {
    const { wallets, bills, loading, errors, baseCurrency, availableCurrencies, exchangeRates } = useFinance();
    const [walletOpen, setWalletOpen] = useState(false);
    const [billOpen, setBillOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [newWallet, setNewWallet] = useState({ name: '', balance: '', icon: 'AccountBalance', currency: 'USD' as Currency });
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
                color: '#06b6d4',
                icon: newWallet.icon,
                currency: newWallet.currency
            });
            toast.success("Wallet created!");
            setWalletOpen(false);
            setNewWallet({ name: '', balance: '', icon: 'AccountBalance', currency: 'USD' });
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
                <Grid size={{ xs: 12, md: 7 }}>
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
                        ) : wallets.map(wallet => {
                            const walletCurrency = wallet.currency || 'USD';
                            const isDifferentFromBase = walletCurrency !== baseCurrency;

                            return (
                                <Grid size={{ xs: 12 }} key={wallet.id}>
                                    <GradientCard variant="ocean" sx={{ height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="h6">{wallet.name}</Typography>
                                            <AccountBalance />
                                        </Box>
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {currencyService.format(wallet.balance, walletCurrency)}
                                            </Typography>
                                            {isDifferentFromBase && (
                                                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontStyle: 'italic', mt: -0.5 }}>
                                                    ≈ {currencyService.format(
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
                    </Grid>
                </Grid>

                {/* Bills Section */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Scheduled Bills</Typography>
                    <Card sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 0 }}>
                            <List>
                                {loading ? (
                                    <ListItem><CircularProgress size={20} /></ListItem>
                                ) : (bills.length === 0 || errors.bills) ? (
                                    <ListItem>
                                        <Typography variant="body2" color="text.secondary">
                                            No scheduled bills found.
                                        </Typography>
                                    </ListItem>
                                ) : bills.map((bill, index) => (
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
                                        {index < bills.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </List>
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
        </MainLayout>
    );
}
