import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LogIn from './components/LogIn'
import Home from './components/Home'

function App() {

    return (
        <Router>
            <Routes>
                <Route path='/' element={<LogIn/>}/>
                <Route path='/home' element={<Home/>}/>
            </Routes>
        </Router>
    )
}

export default App

// https://vite.dev
// https://react.dev