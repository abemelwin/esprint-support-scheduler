import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ACCESS_LEVELS = [
  { value: 'service_manager', label: 'Service Manager', desc: 'Full KPI access, scoped to assigned branches' },
  { value: 'employee',        label: 'Employee',        desc: 'View-only overview for assigned branches' },
]

export default function RegisterPage({ onBack }) {
  const [step, setStep] = useState('form') // 'form' | 'done'
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', role: 'service_manager',
  })
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    if (!form.name.trim())     return 'Full name is required.'
    if (!form.email.trim())    return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirm) return 'Passwords do not match.'
    if (!form.role)            return 'Please select an access level.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate(); if (e2) { setErr(e2); return }
    setBusy(true); setErr('')

    // Check for duplicate email in pending_registrations
    const { data: existing } = await supabase
      .from('pending_registrations')
      .select('id, status')
      .eq('email', form.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        setErr('A registration request for this email is already pending approval.')
        setBusy(false); return
      }
      if (existing.status === 'rejected') {
        setErr('This email was previously rejected. Please contact the admin.')
        setBusy(false); return
      }
      // status === 'approved' but user was deleted — clean up the old record so they can re-register
      const { error: delErr } = await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', existing.id)
      if (delErr) { setErr(delErr.message); setBusy(false); return }
    }

    const { error } = await supabase.from('pending_registrations').insert({
      name:       form.name.trim(),
      email:      form.email.trim().toLowerCase(),
      password:   form.password,
      role:       form.role,
      branch_ids: [],
      status:     'pending',
    })

    if (error) { setErr(error.message); setBusy(false); return }
    setStep('done')
    setBusy(false)
  }

  if (step === 'done') {
    return (
      <div className="login-bg">
        <div className="login-card">
          <div className="lhead">
            <div className="logo">ES</div>
            <h2>Request Submitted</h2>
            <div className="lsub">ES Print Group of Companies</div>
          </div>
          <div className="lbody" style={{ textAlign: 'center', gap: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 42 }}>📬</div>
            <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Your registration request has been submitted.<br />
              <strong>Arnold</strong> will review and approve your account.<br />
              You'll be able to sign in once approved.
            </p>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={onBack}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-bg">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="lhead">
          <div className="logo">ES</div>
          <h2>Create Account</h2>
          <div className="lsub">ES Print Group of Companies — request access</div>
        </div>

        <form className="lbody" onSubmit={handleSubmit}>
          <label className="fld">Full name <span className="req">*</span></label>
          <input
            type="text" className="txt" placeholder="e.g. Grace Villanueva"
            value={form.name} onChange={e => set('name', e.target.value)}
            autoComplete="name"
          />

          <label className="fld">Email <span className="req">*</span></label>
          <input
            type="email" className="txt" placeholder="you@esprint.com"
            value={form.email} onChange={e => set('email', e.target.value)}
            autoComplete="email"
          />

          <label className="fld">Password <span className="req">*</span></label>
          <input
            type="password" className="txt" placeholder="at least 6 characters"
            value={form.password} onChange={e => set('password', e.target.value)}
            autoComplete="new-password"
          />

          <label className="fld">Confirm password <span className="req">*</span></label>
          <input
            type="password" className="txt" placeholder="repeat password"
            value={form.confirm} onChange={e => set('confirm', e.target.value)}
            autoComplete="new-password"
          />

          <label className="fld">Access level <span className="req">*</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ACCESS_LEVELS.map(al => (
              <label
                key={al.value}
                className={`reg-level-option${form.role === al.value ? ' selected' : ''}`}
                onClick={() => set('role', al.value)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`reg-radio-dot${form.role === al.value ? ' active' : ''}`} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{al.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{al.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="login-err" style={{ minHeight: 18 }}>{err}</div>

          <button
            type="submit"
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={busy}
          >
            {busy ? 'Submitting…' : 'Submit Registration Request'}
          </button>

          <button
            type="button"
            className="btn ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            onClick={onBack}
          >
            ← Back to Sign In
          </button>
        </form>

        <div className="login-note">
          Your request will be reviewed by the admin. Branch assignments will be set during approval.
        </div>
      </div>
    </div>
  )
}
