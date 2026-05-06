import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import TaskCard from '../components/TaskCard'
import { IconSpark, IconCheck } from '../components/Icons'
import * as taskService from '../services/taskService'
import * as subjectService from '../services/subjectService'
import * as aiService from '../services/aiService'

export default function Tasks() {
  const [tasks, setTasks]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [filter, setFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRationale, setAiRationale] = useState('')
  const [msg, setMsg]           = useState('')
  const [error, setError]       = useState('')

  const fetchAll = async () => {
    try {
      const [t, s] = await Promise.all([taskService.list(), subjectService.list()])
      setTasks(t); setSubjects(s)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleGenerate = async () => {
    setLoading(true); setMsg(''); setError(''); setAiRationale('')
    try {
      const res = await taskService.generate()
      setMsg(res.message)
      fetchAll()
      setTimeout(() => setMsg(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating study plan')
    } finally { setLoading(false) }
  }

  const handleAIGenerate = async () => {
    setAiLoading(true); setMsg(''); setError(''); setAiRationale('')
    try {
      const res = await aiService.generatePlan()
      setMsg(res.message)
      setAiRationale(res.rationale || '')
      fetchAll()
      setTimeout(() => setMsg(''), 6000)
    } catch (err) {
      const m = err.response?.data?.message || 'AI plan generation failed'
      setError(m.includes('GROQ_API_KEY')
        ? 'AI is not configured — add GROQ_API_KEY to server/.env to enable. (Get one free at console.groq.com)'
        : m)
    } finally { setAiLoading(false) }
  }

  const handleStatus = async (id, status) => {
    try { await taskService.updateStatus(id, status); fetchAll() }
    catch (err) { setError(err.response?.data?.message || 'Failed to update') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try { await taskService.remove(id); fetchAll() }
    catch (err) { setError(err.response?.data?.message || 'Failed to delete') }
  }

  const filtered = useMemo(() => {
    let t = tasks
    if (filter) t = t.filter(x => x.subjectId?._id === filter)
    if (statusFilter !== 'all') t = t.filter(x => x.status === statusFilter)
    return t
  }, [tasks, filter, statusFilter])

  const grouped = useMemo(() => filtered.reduce((acc, task) => {
    const date = new Date(task.date).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(task)
    return acc
  }, {}), [filtered])

  const counts = useMemo(() => ({
    all:     tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    done:    tasks.filter(t => t.status === 'done').length,
    missed:  tasks.filter(t => t.status === 'missed').length,
  }), [tasks])

  const tabs = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'done',    label: 'Done' },
    { key: 'missed',  label: 'Missed' },
  ]

  const busy = loading || aiLoading

  return (
    <Layout
      title="Tasks"
      subtitle="Your generated study plan, day by day."
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleGenerate} disabled={busy} className="btn-secondary">
            {loading ? 'Generating…' : 'Quick Plan'}
          </button>
          <button
            onClick={handleAIGenerate}
            disabled={busy}
            className="btn-primary"
            title="Generate a smart, AI-tailored study plan"
          >
            <IconSpark className="w-4 h-4" />
            {aiLoading ? 'AI is planning…' : 'Generate with AI'}
          </button>
        </div>
      }
    >
      {msg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2 animate-fade-in">
          <IconCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{msg}</p>
            {aiRationale && <p className="mt-1 text-xs text-emerald-600/90">{aiRationale}</p>}
          </div>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="card p-4 mb-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === t.key
                  ? 'bg-white text-slate-900 shadow-soft'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] opacity-60">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {subjects.length > 0 && (
          <select
            className="input md:w-64"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-soft flex items-center justify-center text-brand-600">
            <IconSpark className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-slate-900 mt-4">No tasks here</h3>
          <p className="text-sm text-slate-500 mt-1">
            {tasks.length === 0
              ? 'Add subjects and exams, then click "Generate with AI" for a smart plan.'
              : 'No tasks match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayTasks]) => (
            <section key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="section-title">{date}</h3>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400 font-medium">
                  {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {dayTasks.map(task => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStatusChange={handleStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  )
}
