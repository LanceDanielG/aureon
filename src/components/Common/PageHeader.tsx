import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: string;
    action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    return (
        <Box sx={{ mb: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
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
