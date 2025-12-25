import PersonIcon from '@mui/icons-material/Person';
import { Button, Tooltip } from "@mui/material";
import toast from 'react-hot-toast';
import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import { signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../../config/firebase";
import { FirebaseError } from 'firebase/app';
import { useState, useEffect } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function LogIn({ isLogin = false, setIsLogin }: { isLogin?: boolean, setIsLogin?: (isLogin: boolean) => void }) {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only apply if we are on the /login route specifically
        if (window.location.pathname === '/login') {
            const originalColor = document.body.style.backgroundColor;
            document.body.style.backgroundColor = '#242424';
            return () => {
                document.body.style.backgroundColor = originalColor;
            };
        }
    }, []);

    const togglePassword = () => setShowPassword(prev => !prev);

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            navigate('/dashboard');
        } catch (error: unknown) {
            if (error instanceof FirebaseError) {
                if (error.code === "auth/popup-closed-by-user") {
                    // Handled gracefully
                } else if (error.code === "auth/cancelled-popup-request") {
                    // Handled gracefully
                } else {
                    console.error("Sign-in error:", error);
                    toast.error("An error occurred during Google Sign In.");
                }
            }
        }
    }

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (!validateEmail(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        const loadingToast = toast.loading('Logging in...');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.dismiss(loadingToast);
            toast.success("Logged In Successfully!");
            navigate('/dashboard');
        } catch (error: unknown) {
            toast.dismiss(loadingToast);
            if (error instanceof FirebaseError) {
                console.error("Login error:", error.code, error.message);
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    toast.error("Invalid email or password.");
                } else if (error.code === 'auth/too-many-requests') {
                    toast.error("Too many failed attempts. Please try again later.");
                } else {
                    toast.error("Login failed. Please try again.");
                }
            } else {
                console.error("Unexpected error:", error);
                toast.error("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Please enter your email first.");
            return;
        }

        if (!validateEmail(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        const loadingToast = toast.loading('Sending reset email...');

        try {
            await sendPasswordResetEmail(auth, email);
            toast.dismiss(loadingToast);
            toast.success("Password reset email sent! Check your inbox.");
        } catch (error: unknown) {
            toast.dismiss(loadingToast);
            if (error instanceof FirebaseError) {
                console.error("Reset password error:", error.code, error.message);
                if (error.code === 'auth/user-not-found') {
                    // SECURITY: Treat "User Not Found" as success to prevent Email Enumeration.
                    // Attackers won't know if the email exists or not.
                    toast.success("Password reset email sent! Check your inbox.");
                } else if (error.code === 'auth/invalid-email') {
                    toast.error("Invalid email address.");
                } else if (error.code === 'auth/too-many-requests') {
                    toast.error("Too many requests. Please try again later.");
                } else {
                    toast.error("Failed to send reset email. Please try again.");
                }
            } else {
                console.error("Unexpected error:", error);
                toast.error("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className={`px-5 form-box login absolute w-full md:w-1/2 h-full bg-white md:right-0 flex flex-col justify-center items-center text-center text-gray-800 transition-all duration-700 ease-in-out ${isLogin ? 'translate-x-0 opacity-100 z-50 md:right-[0%] md:z-20' : '-translate-x-[100%] opacity-0 z-0 md:opacity-100 md:z-20'}`}>
            <form onSubmit={handleLogin} className="w-full max-w-sm mx-auto">
                <p className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500 pb-1">Sign In</p>
                <div className="input-box relative my-4">
                    <input
                        type="text"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full ps-[20px] pe-[50px] py-[15px] rounded-xl border-0 outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-cyan-400 transition-all shadow-sm placeholder-gray-400 text-sm text-gray-800"
                        required
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            right: 15,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'gray'
                        }}
                    >
                        <PersonIcon />
                    </Box>
                </div>
                <div className="input-box relative my-4">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full ps-[20px] pe-[50px] py-[15px] rounded-xl border-0 outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-cyan-400 transition-all shadow-sm placeholder-gray-400 text-sm text-gray-800"
                        required
                    />
                    <Box
                        onClick={togglePassword}
                        sx={{
                            position: 'absolute',
                            right: 15,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            color: 'gray'
                        }}
                    >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                    </Box>
                </div>
                <div className="forgot-link text-right mb-6">
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleForgotPassword();
                        }}
                        className="text-sm text-cyan-600 hover:text-cyan-700 font-medium no-underline hover:underline transition-all"
                    >
                        Forgot Password?
                    </a>
                </div>
                <Button
                    className="w-full"
                    variant="contained"
                    sx={{
                        background: 'linear-gradient(to right, #3B82F6, #06B6D4)',
                        width: '100%',
                        borderRadius: '12px',
                        padding: '12px',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(6, 182, 212, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 20px 25px -5px rgba(6, 182, 212, 0.4)',
                        },
                    }}
                    onClick={handleLogin}
                    disabled={loading}
                    type="submit"
                >
                    {loading ? "Logging in..." : "LogIn"}
                </Button>
                <div>
                    <div className="flex items-center h-[20px] mt-[30px] mb-[20px]">
                        <div className="flex-1 h-[1px] bg-gray-200"></div>
                        <span className="mx-[12px] text-xs text-gray-400 font-medium">OR CONTINUE WITH</span>
                        <div className="flex-1 h-[1px] bg-gray-200"></div>
                    </div>
                    <div className="mt-[10px] flex items-center justify-center gap-[15px]">
                        <Tooltip title="Sign in with Google">
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: 50,
                                    height: 50,
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid #f3f4f6',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    },
                                }}
                                onClick={signIn}
                            >
                                <SvgIcon viewBox="0 0 48 48">
                                    <path fill="#4285F4" d="M24 9.5c3.29 0 6.01 1.36 7.99 3.57l5.43-5.43C33.89 4.15 29.29 2 24 2 14.61 2 6.65 7.74 3.65 16.01l6.32 4.91C11.5 14.03 17.29 9.5 24 9.5z" />
                                    <path fill="#DB4437" d="M46.09 24.55c0-1.63-.15-3.19-.43-4.7H24v9.05h12.45c-.54 2.92-2.17 5.4-4.61 7.05l7.05 5.48C43.21 37.39 46.09 31.47 46.09 24.55z" />
                                    <path fill="#F4B400" d="M9.97 28.92A14.5 14.5 0 0 1 9.2 24c0-1.7.29-3.35.77-4.92l-6.32-4.91A23.92 23.92 0 0 0 2 24c0 3.94.96 7.67 2.65 10.83l6.32-4.91z" />
                                    <path fill="#0F9D58" d="M24 46c6.29 0 11.57-2.08 15.43-5.63l-7.05-5.48c-1.96 1.33-4.48 2.12-8.38 2.12-6.71 0-12.5-4.53-14.57-10.58l-6.32 4.91C6.65 40.26 14.61 46 24 46z" />
                                </SvgIcon>
                            </Box>
                        </Tooltip>
                    </div>
                </div>
                <div className="md:hidden mt-8 text-sm text-gray-500">
                    <p>Don't have an account? <span className="text-cyan-600 font-bold cursor-pointer hover:underline" onClick={() => setIsLogin && setIsLogin(false)}>Register</span></p>
                </div>
            </form>
        </div>
    )
}