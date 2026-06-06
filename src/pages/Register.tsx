import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FAVORITE_TEAMS } from '../lib/utils'
import { trophyIcon } from '../lib/images'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    favoriteTeam: 'Argentina',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim()) { setError('First name is required'); return }
    if (!form.lastName.trim())  { setError('Last name is required'); return }
    if (!form.email.trim())     { setError('Email is required'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/^[a-z0-9_]+$/.test(form.username)) {
      setError('Username: lowercase letters, numbers and underscores only')
      return
    }
    if (!form.displayName.trim()) { setError('Team name is required'); return }

    setLoading(true)
    const err = await signUp({
      email: form.email,
      password: form.password,
      username: form.username,
      displayName: form.displayName,
      firstName: form.firstName,
      lastName: form.lastName,
      favoriteTeam: form.favoriteTeam,
    })
    setLoading(false)
    if (err) setError(err)
    else navigate('/')
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-scale-in">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={trophyIcon} alt="FIFA 2026"
              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10 }} />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-pitch-500 leading-none mb-0.5">FIFA World Cup 2026</div>
              <div className="text-lg font-black leading-none" style={{ color: '#0F172A' }}>Prediction League</div>
            </div>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#0F172A' }}>Join the League</h1>
          <p className="text-slate-500 text-sm mt-1">Create your predictor account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="text" className="input" placeholder="John"
                value={form.firstName} onChange={e => set('firstName', e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Last Name <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="text" className="input" placeholder="Doe"
                value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
            </div>
          </div>

          {/* Email — required */}
          <div>
            <label className="label">
              Email <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input type="email" className="input" placeholder="john@example.com"
              value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          {/* Username + Team name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="text" className="input" placeholder="john_doe"
                value={form.username} onChange={e => set('username', e.target.value.toLowerCase())} required />
              <p className="text-xs text-slate-500 mt-1">lowercase · no spaces</p>
            </div>
            <div>
              <label className="label">
                Team Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input type="text" className="input" placeholder="The Predictors"
                value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
              <p className="text-xs text-slate-500 mt-1">shown on leaderboard</p>
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="password" className="input" placeholder="Min 8 chars"
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
            <div>
              <label className="label">Confirm <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="password" className="input" placeholder="Repeat"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
            </div>
          </div>

          {/* Favorite team */}
          <div>
            <label className="label">⚽ Favourite Team</label>
            <select className="input" value={form.favoriteTeam} onChange={e => set('favoriteTeam', e.target.value)}>
              {FAVORITE_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              color: '#DC2626', background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px',
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-pitch-400 hover:text-pitch-300 font-semibold transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
