import { useNavigate } from 'react-router-dom'
import { usePomodoro, formatTime } from '../context/PomodoroContext'
import { IconPlay, IconPause, IconClose } from './Icons'

/**
 * Small fixed-bottom widget that's only visible when a session is active
 * (anywhere except the Focus page itself).
 */
export default function PomodoroMiniWidget() {
  const { phase, paused, remainingMs, progress, subjectName, pause, resume, stop } = usePomodoro()
  const navigate = useNavigate()

  if (phase === 'idle') return null
  // Hide on the dedicated /focus page (it shows the big timer already)
  if (typeof window !== 'undefined' && window.location.pathname === '/focus') return null

  const hue = phase === 'focus' ? '#EF4444' : phase === 'break' ? '#10B981' : '#0EA5E9'
  const label = phase === 'focus' ? 'Focus' : phase === 'break' ? 'Break' : 'Long break'

  return (
    <div
      className="fixed bottom-6 left-6 z-40 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden flex items-stretch animate-fade-in"
      style={{ minWidth: '240px' }}
    >
      <button
        onClick={() => navigate('/focus')}
        className="flex-1 p-3 pr-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        title="Open Focus page"
      >
        <div className="flex items-center gap-3">
          {/* mini ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="4" fill="none" />
              <circle
                cx="20" cy="20" r="16"
                stroke={hue} strokeWidth="4" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: hue }}>
              {label}{paused && ' · paused'}
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatTime(remainingMs)}
            </p>
            {subjectName && phase === 'focus' && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{subjectName}</p>
            )}
          </div>
        </div>
      </button>
      <div className="flex flex-col border-l border-slate-100 dark:border-slate-800">
        {paused ? (
          <button onClick={resume} className="flex-1 px-3 text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Resume">
            <IconPlay className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={pause} className="flex-1 px-3 text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Pause">
            <IconPause className="w-4 h-4" />
          </button>
        )}
        <button onClick={stop} className="flex-1 px-3 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-t border-slate-100 dark:border-slate-800 transition-colors" title="Stop">
          <IconClose className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
