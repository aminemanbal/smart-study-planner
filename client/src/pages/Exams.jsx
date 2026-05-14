import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ExamCountdown from '../components/ExamCountdown'
import { IconPlus, IconCalendar } from '../components/Icons'
import * as examService from '../services/examService'
import * as subjectService from '../services/subjectService'

export default function Exams() {
  const [exams, setExams]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ subjectId: '', examDate: '', priority: 'medium', notes: '' })
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchAll = async () => {
    try {
      const [e, s] = await Promise.all([examService.list(), subjectService.list()])
      setExams(e); setSubjects(s)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await examService.create(form)
      setForm({ subjectId: '', examDate: '', priority: 'medium', notes: '' })
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule exam')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam?')) return
    try { await examService.remove(id); fetchAll() }
    catch (err) { setError(err.response?.data?.message || 'Failed to delete') }
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = exams.filter(e => new Date(e.examDate) >= new Date(today))
                        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
  const past = exams.filter(e => new Date(e.examDate) < new Date(today))

  return (
    <Layout
      title="Exams"
      subtitle="Schedule the exams that drive your study plan."
      actions={
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary"
          disabled={subjects.length === 0}
          title={subjects.length === 0 ? 'Add a subject first' : ''}
        >
          <IconPlus className="w-4 h-4" />
          {showForm ? 'Close form' : 'Schedule Exam'}
        </button>
      }
    >
      {subjects.length === 0 && (
        <div className="card p-4 mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-sm">
          You need to add at least one subject before scheduling exams.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="card p-6 mb-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="label">Subject</label>
              <select
                className="input"
                value={form.subjectId}
                onChange={e => setForm({ ...form, subjectId: e.target.value })}
                required
              >
                <option value="">Select a subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Exam date</label>
              <input
                type="date"
                min={today}
                className="input"
                value={form.examDate}
                onChange={e => setForm({ ...form, examDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              placeholder="Chapters, topics, room…"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button type="submit" className="btn-primary">Schedule exam</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        </form>
      )}

      {exams.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-soft flex items-center justify-center text-brand-600">
            <IconCalendar className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 mt-4">No exams scheduled</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add your first exam so the system can plan around it.</p>
        </div>
      ) : (
        <>
          <h2 className="section-title mb-3">Upcoming ({upcoming.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {upcoming.map(ex => (
              <ExamCountdown key={ex._id} exam={ex} onDelete={handleDelete} />
            ))}
          </div>

          {past.length > 0 && (
            <>
              <h2 className="section-title mb-3">Past ({past.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {past.map(ex => (
                  <ExamCountdown key={ex._id} exam={ex} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}
