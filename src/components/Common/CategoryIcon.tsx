import React, { type ReactNode } from 'react';
import { Box } from '@mui/material';
import {
    ShoppingBag, LocalDining, TrendingUp, Payments,
    Work, Home, Bolt, SportsEsports, DirectionsCar,
    Category as CategoryIconDefault
} from "@mui/icons-material";
import { type Category } from "../../services/categoryService";

interface CategoryIconProps {
    category?: Category;
    iconName?: string;
    color?: string;
    bgColor?: string;
    size?: 'small' | 'medium' | 'large';
}

export const getMaterialIcon = (iconName: string): ReactNode => {
    const map: Record<string, ReactNode> = {
        payments: <Payments fontSize="inherit" />,
        work: <Work fontSize="inherit" />,
        trending_up: <TrendingUp fontSize="inherit" />,
        restaurant: <LocalDining fontSize="inherit" />,
        shopping_bag: <ShoppingBag fontSize="inherit" />,
        home: <Home fontSize="inherit" />,
        bolt: <Bolt fontSize="inherit" />,
        sports_esports: <SportsEsports fontSize="inherit" />,
        directions_car: <DirectionsCar fontSize="inherit" />,
    };
    return map[iconName] || <CategoryIconDefault fontSize="inherit" />;
};

const CategoryIcon: React.FC<CategoryIconProps> = ({
    category,
    iconName,
    color,
    bgColor,
    size = 'medium'
}) => {
    const finalIconName = iconName || category?.icon || 'payments';
    const finalColor = color || category?.color || '#10b981';
    const finalBgColor = bgColor || category?.bgColor || '#ecfdf5';

    const sizeMap = {
        small: 32,
        medium: 40,
        large: 48
    };

    const iconSize = sizeMap[size];

    return (
        <Box
            sx={{
                width: iconSize,
                height: iconSize,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: finalBgColor,
                color: finalColor,
                fontSize: iconSize * 0.6
            }}
        >
            {getMaterialIcon(finalIconName)}
        </Box>
    );
};

export default CategoryIcon;
