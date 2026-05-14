import { useState, useRef, useEffect } from 'react'
import * as aiService from '../services/aiService'
import { IconSpark, IconClose, IconSend, IconCheck, IconRefresh } from './Icons'

const TOOL_LABELS = {
  get_today_tasks:       "Checking today's tasks…",
  get_upcoming_exams:    'Looking at upcoming exams…',
  get_progress_summary:  'Reviewing your progress…',
  get_subjects:          'Loading your subjects…',
  mark_task_done:        'Marking task as done…',
  regenerate_study_plan: 'Regenerating study plan…',
}

const SUGGESTED_PROMPTS = [
  'What should I study today?',
  'Am I on track for my exams?',
  'Generate a fresh study plan',
  "What's my weakest subject?",
]

export default function ChatPanel({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 I'm Pulse — your AI study coach. Ask me anything about your plan, exams, or progress." }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  const send = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || streaming) return

    setError('')
    setInput('')

    const newHistory = [...messages, { role: 'user', content: trimmed }]
    setMessages(newHistory)

    // Insert an empty assistant placeholder we'll fill as text streams in
    setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [] }])
    setStreaming(true)

    const apiHistory = newHistory.map(m => ({ role: m.role, content: m.content }))
    const controller = new AbortController()
    abortRef.current = controller

    let buffer = ''

    try {
      await aiService.chat(apiHistory, {
        onText: ({ delta }) => {
          buffer += delta
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...next[next.length - 1], content: buffer }
            return next
          })
        },
        onToolUse: ({ name, input }) => {
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            const toolCalls = [...(last.toolCalls || []), { name, input, status: 'running' }]
            next[next.length - 1] = { ...last, toolCalls }
            return next
          })
        },
        onToolResult: ({ name, isError }) => {
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            const toolCalls = (last.toolCalls || []).map(tc =>
              tc.name === name && tc.status === 'running'
                ? { ...tc, status: isError ? 'error' : 'done' }
                : tc
            )
            next[next.length - 1] = { ...last, toolCalls }
            return next
          })
        },
        onError: ({ message }) => {
          setError(message || 'Something went wrong.')
        },
        onDone: () => { /* stream finished */ },
      }, { signal: controller.signal })
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Chat failed')
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const reset = () => {
    if (streaming) stop()
    setMessages([{ role: 'assistant', content: "👋 New conversation. What can I help with?" }])
    setError('')
  }

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] animate-fade-in"
      />
      <aside className="fixed top-0 right-0 z-[70] h-screen w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in border-l border-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-gradient text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <IconSpark className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold">Pulse</p>
              <p className="text-[11px] text-white/70">AI Study Coach</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              title="New conversation"
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 transition-colors"
            >
              <IconRefresh className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 transition-colors"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin px-5 py-5 space-y-4 bg-slate-50 dark:bg-slate-900">
          {messages.map((m, i) => <Message key={i} msg={m} streaming={streaming && i === messages.length - 1} />)}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Suggested prompts (only when conversation is fresh) */}
        {messages.length <= 1 && !streaming && (
          <div className="px-5 pt-2 pb-1 flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-900">
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send() }}
          className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              disabled={streaming}
              placeholder="Ask me anything…"
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40 focus:border-brand-400 max-h-32 disabled:bg-slate-50 dark:disabled:bg-slate-900 dark:bg-slate-900"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="btn-secondary px-3 py-2 text-xs"
                title="Stop"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-brand-gradient text-white p-2.5 rounded-xl shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.03] active:scale-95"
                title="Send"
              >
                <IconSend className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400 text-center">
            Pulse can read your data and update tasks. Press Enter to send.
          </p>
        </form>
      </aside>
    </>
  )
}

function Message({ msg, streaming }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-brand-gradient text-white text-sm shadow-glow">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center flex-shrink-0 shadow-glow">
        <IconSpark className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.toolCalls?.map((tc, i) => (
          <div key={i} className="mb-2 inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 mr-2">
            {tc.status === 'running' ? (
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            ) : tc.status === 'error' ? (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            ) : (
              <IconCheck className="w-3 h-3 text-emerald-500" />
            )}
            <span>{TOOL_LABELS[tc.name] || tc.name}</span>
          </div>
        ))}
        {msg.content ? (
          <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl text-sm text-slate-700 dark:text-slate-200 shadow-soft border border-slate-100 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
            {msg.content}
            {streaming && <span className="inline-block w-1.5 h-4 bg-brand-500 ml-0.5 align-middle animate-pulse" />}
          </div>
        ) : streaming && (
          <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}
