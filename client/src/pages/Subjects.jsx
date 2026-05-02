import { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ name: '', difficultyLevel: 'medium', color: '#4F46E5' })
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchSubjects = async () => {
    const res = await axios.get('http://localhost:5000/api/subjects', { headers })
    setSubjects(res.data)
  }

  useEffect(() => { fetchSubjects() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/subjects', form, { headers })
      setForm({ name: '', difficultyLevel: 'medium', color: '#4F46E5' })
      fetchSubjects()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/api/subjects/${id}`, { headers })
    fetchSubjects()
  }

  const diffStyle = {
    easy:   'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard:   'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Subjects</h1>

        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Subject name</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Mathematics"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Difficulty</label>
            <select
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none"
              value={form.difficultyLevel}
              onChange={e => setForm({...form, difficultyLevel: e.target.value})}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Color</label>
            <input
              type="color"
              className="border border-gray-200 rounded-lg px-1 py-1 w-12 h-9 cursor-pointer"
              value={form.color}
              onChange={e => setForm({...form, color: e.target.value})}
            />
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors" type="submit">
            Add Subject
          </button>
          {error && <p className="text-red-500 text-sm w-full">{error}</p>}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjects.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3">No subjects yet. Add your first one above.</p>
          )}
          {subjects.map(s => (
            <div key={s._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}/>
                <div>
                  <p className="font-medium text-sm text-gray-700">{s.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${diffStyle[s.difficultyLevel]}`}>
                    {s.difficultyLevel}
                  </span>
                </div>
              </div>
              <button onClick={() => handleDelete(s._id)} className="text-gray-300 hover:text-red-400 text-sm transition-colors">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}