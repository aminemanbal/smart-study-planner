import { useState, useEffect, useRef, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { IconCamera, IconEdit, IconTrash, IconCheck, IconClose, IconTrophy, IconFire, IconBook, IconCalendar, IconSpark } from '../components/Icons'
import * as profileService from '../services/profileService'
import * as subjectService from '../services/subjectService'
import * as examService from '../services/examService'
import * as progressService from '../services/progressService'

const PRESET_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F43F5E', // rose
  '#F59E0B', // amber
  '#10B981', // emerald
  '#14B8A6', // teal
  '#0EA5E9', // sky
]

// Client-side resize: load file, draw to <canvas>, return data URL.
const resizeToDataURL = (file, size = 320, quality = 0.85) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      // cover-fit
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale, h = img.height * scale
      const dx = (size - w) / 2, dy = (size - h) / 2
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, dx, dy, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = reader.result
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const Badge = ({ icon: Icon, label, hint, unlocked, color = '#6366F1' }) => (
  <div className={`p-4 rounded-2xl border text-center transition-all ${
    unlocked
      ? 'bg-white border-slate-100 shadow-soft'
      : 'bg-slate-50 border-slate-100 opacity-50 grayscale'
  }`}>
    <div
      className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white shadow-glow"
      style={{ background: unlocked ? `linear-gradient(135deg, ${color}, ${shade(color, -20)})` : '#CBD5E1' }}
    >
      <Icon className="w-6 h-6" />
    </div>
    <p className="font-semibold text-sm text-slate-800 mt-2">{label}</p>
    <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>
  </div>
)

