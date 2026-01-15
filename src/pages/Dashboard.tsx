import { auth } from "../config/firebase";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import GradientCard from "../components/Common/GradientCard";
import TransactionItem from "../components/Common/TransactionItem";
import { Card, CardContent, Grid, Typography, Box, List, Button, Tooltip, Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import { CallReceived, CallMade, TrendingUp, ReceiptLong } from "@mui/icons-material";

import { currencyService } from "../services/currencyService";
import { getMaterialIcon } from "../components/Common/CategoryIcon";
import { DashboardStatSkeleton, TransactionItemSkeleton } from "../components/Common/Skeletons";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export default function Dashboard() {
    const {
        transactions,
        bills,
        categories,
        isInitialLoading,
        errors,
        stats,
        baseCurrency,
        exchangeRates,
        dashboardTimeframe,
        setDashboardTimeframe
    } = useFinance();
    const navigate = useNavigate();
    const recentTransactions = transactions.slice(0, 3);
    const upcomingBills = bills
        .filter(b => !b.isPaid)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()) // Sort by due date (soonest/overdue first)
        .slice(0, 10);

    return (
        <MainLayout>
            <PageHeader
                title={`Welcome back, ${auth?.currentUser?.displayName || 'User'}!`}
                subtitle="Here's what's happening with your portfolio today."
                action={
                    <ToggleButtonGroup
                        value={dashboardTimeframe}
                        exclusive
                        onChange={(_, val) => val && setDashboardTimeframe(val)}
                        size="small"
                        sx={{ bgcolor: 'background.paper' }}
                    >
                        <ToggleButton value="daily">Daily</ToggleButton>
                        <ToggleButton value="weekly">Weekly</ToggleButton>
                        <ToggleButton value="monthly">Monthly</ToggleButton>
                        <ToggleButton value="yearly">Yearly</ToggleButton>
                    </ToggleButtonGroup>
                }
            />

            <Grid container spacing={3}>
                {/* Balance Card */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {isInitialLoading ? (
                        <DashboardStatSkeleton />
                    ) : (
                        <GradientCard variant="ocean">
                            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Balance ({baseCurrency})</Typography>
                            <Tooltip title={currencyService.formatClean(stats.totalBalance, baseCurrency)} arrow placement="bottom">
                                <Typography
                                    variant="h3"
                                    fontWeight="bold"
                                    sx={{
                                        my: 2,
                                        fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                                        wordBreak: 'break-word',
                                        cursor: 'help'
                                    }}
                                >
                                    {currencyService.formatCompact(stats.totalBalance, baseCurrency)}
                                </Typography>
                            </Tooltip>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.2)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
                                    <TrendingUp sx={{ mr: 0.5, fontSize: 18, transform: stats.incomeChange < 0 ? 'rotate(180deg)' : 'none' }} />
                                    <Typography variant="body2">
                                        {stats.incomeChange > 0 ? '+' : ''}{stats.incomeChange.toFixed(1)}%
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                    income vs last {dashboardTimeframe === 'daily' ? 'day' : dashboardTimeframe.replace('ly', '')}
                                </Typography>
                            </Box>
                        </GradientCard>
                    )}
                </Grid>

                {/* Quick Stats or Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{
                        borderRadius: '24px',
                        height: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <Box sx={{
                            p: 3,
                            pb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ bgcolor: 'rgba(6, 182, 212, 0.1)', width: 32, height: 32 }}>
                                    <ReceiptLong sx={{ color: '#06b6d4', fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Upcoming Bills</Typography>
                            </Box>
                            {upcomingBills.length > 0 && (
                                <Box sx={{
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>
                                    {upcomingBills.length}
                                </Box>
                            )}
                        </Box>

                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 1, pb: '16px !important', px: 2 }}>
                            {(upcomingBills.length === 0 || errors.bills) ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, opacity: 0.6 }}>
                                    <ReceiptLong sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                                    <Typography variant="body2" color="text.secondary">No bills due.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{
                                    flex: '0 1 auto',
                                    overflowY: 'auto',
                                    maxHeight: '160px',
                                    pr: 1,
                                    minHeight: 0,
                                    '&::-webkit-scrollbar': {
                                        width: '4px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: 'transparent',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: 'rgba(0,0,0,0.1)',
                                        borderRadius: '10px',
                                    },
                                    '&:hover::-webkit-scrollbar-thumb': {
                                        background: 'rgba(0,0,0,0.2)',
                                    }
                                }}>
                                    <List disablePadding>
                                        {upcomingBills.map((bill, index) => {
                                            const category = categories.find(c => c.id === bill.category);
                                            const isOverdue = bill.dueDate < new Date() && !bill.isPaid;

                                            return (
                                                <TransactionItem
                                                    key={bill.id}
                                                    title={bill.title}
                                                    subtitle={`${bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1)} • ${isOverdue ? 'Overdue' : 'Due'}`}
                                                    amount={`-${currencyService.formatCompact(bill.amount, bill.currency || 'PHP')}`}
                                                    date={bill.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    icon={category ? getMaterialIcon(category.icon) : <ReceiptLong />}
                                                    iconColor={category?.color || '#ef4444'}
                                                    iconBgColor={category?.bgColor || '#fef2f2'}
                                                    isLast={index === upcomingBills.length - 1}
                                                />
                                            );
                                        })}
                                    </List>
                                </Box>
                            )}

                            <Box sx={{ mt: 'auto', pt: 2 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => navigate('/wallet')}
                                    sx={{
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        color: '#06b6d4',
                                        borderColor: 'rgba(6, 182, 212, 0.3)',
                                        fontWeight: 600,
                                        '&:hover': {
                                            bgcolor: 'rgba(6, 182, 212, 0.05)',
                                            borderColor: '#06b6d4'
                                        }
                                    }}
                                >
                                    Manage Bills
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Transactions */}
                <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Recent Transactions</Typography>
                        <Typography
                            variant="body2"
                            onClick={() => navigate('/activity')}
                            sx={{ color: '#06b6d4', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                        >
                            View All
                        </Typography>
                    </Box>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <CardContent sx={{ p: 0 }}>
                            {isInitialLoading ? (
                                <List disablePadding>
                                    <TransactionItemSkeleton />
                                    <TransactionItemSkeleton />
                                    <TransactionItemSkeleton />
                                </List>
                            ) : (errors.transactions || errors.wallets || errors.bills) ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography color="error" variant="caption">
                                        Data fetch error. Check Console for details.
                                    </Typography>
                                </Box>
                            ) : recentTransactions.length === 0 ? (
                                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                    No recent transactions.
                                </Typography>
                            ) : (
                                <List disablePadding>
                                    {recentTransactions.map((item, index) => {
                                        const category = categories.find(c => c.id === item.categoryId);

                                        return (
                                            <TransactionItem
                                                key={item.id}
                                                title={item.title}
                                                subtitle={item.subtitle || category?.name || 'General'}
                                                amount={(() => {
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const formatted = currencyService.formatClean(Math.abs(num), item.currency || 'USD');
                                                    return num > 0 ? `+${formatted}` : `-${formatted}`;
                                                })()}
                                                secondaryAmount={(() => {
                                                    if (item.currency === baseCurrency) return undefined;
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const amountUSD = currencyService.convertToUSD(Math.abs(num), item.currency || 'USD', exchangeRates);
                                                    const amountBase = currencyService.convertFromUSD(amountUSD, baseCurrency, exchangeRates);
                                                    return currencyService.formatClean(amountBase, baseCurrency);
                                                })()}
                                                date={item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                icon={category ? getMaterialIcon(category.icon) : (item.flow === 'income' ? <CallMade /> : <CallReceived />)}
                                                iconColor={category?.color || (item.flow === 'income' ? '#10b981' : '#ef4444')}
                                                iconBgColor={category?.bgColor || (item.flow === 'income' ? '#ecfdf5' : '#fef2f2')}
                                                isLast={index === recentTransactions.length - 1}
                                            />
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </MainLayout>
    )
}