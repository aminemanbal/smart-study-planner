import { IconCheck, IconClose, IconRefresh, IconTrash } from './Icons'

const statusStyle = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900/50',
  done:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/50',
  missed:  'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-900/50',
}

export default function TaskCard({ task, onStatusChange, onDelete, compact = false }) {
  const color = task.subjectId?.color || '#6366F1'

  return (
    <div
      className={`group relative card card-hover overflow-hidden flex items-center gap-4 ${compact ? 'p-3' : 'p-4'}`}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">
            {task.subjectId?.name || 'Subject'}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
      </div>

      <span className={`pill ${statusStyle[task.status]} capitalize`}>{task.status}</span>

      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        {task.status === 'pending' && onStatusChange && (
          <>
            <button
              onClick={() => onStatusChange(task._id, 'done')}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
              title="Mark done"
            >
              <IconCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStatusChange(task._id, 'missed')}
              className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
              title="Mark missed"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </>
        )}
        {task.status !== 'pending' && onStatusChange && (
          <button
            onClick={() => onStatusChange(task._id, 'pending')}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            title="Reset to pending"
          >
            <IconRefresh className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(task._id)}
            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            title="Delete"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
