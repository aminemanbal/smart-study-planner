import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { IconCards, IconCheck, IconClose, IconRefresh, IconSpark } from '../components/Icons'
import * as flashcardsService from '../services/flashcardsService'
import * as subjectService from '../services/subjectService'

const QUALITY = [
  { q: 0, label: 'Again', hint: '< 10 min', tone: 'bg-rose-500 hover:bg-rose-600',  description: 'I forgot it' },
  { q: 1, label: 'Hard',  hint: '~1 day',    tone: 'bg-amber-500 hover:bg-amber-600', description: 'Difficult' },
  { q: 2, label: 'Good',  hint: '~3 days',   tone: 'bg-emerald-500 hover:bg-emerald-600', description: 'I knew it' },
  { q: 3, label: 'Easy',  hint: '~6 days',   tone: 'bg-sky-500 hover:bg-sky-600',   description: 'Too easy' },
]

export default function Review() {
  const navigate = useNavigate()
  const [subjects, setSubjects]   = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [dueCards, setDueCards]   = useState([])
  const [stats, setStats]         = useState(null)
  const [index, setIndex]         = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [reviewed, setReviewed]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const loadStats = () => flashcardsService.stats().then(setStats).catch(() => {})

  const loadDue = async () => {
    setLoading(true)
    try {
      const cards = await flashcardsService.due(subjectId ? { subjectId } : {})
      setDueCards(cards)
      setIndex(0); setFlipped(false); setReviewed(0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    subjectService.list().then(setSubjects).catch(() => {})
    loadStats()
  }, [])

  useEffect(() => { loadDue() /* eslint-disable-next-line */ }, [subjectId])

  const current = dueCards[index]
  const finished = index >= dueCards.length

  const handleRate = async (q) => {
    if (!current) return
    try {
      await flashcardsService.review(current._id, q)
      setReviewed(r => r + 1)
      setIndex(i => i + 1)
      setFlipped(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record review')
    }
  }

  const restart = () => { loadDue(); loadStats() }

  return (
    <Layout
      title="Flashcard Review"
      subtitle="Spaced-repetition study session."
      actions={
        <button onClick={() => navigate('/notes')} className="btn-secondary">
          <IconCards className="w-4 h-4" /> Manage notes
        </button>
      }
    >
      {error && (
        <div className="mb-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Due now"          value={stats?.due ?? 0}             accent="text-rose-500"    />
        <Stat label="Total cards"      value={stats?.total ?? 0}           accent="text-brand-600 dark:text-brand-400" />
        <Stat label="Reviewed today"   value={stats?.reviewedToday ?? 0}   accent="text-emerald-500" />
        <Stat label="This session"     value={reviewed}                    accent="text-amber-500"   />
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
          All ({stats?.due ?? 0})
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
            {s.name} ({s.due})
          </button>
        ))}
      </div>

      {/* Card area */}
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Great work. Cards will return based on how well you knew them.</p>
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
                {/* Front */}
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
                {/* Back */}
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
    </Layout>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="card card-hover p-4">
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  )
}
