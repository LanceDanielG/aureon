import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

interface ThemeContextType {
    mode: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeContextProvider');
    }
    return context;
};

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<'light' | 'dark'>(() => {
        const savedMode = localStorage.getItem('themeMode');
        return (savedMode as 'light' | 'dark') || 'light';
    });

    const toggleTheme = () => {
        setMode((prevMode) => {
            const newMode = prevMode === 'light' ? 'dark' : 'light';
            localStorage.setItem('themeMode', newMode);
            return newMode;
        });
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: '#06b6d4', // Cyber Teal
                    },
                    secondary: {
                        main: '#3b82f6', // Electric Blue
                    },
                    background: {
                        default: mode === 'light' ? '#f9fafb' : '#0f172a',
                        paper: mode === 'light' ? '#ffffff' : '#1e293b',
                    },
                    text: {
                        primary: mode === 'light' ? '#111827' : '#f8fafc',
                        secondary: mode === 'light' ? '#6b7280' : '#94a3b8',
                    },
                },
                typography: {
                    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: '8px',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                borderRadius: '16px',
                                backgroundImage: 'none', // Remove MUI default dark overlay
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
