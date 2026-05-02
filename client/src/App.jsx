import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Exams from './pages/Exams'
import Tasks from './pages/Tasks'
import Progress from './pages/Progress'

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/subjects" element={token ? <Subjects /> : <Navigate to="/login" />} />
        <Route path="/exams" element={token ? <Exams /> : <Navigate to="/login" />} />
        <Route path="/tasks" element={token ? <Tasks /> : <Navigate to="/login" />} />
        <Route path="/progress" element={token ? <Progress /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App