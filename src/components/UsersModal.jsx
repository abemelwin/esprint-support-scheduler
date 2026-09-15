import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Admin'           },
  { value: 'service_manager', label: 'Service Manager' },
  { value: 'branch',          label: 'Branch User'     },
]

const ROLE_LABEL = {
  admin:           'Admin',
  service_manager: 'Svc Mgr',
  branch:          'Branch',
}

export default function UsersModal({ onClose }) {
  const {
    appUsers, branches, loadAppUsers,
    updateUserRole, updateUserBranches, toggleUserActive,
  } = useApp()

  // ── Add user form ─────────────────────────────────────────────
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'service_manager', branch_ids:[] })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  // ── Edit state ────────────────────────────────────────────────
  const [editId,       setEditId]       = useState(null)   // user id being edited
  const [editRole,     setEditRole]     = useState('')
  const [editBranches, setEditBranches] = useState([])
  const [editBusy,     setEditBusy]     = useState(false)
  const [editErr,      setEditErr]      = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleBranch(id) {
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(b => b !== id)
        : [...f.branch_ids, id],
    }))
  }

  function toggleEditBranch(id) {
    setEditBranches(cur =>
      cur.includes(id) ? cur.filter(b => b !== id) : [...cur, id]
    )
  }

  function startEdit(u) {
    setEditId(u.id)
    setEditRole(u.role)
    setEditBranches(u.branch_ids || [])
    setEditErr('')
  }

  function cancelEdit() {
    setEditId(null); setEditErr('')
  }

  async function saveEdit(u) {
    const needsBranch = editRole === 'service_manager' || editRole === 'branch'
    if (needsBranch && editBranches.length === 0) {
      setEditErr('Assign at least one branch.'); return
    }
    setEditBusy(true); setEditErr('')
    const e1 = await updateUserRole(u.id, editRole)
    const e2 = await updateUserBranches(u.id, needsBranch ? editBranches : [])
    if (e1 || e2) { setEditErr((e1 || e2).message); setEditBusy(false); return }
    setEditBusy(false)
    setEditId(null)
  }

  const needsBranch = form.role === 'branch' || form.role === 'service_manager'

  async function handleAdd() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr('Name, email and password are required.'); return
    }
    if (needsBranch && form.branch_ids.length === 0) {
      setErr('Please assign at least one branch.'); return
    }

    const already = appUsers.find(u => u.email.toLowerCase() === form.email.trim().toLowerCase())
    if (already) { setErr('This email is already in the user list.'); return }

    setBusy(true); setErr('')

    const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
      email:    form.email.trim(),
      password: form.password.trim(),
      options:  { emailRedirectTo: undefined, data: { name: form.name.trim() } },
    })

    if (authError) { setErr(authError.message); setBusy(false); return }

    const uid              = authData?.user?.id
    const isAlreadyInAuth  = authData?.user?.identities?.length === 0

    if (!uid) {
      setErr('Could not create auth user. Make sure "Confirm email" is OFF in Supabase Auth settings.')
      setBusy(false); return
    }
    if (isAlreadyInAuth) {
      setErr('Email already exists in auth. Delete the auth user from Supabase Dashboard first.')
      setBusy(false); return
    }

    const { error } = await supabase.from('app_users').insert({
      auth_id:     uid,
      name:        form.name.trim(),
      email:       form.email.trim(),
      role:        form.role,
      branch_ids:  needsBranch ? form.branch_ids : [],
      is_active:   true,
      is_approved: true,
    })
    if (error) { setErr(error.message); setBusy(false); return }

    await loadAppUsers()
    setForm({ name:'', email:'', password:'', role:'service_manager', branch_ids:[] })
    setBusy(false)
  }

  async function handleToggleActive(u) {
    const next = !(u.is_active ?? true)
    await toggleUserActive(u.id, next)
  }

  async function handleDelete(id, authId, email) {
    if (!confirm('Remove this user permanently?')) return
    // Also delete the pending_registrations record so the email can re-register
    if (email) {
      await supabase.from('pending_registrations').delete().eq('email', email)
    }
    if (authId) {
      const { error } = await supabase.rpc('delete_auth_user', { user_auth_id: authId })
      if (error) await supabase.from('app_users').delete().eq('id', id)
    } else {
      await supabase.from('app_users').delete().eq('id', id)
    }
    await loadAppUsers()
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 660, width: '100%' }}>
        <div className="modal-head"><h3>User Access Management</h3><div className="spacer" /></div>
        <div className="modal-body">

          {/* ── Add new user manually ── */}
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Add user manually
          </div>
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
                {ROLE_OPTIONS.filter(r => r.value !== 'admin').map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {needsBranch && (
              <div className="full">
                <label className="fld">Assigned branches</label>
                <div className="branch-check">
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
          <button className="btn primary" style={{ marginTop: 10 }} onClick={handleAdd} disabled={busy}>
            ＋ Add user
          </button>

          {/* ── Existing users ── */}
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Existing users ({appUsers.length})
          </div>

          {appUsers.length === 0 && <div className="empty-note">No users yet.</div>}

          {appUsers.map(u => {
            const isEditing  = editId === u.id
            const isActive   = u.is_active ?? true
            const branchNames = (u.branch_ids || [])
              .map(id => branches.find(b => b.id === id)?.name || id)
              .join(', ')

            return (
              <div key={u.id} className={`user-mgmt-card${!isActive ? ' inactive' : ''}`}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pname">{u.name}</span>
                      <span className={`role-tag ${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
                      {!isActive && <span className="role-tag" style={{ background: 'var(--st-fail)', color: '#fff' }}>Inactive</span>}
                    </div>
                    <div className="pmeta">{u.email}</div>
                    {branchNames && <div className="pmeta" style={{ color: 'var(--muted)' }}>Branches: {branchNames}</div>}
                  </div>

                  {/* Action buttons */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button className="btn sm" onClick={() => startEdit(u)} title="Edit role / branches">✎ Edit</button>
                      <button
                        className={`btn sm ${isActive ? 'ghost' : 'primary'}`}
                        onClick={() => handleToggleActive(u)}
                        title={isActive ? 'Deactivate account' : 'Activate account'}
                      >
                        {isActive ? '⏸ Deactivate' : '▶ Activate'}
                      </button>
                      <button className="btn sm danger" onClick={() => handleDelete(u.id, u.auth_id, u.email)} title="Delete user">✕</button>
                    </div>
                  )}
                </div>

                {/* Inline edit panel */}
                {isEditing && (
                  <div className="user-edit-panel">
                    <div className="grid2" style={{ gap: 10 }}>
                      <div>
                        <label className="fld">Access level</label>
                        <select className="sel" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div /> {/* spacer */}
                      {(editRole === 'service_manager' || editRole === 'branch') && (
                        <div className="full">
                          <label className="fld">Assigned branches</label>
                          <div className="branch-check" style={{ maxHeight: 110, overflowY: 'auto' }}>
                            {branches.map(b => (
                              <label key={b.id}>
                                <input type="checkbox"
                                  checked={editBranches.includes(b.id)}
                                  onChange={() => toggleEditBranch(b.id)} />
                                {b.name} · {b.note}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {editErr && <div className="login-err" style={{ textAlign:'left', marginTop: 6 }}>{editErr}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn primary" onClick={() => saveEdit(u)} disabled={editBusy}>
                        {editBusy ? 'Saving…' : '✓ Save'}
                      </button>
                      <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
