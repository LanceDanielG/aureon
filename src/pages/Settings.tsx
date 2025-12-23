import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import { Box, Typography, Card, CardContent, Switch, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Avatar } from "@mui/material";
import { Notifications, Security, Person, DarkMode, Language, ChevronRight, Logout } from "@mui/icons-material";
import { auth } from "../config/firebase";
import { useThemeContext } from "../context/ThemeContext";
import { useFinance } from "../context/FinanceContext";
import { MenuItem, Select, FormControl } from "@mui/material";
import { currencyService, type Currency } from "../services/currencyService";
import { getNotificationPreference, setNotificationPreference } from "../services/notificationService";
import { useState } from "react";

export default function Settings() {
    const { mode, toggleTheme } = useThemeContext();
    const { baseCurrency, setBaseCurrency, availableCurrencies } = useFinance();
    const [notificationsEnabled, setNotificationsEnabled] = useState(getNotificationPreference());

    const handleNotificationToggle = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        setNotificationPreference(newValue);
    };

    return (
        <MainLayout>
            <PageHeader
                title="Settings"
                subtitle="Manage your account preferences and application settings."
            />

            <Box sx={{ maxWidth: 800 }}>
                {/* Profile Section */}
                <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                            <Avatar
                                sx={{ width: 80, height: 80, bgcolor: '#06b6d4', fontSize: '2rem' }}
                            >
                                {auth?.currentUser?.displayName?.charAt(0) || 'U'}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">{auth?.currentUser?.displayName || 'User Name'}</Typography>
                                <Typography variant="body2" color="text.secondary">{auth?.currentUser?.email || 'user@example.com'}</Typography>
                                <Button size="small" sx={{ mt: 1, textTransform: 'none', color: '#06b6d4' }}>Edit Profile</Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* App Settings */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <CardContent sx={{ p: 0 }}>
                        <List>
                            <ListItem sx={{ py: 2, px: 3 }}>
                                <ListItemIcon sx={{ color: 'text.secondary' }}><Person /></ListItemIcon>
                                <ListItemText primary="Account Information" secondary="Update your personal details" />
                                <ChevronRight sx={{ color: 'divider' }} />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem sx={{ py: 2, px: 3 }}>
                                <ListItemIcon sx={{ color: 'text.secondary' }}><Security /></ListItemIcon>
                                <ListItemText primary="Security" secondary="Password, 2FA, Login History" />
                                <ChevronRight sx={{ color: 'divider' }} />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem sx={{ py: 2, px: 3 }}>
                                <ListItemIcon sx={{ color: 'text.secondary' }}><Notifications /></ListItemIcon>
                                <ListItemText primary="Bill Notifications" secondary="Get alerts for overdue and upcoming bills" />
                                <Switch
                                    checked={notificationsEnabled}
                                    onChange={handleNotificationToggle}
                                    color="info"
                                />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem sx={{ py: 2, px: 3 }}>
                                <ListItemIcon sx={{ color: 'text.secondary' }}><DarkMode /></ListItemIcon>
                                <ListItemText primary="Dark Mode" secondary="Toggle dark theme" />
                                <Switch
                                    checked={mode === 'dark'}
                                    onChange={toggleTheme}
                                    color="info"
                                />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem sx={{ py: 2, px: 3 }}>
                                <ListItemIcon sx={{ color: 'text.secondary' }}><Language /></ListItemIcon>
                                <ListItemText primary="Base Currency" secondary="Select global display currency" />
                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                    <Select
                                        value={baseCurrency}
                                        onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {Object.entries(availableCurrencies).map(([code, name]) => (
                                            <MenuItem key={code} value={code}>
                                                {code} ({currencyService.getSymbol(code)}) - {name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </ListItem>
                            <Divider component="li" />
                            <ListItem
                                sx={{
                                    py: 2,
                                    px: 3,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    display: { xs: 'flex', md: 'none' } // Only show on mobile
                                }}
                                onClick={async () => {
                                    await auth.signOut();
                                    window.location.href = '/';
                                }}
                            >
                                <ListItemIcon sx={{ color: 'error.main' }}><Logout /></ListItemIcon>
                                <ListItemText
                                    primary="Logout"
                                    secondary="Sign out of your account"
                                    primaryTypographyProps={{ color: 'error.main' }}
                                />
                                <ChevronRight sx={{ color: 'divider' }} />
                            </ListItem>
                        </List>
                    </CardContent>
                </Card>
            </Box>
        </MainLayout>
    );
}
