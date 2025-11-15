import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export default function LogIn() {
    const navigate = useNavigate();
    const signIn = async () => {
        await signInWithPopup(auth, googleProvider)
        console.log("Sign In Clicked");
        navigate('/home');
    }

    return (    
        <button onClick={signIn}>Log In Component</button>
    )
}