import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Layout from '../components/Layout'
import {
  IconPlus, IconTrash, IconNotes, IconSpark, IconCheck, IconClose,
  IconEdit, IconBook
} from '../components/Icons'
import * as notesService from '../services/notesService'
import * as subjectService from '../services/subjectService'
import * as flashcardsService from '../services/flashcardsService'

const formatRelative = (date) => {
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export default function Notes() {
  const navigate = useNavigate()
  const [notes, setNotes]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [active, setActive]     = useState(null)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({ title: '', content: '', subjectId: '' })
  const [filter, setFilter]     = useState('')
  const [previewMode, setPreviewMode] = useState(false)

  const [aiOpen, setAiOpen]     = useState(false)
  const [aiCount, setAiCount]   = useState(10)
  const [aiCards, setAiCards]   = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]   = useState('')
  const [error, setError]       = useState('')
  const [savedAt, setSavedAt]   = useState(null)

  const saveTimer = useRef(null)

  const loadNotes = async () => {
    try { setNotes(await notesService.list()) }
    catch (err) { setError(err.response?.data?.message || 'Failed to load notes') }
  }

  useEffect(() => {
    loadNotes()
    subjectService.list().then(setSubjects).catch(() => {})
  }, [])

  const loadActive = async (id) => {
    setActiveId(id)
    if (!id) { setActive(null); return }
    try {
      const n = await notesService.get(id)
      setActive(n)
      setForm({ title: n.title, content: n.content, subjectId: n.subjectId?._id || n.subjectId })
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load note')
    }
  }

  // Autosave on form change when editing
  useEffect(() => {
    if (!editing || !activeId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await notesService.update(activeId, {
          title: form.title, content: form.content, subjectId: form.subjectId,
        })
        setActive(updated)
        setSavedAt(new Date())
        loadNotes()
      } catch (err) {
        setError(err.response?.data?.message || 'Autosave failed')
      }
    }, 800)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editing, activeId])

  const handleNew = async () => {
    if (subjects.length === 0) { setError('Add a subject before creating notes.'); return }
    try {
      const note = await notesService.create({
        title: 'Untitled',
        content: '',
        subjectId: subjects[0]._id,
      })
      setNotes(prev => [{ ...note, preview: '', updatedAt: note.updatedAt }, ...prev])
      await loadActive(note._id)
      setEditing(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create note')
    }
  }

  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!confirm('Delete this note? This cannot be undone.')) return
    try {
      await notesService.remove(id)
      setNotes(prev => prev.filter(n => n._id !== id))
      if (activeId === id) { setActiveId(null); setActive(null) }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    }
  }

  const filteredNotes = useMemo(() => {
    if (!filter) return notes
    const f = filter.toLowerCase()
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(f) ||
      (n.preview || '').toLowerCase().includes(f)
    )
  }, [notes, filter])

  /* -------- AI flashcard generation -------- */

  const openAiPanel = () => {
    if (!active || !form.content || form.content.trim().length < 30) {
      setError('Write at least ~30 characters before generating flashcards.')
      return
    }
    setAiOpen(true); setAiCards([]); setAiError('')
  }

  const runAiGeneration = async () => {
    setAiLoading(true); setAiError(''); setAiCards([])
    try {
      const res = await flashcardsService.generate({
        noteId: activeId,
        subjectId: form.subjectId,
        count: aiCount,
      })
      setAiCards(res.cards.map(c => ({ ...c, save: true })))
    } catch (err) {
      const m = err.response?.data?.message || 'Failed to generate'
      setAiError(m.includes('GROQ_API_KEY')
        ? 'AI not configured — add GROQ_API_KEY to server/.env'
        : m)
    } finally { setAiLoading(false) }
  }

  const saveAiCards = async () => {
    const toSave = aiCards.filter(c => c.save && c.front && c.back)
                          .map(({ front, back }) => ({ front, back }))
    if (toSave.length === 0) return
    try {
      const res = await flashcardsService.bulk({
        cards: toSave,
        subjectId: form.subjectId,
        noteId: activeId,
      })
      setAiOpen(false)
      setSavedAt(new Date())
      alert(`✓ Saved ${res.count} flashcards. Open Review to study them.`)
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to save')
    }
  }

  return (
    <Layout
      title="Notes"
      subtitle="Capture, organise, and turn into flashcards."
      actions={
        <>
          <button onClick={() => navigate('/review')} className="btn-secondary">
            <IconCheck className="w-4 h-4" /> Review
          </button>
          <button onClick={handleNew} className="btn-primary">
            <IconPlus className="w-4 h-4" /> New note
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">
            <IconClose className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LIST */}
        <aside className="lg:col-span-4 card p-4">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input mb-3 !py-2"
            placeholder="Search notes…"
          />
          <div className="space-y-1 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-10 px-4">
                <IconNotes className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">No notes yet.</p>
                <button onClick={handleNew} className="btn-primary mt-4 py-2 text-xs">
                  <IconPlus className="w-3 h-3" /> Create your first note
                </button>
              </div>
            ) : filteredNotes.map(n => (
              <button
                key={n._id}
                onClick={() => loadActive(n._id)}
                className={`group w-full text-left p-3 rounded-xl transition-all relative ${
                  activeId === n._id
                    ? 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {n.subjectId && (
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: n.subjectId.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      activeId === n._id
                        ? 'text-brand-700 dark:text-brand-300'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>{n.title}</p>
                    {n.preview && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.preview}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{n.subjectId?.name}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelative(n.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <span
                  role="button"
                  onClick={(e) => handleDelete(n._id, e)}
                  className="absolute top-1.5 right-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* EDITOR */}
        <main className="lg:col-span-8 card p-0 overflow-hidden">
          {!active ? (
            <div className="p-16 text-center">
              <IconNotes className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 mt-4">Pick a note or create one</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Markdown is supported. Generate flashcards from your notes with one click.
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                <select
                  value={form.subjectId}
                  onChange={e => { setForm({ ...form, subjectId: e.target.value }); setEditing(true) }}
                  className="appearance-none text-xs font-semibold pl-3 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {savedAt ? `Saved ${formatRelative(savedAt)}` : `Updated ${formatRelative(active.updatedAt)}`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                        !previewMode
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-soft'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >Edit</button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                        previewMode
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-soft'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >Preview</button>
                  </div>
                  <button onClick={openAiPanel} className="btn-primary py-1.5 text-xs">
                    <IconSpark className="w-3.5 h-3.5" /> Generate flashcards
                  </button>
                </div>
              </div>

              <input
                value={form.title}
                onChange={e => { setForm({ ...form, title: e.target.value }); setEditing(true) }}
                placeholder="Untitled"
                className="w-full px-5 pt-5 pb-2 text-2xl font-bold font-display bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                maxLength={200}
              />

              {previewMode ? (
                <div className="p-5 pt-2 min-h-[400px] prose prose-sm prose-slate dark:prose-invert max-w-none">
                  {form.content
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                    : <p className="text-slate-400 dark:text-slate-500 italic">Nothing to preview.</p>}
                </div>
              ) : (
                <textarea
                  value={form.content}
                  onChange={e => { setForm({ ...form, content: e.target.value }); setEditing(true) }}
                  placeholder="Start writing… Markdown supported.

# Big heading
## Subheading
- Bullet
**bold** *italic* `code`"
                  className="w-full px-5 pb-5 pt-2 min-h-[400px] bg-transparent text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-mono resize-y focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* AI flashcard panel */}
      {aiOpen && (
        <>
          <div onClick={() => !aiLoading && setAiOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fade-in" />
          <div className="fixed inset-x-4 top-10 bottom-10 lg:inset-x-auto lg:right-10 lg:left-auto lg:top-10 lg:bottom-10 lg:w-[640px] z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-brand-gradient text-white">
              <div className="flex items-center gap-2">
                <IconSpark className="w-5 h-5" />
                <h3 className="font-display font-bold">AI Flashcard Generator</h3>
              </div>
              <button onClick={() => !aiLoading && setAiOpen(false)} className="p-1 text-white/80 hover:bg-white/15 rounded-lg">
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 scroll-thin">
              {aiCards.length === 0 ? (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Generate flashcards from <strong>{active?.title}</strong>. AI will analyse the note and produce question/answer pairs.
                  </p>
                  <div className="mt-4">
                    <label className="label">How many cards?</label>
                    <div className="flex items-center gap-2">
                      {[5, 10, 15, 20].map(n => (
                        <button
                          key={n}
                          onClick={() => setAiCount(n)}
                          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                            aiCount === n
                              ? 'bg-brand-gradient text-white shadow-glow'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  {aiError && <p className="mt-4 text-rose-500 text-sm">{aiError}</p>}
                  <button onClick={runAiGeneration} disabled={aiLoading} className="btn-primary mt-5 w-full py-3">
                    <IconSpark className="w-4 h-4" />
                    {aiLoading ? 'Generating…' : `Generate ${aiCount} flashcards`}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Review before saving ({aiCards.filter(c => c.save).length}/{aiCards.length})
                    </p>
                    <button onClick={() => setAiCards([])} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                      Reset
                    </button>
                  </div>
                  <div className="space-y-3">
                    {aiCards.map((c, i) => (
                      <div key={i} className={`p-3 rounded-xl border transition-all ${
                        c.save
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
                      }`}>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={c.save}
                            onChange={e => {
                              const next = [...aiCards]; next[i].save = e.target.checked
                              setAiCards(next)
                            }}
                            className="mt-1 accent-brand-600"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              value={c.front}
                              onChange={e => { const next = [...aiCards]; next[i].front = e.target.value; setAiCards(next) }}
                              className="w-full text-sm font-semibold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                            />
                            <textarea
                              value={c.back}
                              onChange={e => { const next = [...aiCards]; next[i].back = e.target.value; setAiCards(next) }}
                              rows={2}
                              className="w-full text-xs text-slate-600 dark:text-slate-300 bg-transparent focus:outline-none mt-1 resize-none"
                            />
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {aiCards.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button onClick={() => setAiOpen(false)} className="btn-ghost">Cancel</button>
                <button onClick={saveAiCards} className="btn-primary flex-1">
                  <IconCheck className="w-4 h-4" /> Save selected
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
