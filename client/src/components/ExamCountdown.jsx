const priorityStyle = {
  low:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/50',
  medium: 'bg-amber-50   text-amber-700   ring-1 ring-amber-100   dark:bg-amber-900/30   dark:text-amber-300   dark:ring-amber-900/50',
  high:   'bg-rose-50    text-rose-700    ring-1 ring-rose-100    dark:bg-rose-900/30    dark:text-rose-300    dark:ring-rose-900/50',
}

const daysBetween = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))
}

export default function ExamCountdown({ exam, onDelete }) {
  const days = daysBetween(exam.examDate)
  const urgent = days <= 3
  const soon = days <= 7
  const color = exam.subjectId?.color || '#6366F1'

  const ringColor = urgent
    ? 'ring-rose-200 dark:ring-rose-900/50'
    : soon ? 'ring-amber-200 dark:ring-amber-900/50'
           : 'ring-slate-100 dark:ring-slate-800'
  const dayColor = urgent ? 'text-rose-500' : soon ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'

  return (
    <div className={`relative card card-hover p-4 ring-1 ${ringColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: color }}
          >
            {(exam.subjectId?.name || '·')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {exam.subjectId?.name || 'Subject'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {new Date(exam.examDate).toLocaleDateString('en-US', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-2xl font-extrabold leading-none ${dayColor}`}>{days}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
            {days === 1 ? 'day' : 'days'} left
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`pill ${priorityStyle[exam.priority]} capitalize`}>
          {exam.priority} priority
        </span>
        {onDelete && (
          <button
            onClick={() => onDelete(exam._id)}
            className="text-xs text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            title="Delete exam"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
