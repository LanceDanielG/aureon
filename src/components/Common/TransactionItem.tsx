import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Box, Button } from '@mui/material';
import type { ReactNode } from 'react';

interface TransactionItemProps {
    icon: ReactNode;
    title: string;
    subtitle: string;
    walletName?: string;
    amount: string;
    secondaryAmount?: string;
    date?: string;
    iconColor: string;
    iconBgColor: string;
    isLast?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function TransactionItem({
    icon,
    title,
    subtitle,
    walletName,
    amount,
    secondaryAmount,
    date,
    iconColor,
    iconBgColor,
    isLast = false,
    onEdit,
    onDelete
}: TransactionItemProps) {
    return (
        <ListItem
            sx={{
                py: 2,
                px: { xs: 1.5, sm: 2 },
                borderBottom: isLast ? 'none' : 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover', borderRadius: '8px' },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <ListItemAvatar sx={{ minWidth: { xs: 48, sm: 56 } }}>
                    <Avatar sx={{ bgcolor: iconBgColor, color: iconColor }}>
                        {icon}
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={
                        <Typography variant="subtitle1" fontWeight="600" noWrap>
                            {title}
                        </Typography>
                    }
                    secondary={
                        <Box component="span">
                            <Typography variant="body2" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
                                {subtitle}
                            </Typography>
                            {walletName && (
                                <Typography variant="caption" color="primary" sx={{ fontWeight: '500', display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mr: 0.5, display: 'inline-block' }} />
                                    {walletName}
                                </Typography>
                            )}
                        </Box>
                    }
                    sx={{ mr: 1, overflow: 'hidden' }}
                />
            </Box>

            <Box sx={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{ color: amount.startsWith('+') ? '#10b981' : amount.startsWith('-') ? '#ef4444' : 'text.primary' }}
                >
                    {amount}
                </Typography>
                {secondaryAmount && (
                    <Typography variant="caption" sx={{ display: 'block', mt: -0.5, opacity: 0.7, fontStyle: 'italic' }}>
                        ≈ {secondaryAmount}
                    </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {date || 'Completed'}
                </Typography>
                {(onEdit || onDelete) && (
                    <Box sx={{ display: 'flex', gap: 0.25, mt: 0.5 }}>
                        {onEdit && (
                            <Button
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                sx={{
                                    color: '#06b6d4',
                                    minWidth: 'auto',
                                    p: 0.5,
                                    fontSize: '0.7rem',
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.08)' }
                                }}
                            >
                                Edit
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                sx={{
                                    color: '#ef4444',
                                    minWidth: 'auto',
                                    p: 0.5,
                                    fontSize: '0.7rem',
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' }
                                }}
                            >
                                Delete
                            </Button>
                        )}
                    </Box>
                )}
            </Box>
        </ListItem>
    );
}
