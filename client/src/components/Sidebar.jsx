import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconDashboard, IconBook, IconCalendar, IconCheck, IconChart,
  IconLogout, IconLogo, IconClose, IconSpark
} from './Icons'

const links = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/subjects',  label: 'Subjects',  Icon: IconBook },
  { to: '/exams',     label: 'Exams',     Icon: IconCalendar },
  { to: '/tasks',     label: 'Tasks',     Icon: IconCheck },
  { to: '/progress',  label: 'Progress',  Icon: IconChart },
]

export default function Sidebar({ open, onClose, onOpenChat }) {
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
    : '·'

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-0
          h-screen w-72 shrink-0
          bg-white border-r border-slate-100
          flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <IconLogo className="w-9 h-9" />
            <div className="leading-tight">
              <p className="font-display font-bold text-slate-900">Study Planner</p>
              <p className="text-[11px] text-slate-400 tracking-wide uppercase">Smart Edition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors p-1"
            aria-label="Close menu"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto scroll-thin">
          <p className="px-3 mb-3 section-title">Workspace</p>
          <ul className="space-y-1">
            {links.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 shadow-soft'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : ''}`} />
                      {label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {onOpenChat && (
            <>
              <p className="px-3 mt-7 mb-3 section-title">AI</p>
              <button
                onClick={() => { onClose?.(); onOpenChat() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-gradient shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
              >
                <IconSpark className="w-5 h-5" />
                Ask Pulse
                <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
              </button>
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-brand-gradient text-white flex items-center justify-center text-sm font-bold shadow-glow">
              {initials}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Student'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
