import { useState } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { IconLogo, IconMenu, IconSpark } from './Icons'

export default function Layout({ children, title, subtitle, actions }) {
  const [open, setOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar open={open} onClose={() => setOpen(false)} onOpenChat={() => setChatOpen(true)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open menu"
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <IconLogo className="w-7 h-7" />
            <span className="font-display font-bold text-slate-900 dark:text-slate-100">Study Planner</span>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30"
            aria-label="Open AI chat"
          >
            <IconSpark className="w-5 h-5" />
          </button>
        </header>

        {(title || actions) && (
          <div className="px-6 lg:px-10 pt-8 lg:pt-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {title && <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>}
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          </div>
        )}

        <main className="flex-1 px-6 lg:px-10 py-8 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Floating Ask AI button (desktop) */}
      <button
        onClick={() => setChatOpen(true)}
        className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2 bg-brand-gradient text-white pl-4 pr-5 py-3 rounded-full shadow-glow hover:scale-105 active:scale-95 transition-all"
        title="Ask the AI study coach"
      >
        <IconSpark className="w-5 h-5" />
        <span className="font-semibold text-sm">Ask Pulse</span>
      </button>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
