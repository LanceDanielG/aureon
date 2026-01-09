import { auth } from "../config/firebase";
import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import GradientCard from "../components/Common/GradientCard";
import TransactionItem from "../components/Common/TransactionItem";
import { Card, CardContent, Grid, Typography, Box, List, Button, Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import { CallReceived, CallMade, TrendingUp } from "@mui/icons-material";

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
    const upcomingBills = bills.filter(b => !b.isPaid).slice(0, 3);

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
                            <Tooltip title={currencyService.format(stats.totalBalance, baseCurrency)} arrow placement="bottom">
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
                        borderRadius: '16px',
                        height: '100%',
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: 'none'
                    }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Upcoming Bills</Typography>
                        {(upcomingBills.length === 0 || errors.bills) ? (
                            <Typography variant="body2" color="text.secondary">No bills due.</Typography>
                        ) : (
                            <List disablePadding>
                                {upcomingBills.map(bill => (
                                    <Box key={bill.id} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" fontWeight="500">{bill.title}</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="error.main">
                                            -{currencyService.formatCompact(bill.amount, bill.currency || 'PHP')}
                                        </Typography>
                                    </Box>
                                ))}
                            </List>
                        )}
                        <Button
                            size="small"
                            variant="text"
                            sx={{ mt: 1, alignSelf: 'flex-start', color: '#06b6d4' }}
                            onClick={() => navigate('/wallet')}
                        >
                            Manage Bills
                        </Button>
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
                                                    const formatted = currencyService.format(Math.abs(num), item.currency || 'USD');
                                                    return num > 0 ? `+${formatted}` : `-${formatted}`;
                                                })()}
                                                secondaryAmount={(() => {
                                                    if (item.currency === baseCurrency) return undefined;
                                                    const num = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/[^0-9.-]+/g, "") || "0");
                                                    const amountUSD = currencyService.convertToUSD(Math.abs(num), item.currency || 'USD', exchangeRates);
                                                    const amountBase = currencyService.convertFromUSD(amountUSD, baseCurrency, exchangeRates);
                                                    return currencyService.format(amountBase, baseCurrency);
                                                })()}
                                                date={item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                icon={category ? getMaterialIcon(category.icon) : (item.flow === 'income' ? <CallReceived /> : <CallMade />)}
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