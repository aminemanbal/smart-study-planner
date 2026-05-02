import { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'

export default function Progress() {
  const [subjects, setSubjects] = useState([])
  const [summary, setSummary]   = useState(null)
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    const fetchData = async () => {
      const [s, sum] = await Promise.all([
        axios.get('http://localhost:5000/api/progress',         { headers }),
        axios.get('http://localhost:5000/api/progress/summary', { headers })
      ])
      setSubjects(s.data)
      setSummary(sum.data)
    }
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-8">Progress Tracking</h1>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Overall Rate',      value: `${summary.overall}%`, color: 'text-blue-600' },
              { label: 'Tasks Completed',   value: summary.completed,      color: 'text-green-500' },
              { label: 'Tasks Missed',      value: summary.missed,         color: 'text-red-400' },
              { label: 'Total Tasks',       value: summary.total,          color: 'text-gray-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Completion by Subject</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjects.map(s => ({ name: s.subject.name, rate: s.completionRate }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }}/>
                <Tooltip formatter={(v) => `${v}%`}/>
                <Bar dataKey="rate" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Completion"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity — Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={summary?.last7 || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 12 }}/>
                <Tooltip/>
                <Line type="monotone" dataKey="done"  stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Completed"/>
                <Line type="monotone" dataKey="total" stroke="#D1D5DB" strokeWidth={1} strokeDasharray="4 2" name="Total"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Subject Breakdown</h2>
          <div className="flex flex-col gap-5">
            {subjects.map(s => (
              <div key={s.subject.id}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.subject.color }}/>
                    <span className="text-sm font-medium text-gray-700">{s.subject.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {s.completedTasks}/{s.totalTasks} tasks — {s.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${s.completionRate}%`, backgroundColor: s.subject.color }}
                  />
                </div>
                {s.missedTasks > 0 && (
                  <p className="text-xs text-red-400 mt-1">{s.missedTasks} missed task(s)</p>
                )}
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-gray-400 text-sm">No data yet. Generate a study plan to start tracking.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}