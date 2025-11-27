import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import EmailIcon from '@mui/icons-material/Email';
import PasswordIcon from '@mui/icons-material/Password';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import PersonIcon from '@mui/icons-material/Person';
import { Button } from "@mui/material";

export default function Home() {
    const navigate = useNavigate();
    const logout = async () => {
        await auth.signOut();
        navigate('/');
    }

    return (
        <div className="relative w-[850px] min-h-[550px] bg-white shadow-2xl rounded-2xl overflow-hidden">
            <div className="form-box login absolute w-1/2 h-full bg-white right-0 flex items-center text-center text-gray-800 z-10">
                <form action="" className="w-full">
                    <p className="text-2xl font-bold">Log In</p>
                    <div className="input-box relative m-[30px]">
                        <input type="text" placeholder="Username" className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs"/>
                        <PersonIcon className="absolute right-[20px] top-1/2 -translate-y-1/2 text-gray-400" fontSize="small"/>
                    </div>
                    <div className="input-box relative m-[30px]">
                        <input type="text" placeholder="Password" className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs"/>
                        <PasswordIcon className="absolute right-[20px] top-1/2 -translate-y-1/2 text-gray-400" fontSize="small"/>
                    </div>
                    <div className="forgot-link">
                        <a href="#">Forgot Password?</a>
                    </div>
                    <Button 
                        className="w-full"
                    >
                        LogIn
                    </Button>
                    <p>or login with social platform</p>
                    <div className="social-icons inline-flex p-[10px] border-2-solid rounded-full border-gray-300 gap-[15px] mt-[10px]">
                        <GitHubIcon />
                        <GoogleIcon />
                        <FacebookIcon />
                        <LinkedInIcon />
                    </div>
                </form>
            </div>
            <div className="hidden form-box login absolute w-1/2 h-full bg-green-200 right-0 items-center text-center text-gray-800">
                <form action="" className="w-full">
                    <p className="text-2xl font-bold">Registration</p>
                    <div className="input-box relative m-[30px]">
                        <input type="text" placeholder="Email" className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs"/>
                        <EmailIcon className="absolute right-[20px] top-1/2 -translate-y-1/2 text-gray-400" fontSize="small"/>
                    </div>
                    <div className="input-box relative m-[30px]">
                        <input type="text" placeholder="Password" className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs"/>
                        <PasswordIcon className="absolute right-[20px] top-1/2 -translate-y-1/2 text-gray-400" fontSize="small"/>
                    </div>
                    <div className="input-box relative m-[30px]">
                        <input type="text" placeholder="Confirm Password" className="w-full ps-[20px] pe-[50px] py-[13px] rounded border-0 outline-0 bg-white placeholder-gray-400 placeholder:text-xs"/>
                        <PasswordIcon className="absolute right-[20px] top-1/2 -translate-y-1/2 text-gray-400" fontSize="small"/>
                    </div>
                    <Button 
                        className="w-full"
                    >
                        Register
                    </Button>
                    <p>or login with social platform</p>
                    <div className="social-icons inline-flex p-[10px] border-2-solid rounded-full border-gray-300 gap-[15px] mt-[10px]">
                        <GitHubIcon />
                        <GoogleIcon />
                        <FacebookIcon />
                        <LinkedInIcon />
                    </div>
                </form>
            </div>
            <div className="toggle-box absolute w-full h-full bg-green-500 flex flex-col justify-center items-center text-white">
                <p>Hello, Welcome!</p>
                <p>Don't have an Account?</p>
                <Button 
                    className="btn btn-register w-full"
                >
                    Register
                </Button>
            </div>
            {/* <p>User Name: {auth?.currentUser?.displayName}</p>
            <p>Email: {auth?.currentUser?.email}</p>

            <button onClick={logout}>LogOut</button> */}
        </div>
    )
}