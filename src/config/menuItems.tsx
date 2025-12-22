import { Home, AccountBalanceWallet, History, Settings } from '@mui/icons-material';
import type { NavItem } from '../types/navigation';

export const DEFAULT_NAV_ITEMS: NavItem[] = [
    { text: 'Home', icon: <Home />, path: '/dashboard' },
    { text: 'Wallet', icon: <AccountBalanceWallet />, path: '/wallet' },
    { text: 'Activity', icon: <History />, path: '/activity' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
];
