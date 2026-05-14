import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconLogo } from '../components/Icons'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-slate-950">
      {/* Hero / brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-gradient text-white overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-pink-500/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <IconLogo className="w-10 h-10" />
          <span className="font-display font-bold text-xl">Study Planner</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl xl:text-5xl font-display font-extrabold leading-tight">
            Transform academic chaos into structured execution.
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-md">
            Plan smarter, study consistently, and never miss an exam again.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: '8w', l: 'Build duration' },
              { v: '5+', l: 'Smart modules' },
              { v: '24/7', l: 'Cloud access' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                <p className="text-2xl font-extrabold">{s.v}</p>
                <p className="text-xs text-white/70 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/60 italic">
          "The best systems are not the most complex — but the ones that make life simpler and clearer."
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <IconLogo className="w-9 h-9" />
            <span className="font-display font-bold text-slate-900 dark:text-slate-100 text-lg">Study Planner</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5">Sign in to continue your study plan.</p>

          {error && (
            <div className="mt-6 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button disabled={loading} className="btn-primary w-full py-3" type="submit">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-sm text-center text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
