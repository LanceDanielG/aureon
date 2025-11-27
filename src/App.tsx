import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import LogIn from './pages/LogIn'
import Home from './pages/Home'
import NotFound from './pages/404';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

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