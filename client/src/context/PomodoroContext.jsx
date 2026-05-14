import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import * as sessionService from '../services/sessionService'

/*
  POMODORO STATE MACHINE
  ----------------------
  phase: 'idle' | 'focus' | 'break' | 'longBreak'

  - 'focus' creates a DB session at start, marks completed on finish (auto)
    or abandoned on user stop.
  - 'break' / 'longBreak' are pure UI; not persisted.
  - Every 4 completed focus rounds we go into 'longBreak' (15m) instead of 'break' (5m).
  - State persists to localStorage so a page refresh doesn't lose the timer.
*/

const STORAGE = 'studyplanner-pomodoro'
const DEFAULTS = { focus: 25, break: 5, longBreak: 15 }

const PomodoroContext = createContext(null)

const loadPersisted = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export const PomodoroProvider = ({ children }) => {
  const persisted = loadPersisted()

  const [phase, setPhase]                 = useState(persisted?.phase || 'idle')
  const [endsAt, setEndsAt]               = useState(persisted?.endsAt || null)        // ms epoch
  const [sessionId, setSessionId]         = useState(persisted?.sessionId || null)
  const [subjectId, setSubjectId]         = useState(persisted?.subjectId || '')
  const [taskId, setTaskId]               = useState(persisted?.taskId || '')
  const [subjectName, setSubjectName]     = useState(persisted?.subjectName || '')
  const [completedRounds, setCompletedRounds] = useState(persisted?.completedRounds || 0)
  const [paused, setPaused]               = useState(persisted?.paused || false)
  const [pausedRemainingMs, setPausedRemainingMs] = useState(persisted?.pausedRemainingMs || 0)
  const [settings, setSettings]           = useState(persisted?.settings || DEFAULTS)

  // tick to refresh `remainingMs` every second
  const [tick, setTick] = useState(0)
  const tickRef = useRef(null)

  // persist
  useEffect(() => {
    const data = { phase, endsAt, sessionId, subjectId, taskId, subjectName, completedRounds, paused, pausedRemainingMs, settings }
    localStorage.setItem(STORAGE, JSON.stringify(data))
  }, [phase, endsAt, sessionId, subjectId, taskId, subjectName, completedRounds, paused, pausedRemainingMs, settings])

  // ticker
  useEffect(() => {
    if (phase === 'idle' || paused) return
    tickRef.current = setInterval(() => setTick(t => t + 1), 250)
    return () => clearInterval(tickRef.current)
  }, [phase, paused])

  // Hydrate active session on mount (in case server has one we don't know about)
  useEffect(() => {
    (async () => {
      if (sessionId || phase !== 'idle') return
      try {
        const s = await sessionService.active()
        if (s && s.status === 'active') {
          const ends = new Date(s.startedAt).getTime() + s.durationMinutes * 60_000
          setSessionId(s._id)
          setEndsAt(ends)
          setSubjectId(s.subjectId?._id || s.subjectId || '')
          setSubjectName(s.subjectId?.name || '')
          setTaskId(s.taskId?._id || s.taskId || '')
          setPhase('focus')
        }
      } catch { /* ignore */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-transition when timer hits zero
  useEffect(() => {
    if (phase === 'idle' || paused || !endsAt) return
    if (Date.now() < endsAt) return
    handleNaturalEnd()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, endsAt, phase, paused])

  const remainingMs = paused
    ? pausedRemainingMs
    : (phase === 'idle' || !endsAt ? 0 : Math.max(0, endsAt - Date.now()))

  // ---------- actions ----------
  const startFocus = useCallback(async ({ subjectId: sid, subjectName: sname, taskId: tid, durationMinutes } = {}) => {
    const minutes = Number(durationMinutes || settings.focus)
    const res = await sessionService.start({
      subjectId: sid || subjectId || null,
      taskId: tid || taskId || null,
      durationMinutes: minutes,
    })
    setSessionId(res._id)
    setSubjectId(sid || subjectId || '')
    setSubjectName(sname || subjectName || '')
    setTaskId(tid || taskId || '')
    setEndsAt(new Date(res.startedAt).getTime() + minutes * 60_000)
    setPaused(false)
    setPausedRemainingMs(0)
    setPhase('focus')
    return res
  }, [settings.focus, subjectId, taskId, subjectName])

  const startBreak = useCallback((long = false) => {
    const minutes = long ? settings.longBreak : settings.break
    setSessionId(null)
    setEndsAt(Date.now() + minutes * 60_000)
    setPaused(false)
    setPausedRemainingMs(0)
    setPhase(long ? 'longBreak' : 'break')
  }, [settings.break, settings.longBreak])

  const pause = useCallback(() => {
    if (phase === 'idle' || paused || !endsAt) return
    setPausedRemainingMs(Math.max(0, endsAt - Date.now()))
    setPaused(true)
  }, [phase, paused, endsAt])

  const resume = useCallback(() => {
    if (!paused) return
    setEndsAt(Date.now() + pausedRemainingMs)
    setPaused(false)
    setPausedRemainingMs(0)
  }, [paused, pausedRemainingMs])

  const stop = useCallback(async () => {
    if (phase === 'focus' && sessionId) {
      try { await sessionService.abandon(sessionId) } catch { /* ignore */ }
    }
    setPhase('idle')
    setEndsAt(null)
    setSessionId(null)
    setPaused(false)
    setPausedRemainingMs(0)
  }, [phase, sessionId])

  const skip = useCallback(async () => {
    if (phase === 'focus' && sessionId) {
      // treat as completed early (user explicitly skipped)
      try { await sessionService.complete(sessionId) } catch { /* ignore */ }
      const next = (completedRounds + 1) % 4 === 0
      setCompletedRounds(c => c + 1)
      startBreak(next)
    } else {
      setPhase('idle')
      setEndsAt(null)
    }
  }, [phase, sessionId, completedRounds, startBreak])

  const handleNaturalEnd = async () => {
    if (phase === 'focus' && sessionId) {
      try { await sessionService.complete(sessionId) } catch { /* ignore */ }
      const newRounds = completedRounds + 1
      setCompletedRounds(newRounds)
      // ding
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRkQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSAEAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f38=')
        audio.play().catch(() => {})
      } catch { /* ignore */ }
      // notify
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 Focus session done!', { body: 'Take a short break.' })
      }
      const isLong = newRounds % 4 === 0
      startBreak(isLong)
    } else {
      // break ended
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('☕ Break over', { body: 'Ready for another round?' })
      }
      setPhase('idle')
      setEndsAt(null)
    }
  }

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const totalMs = endsAt && phase !== 'idle'
    ? (paused ? pausedRemainingMs : (endsAt - Date.now())) + 0
    : 0

  const phaseDurationMs =
    phase === 'focus' ? settings.focus * 60_000 :
    phase === 'break' ? settings.break * 60_000 :
    phase === 'longBreak' ? settings.longBreak * 60_000 : 0

  const progress = phaseDurationMs > 0
    ? Math.max(0, Math.min(1, 1 - remainingMs / phaseDurationMs))
    : 0

  const value = {
    phase, paused, remainingMs, progress,
    sessionId, subjectId, subjectName, taskId, completedRounds,
    settings, setSettings,
    startFocus, startBreak, pause, resume, stop, skip,
    requestNotificationPermission,
  }

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
}

export const usePomodoro = () => {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider')
  return ctx
}

export const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
