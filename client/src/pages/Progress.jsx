import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { PerSubjectChart, OverallRing } from '../components/ProgressChart'
import { IconChart, IconCheck, IconClose, IconFire } from '../components/Icons'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import * as progressService from '../services/progressService'

const StatTile = ({ label, value, accent, icon: Icon, hint }) => (
  <div className="card card-hover p-5 relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-3xl font-extrabold mt-2 ${accent}`}>{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
      {Icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
  </div>
)

export default function Progress() {
  const [subjects, setSubjects] = useState([])
  const [summary, setSummary]   = useState(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, sum] = await Promise.all([
          progressService.perSubject(),
          progressService.summary()
        ])
        setSubjects(s); setSummary(sum)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load progress')
      }
    }
    fetchData()
  }, [])

  return (
    <Layout
      title="Progress Tracking"
      subtitle="Measure consistency, completion, and momentum."
    >
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatTile label="Overall"        value={`${summary.overall}%`}            accent="text-brand-600"   icon={IconChart} hint="Across all subjects" />
          <StatTile label="Completed"      value={summary.completed}                 accent="text-emerald-500" icon={IconCheck} />
          <StatTile label="Missed"         value={summary.missed}                    accent="text-rose-500"    icon={IconClose} />
          <StatTile label="Total tasks"    value={summary.total}                     accent="text-slate-700" />
          <StatTile label="Active days"    value={`${summary.studiedDays ?? 0}/7`}   accent="text-amber-500"   icon={IconFire} hint="Last 7 days" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display font-bold text-slate-900">Completion by Subject</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">Per-subject completion rate</p>
          <PerSubjectChart data={subjects} />
        </div>

        <div className="card p-6 flex flex-col items-center text-center">
          <h3 className="font-display font-bold text-slate-900">Overall Progress</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">Tasks done vs. total</p>
          <OverallRing value={summary?.overall || 0} />
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-display font-bold text-slate-900">Activity — Last 7 Days</h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-5">Tasks completed per day</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={summary?.last7 || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="doneGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area type="monotone" dataKey="done"  stroke="#10B981" strokeWidth={2} fill="url(#doneGradient)" name="Completed" />
            <Line type="monotone" dataKey="total" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 2" name="Planned" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-bold text-slate-900">Subject Breakdown</h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-6">Granular completion per subject</p>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No data yet — generate a study plan to start tracking progress.
          </p>
        ) : (
          <div className="space-y-5">
            {subjects.map(s => (
              <div key={s.subject.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: s.subject.color }}
                    >
                      {s.subject.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.subject.name}</p>
                      <p className="text-xs text-slate-400">
                        {s.completedTasks}/{s.totalTasks} tasks
                        {s.missedTasks > 0 && (
                          <span className="text-rose-500 ml-2">· {s.missedTasks} missed</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{s.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${s.completionRate}%`, backgroundColor: s.subject.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
