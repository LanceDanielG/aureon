import MainLayout from "../components/Layout/MainLayout";
import PageHeader from "../components/Common/PageHeader";
import { Box, Typography, Card, CardContent, Switch, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Avatar, useTheme, useMediaQuery } from "@mui/material";
import { Notifications, Person, DarkMode, Language, ChevronRight, Logout } from "@mui/icons-material";
import { auth } from "../config/firebase";
import { useThemeContext } from "../context/ThemeContext";
import { useFinance } from "../context/FinanceContext";
import { MenuItem, Select, FormControl } from "@mui/material";
import { currencyService, type Currency } from "../services/currencyService";
import { getNotificationPreference, setNotificationPreference } from "../services/notificationService";


import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { userService } from "../services/userService";
import { toast } from "react-hot-toast";

export default function Settings() {
    const { mode, toggleTheme } = useThemeContext();
    const { baseCurrency, setBaseCurrency, availableCurrencies } = useFinance();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));


    const [notificationsEnabled, setNotificationsEnabled] = useState(getNotificationPreference());

    // Edit Profile State
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editData, setEditData] = useState({
        displayName: auth.currentUser?.displayName || '',
        color: (auth.currentUser?.photoURL?.startsWith('#') ? auth.currentUser.photoURL : '#06b6d4')
    });
    const [updating, setUpdating] = useState(false);

    const handleUpdateProfile = async () => {
        if (!auth.currentUser) return;
        setUpdating(true);
        try {
            await userService.updateUserProfile(auth.currentUser, {
                displayName: editData.displayName,
                photoURL: editData.color
            });
            toast.success("Profile updated!");
            setEditProfileOpen(false);
            // Force reload to update UI if needed, though Firebase auth state might auto-update or require manual refresh trigger in context
            // Ideally, the AuthContext listens to changes, but let's assume valid reactivity for now or reload page
            window.location.reload();
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setUpdating(false);
        }
    };

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
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: (auth?.currentUser?.photoURL?.startsWith('#') ? auth.currentUser.photoURL : '#06b6d4'),
                                    fontSize: '2rem'
                                }}
                            >
                                {auth?.currentUser?.displayName?.charAt(0) || 'U'}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">{auth?.currentUser?.displayName || 'User Name'}</Typography>
                                <Typography variant="body2" color="text.secondary">{auth?.currentUser?.email || 'user@example.com'}</Typography>
                                <Button
                                    size="small"
                                    sx={{ mt: 1, textTransform: 'none', color: '#06b6d4' }}
                                    onClick={() => {
                                        setEditData({
                                            displayName: auth.currentUser?.displayName || '',
                                            color: (auth.currentUser?.photoURL?.startsWith('#') ? auth.currentUser.photoURL : '#06b6d4')
                                        });
                                        setEditProfileOpen(true);
                                    }}
                                >
                                    Edit Profile
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* App Settings */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <CardContent sx={{ p: 0 }}>
                        <List>
                            <ListItem
                                sx={{ py: 2, px: 3, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                onClick={() => {
                                    setEditData({
                                        displayName: auth.currentUser?.displayName || '',
                                        color: (auth.currentUser?.photoURL?.startsWith('#') ? auth.currentUser.photoURL : '#06b6d4')
                                    });
                                    setEditProfileOpen(true);
                                }}
                            >
                                <ListItemIcon sx={{ color: 'text.secondary' }}><Person /></ListItemIcon>
                                <ListItemText primary="Account Information" secondary="Update your personal details" />
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
                            <ListItem
                                sx={{
                                    py: 2,
                                    px: 3,
                                    flexDirection: { xs: 'column', md: 'row' },
                                    alignItems: { xs: 'flex-start', md: 'center' },
                                    gap: { xs: 1.5, md: 4 }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <ListItemIcon sx={{ color: 'text.secondary', minWidth: 0, m: 0 }}><Language /></ListItemIcon>
                                    <ListItemText
                                        primary="Base Currency"
                                        secondary="Select global display currency"
                                        sx={{ m: 0 }}
                                    />
                                </Box>
                                <FormControl
                                    size="small"
                                    sx={{
                                        width: { xs: '100%', md: 'auto' },
                                        minWidth: { md: 150 },
                                        maxWidth: { xs: '100%', md: 400 },
                                        ml: { xs: 0, sm: 5, md: 0 }
                                    }}
                                >
                                    <Select
                                        value={baseCurrency}
                                        onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                                        renderValue={(selected) =>
                                            isMobile
                                                ? `${selected} (${currencyService.getSymbol(selected)}) - ${availableCurrencies[selected]}`
                                                : `${selected} (${currencyService.getSymbol(selected)})`
                                        }
                                        sx={{
                                            borderRadius: 2,
                                            '& .MuiSelect-select': {
                                                py: { xs: 1.5, md: 1 },
                                                textAlign: 'left'
                                            }
                                        }}
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

            {/* Edit Profile Dialog */}
            <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Display Name"
                            fullWidth
                            value={editData.displayName}
                            onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        />
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                Avatar Color
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {[
                                    '#06b6d4', // Cyan (Default)
                                    '#10b981', // Emerald
                                    '#ef4444', // Red
                                    '#f59e0b', // Amber
                                    '#8b5cf6', // Violet
                                    '#ec4899', // Pink
                                    '#3b82f6', // Blue
                                    '#6366f1'  // Indigo
                                ].map((color) => (
                                    <Box
                                        key={color}
                                        onClick={() => setEditData({ ...editData, color })}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: color,
                                            cursor: 'pointer',
                                            border: editData.color === color ? '2px solid black' : 'none',
                                            transform: editData.color === color ? 'scale(1.1)' : 'none',
                                            transition: 'transform 0.2s',
                                            boxShadow: editData.color === color ? 3 : 1
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditProfileOpen(false)} disabled={updating}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdateProfile}
                        disabled={updating}
                        sx={{ bgcolor: '#06b6d4' }}
                    >
                        {updating ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </MainLayout>
    );
}
