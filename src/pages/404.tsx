import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowBack } from '@mui/icons-material';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <Container component="main" maxWidth="md">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                }}
            >
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: '8rem', md: '12rem' },
                        fontWeight: 900,
                        background: 'linear-gradient(to right, #3B82F6, #06B6D4)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        mb: 2
                    }}
                >
                    404
                </Typography>

                <Typography variant="h4" fontWeight="bold" sx={{ color: '#111827', mb: 2 }}>
                    Page Not Found
                </Typography>

                <Typography variant="body1" sx={{ color: '#6b7280', mb: 6, maxWidth: '500px' }}>
                    Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(-1)}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            px: 4,
                            py: 1.5,
                            borderColor: '#e5e7eb',
                            color: '#4b5563',
                            '&:hover': {
                                borderColor: '#d1d5db',
                                bgcolor: '#f9fafb'
                            }
                        }}
                    >
                        Go Back
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<Home />}
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            px: 4,
                            py: 1.5,
                            background: 'linear-gradient(to right, #3B82F6, #06B6D4)',
                            boxShadow: '0 4px 6px -1px rgba(6, 182, 212, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(to right, #2563eb, #0891b2)',
                            }
                        }}
                    >
                        Go Dashboard
                    </Button>
                </Box>
            </Box>
        </Container>
    )
}