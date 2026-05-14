import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { PomodoroProvider } from './context/PomodoroContext'
import PomodoroMiniWidget from './components/PomodoroMiniWidget'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Exams from './pages/Exams'
import Tasks from './pages/Tasks'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Tutor from './pages/Tutor'
import Focus from './pages/Focus'

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand-600 animate-spin" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  </div>
)

const Protected = ({ children }) => {
  const { token, loading } = useAuth()
  if (loading) return <Loader />
  return token ? children : <Navigate to="/login" replace />
}

const PublicOnly = ({ children }) => {
  const { token, loading } = useAuth()
  if (loading) return <Loader />
  return token ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"     element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register"  element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/subjects"  element={<Protected><Subjects /></Protected>} />
      <Route path="/exams"     element={<Protected><Exams /></Protected>} />
      <Route path="/tasks"     element={<Protected><Tasks /></Protected>} />
      <Route path="/progress"  element={<Protected><Progress /></Protected>} />
      <Route path="/profile"   element={<Protected><Profile /></Protected>} />
      <Route path="/tutor"     element={<Protected><Tutor /></Protected>} />
      <Route path="/focus"     element={<Protected><Focus /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppShell() {
  const { token } = useAuth()
  return (
    <>
      <AppRoutes />
      {token && <PomodoroMiniWidget />}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PomodoroProvider>
            <AppShell />
          </PomodoroProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
