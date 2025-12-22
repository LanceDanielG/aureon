import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { ErrorOutline, Refresh } from "@mui/icons-material";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="sm">
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100vh',
                            textAlign: 'center',
                            gap: 3
                        }}
                    >
                        <ErrorOutline sx={{ fontSize: 80, color: 'error.main' }} />
                        <Typography variant="h4" fontWeight="bold">
                            Something went wrong
                        </Typography>
                        <Typography color="text.secondary">
                            {this.state.error?.message || "An unexpected error occurred."}
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Refresh />}
                            onClick={() => window.location.reload()}
                            sx={{ mt: 2, bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                        >
                            Reload Page
                        </Button>
                        <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'left', width: '100%', overflow: 'auto' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
                                {this.state.error?.stack}
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
