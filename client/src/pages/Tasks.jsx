import { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

export default function Tasks() {
  const [tasks, setTasks]   = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState('')
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchTasks = async () => {
    const res = await axios.get('http://localhost:5000/api/tasks', { headers })
    setTasks(res.data)
  }

  useEffect(() => { fetchTasks() }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await axios.post('http://localhost:5000/api/tasks/generate', {}, { headers })
      setMsg(res.data.message)
      fetchTasks()
    } catch {
      setMsg('Error generating study plan')
    }
    setLoading(false)
  }

  const handleStatus = async (id, status) => {
    await axios.patch(`http://localhost:5000/api/tasks/${id}/status`, { status }, { headers })
    fetchTasks()
  }

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/api/tasks/${id}`, { headers })
    fetchTasks()
  }

  const grouped = tasks.reduce((acc, task) => {
    const date = new Date(task.date).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(task)
    return acc
  }, {})

  const statusStyle = {
    pending: 'bg-yellow-100 text-yellow-700',
    done:    'bg-green-100 text-green-700',
    missed:  'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Tasks</h1>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {loading ? 'Generating...' : '⚡ Generate Study Plan'}
          </button>
        </div>

        {msg && <p className="text-green-600 mb-4 text-sm bg-green-50 px-4 py-2 rounded-lg">{msg}</p>}

        {Object.entries(grouped).map(([date, dayTasks]) => (
          <div key={date} className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{date}</h2>
            <div className="flex flex-col gap-2">
              {dayTasks.map(task => (
                <div key={task._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.subjectId?.color }}/>
                    <div>
                      <p className="font-medium text-sm text-gray-700">{task.title}</p>
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
                    <button onClick={() => handleDelete(task._id)}
                      className="text-gray-300 hover:text-red-400 text-xs transition-colors">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm mt-2">Add subjects and exams, then click "Generate Study Plan"</p>
          </div>
        )}
      </div>
    </div>
  )
}