import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import {
  IconDashboard, IconBook, IconCalendar, IconCheck, IconChart,
  IconLogout, IconLogo, IconClose, IconSpark, IconUser, IconAcademic, IconTomato, IconNotes, IconCards
} from './Icons'

const links = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/subjects',  label: 'Subjects',  Icon: IconBook },
  { to: '/exams',     label: 'Exams',     Icon: IconCalendar },
  { to: '/tasks',     label: 'Tasks',     Icon: IconCheck },
  { to: '/focus',     label: 'Focus',     Icon: IconTomato },
  { to: '/notes',     label: 'Notes',     Icon: IconNotes },
  { to: '/review',    label: 'Review',    Icon: IconCards },
  { to: '/progress',  label: 'Progress',  Icon: IconChart },
  { to: '/profile',   label: 'Profile',   Icon: IconUser },
]

const aiLinks = [
  { to: '/tutor',     label: 'AI Tutor',  Icon: IconAcademic },
]

export default function Sidebar({ open, onClose, onOpenChat }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
    : '·'

  const accent = user?.accentColor || '#6366F1'

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
          bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800
          flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <IconLogo className="w-9 h-9" />
            <div className="leading-tight">
              <p className="font-display font-bold text-slate-900 dark:text-slate-100">Study Planner</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 tracking-wide uppercase">Smart Edition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
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
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-soft'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                      {label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="px-3 mt-7 mb-3 section-title">AI</p>
          <ul className="space-y-1 mb-3">
            {aiLinks.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-soft'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                      {label}
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          {onOpenChat && (
            <button
              onClick={() => { onClose?.(); onOpenChat() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-gradient shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
            >
              <IconSpark className="w-5 h-5" />
              Ask Pulse
            </button>
          )}

          <div className="mt-7 px-3 flex items-center justify-between">
            <span className="section-title">Theme</span>
            <ThemeToggle />
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
            <button
              onClick={() => { onClose?.(); navigate('/profile') }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              title="View profile"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover ring-2 shrink-0"
                  style={{ '--tw-ring-color': accent, ringColor: accent }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-glow shrink-0"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -30)})` }}
                >
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{user?.name || 'Student'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
              </div>
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0"
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

function shade (hex, percent) {
  const c = (hex || '#6366F1').replace('#', '')
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0xff) + percent
  let b = (num & 0xff) + percent
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}
