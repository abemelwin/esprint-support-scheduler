import { useState } from 'react'
import { useApp } from '../lib/AppContext'

export default function LoginPage({ onRegister }) {
  const { signIn } = useApp()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [err,      setErr]      = useState('')
  const [busy,     setBusy]     = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setErr('Please enter username and password.'); return }
    setBusy(true); setErr('')
    const error = await signIn(email.trim(), password)
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
          <label className="fld">Username</label>
          <input
            type="text"
            className="txt"
            placeholder="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
          />
          <label className="fld">Password</label>
          <input
            type="password"
            className="txt"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
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
