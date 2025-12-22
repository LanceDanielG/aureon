import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LogIn from './components/Auth/LogIn'
import Home from './pages/Home'
import RouteError from './pages/RouteError';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Activity from './pages/Activity';
import Settings from './pages/Settings';

import { Toaster } from 'react-hot-toast';
import { ThemeContextProvider } from './context/ThemeContext';
import { FinanceProvider } from './context/FinanceContext';
import ErrorBoundary from './components/Common/ErrorBoundary';

function App() {

    const router = createBrowserRouter([
        {
            path: "/",
            element: <Home />,
            errorElement: <RouteError />
        },
        {
            path: "/login",
            element: <LogIn />,
            errorElement: <RouteError />
        },
        {
            path: "/register",
            element: <Register />,
            errorElement: <RouteError />
        },
        {
            path: "/dashboard",
            element: <Dashboard />,
            errorElement: <RouteError />
        },
        {
            path: "/wallet",
            element: <Wallet />,
            errorElement: <RouteError />
        },
        {
            path: "/activity",
            element: <Activity />,
            errorElement: <RouteError />
        },
        {
            path: "/settings",
            element: <Settings />,
            errorElement: <RouteError />
        }
    ]);

    return (
        <ErrorBoundary>
            <ThemeContextProvider>
                <FinanceProvider>
                    <Toaster position="top-center" reverseOrder={false} />
                    <RouterProvider router={router} />
                </FinanceProvider>
            </ThemeContextProvider>
        </ErrorBoundary>
    );
}

export default App

// https://vite.dev
// https://react.dev