import { useState } from 'react'
import { useApp } from '../lib/AppContext'

// ── Minimalist Vector Eye Icon ────────────────────────────────────────────────
function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function LoginPage({ onRegister }) {
  const { signIn } = useApp()
  const [email,    setEmail]    = useState(() => {
    return localStorage.getItem('esprint_last_email') || ''
  })
  const [password, setPassword] = useState('')
  const [err,      setErr]      = useState('')
  const [busy,     setBusy]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setErr('Please enter username and password.'); return }
    setBusy(true); setErr('')
    const trimmed = email.trim()
    localStorage.setItem('esprint_last_email', trimmed)
    const error = await signIn(trimmed, password)
    if (error) setErr(error.message || 'Invalid credentials.')
    setBusy(false)
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="lhead">
          <div className="logo">ES</div>
          <h2>Support Team Scheduler</h2>
          <div className="lsub">ES Print Group of Companies — please sign in</div>
        </div>
        <form className="lbody" onSubmit={handleLogin}>
          <label className="fld">Username / Email</label>
          <input
            type="text"
            className="txt"
            placeholder="e.g. esprint.rickyeina@gmail.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              localStorage.setItem('esprint_last_email', e.target.value.trim())
            }}
            autoComplete="username"
          />
          <label className="fld">Password</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="txt"
              placeholder="password"
              style={{ width: '100%', paddingRight: 38 }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                padding: '5px',
                borderRadius: '5px',
                transition: 'color .15s ease',
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
          <div className="login-err">{err}</div>
          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ textAlign: 'center', padding: '10px 24px 4px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Don't have an account? </span>
          <button
            type="button"
            className="btn-link"
            onClick={onRegister}
          >
            Request access
          </button>
        </div>

        <div className="login-note">
          🔒 Access is applied inside this page only — it organizes who sees
          what, but it is <b>not</b> server-grade security. Don't store this file where
          untrusted people can open it. Ask your admin for a hosted version if
          you need real protection.
        </div>
      </div>
    </div>
  )
}
