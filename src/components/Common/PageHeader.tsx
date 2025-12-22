import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: string;
    action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    return (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#111827' }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body1" sx={{ color: '#6b7280', mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action && (
                <Box>
                    {action}
                </Box>
            )}
        </Box>
    );
}
