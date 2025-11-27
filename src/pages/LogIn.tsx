import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";

export default function LogIn() {
    const navigate = useNavigate();
    const signIn = async () => {
        await signInWithPopup(auth, googleProvider)
        console.log("Sign In Clicked");
        navigate('/home');
    }

    return (    
        <div>
            <h1 className="text-3xl font-bold underline text-red-200">
                Hello world!
            </h1>
            <Button variant="contained">Hello world</Button>
            <button onClick={signIn}>Log In Component</button>
        </div>
    )
}