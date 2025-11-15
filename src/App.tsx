import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LogIn from './pages/LogIn'
import Home from './pages/Home'
import NotFound from './pages/404';

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
        }
    ]);

    return <RouterProvider router={router} />;
}

export default App

// https://vite.dev
// https://react.dev