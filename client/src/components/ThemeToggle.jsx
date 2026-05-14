import { useTheme } from '../context/ThemeContext'
import { IconSun, IconMoon } from './Icons'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      className={`
        relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300
        ${isDark ? 'bg-slate-700' : 'bg-slate-200'}
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-soft flex items-center justify-center
          transform transition-transform duration-300
          ${isDark ? 'translate-x-7' : 'translate-x-0'}
        `}
      >
        {isDark
          ? <IconMoon className="w-3.5 h-3.5 text-slate-700" />
          : <IconSun  className="w-3.5 h-3.5 text-amber-500" />}
      </span>
      <span className={`text-[10px] font-bold absolute left-2 transition-opacity ${isDark ? 'opacity-0' : 'opacity-60'} text-slate-500`}>L</span>
      <span className={`text-[10px] font-bold absolute right-2 transition-opacity ${isDark ? 'opacity-60' : 'opacity-0'} text-white`}>D</span>
    </button>
  )
}
