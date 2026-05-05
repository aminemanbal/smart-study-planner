import { useState } from 'react'
import Sidebar from './Sidebar'
import { IconLogo, IconMenu } from './Icons'

export default function Layout({ children, title, subtitle, actions }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <IconLogo className="w-7 h-7" />
            <span className="font-display font-bold text-slate-900">Study Planner</span>
          </div>
          <div className="w-9" />
        </header>

        {(title || actions) && (
          <div className="px-6 lg:px-10 pt-8 lg:pt-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {title && <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{title}</h1>}
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
            </div>
          </div>
        )}

        <main className="flex-1 px-6 lg:px-10 py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