// Lighten/darken a hex color
function shade (hex, percent) {
  const c = hex.replace('#', '')
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0xff) + percent
  let b = (num & 0xff) + percent
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', goal: '', accentColor: '#6366F1', dailyStudyHours: 2 })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)

  // Stats for badges
  const [stats, setStats] = useState({ subjects: 0, exams: 0, completed: 0, missed: 0, overall: 0, studiedDays: 0, total: 0 })

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        goal: user.goal || '',
        accentColor: user.accentColor || '#6366F1',
        dailyStudyHours: user.dailyStudyHours ?? 2,
      })
      setAvatarPreview(user.avatar || '')
    }
  }, [user])

  useEffect(() => {
    const load = async () => {
      try {
        const [subs, exs, sum] = await Promise.all([
          subjectService.list(),
          examService.list(),
          progressService.summary(),
        ])
        setStats({
          subjects: subs.length,
          exams: exs.length,
          completed: sum.completed,
          missed: sum.missed,
          overall: sum.overall,
          studiedDays: sum.studiedDays ?? 0,
          total: sum.total,
        })
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file (PNG, JPEG, WebP).')
      return
    }
    try {
      const dataUrl = await resizeToDataURL(file, 320, 0.85)
      setAvatarPreview(dataUrl)
      setEditing(true)
    } catch {
      setError('Could not read that image.')
    }
  }

  const removeAvatar = () => {
    setAvatarPreview('')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(''); setMsg('')
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      goal: user.goal || '',
      accentColor: user.accentColor || '#6366F1',
      dailyStudyHours: user.dailyStudyHours ?? 2,
    })
    setAvatarPreview(user.avatar || '')
  }

  const save = async () => {
    setSaving(true); setError(''); setMsg('')
    try {
      const patch = {
        name:         form.name,
        bio:          form.bio,
        goal:         form.goal,
        accentColor:  form.accentColor,
        dailyStudyHours: Number(form.dailyStudyHours),
        avatar:       avatarPreview,
      }
      const updated = await profileService.update(patch)
      updateUser(updated)
      setMsg('Profile saved ✓')
      setEditing(false)
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const accent = form.accentColor || '#6366F1'
  const accentGradient = `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -30)} 100%)`

  const memberSince = user?.createdAt ? new Date(user.createdAt) : null
  const initials = useMemo(() =>
    (user?.name || '·').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  , [user?.name])

  const achievements = [
    { icon: IconBook,     label: 'Curator',     hint: 'Add 3+ subjects',          unlocked: stats.subjects >= 3 },
    { icon: IconCalendar, label: 'Planner',     hint: 'Schedule an exam',         unlocked: stats.exams >= 1 },
    { icon: IconCheck,    label: 'Achiever',    hint: '10 tasks completed',       unlocked: stats.completed >= 10 },
    { icon: IconCheck,    label: 'Centurion',   hint: '100 tasks completed',      unlocked: stats.completed >= 100 },
    { icon: IconFire,     label: 'On Fire',     hint: '5+ active days in a week', unlocked: stats.studiedDays >= 5 },
    { icon: IconTrophy,   label: 'Sharp shot',  hint: '80%+ completion rate',     unlocked: stats.overall >= 80 && stats.total >= 5 },
    { icon: IconSpark,    label: 'Champion',    hint: '50 done, zero missed',     unlocked: stats.completed >= 50 && stats.missed === 0 },
  ]

  return (
    <Layout title="Profile" subtitle="Make this space your own.">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}
      {msg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <IconCheck className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* HERO ------------------------------------------------------- */}
      <div className="card overflow-hidden mb-6">
        <div
          className="h-32 sm:h-40 relative"
          style={{ background: accentGradient }}
        >
          <div className="absolute inset-0 bg-mesh opacity-50" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-4 right-4 bg-white/15 backdrop-blur hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
            >
              <IconEdit className="w-3.5 h-3.5" />
              Edit profile
            </button>
          )}
        </div>

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
            <div className="relative w-28 h-28 rounded-2xl ring-4 ring-white shadow-card overflow-hidden bg-white shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-3xl font-extrabold"
                  style={{ background: accentGradient }}
                >
                  {initials}
                </div>
              )}
              <button
                onClick={onPickFile}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-slate-600 hover:text-brand-600 transition-colors"
                title="Change photo"
              >
                <IconCamera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0 pt-3 sm:pt-0 pb-1">
              {editing ? (
                <input
                  className="input text-xl font-bold !py-1.5"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  maxLength={80}
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-2xl font-extrabold text-slate-900 truncate">{user?.name}</h2>
              )}
              <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              {memberSince && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Member since {memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-5">
            {editing ? (
              <>
                <label className="label">About you</label>
                <textarea
                  className="input min-h-[60px]"
                  rows={2}
                  maxLength={240}
                  placeholder="A short bio: who are you, what are you studying?"
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{form.bio.length}/240</p>
              </>
            ) : user?.bio ? (
              <p className="text-sm text-slate-700 leading-relaxed">{user.bio}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No bio yet — click Edit to add one.</p>
            )}
          </div>

          {editing && avatarPreview && (
            <button
              onClick={removeAvatar}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-semibold"
            >
              <IconTrash className="w-3.5 h-3.5" />
              Remove photo
            </button>
          )}

          {editing && (
            <div className="flex items-center gap-2 mt-6">
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={cancel} disabled={saving} className="btn-secondary">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* STATS + GOAL ----------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display font-bold text-slate-900">Your stats</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">A snapshot of your journey so far.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Subjects',  value: stats.subjects,           hint: 'Tracked' },
              { label: 'Exams',     value: stats.exams,              hint: 'Scheduled' },
              { label: 'Completed', value: stats.completed,          hint: 'Tasks done' },
              { label: 'Overall',   value: `${stats.overall}%`,      hint: 'Completion' },
            ].map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl text-white shadow-soft"
                style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -30)})` }}
              >
                <p className="text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs opacity-90 mt-0.5">{s.label}</p>
                <p className="text-[10px] opacity-70 mt-1">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 relative overflow-hidden">
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: accentGradient }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-glow"
                style={{ background: accentGradient }}
              >
                <IconSpark className="w-4 h-4" />
              </span>
              <h3 className="font-display font-bold text-slate-900">My goal</h3>
            </div>
            {editing ? (
              <>
                <textarea
                  className="input min-h-[80px]"
                  rows={3}
                  maxLength={240}
                  placeholder="Your study goal or motivation…"
                  value={form.goal}
                  onChange={e => setForm({ ...form, goal: e.target.value })}
                />
                <div className="mt-3">
                  <label className="label">Daily study target (hours)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    className="input"
                    value={form.dailyStudyHours}
                    onChange={e => setForm({ ...form, dailyStudyHours: e.target.value })}
                  />
                </div>
              </>
            ) : user?.goal ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{user.goal}"</p>
                {user.dailyStudyHours > 0 && (
                  <p className="text-xs text-slate-400 mt-3">Target: {user.dailyStudyHours}h / day</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Set a goal to stay motivated.</p>
            )}
          </div>
        </div>
      </div>

      {/* ACCENT COLOR ----------------------------------------------- */}
      {editing && (
        <div className="card p-6 mb-6 animate-fade-in">
          <h3 className="font-display font-bold text-slate-900">Accent color</h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Personalise your profile gradient.</p>
          <div className="flex items-center gap-3 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, accentColor: c })}
                className={`w-10 h-10 rounded-full transition-all ${
                  form.accentColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                }`}
                style={{ background: `linear-gradient(135deg, ${c}, ${shade(c, -30)})` }}
                aria-label={`Pick ${c}`}
              />
            ))}
            <input
              type="color"
              value={form.accentColor}
              onChange={e => setForm({ ...form, accentColor: e.target.value })}
              className="w-10 h-10 rounded-full cursor-pointer border border-slate-200"
              title="Custom color"
            />
            <span className="text-xs text-slate-500 ml-1">{form.accentColor}</span>
          </div>
        </div>
      )}

      {/* ACHIEVEMENTS ----------------------------------------------- */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-slate-900">Achievements</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
            </p>
          </div>
          <IconTrophy className="w-5 h-5 text-amber-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {achievements.map((a, i) => (
            <Badge key={i} {...a} color={accent} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
