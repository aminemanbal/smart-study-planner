import { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

export default function Exams() {
  const [exams, setExams]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ subjectId: '', examDate: '', priority: 'medium', notes: '' })
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    const [e, s] = await Promise.all([
      axios.get('http://localhost:5000/api/exams',    { headers }),
      axios.get('http://localhost:5000/api/subjects', { headers })
    ])
    setExams(e.data)
    setSubjects(s.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    await axios.post('http://localhost:5000/api/exams', form, { headers })
    setForm({ subjectId: '', examDate: '', priority: 'medium', notes: '' })
    fetchAll()
  }

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/api/exams/${id}`, { headers })
    fetchAll()
  }

  const priorityStyle = {
    low:    'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high:   'bg-red-100 text-red-700'
  }

  const daysLeft = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Exams</h1>

        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-40">
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Subject</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none"
              value={form.subjectId}
              onChange={e => setForm({...form, subjectId: e.target.value})}
              required
            >
              <option value="">Select a subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Exam Date</label>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none"
              value={form.examDate}
              onChange={e => setForm({...form, examDate: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Priority</label>
            <select
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none"
              value={form.priority}
              onChange={e => setForm({...form, priority: e.target.value})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors" type="submit">
            Schedule Exam
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exams.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3">No exams scheduled yet.</p>
          )}
          {exams.map(ex => (
            <div key={ex._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ex.subjectId?.color }}/>
                  <p className="font-medium text-sm text-gray-700">{ex.subjectId?.name}</p>
                </div>
                <button onClick={() => handleDelete(ex._id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                {new Date(ex.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyle[ex.priority]}`}>{ex.priority}</span>
                <span className={`text-sm font-semibold ${daysLeft(ex.examDate) <= 3 ? 'text-red-500' : daysLeft(ex.examDate) <= 7 ? 'text-yellow-500' : 'text-gray-500'}`}>
                  {daysLeft(ex.examDate)} days left
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}