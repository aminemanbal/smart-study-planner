import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconLogo, IconCheck } from '../components/Icons'

const benefits = [
  'Auto-generated daily study plans',
  'Smart prioritisation by exam proximity',
  'Real-time progress tracking & charts',
  'Works on every device',
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      await login({ email: form.email, password: form.password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-slate-950">
      <div className="flex items-center justify-center p-6 sm:p-12 order-2 lg:order-1">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <IconLogo className="w-9 h-9" />
            <span className="font-display font-bold text-slate-900 dark:text-slate-100 text-lg">Study Planner</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Create your account</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5">Start turning intentions into trackable actions.</p>

          {error && (
            <div className="mt-6 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                placeholder="John Doe"
                autoComplete="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button disabled={loading} className="btn-primary w-full py-3" type="submit">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-sm text-center text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-gradient text-white overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/40 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <IconLogo className="w-10 h-10" />
          <span className="font-display font-bold text-xl">Study Planner</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl xl:text-5xl font-display font-extrabold leading-tight">
            From scattered notes to a clear roadmap.
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-md">
            Join students who already plan smarter, not harder.
          </p>

          <ul className="mt-10 space-y-3 max-w-md">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90">
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <IconCheck className="w-4 h-4" />
                </span>
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          Built with React, Express, MongoDB — DevCore Academy.
        </p>
      </div>
    </div>
  )
}
