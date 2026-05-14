import { useEffect, useState, useMemo } from 'react'
import Layout from '../components/Layout'
import { usePomodoro, formatTime } from '../context/PomodoroContext'
import { IconPlay, IconPause, IconSkip, IconClose, IconTomato, IconFire, IconCheck, IconClock } from '../components/Icons'
import * as sessionService from '../services/sessionService'
import * as subjectService from '../services/subjectService'
import * as taskService    from '../services/taskService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const PHASE_LABEL = {
  idle:      'Ready',
  focus:     'Focus',
  break:     'Short break',
  longBreak: 'Long break',
}

const PHASE_HUE = {
  idle:      '#6366F1',
  focus:     '#EF4444',
  break:     '#10B981',
  longBreak: '#0EA5E9',
}

const DURATION_PRESETS = [15, 25, 50, 90]

export default function Focus() {
  const {
    phase, paused, remainingMs, progress,
    subjectId, subjectName, settings, completedRounds,
    startFocus, pause, resume, stop, skip,
    requestNotificationPermission,
  } = usePomodoro()

  const [subjects, setSubjects]   = useState([])
  const [tasks, setTasks]         = useState([])
  const [stats, setStats]         = useState(null)
  const [pickedSubject, setPickedSubject] = useState('')
  const [pickedTask, setPickedTask]       = useState('')
  const [duration, setDuration]   = useState(settings.focus)

  const loadStats = async () => {
    try { setStats(await sessionService.stats()) } catch { /* ignore */ }
  }

  useEffect(() => {
    (async () => {
      try {
        const [subs, ts] = await Promise.all([subjectService.list(), taskService.list()])
        setSubjects(subs); setTasks(ts)
      } catch { /* ignore */ }
    })()
    loadStats()
  }, [])

  // refresh stats when a session completes (phase changes back to break/idle)
  useEffect(() => { loadStats() }, [phase])

  useEffect(() => { requestNotificationPermission() }, [requestNotificationPermission])

  const isIdle    = phase === 'idle'
  const isFocus   = phase === 'focus'
  const isBreak   = phase === 'break' || phase === 'longBreak'
  const hue       = PHASE_HUE[phase]

  const ringCircumference = 2 * Math.PI * 110

  const availableTasks = useMemo(() => {
    if (!pickedSubject) return []
    return tasks.filter(t => t.subjectId?._id === pickedSubject && t.status === 'pending')
  }, [tasks, pickedSubject])

  const handleStart = async () => {
    const sub = subjects.find(s => s._id === pickedSubject)
    await startFocus({
      subjectId: pickedSubject || null,
      subjectName: sub?.name || '',
      taskId: pickedTask || null,
      durationMinutes: duration,
    })
  }

  return (
    <Layout
      title="Focus Mode"
      subtitle="Pomodoro timer with study-time tracking."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TIMER */}
        <div className="card p-8 lg:col-span-2 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hue }}
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {PHASE_LABEL[phase]}
              {isFocus && subjectName && ` · ${subjectName}`}
              {paused && ' · Paused'}
            </p>
          </div>

          {/* Ring + time */}
          <div className="relative w-72 h-72 my-4">
            <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
              <circle
                cx="120" cy="120" r="110"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="14"
                fill="none"
              />
              <circle
                cx="120" cy="120" r="110"
                stroke={hue}
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p
                className="text-6xl font-extrabold tracking-tight tabular-nums"
                style={{ color: isIdle ? '#6366F1' : hue }}
              >
                {isIdle ? `${duration}:00` : formatTime(remainingMs)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                {isFocus ? 'minutes left' : isBreak ? 'break time' : 'when you’re ready'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-2">
            {isIdle ? (
              <button
                onClick={handleStart}
                className="btn-primary px-8 py-3 text-base"
              >
                <IconPlay className="w-5 h-5" /> Start focus
              </button>
            ) : (
              <>
                {paused ? (
                  <button onClick={resume} className="btn-primary px-6">
                    <IconPlay className="w-4 h-4" /> Resume
                  </button>
                ) : (
                  <button onClick={pause} className="btn-secondary px-6">
                    <IconPause className="w-4 h-4" /> Pause
                  </button>
                )}
                <button onClick={skip} className="btn-secondary px-6" title="Skip to next phase">
                  <IconSkip className="w-4 h-4" /> Skip
                </button>
                <button onClick={stop} className="btn-ghost px-3" title="Stop">
                  <IconClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Idle config */}
          {isIdle && (
            <div className="w-full max-w-lg mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Subject (optional)</label>
                  <select
                    className="input"
                    value={pickedSubject}
                    onChange={e => { setPickedSubject(e.target.value); setPickedTask('') }}
                  >
                    <option value="">No subject</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Task (optional)</label>
                  <select
                    className="input"
                    value={pickedTask}
                    onChange={e => setPickedTask(e.target.value)}
                    disabled={!pickedSubject || availableTasks.length === 0}
                  >
                    <option value="">No specific task</option>
                    {availableTasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Duration</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DURATION_PRESETS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        duration === d
                          ? 'bg-brand-gradient text-white shadow-glow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 mt-8 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
              {completedRounds} rounds done today
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock className="w-3.5 h-3.5 text-brand-500" />
              {Math.floor((stats?.todayMinutes || 0) / 60)}h {(stats?.todayMinutes || 0) % 60}m focused
            </span>
          </div>
        </div>

        {/* SIDE: today's stats */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100">Today</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-5">Your focus session breakdown</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={IconClock}
                value={`${Math.floor((stats?.todayMinutes || 0) / 60)}h ${(stats?.todayMinutes || 0) % 60}m`}
                label="Total focus"
                gradient="bg-gradient-to-br from-red-500 to-rose-500"
              />
              <Tile
                icon={IconTomato}
                value={stats?.sessionCountToday ?? 0}
                label="Sessions"
                gradient="bg-gradient-to-br from-amber-500 to-orange-500"
              />
            </div>

            {stats?.todayBySubject?.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">By subject</p>
                <div className="space-y-2">
                  {stats.todayBySubject.map((s) => (
                    <div key={s.subjectId} className="flex items-center gap-2">
                      <div className="w-2 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{s.name}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WEEKLY CHART */}
      <div className="card p-6 mt-6">
        <h3 className="font-display font-bold text-slate-900 dark:text-slate-100">Last 7 Days</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-5">Minutes focused per day</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats?.days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              formatter={(v) => [`${v} min`, 'Focus time']}
            />
            <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {(stats?.days || []).map((_, i) => (
                <Cell key={i} fill={i === (stats?.days?.length || 0) - 1 ? '#EF4444' : '#FCA5A5'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  )
}

function Tile({ icon: Icon, value, label, gradient }) {
  return (
    <div className="p-4 rounded-xl text-white" style={{ background: undefined }}>
      <div className={`${gradient} -m-4 mb-2 p-4 rounded-xl text-white`}>
        <div className="flex items-center justify-between">
          <Icon className="w-5 h-5 opacity-90" />
          <p className="text-xl font-extrabold tabular-nums">{value}</p>
        </div>
        <p className="text-[11px] opacity-90 mt-1">{label}</p>
      </div>
    </div>
  )
}
