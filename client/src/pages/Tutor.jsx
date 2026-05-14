import { useState, useEffect, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Sidebar from '../components/Sidebar'
import {
  IconLogo, IconMenu, IconSpark, IconClose, IconSend, IconPlus, IconTrash,
  IconAcademic, IconBook, IconCopy, IconCheck, IconChevronDown, IconStop, IconEdit, IconRefresh,
} from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import * as tutorService from '../services/tutorService'
import * as subjectService from '../services/subjectService'
import * as documentsService from '../services/documentsService'
import { IconDocument, IconUpload } from '../components/Icons'

/* ----------------------------- HELPERS ----------------------------- */

const formatRelative = (date) => {
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

const groupByPeriod = (convos) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const lastWeek  = new Date(today); lastWeek.setDate(today.getDate() - 7)
  const groups = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] }
  for (const c of convos) {
    const t = new Date(c.updatedAt)
    if (t >= today)         groups.Today.push(c)
    else if (t >= yesterday) groups.Yesterday.push(c)
    else if (t >= lastWeek)  groups['Last 7 days'].push(c)
    else                     groups.Older.push(c)
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0)
}

const QUICK_ACTIONS = [
  { label: 'Explain',     template: 'Explain {topic} clearly with examples.' },
  { label: 'Quiz me',     template: 'Generate a 5-question quiz on {topic}, multiple choice with an answer key.' },
  { label: 'Summarize',   template: 'Summarize the key points of {topic}.' },
  { label: 'Step by step', template: 'Walk me through {topic} step by step.' },
  { label: 'Flashcards',  template: 'Create 8 flashcards (Q/A) for {topic}.' },
]

const STARTER_PROMPTS = [
  { emoji: '🧠', title: 'Explain a concept',  prompt: 'Explain how gradient descent works in machine learning.' },
  { emoji: '📝', title: 'Make a quiz',         prompt: 'Generate a 5-question quiz on derivatives with an answer key.' },
  { emoji: '✨', title: 'Summarize a topic',   prompt: 'Summarize the key concepts of object-oriented programming.' },
  { emoji: '🔢', title: 'Solve a problem',     prompt: 'Walk me through solving ∫(2x² + 3x + 1) dx step by step.' },
  { emoji: '💡', title: 'Study strategy',      prompt: 'How should I prepare for an algorithms exam in 7 days?' },
  { emoji: '🗂️', title: 'Flashcards',          prompt: 'Create 8 flashcards on the parts of a cell.' },
]

/* ------------------------- MARKDOWN MESSAGE ------------------------- */

const Markdown = ({ children }) => (
  <div className="
    prose prose-sm prose-slate dark:prose-invert max-w-none
    prose-headings:font-display prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:mt-4 prose-headings:mb-2
    prose-h1:text-base prose-h2:text-base prose-h3:text-sm
    prose-p:my-2 prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
    prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold
    prose-em:text-slate-700 dark:prose-em:text-slate-300
    prose-code:before:content-none prose-code:after:content-none
    prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-brand-700 dark:prose-code:text-brand-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:font-medium
    prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 dark:prose-pre:border dark:prose-pre:border-slate-800 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-3 prose-pre:text-[0.85em] prose-pre:shadow-soft
    prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-slate-700 dark:prose-li:text-slate-300
    prose-blockquote:border-l-brand-300 prose-blockquote:bg-brand-50/40 dark:prose-blockquote:bg-brand-900/20 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300
    prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-a:no-underline hover:prose-a:underline
    prose-hr:border-slate-200 dark:prose-hr:border-slate-800
    prose-table:text-sm
  ">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
)

