import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavItem } from '../../types/navigation';

interface MobileNavProps {
    items: NavItem[];
}

export default function MobileNav({ items }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                display: { xs: 'block', md: 'none' },
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                backgroundImage: 'none'
            }}
            elevation={0}
        >
            <BottomNavigation
                showLabels
                value={location.pathname}
                onChange={(_, newValue) => {
                    navigate(newValue);
                }}
                sx={{
                    height: 80,
                    pb: 2,
                    '& .Mui-selected': {
                        color: '#06b6d4',
                        '& .MuiSvgIcon-root': {
                            color: '#06b6d4',
                        }
                    }
                }}
            >
                {items.map((item) => (
                    <BottomNavigationAction
                        key={item.text}
                        label={item.text}
                        value={item.path}
                        icon={item.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
