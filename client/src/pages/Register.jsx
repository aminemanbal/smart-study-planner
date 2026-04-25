import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/auth/register', form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6">Create an account</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-4 py-2"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input
            className="w-full border rounded-lg px-4 py-2"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input
            className="w-full border rounded-lg px-4 py-2"
            type="password"
            placeholder="password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            type="submit"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-sm text-center">
          Already have an account ? <Link to="/login" className="text-blue-600">Login</Link>
        </p>
      </div>
    </div>
  )
}