const TypingDots = () => (
  <div className="flex gap-1.5 px-1">
    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '120ms' }} />
    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '240ms' }} />
  </div>
)

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-xs text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors"
      title="Copy"
    >
      {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-500" /> : <IconCopy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ------------------------------ PAGE ------------------------------ */

export default function Tutor() {
  const { user } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [convoOpen, setConvoOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)              // full conversation object
  const [activeId, setActiveId] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [documents, setDocuments] = useState([])
  const [documentId, setDocumentId] = useState('')
  const [docMenuOpen, setDocMenuOpen] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const pdfInputRef = useRef(null)

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [renameMode, setRenameMode] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const scrollRef = useRef(null)
  const inputRef  = useRef(null)
  const abortRef  = useRef(null)

  /* -------- INITIAL LOAD -------- */
  useEffect(() => {
    (async () => {
      try {
        const [convos, subs, docs] = await Promise.all([
          tutorService.listConversations(),
          subjectService.list(),
          documentsService.list().catch(() => []),
        ])
        setConversations(convos)
        setSubjects(subs)
        setDocuments(docs)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load conversations')
      }
    })()
  }, [])

  /* -------- LOAD A CONVERSATION -------- */
  const loadConversation = async (id) => {
    if (streaming) return
    setActiveId(id)
    setConvoOpen(false)
    if (!id) { setActive(null); setDocumentId(''); return }
    try {
      const c = await tutorService.getConversation(id)
      setActive(c)
      setSubjectId(c.subjectId?._id || c.subjectId || '')
      setDocumentId(c.documentId?._id || c.documentId || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load conversation')
    }
  }

  /* -------- PDF upload -------- */
  const onPickPdf = () => pdfInputRef.current?.click()

  const onPdfChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-uploading the same file
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    setError('')
    try {
      const doc = await documentsService.upload(file, {
        subjectId: subjectId || undefined,
        onProgress: setUploadProgress,
      })
      setDocuments(prev => [doc, ...prev])
      setDocumentId(doc._id)
      setDocMenuOpen(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false); setUploadProgress(0)
    }
  }

  const deleteDocument = async (id) => {
    if (!confirm('Delete this document?')) return
    try {
      await documentsService.remove(id)
      setDocuments(prev => prev.filter(d => d._id !== id))
      if (documentId === id) setDocumentId('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    }
  }

  /* -------- AUTO-SCROLL -------- */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [active?.messages?.length, streaming])

  /* -------- SEND MESSAGE -------- */
  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim()
    if (!text || streaming) return

    setError('')
    setInput('')

    // optimistic insert
    const optimisticUser = { role: 'user', content: text }
    setActive(prev => {
      if (prev) return { ...prev, messages: [...prev.messages, optimisticUser] }
      return {
        _id: null,
        title: text.slice(0, 50),
        subjectId: subjectId || null,
        messages: [optimisticUser],
      }
    })
    setActive(prev => prev ? { ...prev, messages: [...prev.messages, { role: 'assistant', content: '' }] } : prev)

    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller

    let assistantBuffer = ''
    let newConvoId = activeId

    try {
      await tutorService.chat(
        { conversationId: activeId, message: text, subjectId: subjectId || null, documentId: documentId || null },
        {
          onMeta: ({ conversationId, title, isNew }) => {
            newConvoId = conversationId
            setActiveId(conversationId)
            if (isNew) {
              const summary = {
                _id: conversationId,
                title,
                subjectId: subjectId
                  ? subjects.find(s => s._id === subjectId) || null
                  : null,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                messageCount: 1,
                preview: text.slice(0, 90),
              }
              setConversations(prev => [summary, ...prev])
            }
          },
          onText: ({ delta }) => {
            assistantBuffer += delta
            setActive(prev => {
              if (!prev) return prev
              const msgs = [...prev.messages]
              msgs[msgs.length - 1] = { role: 'assistant', content: assistantBuffer }
              return { ...prev, messages: msgs }
            })
          },
          onDone: () => {
            // Refresh conversation list to update timestamps + previews
            tutorService.listConversations().then(setConversations).catch(() => {})
          },
          onError: ({ message }) => {
            setError(message || 'Tutor failed')
          },
        },
        { signal: controller.signal }
      )
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Tutor failed')
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  /* -------- DELETE CONVERSATION -------- */
  const deleteConvo = async (id, e) => {
    e?.stopPropagation()
    if (streaming) return
    if (!confirm('Delete this conversation?')) return
    try {
      await tutorService.deleteConversation(id)
      setConversations(prev => prev.filter(c => c._id !== id))
      if (activeId === id) { setActiveId(null); setActive(null) }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete')
    }
  }

  /* -------- RENAME CONVERSATION -------- */
  const saveRename = async () => {
    const t = renameValue.trim().slice(0, 120)
    if (!t || !activeId) { setRenameMode(false); return }
    try {
      const updated = await tutorService.renameConversation(activeId, { title: t })
      setActive(prev => prev ? { ...prev, title: updated.title } : prev)
      setConversations(prev => prev.map(c => c._id === activeId ? { ...c, title: updated.title } : c))
      setRenameMode(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not rename')
    }
  }

  /* -------- NEW CONVERSATION -------- */
  const newConvo = () => {
    if (streaming) return
    setActive(null)
    setActiveId(null)
    setSubjectId('')
    setConvoOpen(false)
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /* -------- DERIVED -------- */
  const grouped = useMemo(() => groupByPeriod(conversations), [conversations])
  const messages = active?.messages || []
  const activeSubject = subjects.find(s => s._id === subjectId)
  const activeDocument = documents.find(d => d._id === documentId)

  /* ------------------------------ RENDER ------------------------------ */

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} onOpenChat={() => setChatOpen(true)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* MOBILE TOP BAR */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setNavOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <IconLogo className="w-7 h-7" />
            <span className="font-display font-bold text-slate-900">AI Tutor</span>
          </div>
          <button
            onClick={() => setConvoOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Open conversations"
          >
            <IconAcademic className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex min-h-0 lg:p-6 lg:gap-6">
          {/* CONVERSATIONS PANEL */}
          {convoOpen && (
            <div
              onClick={() => setConvoOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            />
          )}
          <aside
            className={`
              fixed lg:relative top-0 left-0 z-50 lg:z-0
              h-screen lg:h-auto w-80 lg:w-72
              bg-white dark:bg-slate-900 lg:rounded-2xl
              border-r lg:border lg:border-slate-100 border-slate-100 dark:border-slate-800 dark:lg:border-slate-800 lg:shadow-soft
              flex flex-col
              transition-transform duration-200
              ${convoOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            `}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">Conversations</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{conversations.length} saved</p>
              </div>
              <button
                onClick={() => setConvoOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-700 p-1"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3">
              <button
                onClick={newConvo}
                className="w-full btn-primary py-2.5"
              >
                <IconPlus className="w-4 h-4" />
                New chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-3">
              {conversations.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8 px-3">
                  No conversations yet. Ask your first question to get started.
                </p>
              ) : (
                grouped.map(([period, items]) => (
                  <div key={period} className="mt-3 first:mt-0">
                    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{period}</p>
                    {items.map(c => (
                      <button
                        key={c._id}
                        onClick={() => loadConversation(c._id)}
                        className={`
                          group w-full text-left px-3 py-2.5 rounded-xl transition-all relative
                          ${activeId === c._id
                            ? 'bg-brand-50 dark:bg-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
                        `}
                      >
                        <p className={`text-sm font-medium truncate ${activeId === c._id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {c.subjectId && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: c.subjectId.color || '#6366F1' }}
                            >
                              {c.subjectId.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelative(c.updatedAt)}</span>
                        </div>
                        <span
                          role="button"
                          onClick={(e) => deleteConvo(c._id, e)}
                          className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* CHAT AREA */}
          <main className="flex-1 min-w-0 flex flex-col lg:rounded-2xl bg-white dark:bg-slate-900 lg:shadow-soft lg:border lg:border-slate-100 dark:lg:border-slate-800 overflow-hidden">
            {/* HEADER */}
            <div className="px-5 lg:px-7 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow shrink-0">
                  <IconAcademic className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  {active && renameMode ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename()
                        if (e.key === 'Escape') { setRenameMode(false); setRenameValue('') }
                      }}
                      className="w-full input !py-1 !px-2 !text-sm font-semibold"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        if (!active) return
                        setRenameMode(true)
                        setRenameValue(active.title)
                      }}
                      className="flex items-center gap-1.5 group text-left max-w-full"
                      disabled={!active}
                    >
                      <h1 className="font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                        {active ? active.title : 'AI Tutor'}
                      </h1>
                      {active && <IconEdit className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {active ? `${active.messages.length} message${active.messages.length !== 1 ? 's' : ''}` : 'Ask anything about your subjects.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* PDF picker */}
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={onPdfChange} />
                <div className="relative">
                  <button
                    onClick={() => setDocMenuOpen(v => !v)}
                    disabled={streaming || uploading}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold pl-2.5 pr-2 py-1.5 rounded-full border transition-all ${
                      activeDocument
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600'
                    }`}
                    title="Attach a PDF to ground the conversation in its content"
                  >
                    <IconDocument className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">
                      {uploading ? `Uploading… ${Math.round(uploadProgress * 100)}%` :
                       activeDocument ? activeDocument.filename : 'Attach PDF'}
                    </span>
                    <IconChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {docMenuOpen && (
                    <>
                      <div onClick={() => setDocMenuOpen(false)} className="fixed inset-0 z-40" />
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                        <button
                          onClick={() => { onPickPdf(); setDocMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-b border-slate-100 dark:border-slate-700 transition-colors"
                        >
                          <IconUpload className="w-4 h-4" />
                          Upload new PDF
                        </button>
                        {documentId && (
                          <button
                            onClick={() => { setDocumentId(''); setDocMenuOpen(false) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 transition-colors"
                          >
                            <IconClose className="w-3.5 h-3.5" />
                            Remove document context
                          </button>
                        )}
                        <div className="max-h-72 overflow-y-auto scroll-thin">
                          {documents.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6 px-3">
                              No PDFs uploaded yet.
                            </p>
                          ) : documents.map(d => (
                            <div
                              key={d._id}
                              className={`group flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                documentId === d._id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                              }`}
                            >
                              <button
                                onClick={() => { setDocumentId(d._id); setDocMenuOpen(false) }}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                              >
                                <IconDocument className={`w-3.5 h-3.5 shrink-0 ${documentId === d._id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                <div className="min-w-0">
                                  <p className={`text-xs font-medium truncate ${documentId === d._id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {d.filename}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {d.pageCount} pages · {Math.round(d.sizeBytes / 1024)} KB
                                    {d.truncated && ' · truncated'}
                                  </p>
                                </div>
                              </button>
                              <button
                                onClick={() => deleteDocument(d._id)}
                                className="text-slate-300 dark:text-slate-600 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Subject selector */}
                <div className="relative">
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    disabled={streaming}
                    className="appearance-none text-xs font-semibold pl-3 pr-7 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40 transition-all cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <option value="">No subject context</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  <IconChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
                </div>
                <button
                  onClick={newConvo}
                  className="hidden sm:flex btn-secondary py-1.5 px-3 text-xs"
                  disabled={streaming}
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
            </div>

            {/* MESSAGES */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin px-4 lg:px-7 py-6 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              {error && (
                <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {!active && messages.length === 0 ? (
                <WelcomeState onPick={(p) => send(p)} userName={user?.name} />
              ) : (
                <div className="space-y-5 max-w-3xl mx-auto">
                  {messages.map((m, i) => (
                    <Bubble
                      key={i}
                      role={m.role}
                      content={m.content}
                      streaming={streaming && m.role === 'assistant' && i === messages.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* COMPOSER */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 lg:px-7 py-4 bg-white dark:bg-slate-900">
              <div className="max-w-3xl mx-auto">
                {(activeSubject || activeDocument) && (
                  <div className="mb-2 flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-slate-500 dark:text-slate-400">Context:</span>
                    {activeSubject && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: activeSubject.color || '#6366F1' }}
                      >
                        <IconBook className="w-3 h-3" />
                        {activeSubject.name}
                      </span>
                    )}
                    {activeDocument && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-gradient text-white shadow-glow">
                        <IconDocument className="w-3 h-3" />
                        {activeDocument.filename}
                      </span>
                    )}
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); send() }}
                  className="relative"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                    }}
                    rows={1}
                    disabled={streaming}
                    placeholder="Ask anything — concepts, problems, quizzes, summaries…"
                    className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 pl-4 pr-14 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40 focus:border-brand-400 max-h-40 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-all shadow-soft placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  {streaming ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="absolute right-2 bottom-2 bg-rose-500 hover:bg-rose-600 text-white p-2.5 rounded-xl shadow-soft transition-all hover:scale-105 active:scale-95"
                      title="Stop generating"
                    >
                      <IconStop className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="absolute right-2 bottom-2 bg-brand-gradient text-white p-2.5 rounded-xl shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                      title="Send (Enter)"
                    >
                      <IconSend className="w-4 h-4" />
                    </button>
                  )}
                </form>

                {/* Quick action chips */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick:</span>
                  {QUICK_ACTIONS.map(qa => (
                    <button
                      key={qa.label}
                      onClick={() => {
                        const filled = qa.template.replace('{topic}',
                          activeSubject ? activeSubject.name : '___')
                        setInput(filled)
                        inputRef.current?.focus()
                      }}
                      disabled={streaming}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-300 text-slate-600 dark:text-slate-300 font-medium transition-colors disabled:opacity-50"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                  Powered by Llama 3.3 — answers can be wrong, verify important facts.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ BUBBLE ------------------------------ */

function Bubble({ role, content, streaming }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-md bg-brand-gradient text-white text-sm shadow-glow whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white shrink-0 shadow-glow">
        <IconAcademic className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 group">
        <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl rounded-tl-md border border-slate-100 dark:border-slate-700 shadow-soft">
          {content ? (
            <>
              <Markdown>{content}</Markdown>
              {streaming && <span className="inline-block w-1.5 h-4 bg-brand-500 ml-1 align-middle animate-pulse rounded-sm" />}
            </>
          ) : (
            <TypingDots />
          )}
        </div>
        {content && !streaming && (
          <div className="flex items-center gap-3 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={content} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ WELCOME ------------------------------ */

function WelcomeState({ onPick, userName }) {
  return (
    <div className="max-w-3xl mx-auto py-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-gradient shadow-glow mb-5">
        <IconAcademic className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        Hi{userName ? `, ${userName.split(' ')[0]}` : ''} — what should we study today?
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mt-2">
        Ask anything. I can explain concepts, solve problems, quiz you, or summarise a topic.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
        {STARTER_PROMPTS.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s.prompt)}
            className="text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-900/20 hover:shadow-soft transition-all group"
          >
            <div className="text-2xl mb-2">{s.emoji}</div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
              {s.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{s.prompt}</p>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <IconSpark className="w-4 h-4" />
        Pick a subject in the top right for tailored answers
      </div>
    </div>
  )
}
