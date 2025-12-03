import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import PasswordIcon from '@mui/icons-material/Password';
import { Button, Tooltip } from "@mui/material";
import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../config/firebase';
import { useState } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function Register({isLogin} : {isLogin?: boolean}) {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const togglePassword = () => setShowPassword(prev => !prev);
    const toggleConfirmPassword = () => setShowConfirmPassword(prev => !prev);
    
    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            
            console.log("Sign In Clicked");
            navigate('/dashboard');
        } catch (error: unknown) {
            if (error instanceof FirebaseError) {
                if (error.code === "auth/popup-closed-by-user") {
                    console.log("Popup closed by user, please try again.");
                } else if (error.code === "auth/cancelled-popup-request") {
                    console.log("Popup request cancelled, maybe another popup is open.");
                } else {
                    console.error("Sign-in error:", error);
                }
            }
        }
    }
        
    return (
        <div className={`px-5 form-box register absolute w-1/2 h-full bg-white right-0 items-center text-center text-gray-800 z-20 transition-normal delay-[.6s] ease-in-out transition-[visibility_0s_1s] ${isLogin ? 'hidden' : 'flex right-[50%]'}`}>
            <form action="" className="w-full">
                <p className="text-2xl font-bold">Sign Up</p>
                <div className="input-box relative m-[30px]">
                    <input 
                        type="text" 
                        placeholder="Email" 
                        className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs" 
                    />
                    <EmailIcon
                        sx={{
                            position: 'absolute',
                            right: 15,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            color: 'gray'
                        }}
                    >
                        <EmailIcon fontSize="small" />
                    </EmailIcon>
                </div>
                <div className="input-box relative m-[30px]">
                    <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Password" 
                        className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs" 
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
                        {showPassword ? <Visibility/> : <VisibilityOff/>}
                    </Box>
                </div>
                <div className="input-box relative m-[30px]">
                    <input 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password" 
                        className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs" 
                    />
                    <Box
                        onClick={toggleConfirmPassword}
                        sx={{
                            position: 'absolute',
                            right: 15,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            color: 'gray'
                        }}
                    >
                        {showConfirmPassword ? <Visibility/> : <VisibilityOff/>}
                    </Box>
                </div>
                <Button
                    className="w-full"
                    variant="contained"
                    sx={{
                        backgroundColor: 'var(--color-blue-400)',
                        width: '100%',
                        mt: 2,
                    }}
                >
                    Register
                </Button>
                <div>
                    <div className="flex items-center h-[20px] mt-[24px] mb-[16px]">
                        <div className="flex-1 h-[1px] bg-gray-400"></div>
                        <span className="mx-[8px] text-xs text-gray-400">or</span>
                        <div className="flex-1 h-[1px] bg-gray-400"></div>
                    </div>
                    <div className="mt-[10px] flex items-center justify-center gap-[15px]">
                        {/* <Tooltip title="Sign in with GitHub">
                            <GitHubIcon
                                sx={{
                                    transition: 'transform 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.2)',
                                    },
                                    cursor: 'pointer',
                                }}
                            />
                        </Tooltip> */}
                        <Tooltip title="Sign in with Google">
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: 15,
                                    height: 15,
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.1)',    
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
            </form>
        </div>
    )
}