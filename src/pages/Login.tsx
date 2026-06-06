import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { messiFCR7, trophyIcon } from '../lib/images'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fakeEmail = `${username.toLowerCase().trim()}@wc2026.internal`
    const err = await signIn(fakeEmail, password)
    setLoading(false)
    if (err) setError('Invalid username or password')
    else navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F1F5F9' }}>

      {/* ── Left: Form panel ── */}
      <div className="auth-form-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 44px',
        background: '#FFFFFF',
        position: 'relative',
        zIndex: 2,
        boxShadow: '4px 0 32px rgba(0,0,0,0.06)',
      }}>

        {/* Branding */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <img
              src={trophyIcon}
              alt="FIFA 2026"
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#16A34A', lineHeight: 1 }}>
                FIFA World Cup
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                2026 Prediction League
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#0F172A', marginBottom: 6, lineHeight: 1.1 }}>
            Welcome back
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
            Sign in to make your picks and climb the board
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              placeholder="your_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#f87171',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '10px 14px',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '13px 24px', fontSize: 15, marginTop: 4 }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="animate-spin" style={{
                  display: 'inline-block', width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                }} />
                Signing in…
              </span>
            ) : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#4ade80', fontWeight: 600, textDecoration: 'none' }}>
              Create one →
            </Link>
          </p>
        </div>

        {/* Host nations */}
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hosted by</span>
          <span style={{ fontSize: 13, color: '#475569' }}>🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico</span>
        </div>
      </div>

      {/* ── Right: Player hero image ── */}
      <div className="auth-hero-panel" style={{
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* The actual player photo */}
        <img
          src={messiFCR7}
          alt="World Cup Stars"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />

        {/* Left-to-center dark fade so it blends into the form panel */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, #0A0F1E 0%, rgba(10,15,30,0.55) 35%, rgba(10,15,30,0.05) 100%)',
        }} />

        {/* Bottom gradient + text */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '60px 48px 44px',
          background: 'linear-gradient(to top, rgba(5,8,16,0.95) 0%, rgba(5,8,16,0.5) 50%, transparent 100%)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'rgba(34,197,94,0.9)', marginBottom: 10,
          }}>
            June – July 2026
          </div>
          <div style={{
            fontSize: 38, fontWeight: 900, color: '#fff',
            lineHeight: 1.08, marginBottom: 10,
            textShadow: '0 2px 24px rgba(0,0,0,0.7)',
          }}>
            The World's<br />Greatest Stage
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Messi', 'Mbappé', 'Cristiano'].map(name => (
              <span key={name} style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999, padding: '3px 10px',
              }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
