import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import {
  IconCards, IconCheck, IconClose, IconRefresh, IconSpark, IconTrash, IconEdit
} from '../components/Icons'
import * as flashcardsService from '../services/flashcardsService'
import * as subjectService from '../services/subjectService'

const QUALITY = [
  { q: 0, label: 'Again', hint: '< 10 min', tone: 'bg-rose-500 hover:bg-rose-600',  description: 'I forgot it' },
  { q: 1, label: 'Hard',  hint: '~1 day',    tone: 'bg-amber-500 hover:bg-amber-600', description: 'Difficult' },
  { q: 2, label: 'Good',  hint: '~3 days',   tone: 'bg-emerald-500 hover:bg-emerald-600', description: 'I knew it' },
  { q: 3, label: 'Easy',  hint: '~6 days',   tone: 'bg-sky-500 hover:bg-sky-600',   description: 'Too easy' },
]

const formatDue = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const diffMs = d.getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMs <= 0) return 'due now'
  if (diffMin < 60) return `in ${diffMin}m`
  if (diffMin < 1440) return `in ${Math.round(diffMin / 60)}h`
  return `in ${Math.round(diffMin / 1440)}d`
}

export default function Review() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('study')          // 'study' | 'manage'
  const [subjects, setSubjects]   = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [stats, setStats]         = useState(null)
  const [error, setError]         = useState('')

  // Study mode
  const [dueCards, setDueCards]   = useState([])
  const [index, setIndex]         = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [reviewed, setReviewed]   = useState(0)
  const [loading, setLoading]     = useState(true)

  // Manage mode
  const [allCards, setAllCards]   = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({ front: '', back: '' })
  const [search, setSearch]       = useState('')

  const loadStats = () => flashcardsService.stats().then(setStats).catch(() => {})

  const loadDue = async () => {
    setLoading(true)
    try {
      const cards = await flashcardsService.due(subjectId ? { subjectId } : {})
      setDueCards(cards)
      setIndex(0); setFlipped(false); setReviewed(0)
    } catch (err) { setError(err.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const cards = await flashcardsService.list(subjectId ? { subjectId } : {})
      setAllCards(cards)
    } catch (err) { setError(err.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    subjectService.list().then(setSubjects).catch(() => {})
    loadStats()
  }, [])

  useEffect(() => {
    if (mode === 'study') loadDue()
    else loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, mode])

  /* -------- STUDY -------- */

  const current = dueCards[index]
  const finished = index >= dueCards.length

  const handleRate = async (q) => {
    if (!current) return
    try {
      await flashcardsService.review(current._id, q)
      setReviewed(r => r + 1); setIndex(i => i + 1); setFlipped(false)
      loadStats()
    } catch (err) { setError(err.response?.data?.message || 'Failed to record review') }
  }

  const restart = () => { loadDue(); loadStats() }

  /* -------- MANAGE -------- */

  const startEdit = (c) => {
    setEditingId(c._id)
    setEditForm({ front: c.front, back: c.back })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({ front: '', back: '' }) }

  const saveEdit = async () => {
    try {
      const updated = await flashcardsService.update(editingId, editForm)
      setAllCards(prev => prev.map(c => c._id === editingId ? { ...c, ...updated } : c))
      cancelEdit()
    } catch (err) { setError(err.response?.data?.message || 'Failed to save') }
  }

  const removeOne = async (id) => {
    if (!confirm('Delete this flashcard?')) return
    try {
      await flashcardsService.remove(id)
      setAllCards(prev => prev.filter(c => c._id !== id))
      loadStats()
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete') }
  }

  const removeAllInSubject = async () => {
    if (!subjectId) return
    const subj = subjects.find(s => s._id === subjectId)
    const count = allCards.length
    if (!confirm(`Delete ALL ${count} cards in "${subj?.name || 'this subject'}"? This cannot be undone.`)) return
    try {
      const res = await flashcardsService.bulkRemove({ subjectId })
      setAllCards([])
      loadStats()
      alert(`Deleted ${res.deletedCount} flashcards.`)
    } catch (err) { setError(err.response?.data?.message || 'Bulk delete failed') }
  }

  const filteredCards = useMemo(() => {
    if (!search) return allCards
    const s = search.toLowerCase()
    return allCards.filter(c =>
      c.front.toLowerCase().includes(s) || c.back.toLowerCase().includes(s)
    )
  }, [allCards, search])

  /* -------- RENDER -------- */

  return (
    <Layout
      title="Flashcards"
      subtitle="Study with spaced repetition — or manage your deck."
      actions={
        <button onClick={() => navigate('/notes')} className="btn-secondary">
          <IconCards className="w-4 h-4" /> Notes
        </button>
      }
    >
      {error && (
        <div className="mb-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600"><IconClose className="w-4 h-4" /></button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="card p-1.5 mb-6 inline-flex">
        {[
          { key: 'study',  label: 'Study',  hint: `${stats?.due ?? 0} due` },
          { key: 'manage', label: 'Manage', hint: `${stats?.total ?? 0} cards` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === t.key
                ? 'bg-brand-gradient text-white shadow-glow'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            <span className={`ml-2 text-[10px] ${mode === t.key ? 'opacity-80' : 'opacity-60'}`}>{t.hint}</span>
          </button>
        ))}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Due now"          value={stats?.due ?? 0}             accent="text-rose-500"    />
        <Stat label="Total cards"      value={stats?.total ?? 0}           accent="text-brand-600 dark:text-brand-400" />
        <Stat label="Reviewed today"   value={stats?.reviewedToday ?? 0}   accent="text-emerald-500" />
        <Stat label={mode === 'study' ? 'This session' : 'Showing'} value={mode === 'study' ? reviewed : filteredCards.length} accent="text-amber-500" />
      </div>

      {/* Subject filter */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subject:</span>
        <button
          onClick={() => setSubjectId('')}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
            !subjectId
              ? 'bg-brand-gradient text-white shadow-glow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All ({stats?.total ?? 0})
        </button>
        {stats?.bySubject?.map(s => (
          <button
            key={s.subjectId}
            onClick={() => setSubjectId(s.subjectId)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              subjectId === s.subjectId
                ? 'text-white shadow-glow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            style={subjectId === s.subjectId ? { backgroundColor: s.color } : {}}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name} ({s.total})
          </button>
        ))}

        {/* Bulk delete (manage mode + subject filter active) */}
        {mode === 'manage' && subjectId && allCards.length > 0 && (
          <button
            onClick={removeAllInSubject}
            className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors"
          >
            <IconTrash className="w-3.5 h-3.5" />
            Delete all in subject
          </button>
        )}
      </div>

      {mode === 'study' ? <StudyView /> : <ManageView />}
    </Layout>
  )

  /* -------- subviews -------- */

  function StudyView() {
    return (
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="card p-16 text-center">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-brand-600 animate-spin" />
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">Loading cards…</p>
          </div>
        ) : dueCards.length === 0 ? (
          <div className="card p-16 text-center">
            <IconCheck className="w-12 h-12 mx-auto text-emerald-500" />
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 mt-4 text-xl">All caught up!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {stats?.total > 0
                ? "Nothing's due right now. Come back later or add more cards."
                : 'Generate flashcards from your notes to start studying.'}
            </p>
            <button onClick={() => navigate('/notes')} className="btn-primary mt-6">
              <IconSpark className="w-4 h-4" /> Go to Notes
            </button>
          </div>
        ) : finished ? (
          <div className="card p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <IconCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 mt-4 text-xl">
              Session done — {reviewed} card{reviewed === 1 ? '' : 's'} reviewed 🎉
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Great work. Cards return based on how well you knew them.</p>
            <button onClick={restart} className="btn-primary mt-6">
              <IconRefresh className="w-4 h-4" /> Review more
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>Card {index + 1} of {dueCards.length}</span>
              {current.subjectId && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: current.subjectId.color }} />
                  {current.subjectId.name}
                </span>
              )}
            </div>

            <div className="relative" style={{ perspective: '1000px' }}>
              <button
                onClick={() => setFlipped(f => !f)}
                className="w-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
                }}
              >
                <div
                  className="card p-8 min-h-[280px] flex flex-col items-center justify-center text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Question</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-3 leading-relaxed">
                    {current.front}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">Click to flip</p>
                </div>
                <div
                  className="card p-8 min-h-[280px] flex flex-col items-center justify-center text-center absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">Answer</p>
                  <p className="text-lg text-slate-800 dark:text-slate-100 mt-3 leading-relaxed whitespace-pre-wrap">
                    {current.back}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">How well did you know it?</p>
                </div>
              </button>
            </div>

            {flipped && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 animate-fade-in">
                {QUALITY.map(({ q, label, hint, tone, description }) => (
                  <button
                    key={q}
                    onClick={() => handleRate(q)}
                    className={`${tone} text-white p-3 rounded-xl shadow-soft hover:shadow-card transition-all hover:-translate-y-0.5 active:translate-y-0`}
                    title={description}
                  >
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{hint}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function ManageView() {
    return (
      <div className="space-y-4">
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="input flex-1 !py-2"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
            {filteredCards.length} of {allCards.length} card{allCards.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="card p-12 text-center">
            <div className="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-brand-600 animate-spin" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="card p-12 text-center">
            <IconCards className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              {allCards.length === 0 ? 'No flashcards yet.' : 'No cards match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map(c => {
              const isEditing = editingId === c._id
              return (
                <div
                  key={c._id}
                  className="card p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  {c.subjectId && (
                    <span
                      className="w-1 sm:w-1 shrink-0 rounded-full self-stretch hidden sm:block"
                      style={{ backgroundColor: c.subjectId.color || '#6366F1' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <>
                        <input
                          value={editForm.front}
                          onChange={e => setEditForm({ ...editForm, front: e.target.value })}
                          className="input mb-2 !py-2 font-semibold"
                          maxLength={1000}
                          placeholder="Question"
                        />
                        <textarea
                          value={editForm.back}
                          onChange={e => setEditForm({ ...editForm, back: e.target.value })}
                          className="input min-h-[60px] !py-2"
                          rows={2}
                          maxLength={2000}
                          placeholder="Answer"
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.front}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{c.back}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                          {c.subjectId && (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.subjectId.color }} />
                              {c.subjectId.name}
                            </span>
                          )}
                          <span>· {c.timesReviewed} review{c.timesReviewed === 1 ? '' : 's'}</span>
                          <span>· {formatDue(c.dueAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg" title="Save">
                          <IconCheck className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Cancel">
                          <IconClose className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg" title="Edit">
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeOne(c._id)} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 rounded-lg" title="Delete">
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
}

function Stat({ label, value, accent }) {
  return (
    <div className="card card-hover p-4">
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  )
}
