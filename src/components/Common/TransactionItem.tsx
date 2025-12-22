import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Box } from '@mui/material';
import type { ReactNode } from 'react';

interface TransactionItemProps {
    icon: ReactNode;
    title: string;
    subtitle: string;
    amount: string;
    secondaryAmount?: string;
    date?: string;
    iconColor: string;
    iconBgColor: string;
    isLast?: boolean;
}

export default function TransactionItem({
    icon,
    title,
    subtitle,
    amount,
    secondaryAmount,
    date,
    iconColor,
    iconBgColor,
    isLast = false
}: TransactionItemProps) {
    return (
        <ListItem
            sx={{
                py: 2,
                borderBottom: isLast ? 'none' : 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover', borderRadius: '8px' }
            }}
            secondaryAction={
                <Box sx={{ textAlign: 'right' }}>
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
                    <Typography variant="body2" color="text.secondary">
                        {date || 'Completed'}
                    </Typography>
                </Box>
            }
        >
            <ListItemAvatar>
                <Avatar sx={{ bgcolor: iconBgColor, color: iconColor }}>
                    {icon}
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Typography variant="subtitle1" fontWeight="600">
                        {title}
                    </Typography>
                }
                secondary={
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                }
            />
        </ListItem>
    );
}
