import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LogIn from './components/Auth/LogIn'
import Home from './pages/Home'
import NotFound from './pages/404';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';

function App() {
    
    const router = createBrowserRouter([
        {
            path: "/",
            element: <Home/>,
            errorElement: <NotFound/>
        },
        {
            path: "/login",
            element: <LogIn/>
        },
        {
            path: "/register",
            element: <Register/>
        },
        {
            path: "/dashboard",
            element: <Dashboard/>
        }
    ]);

    return <RouterProvider router={router} />;
}

export default App

// https://vite.dev
// https://react.dev