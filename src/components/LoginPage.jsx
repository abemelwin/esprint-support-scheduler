import { useState } from 'react'
import { useApp } from '../lib/AppContext'

export default function LoginPage() {
  const { signIn } = useApp()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [err,      setErr]      = useState('')
  const [busy,     setBusy]     = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setErr('Please enter email and password.'); return }
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
          <label className="fld">Email</label>
          <input
            type="email"
            className="txt"
            placeholder="you@esprint.com"
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
          <button className="btn primary" style={{ width:'100%', justifyContent:'center', marginTop:6 }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="login-note">
          🔒 Powered by Supabase Auth — credentials are securely managed server-side.
        </div>
      </div>
    </div>
  )
}
