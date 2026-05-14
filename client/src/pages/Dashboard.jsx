import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import TaskCard from '../components/TaskCard'
import ExamCountdown from '../components/ExamCountdown'
import { OverallRing } from '../components/ProgressChart'
import { useAuth } from '../context/AuthContext'
import { IconBook, IconCalendar, IconCheck, IconFire, IconSpark, IconBell, IconRefresh } from '../components/Icons'
import * as taskService from '../services/taskService'
import * as examService from '../services/examService'
import * as subjectService from '../services/subjectService'
import * as progressService from '../services/progressService'
import * as aiService from '../services/aiService'

const StatCard = ({ icon: Icon, label, value, gradient, hint }) => (
  <div className="card card-hover p-5 relative overflow-hidden">
    <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10 ${gradient}`} />
    <div className="relative flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${gradient}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
      </div>
    </div>
  </div>
)

const toneStyle = {
  info:    'bg-brand-50    text-brand-700    border-brand-100   dark:bg-brand-900/30   dark:text-brand-300   dark:border-brand-800',
  warn:    'bg-amber-50    text-amber-800    border-amber-100   dark:bg-amber-900/30   dark:text-amber-300   dark:border-amber-800',
  danger:  'bg-rose-50     text-rose-700     border-rose-100    dark:bg-rose-900/30    dark:text-rose-300    dark:border-rose-800',
  success: 'bg-emerald-50  text-emerald-700  border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
}

const fallbackSuggestions = (summary, exams, todayTasks, subjects, daysLeft) => {
  const out = []
  const examsIn7Days = exams.filter(e => daysLeft(e.examDate) <= 7).length
  if (examsIn7Days > 0) out.push({ tone: 'warn', text: `${examsIn7Days} exam${examsIn7Days>1?'s':''} in the next 7 days — review your plan.` })
  if (summary?.missed > 3) out.push({ tone: 'danger', text: `You missed ${summary.missed} tasks — consider catching up.` })
  if (todayTasks.length === 0 && exams.length > 0) out.push({ tone: 'info', text: 'No tasks scheduled for today — generate a new study plan.' })
  if (summary?.overall >= 80) out.push({ tone: 'success', text: `You're at ${summary.overall}% completion — excellent pace!` })
  if (subjects.length === 0) out.push({ tone: 'info', text: 'Start by adding your subjects in the Subjects page.' })
  if (out.length === 0) out.push({ tone: 'success', text: 'Everything is on track — keep going!' })
  return out
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tasks, setTasks]       = useState([])
  const [exams, setExams]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [summary, setSummary]   = useState(null)
  const [aiSuggestions, setAiSuggestions]     = useState(null)
  const [aiLoading, setAiLoading]             = useState(false)
  const [aiError, setAiError]                 = useState('')

  const fetchAll = async () => {
    try {
      const [t, e, s, sum] = await Promise.all([
        taskService.list(),
        examService.list(),
        subjectService.list(),
        progressService.summary()
      ])
      setTasks(t); setExams(e); setSubjects(s); setSummary(sum)
    } catch (err) { console.error(err) }
  }

  const fetchAiInsights = async () => {
    setAiLoading(true); setAiError('')
    try {
      const data = await aiService.getInsights()
      setAiSuggestions(data.suggestions)
    } catch (err) {
      setAiError(err.response?.data?.message || 'AI insights unavailable')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Fetch AI insights once we have meaningful data to summarise
  useEffect(() => {
    if (subjects.length > 0 && summary !== null && !aiSuggestions && !aiLoading && !aiError) {
      fetchAiInsights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.length, summary])

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const todayTasks = tasks.filter(t => {
    const d = new Date(t.date); d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const upcomingExams = exams
    .filter(e => new Date(e.examDate) >= today)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .slice(0, 4)

  const daysLeft = (date) => Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))

  const handleStatus = async (id, status) => {
    await taskService.updateStatus(id, status)
    fetchAll()
  }

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      const count = tasks.filter(t => {
        const td = new Date(t.date); td.setHours(0, 0, 0, 0)
        return td.getTime() === d.getTime()
      }).length
      days.push({ date: d, count })
    }
    return days
  }, [tasks, today])

  const suggestions = aiSuggestions || fallbackSuggestions(summary, upcomingExams, todayTasks, subjects, daysLeft)

  return (
    <Layout
      title={`${greeting}${user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋`}
      subtitle={today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      actions={
        <Link to="/tasks" className="btn-primary">
          <IconSpark className="w-4 h-4" />
          Generate Study Plan
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IconBook}     label="Subjects"        value={subjects.length}            gradient="bg-gradient-to-br from-indigo-500 to-violet-500" />
        <StatCard icon={IconCalendar} label="Scheduled Exams" value={exams.length}               gradient="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <StatCard icon={IconCheck}    label="Tasks Completed" value={summary?.completed || 0}    gradient="bg-gradient-to-br from-emerald-500 to-teal-500" />
        <StatCard icon={IconFire}     label="Active Days (7d)" value={`${summary?.studiedDays ?? 0}/7`} gradient="bg-gradient-to-br from-rose-500 to-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Today's Tasks</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} for {today.toLocaleDateString('en-US', { weekday: 'long' })}</p>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">View all →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nothing planned for today.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Generate a study plan to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todayTasks.map(task => (
                <TaskCard key={task._id} task={task} onStatusChange={handleStatus} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-6 flex flex-col items-center text-center">
          <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Overall Progress</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-5">Across all subjects</p>
          <OverallRing value={summary?.overall || 0} />
          <Link to="/progress" className="mt-5 btn-secondary px-4 py-2 text-xs">
            View detailed report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Exam Countdown</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Next {Math.min(upcomingExams.length, 4)} upcoming exam(s)</p>
            </div>
            <Link to="/exams" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">Manage →</Link>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No upcoming exams</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Schedule an exam to start planning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingExams.map(ex => <ExamCountdown key={ex._id} exam={ex} />)}
            </div>
          )}
        </div>

        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-gradient opacity-5 rounded-full -mr-16 -mt-16" />
          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-glow">
                <IconSpark className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">AI Suggestions</h2>
                <p className="text-xs text-slate-400">
                  {aiLoading ? 'Pulse is thinking…' : aiSuggestions ? 'Powered by Claude' : aiError ? 'Showing offline tips' : 'Heuristic tips'}
                </p>
              </div>
            </div>
            {aiSuggestions && !aiLoading && (
              <button
                onClick={fetchAiInsights}
                className="text-slate-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                title="Refresh AI suggestions"
              >
                <IconRefresh className="w-4 h-4" />
              </button>
            )}
          </div>

          {aiLoading && !aiSuggestions ? (
            <div className="space-y-3 relative">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3 relative">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className={`text-sm px-4 py-3 rounded-xl border leading-relaxed ${toneStyle[s.tone] || toneStyle.info}`}
                >
                  {s.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Next 14 Days</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily task density across upcoming days</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800" /> 0
            <span className="w-2.5 h-2.5 rounded bg-brand-100" /> 1–2
            <span className="w-2.5 h-2.5 rounded bg-brand-300" /> 3–4
            <span className="w-2.5 h-2.5 rounded bg-brand-500" /> 5+
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map(({ date, count }, i) => {
            const isToday = date.getTime() === today.getTime()
            const intensity = count === 0 ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500' :
                              count < 3  ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' :
                              count < 5  ? 'bg-brand-300 dark:bg-brand-700 text-white' :
                                           'bg-brand-500 text-white'
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${intensity} ${
                  isToday ? 'ring-2 ring-brand-600 ring-offset-2' : ''
                }`}
                title={`${count} task(s) on ${date.toDateString()}`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-base font-bold leading-tight">{date.getDate()}</span>
                {count > 0 && <span className="text-[9px] opacity-90">{count} task{count > 1 ? 's' : ''}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
