import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container, Paper } from "@mui/material";
import { Home, Refresh, Report } from "@mui/icons-material";

export default function RouteError() {
    const error = useRouteError();
    const navigate = useNavigate();

    let title = "System Malfunction";
    let message = "An unexpected error occurred in the ledger core.";
    let code = "500";

    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            title = "Memory Leak - Page Not Found";
            message = "The requested sector could not be located in the vault.";
            code = "404";
        } else if (error.status === 401) {
            title = "Access Denied";
            message = "Your authentication tokens are invalid or expired.";
            code = "401";
        }
    } else if (error instanceof Error) {
        message = error.message;
    }

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
                {/* Glitchy looking Code */}
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: '6rem', md: '10rem' },
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        color: code === '404' ? '#06b6d4' : '#f43f5e',
                        textShadow: code === '404' ? '4px 4px #1e293b, -4px -4px #0891b2' : '4px 4px #1e293b, -4px -4px #e11d48',
                        mb: 0
                    }}
                >
                    {code}
                </Typography>

                <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary', mb: 2, letterSpacing: -1 }}>
                    {title}
                </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 6, maxWidth: '500px' }}>
                    {message}
                </Typography>

                {/* Detailed Error for Debugging */}
                {!isRouteErrorResponse(error) && error instanceof Error && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mb: 6,
                            bgcolor: 'rgba(244, 63, 94, 0.05)',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            borderRadius: '12px',
                            textAlign: 'left',
                            width: '100%',
                            overflow: 'auto'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#f43f5e' }}>
                            <Report fontSize="small" />
                            <Typography variant="caption" fontWeight="bold">DEBUG_LOG</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre', color: 'text.primary' }}>
                            {error.stack}
                        </Typography>
                    </Paper>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => window.location.reload()}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            px: 4,
                            py: 1.5,
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        Reboot System
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
                            boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.39)',
                            '&:hover': {
                                background: 'linear-gradient(to right, #2563eb, #0891b2)',
                            }
                        }}
                    >
                        Home Protocol
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}
