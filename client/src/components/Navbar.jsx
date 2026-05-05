import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconLogo, IconLogout } from './Icons'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/subjects',  label: 'Subjects' },
  { to: '/exams',     label: 'Exams' },
  { to: '/tasks',     label: 'Tasks' },
  { to: '/progress',  label: 'Progress' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="bg-white/80 backdrop-blur border-b border-slate-100 px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <IconLogo className="w-7 h-7" />
            <span className="font-display font-bold text-slate-900">Study Planner</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="hidden sm:inline text-sm text-slate-600">{user.name}</span>}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="btn-ghost px-3 py-1.5"
            title="Log out"
          >
            <IconLogout className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
