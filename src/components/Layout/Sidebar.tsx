import { Logout } from '@mui/icons-material';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Button, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavItem } from '../../types/navigation';

interface SidebarProps {
    items: NavItem[];
    onLogout: () => void;
}

export default function Sidebar({ items, onLogout }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Box
            sx={{
                width: 240,
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                borderRight: 1,
                borderColor: 'divider',
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                bgcolor: 'background.paper',
                zIndex: 40
            }}
        >
            <Box sx={{ p: 3 }}>
                <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{
                        background: 'linear-gradient(to right, #3b82f6, #06b6d4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    LedgerLink
                </Typography>
            </Box>

            <List sx={{ flex: 1, px: 2 }}>
                {items.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => navigate(item.path)}
                            selected={location.pathname === item.path}
                            sx={{
                                borderRadius: '12px',
                                '&.Mui-selected': {
                                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                                    color: '#06b6d4',
                                    '&:hover': {
                                        backgroundColor: 'rgba(6, 182, 212, 0.2)',
                                    },
                                    '& .MuiListItemIcon-root': {
                                        color: '#06b6d4',
                                    }
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? '#06b6d4' : 'inherit' }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                    fullWidth
                    variant="text"
                    color="error"
                    startIcon={<Logout />}
                    onClick={onLogout}
                    sx={{ borderRadius: '12px', justifyContent: 'flex-start', textTransform: 'none' }}
                >
                    Logout
                </Button>
            </Box>
        </Box>
    );
}
