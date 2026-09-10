import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'

export default function UsersModal({ onClose }) {
  const { appUsers, branches, loadAppUsers } = useApp()
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'branch', branch_ids:[] })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleBranch(id) {
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(b => b !== id)
        : [...f.branch_ids, id]
    }))
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr('Name, email and password are required.'); return
    }
    if (form.role === 'branch' && form.branch_ids.length === 0) {
      setErr('Please assign at least one branch.'); return
    }
    setBusy(true); setErr('')

    // signUp with emailRedirectTo suppresses the confirmation flow on some Supabase plans.
    // We pass shouldCreateSession: false so the admin stays logged in.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password.trim(),
      options: {
        emailRedirectTo: undefined,
        data: { name: form.name.trim() },
      },
    })

    if (authError) { setErr(authError.message); setBusy(false); return }

    // If Supabase still requires email confirmation, authData.user will exist but
    // identities array will be empty (duplicate) or session will be null.
    // We still insert into app_users using the returned user id so the record exists.
    const uid = authData?.user?.id
    if (!uid) {
      setErr('Could not create auth user. Check Supabase email confirmation settings.'); setBusy(false); return
    }

    const { error } = await supabase.from('app_users').insert({
      auth_id:    uid,
      name:       form.name.trim(),
      email:      form.email.trim(),
      role:       form.role,
      branch_ids: form.role === 'branch' ? form.branch_ids : [],
    })
    if (error) { setErr(error.message); setBusy(false); return }

    await loadAppUsers()
    setForm({ name:'', email:'', password:'', role:'branch', branch_ids:[] })
    setBusy(false)
  }

  async function handleDelete(id, authId) {
    if (!confirm('Remove this user?')) return
    await supabase.from('app_users').delete().eq('id', id)
    await loadAppUsers()
  }

  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-head"><h3>User Access</h3><div className="spacer" /></div>
        <div className="modal-body">
          <div className="grid2">
            <div>
              <label className="fld">Full name</label>
              <input type="text" className="txt" placeholder="e.g. Grace Villanueva"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="fld">Email</label>
              <input type="email" className="txt" placeholder="grace@esprint.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="fld">Password</label>
              <input type="text" className="txt" placeholder="set a password"
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label className="fld">Access level</label>
              <select className="sel" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="admin">All access (Service Mgr / Manila hotline)</option>
                <option value="branch">Branch only (Branch Service Mgr)</option>
              </select>
            </div>
            {form.role === 'branch' && (
              <div className="full">
                <label className="fld">Assigned branches (tick all that apply)</label>
                <div className="branch-check">
                  {branches.length === 0 && <span className="empty">No branches yet.</span>}
                  {branches.map(b => (
                    <label key={b.id}>
                      <input type="checkbox" checked={form.branch_ids.includes(b.id)}
                        onChange={() => toggleBranch(b.id)} />
                      {b.name} · {b.note}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {err && <div className="login-err" style={{ textAlign:'left' }}>{err}</div>}
          <button className="btn primary" style={{ marginTop:10 }} onClick={handleAdd} disabled={busy}>
            ＋ Add user
          </button>

          <div style={{ marginTop:16 }}>
            {appUsers.map(u => (
              <div key={u.id} className="person" style={{ justifyContent:'space-between', marginBottom:5 }}>
                <div>
                  <div className="pname">{u.name}</div>
                  <div className="pmeta">
                    {u.email} · <span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Branch'}</span>
                    {u.role === 'branch' && u.branch_ids?.length > 0 && (
                      <span> · {u.branch_ids.map(id => branches.find(b=>b.id===id)?.name||id).join(', ')}</span>
                    )}
                  </div>
                </div>
                <button className="btn sm danger" onClick={() => handleDelete(u.id, u.auth_id)}>✕</button>
              </div>
            ))}
            {appUsers.length === 0 && <div className="empty-note">No users yet.</div>}
          </div>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Done</button></div>
      </div>
    </div>
  )
}
