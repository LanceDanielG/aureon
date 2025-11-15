import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";

export default function Home() {
    const navigate = useNavigate();
    const logout = async () => {
        await auth.signOut();
        console.log(auth);
        
        navigate('/');
    }

    return (
        <div>
            <p>User Name: {auth?.currentUser?.displayName}</p>
            <p>Email: {auth?.currentUser?.email}</p>

            <button onClick={logout}>LogOut</button>
        </div>
    )
}