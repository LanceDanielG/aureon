import { Card, CardContent } from '@mui/material';
import type { ReactNode } from 'react';

interface GradientCardProps {
    children: ReactNode;
    variant?: 'ocean' | 'midnight';
    customColor?: string;
    sx?: object;
}

export default function GradientCard({ children, variant = 'ocean', customColor, sx = {} }: GradientCardProps) {
    const backgrounds = {
        ocean: 'linear-gradient(to right, #3B82F6, #06B6D4)',
        midnight: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    };

    const shadows = {
        ocean: '0 10px 15px -3px rgba(6, 182, 212, 0.3)',
        midnight: '0 10px 15px -3px rgba(15, 23, 42, 0.3)',
    };

    const bgStyle = customColor
        ? `linear-gradient(135deg, ${customColor} 0%, ${customColor}dd 100%)`
        : backgrounds[variant];

    const shadowStyle = customColor
        ? `0 10px 15px -3px ${customColor}40`
        : shadows[variant];

    return (
        <Card
            sx={{
                background: bgStyle,
                color: 'white',
                borderRadius: '20px',
                boxShadow: shadowStyle,
                overflow: 'hidden',
                position: 'relative',
                ...sx
            }}
        >
            <CardContent sx={{ p: 4, height: '100%' }}>
                {children}
            </CardContent>
        </Card>
    );
}
