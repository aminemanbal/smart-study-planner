import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { IconPlus, IconTrash, IconBook } from '../components/Icons'
import * as subjectService from '../services/subjectService'

const diffStyle = {
  easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/50',
  medium: 'bg-amber-50   text-amber-700   ring-1 ring-amber-100   dark:bg-amber-900/30   dark:text-amber-300   dark:ring-amber-900/50',
  hard:   'bg-rose-50    text-rose-700    ring-1 ring-rose-100    dark:bg-rose-900/30    dark:text-rose-300    dark:ring-rose-900/50',
}

const colorPresets = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#14B8A6']

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ name: '', difficultyLevel: 'medium', color: '#6366F1' })
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const fetchSubjects = async () => {
    try { setSubjects(await subjectService.list()) }
    catch (err) { setError(err.response?.data?.message || 'Failed to load subjects') }
  }

  useEffect(() => { fetchSubjects() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await subjectService.create(form)
      setForm({ name: '', difficultyLevel: 'medium', color: '#6366F1' })
      setShowForm(false)
      fetchSubjects()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subject')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject? Linked exams and tasks will also be removed.')) return
    try {
      await subjectService.remove(id)
      fetchSubjects()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <Layout
      title="Subjects"
      subtitle="Define what you're studying and how challenging it feels."
      actions={
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <IconPlus className="w-4 h-4" />
          {showForm ? 'Close form' : 'New Subject'}
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleAdd} className="card p-6 mb-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="label">Subject name</label>
              <input
                className="input"
                placeholder="e.g. Linear Algebra"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select
                className="input"
                value={form.difficultyLevel}
                onChange={e => setForm({ ...form, difficultyLevel: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="label">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorPresets.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Pick ${c}`}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer border border-slate-200"
                title="Custom color"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button type="submit" className="btn-primary">Save subject</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        </form>
      )}

      {subjects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-soft flex items-center justify-center text-brand-600">
            <IconBook className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 mt-4">No subjects yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add your first subject to start building a study plan.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-6">
            <IconPlus className="w-4 h-4" /> Add subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <div key={s._id} className="card card-hover p-5 relative group overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: s.color }}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow-soft"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
                    <span className={`pill ${diffStyle[s.difficultyLevel]} capitalize mt-1.5`}>
                      {s.difficultyLevel}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s._id)}
                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete subject"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
