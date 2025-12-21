import { Button } from "@mui/material";
import { useState } from "react";
import LogIn from "../components/Auth/LogIn";
import Register from "../components/Auth/Register";

export default function Home() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className={`relative w-full h-screen md:h-[550px] md:w-full md:max-w-[850px] bg-white md:rounded-2xl md:shadow-2xl overflow-hidden font-poppins`}>
            <LogIn isLogin={isLogin} setIsLogin={setIsLogin} />
            <Register isLogin={isLogin} setIsLogin={setIsLogin} />
            <div className={`toggle-box hidden md:flex absolute w-full h-full justify-center items-center text-white before:content-[''] before:absolute before:left-[-250%] before:w-[300%] before:h-full before:bg-gradient-to-r before:from-blue-500 before:to-cyan-500 before:rounded-[150px] before:z-20 before:transition-all before:duration-[1.8s] before:ease-in-out ${!isLogin ? 'before:left-[50%]' : ''}`}>
                <div className={`toggle-pannel toggle-left absolute w-1/2 h-full left-0 flex flex-col justify-center items-center px-10 text-center z-20 transition-all ease-in-out delay-[.6s] ${isLogin ? '' : 'left-[-50%] delay-[.6s]'}`}>
                    <p className="text-4xl">Hello, Welcome!</p>
                    <p className="mb-5 text-xs">Don't have an Account?</p>
                    <Button
                        className="btn btn-register w-full"
                        variant="contained"
                        sx={{
                            backgroundColor: 'transparent',
                            width: '160px',
                            height: '46px',
                            boxShadow: 'none',
                            border: '2px solid white',
                        }}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </Button>
                </div>
                <div className={`toggle-pannel toggle-right absolute w-1/2 h-full right-[-50%] flex flex-col justify-center items-center px-10 text-center z-20 transition-all ease-in-out delay-[.6s] ${isLogin ? '' : 'right-[0%] delay-[1.2s]'}`}>
                    <p className="text-4xl">Welcome Back!</p>
                    <p className="mb-5 text-xs">Already have an Account?</p>
                    <Button
                        className="btn btn-register w-full"
                        variant="contained"
                        sx={{
                            backgroundColor: 'transparent',
                            width: '160px',
                            height: '46px',
                            boxShadow: 'none',
                            border: '2px solid white',
                        }}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </Button>
                </div>
            </div>
        </div>
    )
}