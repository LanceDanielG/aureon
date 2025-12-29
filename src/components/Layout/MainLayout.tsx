import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { DEFAULT_NAV_ITEMS } from '../../config/menuItems';
import type { NavItem } from '../../types/navigation';

interface DashboardLayoutProps {
    children: ReactNode;
    navItems?: NavItem[];
    onLogout?: () => void;
}

export default function DashboardLayout({ children, navItems = DEFAULT_NAV_ITEMS, onLogout }: DashboardLayoutProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await auth.signOut();
            navigate('/');
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Sidebar items={navItems} onLogout={handleLogout} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, md: 3 },
                    pt: { xs: 10, md: 3 }, // Adjusted to ~80px for balanced status bar clearance
                    ml: { md: '240px' }, // Width of sidebar
                    mb: { xs: '80px', md: 0 }, // Height of mobile nav
                    width: { md: `calc(100% - 240px)` }
                }}
            >
                {children}
            </Box>
            <MobileNav items={navItems} />
        </Box>
    );
}
