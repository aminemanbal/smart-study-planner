import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [tasks, setTasks]     = useState([])
  const [exams, setExams]     = useState([])
  const [summary, setSummary] = useState(null)
  const [subjects, setSubjects] = useState([])
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    try {
      const [t, e, s, sum] = await Promise.all([
        axios.get('http://localhost:5000/api/tasks',            { headers }),
        axios.get('http://localhost:5000/api/exams',            { headers }),
        axios.get('http://localhost:5000/api/subjects',         { headers }),
        axios.get('http://localhost:5000/api/progress/summary', { headers })
      ])
      setTasks(t.data)
      setExams(e.data)
      setSubjects(s.data)
      setSummary(sum.data)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTasks = tasks.filter(t => {
    const d = new Date(t.date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const upcomingExams = exams
    .filter(e => new Date(e.examDate) >= today)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .slice(0, 4)

  const daysLeft = (date) => Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))

  const handleStatus = async (id, status) => {
    await axios.patch(`http://localhost:5000/api/tasks/${id}/status`, { status }, { headers })
    fetchAll()
  }

  const suggestions = []
  const examsIn7Days = upcomingExams.filter(e => daysLeft(e.examDate) <= 7).length
  if (examsIn7Days > 0) suggestions.push(`⚠️ You have ${examsIn7Days} exam(s) in the next 7 days — review your study plan!`)
  if (summary?.missed > 3) suggestions.push(`📌 You have ${summary.missed} missed tasks — try to catch up.`)
  if (todayTasks.length === 0) suggestions.push(`📅 No tasks scheduled for today — generate a new study plan!`)
  if (summary?.overall >= 80) suggestions.push(`🎉 Excellent! You're at ${summary.overall}% overall completion — keep it up!`)
  if (suggestions.length === 0) suggestions.push(`✅ Everything is on track — keep going!`)

  const radialData = [{ name: 'Progress', value: summary?.overall || 0, fill: '#4F46E5' }]

  const priorityColor = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700'
  }
  const statusStyle = {
    pending: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    missed: 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8 max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Subjects',         value: subjects.length,        color: 'text-blue-600' },
            { label: 'Scheduled Exams',  value: exams.length,           color: 'text-purple-500' },
            { label: 'Tasks Completed',  value: summary?.completed || 0, color: 'text-green-500' },
            { label: 'Tasks Missed',     value: summary?.missed || 0,    color: 'text-red-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow-sm text-center border border-gray-100">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Today's Tasks ({todayTasks.length})
            </h2>
            {todayTasks.length === 0 ? (
              <p className="text-gray-400 text-sm">No tasks scheduled for today.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {todayTasks.map(task => (
                  <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.subjectId?.color }}/>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{task.title}</p>
                        <p className="text-xs text-gray-400">{task.subjectId?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[task.status]}`}>
                        {task.status}
                      </span>
                      {task.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(task._id, 'done')}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">✓</button>
                          <button onClick={() => handleStatus(task._id, 'missed')}
                            className="text-xs bg-red-400 text-white px-2 py-1 rounded hover:bg-red-500">✗</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/tasks" className="text-xs text-blue-500 hover:underline mt-4 block">View all tasks →</Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Overall Progress</h2>
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#F3F4F6' }}/>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">{summary?.overall || 0}%</span>
              </div>
            </div>
            <Link to="/progress" className="text-xs text-blue-500 hover:underline mt-3">View details →</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Exam Countdown</h2>
            {upcomingExams.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming exams.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingExams.map(exam => (
                  <div key={exam._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{exam.subjectId?.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(exam.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[exam.priority]}`}>
                        {exam.priority}
                      </span>
                      <span className={`text-sm font-bold ${
                        daysLeft(exam.examDate) <= 3 ? 'text-red-500' :
                        daysLeft(exam.examDate) <= 7 ? 'text-yellow-500' : 'text-gray-600'
                      }`}>
                        {daysLeft(exam.examDate)}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/exams" className="text-xs text-blue-500 hover:underline mt-4 block">Manage exams →</Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">💡 Suggestions</h2>
            <div className="flex flex-col gap-3">
              {suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 leading-relaxed">
                  {s}
                </div>
              ))}
            </div>
            <Link to="/tasks" className="text-xs text-blue-500 hover:underline mt-4 block">Generate study plan →</Link>
          </div>

        </div>
      </div>
    </div>
  )
}