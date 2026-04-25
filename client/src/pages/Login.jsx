import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form)
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6">Login</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-4 py-2"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
          <input
            className="w-full border rounded-lg px-4 py-2"
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            type="submit"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-sm text-center">
          No account ? <Link to="/register" className="text-blue-600">register</Link>
        </p>
      </div>
    </div>
  )
}