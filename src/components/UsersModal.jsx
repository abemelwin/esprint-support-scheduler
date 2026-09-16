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

// ── View Only / Can Edit toggle ───────────────────────────────────────────────
function AccessToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content', marginTop: 2 }}>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          background: !value ? 'var(--accent, #2a78d6)' : 'var(--surface)',
          color:      !value ? '#fff' : 'var(--muted)',
          transition: 'background .15s, color .15s',
        }}
      >
        👁 View Only
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          borderLeft: '1px solid var(--border)',
          cursor: 'pointer',
          background: value ? 'var(--accent, #2a78d6)' : 'var(--surface)',
          color:      value ? '#fff' : 'var(--muted)',
          transition: 'background .15s, color .15s',
        }}
      >
        ✏️ Can Edit
      </button>
    </div>
  )
}

export default function UsersModal({ onClose }) {
  const {
    appUsers, branches, loadAppUsers,
    updateUserRole, updateUserBranches, toggleUserActive,
  } = useApp()

  // ── Add user form ─────────────────────────────────────────────
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'service_manager', branch_ids:[], can_edit: true })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  // ── Edit state ────────────────────────────────────────────────
  const [editId,       setEditId]       = useState(null)   // user id being edited
  const [editName,     setEditName]     = useState('')
  const [editEmail,    setEditEmail]    = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole,     setEditRole]     = useState('')
  const [editCanEdit,  setEditCanEdit]  = useState(true)
  const [editBranches, setEditBranches] = useState([])
  const [editBusy,     setEditBusy]     = useState(false)
  const [editErr,      setEditErr]      = useState('')

  // ── Search & Filter State for Existing Users ─────────────────
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Filtered users logic
  const searchTerm = search.trim().toLowerCase()
  const filteredUsers = appUsers.filter(u => {
    // 1. User search by name or email
    if (searchTerm) {
      const matchName  = u.name?.toLowerCase().includes(searchTerm)
      const matchEmail = u.email?.toLowerCase().includes(searchTerm)
      if (!matchName && !matchEmail) return false
    }

    // 2. Role filter
    if (roleFilter && u.role !== roleFilter) {
      return false
    }

    // 3. Branch filter
    if (branchFilter) {
      const uBranches = u.branch_ids || []
      const isAllBranchesUser = branches.length > 0 && branches.every(b => uBranches.includes(b.id))
      
      if (branchFilter === '__all__') {
        if (u.role !== 'admin' && !isAllBranchesUser) return false
      } else if (branchFilter === '__unassigned__') {
        if (u.role === 'admin' || uBranches.length > 0) return false
      } else {
        const hasBranch = uBranches.includes(branchFilter)
        const isAdminAccess = u.role === 'admin'
        if (!hasBranch && !isAdminAccess) return false
      }
    }

    // 4. Status / Access filter
    if (statusFilter) {
      const isActive = u.is_active ?? true
      const canEdit  = u.can_edit !== false
      if (statusFilter === 'active'    && !isActive) return false
      if (statusFilter === 'inactive'  && isActive)  return false
      if (statusFilter === 'can_edit'  && !canEdit)  return false
      if (statusFilter === 'view_only' && canEdit)   return false
    }

    return true
  })

  const isFiltered = !!(searchTerm || roleFilter || branchFilter || statusFilter)

  function resetFilters() {
    setSearch('')
    setRoleFilter('')
    setBranchFilter('')
    setStatusFilter('')
  }

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
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditPassword('') // Leave blank unless changing
    setEditRole(u.role)
    setEditCanEdit(u.can_edit !== false)
    setEditBranches(u.branch_ids || [])
    setEditErr('')
  }

  function cancelEdit() {
    setEditId(null); setEditErr('')
  }

  async function saveEdit(u) {
    if (!editName.trim()) {
      setEditErr('Full name is required.'); return
    }
    if (!editEmail.trim()) {
      setEditErr('Email address is required.'); return
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      setEditErr('Password must be at least 6 characters.'); return
    }

    const needsBranch = editRole === 'service_manager' || editRole === 'branch'
    if (needsBranch && editBranches.length === 0) {
      setEditErr('Assign at least one branch.'); return
    }

    // Check if email already used by another user
    const existingOther = appUsers.find(
      x => x.id !== u.id && x.email?.trim().toLowerCase() === editEmail.trim().toLowerCase()
    )
    if (existingOther) {
      setEditErr('This email is already in use by another user.'); return
    }

    setEditBusy(true); setEditErr('')

    const finalCanEdit = editRole === 'admin' ? true : editCanEdit

    // 1. Update app_users
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        name:       editName.trim(),
        email:      editEmail.trim(),
        role:       editRole,
        branch_ids: needsBranch ? editBranches : [],
        can_edit:   finalCanEdit,
      })
      .eq('id', u.id)

    if (updateError) {
      setEditErr(updateError.message)
      setEditBusy(false)
      return
    }

    // 2. Update pending_registrations if existing
    if (u.email) {
      const regUpdates = {
        name:       editName.trim(),
        email:      editEmail.trim(),
        role:       editRole,
        branch_ids: needsBranch ? editBranches : [],
        can_edit:   finalCanEdit,
      }
      if (editPassword.trim()) {
        regUpdates.password = editPassword.trim()
      }
      await supabase
        .from('pending_registrations')
        .update(regUpdates)
        .eq('email', u.email)
    }

    // 3. Update auth user credentials (password/email/name) via RPC if available
    if (u.auth_id && (editPassword.trim() || editEmail.trim() !== u.email || editName.trim() !== u.name)) {
      try {
        await supabase.rpc('admin_update_user', {
          target_user_id: u.auth_id,
          new_email:    editEmail.trim() !== u.email ? editEmail.trim() : null,
          new_password: editPassword.trim() ? editPassword.trim() : null,
          new_name:     editName.trim() !== u.name ? editName.trim() : null,
        })
      } catch (rpcErr) {
        console.warn('admin_update_user RPC skipped or unavailable:', rpcErr)
      }
    }

    await loadAppUsers()
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
      can_edit:    form.can_edit,
      is_active:   true,
      is_approved: true,
    })
    if (error) { setErr(error.message); setBusy(false); return }

    await loadAppUsers()
    setForm({ name:'', email:'', password:'', role:'service_manager', branch_ids:[], can_edit: true })
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
      <div className="modal" style={{ maxWidth: 700, width: '100%' }}>
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
            <div className="full">
              <label className="fld">Access permission</label>
              <AccessToggle value={form.can_edit} onChange={v => set('can_edit', v)} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {form.can_edit
                  ? 'User can create, edit, and update job tickets.'
                  : 'User can only view the schedule (View Only). No editing allowed.'}
              </div>
            </div>
            {needsBranch && (
              <div className="full">
                <label className="fld">
                  Assigned branches
                  {form.branch_ids.length > 0 && (
                    <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--senior)' }}>
                      ({branches.length > 0 && branches.every(b => form.branch_ids.includes(b.id)) ? `All ${branches.length}` : `${form.branch_ids.length} of ${branches.length}`} selected)
                    </span>
                  )}
                </label>
                <div className="branch-check" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={branches.length > 0 && branches.every(b => form.branch_ids.includes(b.id))}
                      ref={el => {
                        if (el) {
                          const all = branches.length > 0 && branches.every(b => form.branch_ids.includes(b.id))
                          el.indeterminate = !all && form.branch_ids.length > 0
                        }
                      }}
                      onChange={e => set('branch_ids', e.target.checked ? branches.map(b => b.id) : [])}
                    />
                    Select All
                  </label>
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

          {/* ── Existing users header & filters ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 8px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Existing users ({isFiltered ? `${filteredUsers.length} of ${appUsers.length}` : appUsers.length})
            </div>
            {isFiltered && (
              <button className="btn-link" style={{ fontSize: 12 }} onClick={resetFilters}>
                ✕ Reset filters
              </button>
            )}
          </div>

          {/* ── Search and Filter Controls ── */}
          <div className="user-filter-bar">
            <div className="user-filter-row">
              {/* Search user */}
              <div className="ovl-role-search" style={{ flex: 1, minWidth: 180, margin: 0 }}>
                <span className="ovl-role-search-icon">🔍</span>
                <input
                  className="ovl-role-search-input"
                  placeholder="Filter by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>
                )}
              </div>

              {/* Branch filter */}
              <select
                className="sel"
                style={{ fontSize: 12, padding: '5px 8px', minWidth: 140 }}
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                <option value="__all__">🌐 All Branches Access (Admin/Global)</option>
                <option value="__unassigned__">⚠️ No Branch Assigned</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} · {b.note}</option>
                ))}
              </select>

              {/* Role filter */}
              <select
                className="sel"
                style={{ fontSize: 12, padding: '5px 8px', minWidth: 110 }}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {/* Status / Access filter */}
              <select
                className="sel"
                style={{ fontSize: 12, padding: '5px 8px', minWidth: 110 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="can_edit">Can Edit</option>
                <option value="view_only">View Only</option>
              </select>
            </div>
          </div>

          {appUsers.length === 0 && <div className="empty-note">No users yet.</div>}
          {appUsers.length > 0 && filteredUsers.length === 0 && (
            <div className="empty-note">
              No users matching your filters.
              <br />
              <button className="btn-link" style={{ marginTop: 6 }} onClick={resetFilters}>Clear all filters</button>
            </div>
          )}

          {filteredUsers.map(u => {
            const isEditing   = editId === u.id
            const isActive    = u.is_active ?? true
            const canEdit     = u.can_edit !== false
            const uBranches   = u.branch_ids || []
            const isAllBranch = branches.length > 0 && branches.every(b => uBranches.includes(b.id))

            return (
              <div key={u.id} className={`user-mgmt-card${!isActive ? ' inactive' : ''}`}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="pname">{u.name}</span>
                      <span className={`role-tag ${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
                      {u.role !== 'admin' && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                          background: canEdit ? '#e8f5e9' : '#fff3e0',
                          color:      canEdit ? '#2e7d32' : '#e65100',
                        }}>
                          {canEdit ? '✏️ Can Edit' : '👁 View Only'}
                        </span>
                      )}
                      {!isActive && <span className="role-tag" style={{ background: 'var(--st-fail)', color: '#fff' }}>Inactive</span>}
                    </div>
                    <div className="pmeta">{u.email}</div>

                    {/* Enhanced Branch display */}
                    <div className="user-branch-row">
                      {u.role === 'admin' ? (
                        <span className="user-branch-badge all" title="Administrator has full access to all branches">
                          🌐 All Branches (Admin)
                        </span>
                      ) : isAllBranch ? (
                        <span className="user-branch-badge all" title={`Assigned to all ${branches.length} branches`}>
                          🌐 All Branches ({branches.length})
                        </span>
                      ) : uBranches.length === 0 ? (
                        <span className="user-branch-badge none" title="No branch assigned to this user">
                          ⚠️ No branch assigned
                        </span>
                      ) : (
                        <>
                          <span className="user-branch-label">Branches ({uBranches.length}):</span>
                          <div className="user-branch-chips">
                            {uBranches.map(id => {
                              const b = branches.find(x => x.id === id)
                              const name = b ? b.name : id
                              const note = b?.note ? ` · ${b.note}` : ''
                              return (
                                <span key={id} className="user-branch-badge" title={`${name}${note}`}>
                                  {name}
                                </span>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button className="btn sm" onClick={() => startEdit(u)} title="Edit role / access / branches">✎ Edit</button>
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
                    <div style={{ fontWeight: 650, fontSize: 12, color: 'var(--senior)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Edit User Details
                    </div>
                    <div className="grid2" style={{ gap: 10 }}>
                      <div>
                        <label className="fld">Full name <span className="req">*</span></label>
                        <input
                          type="text"
                          className="txt"
                          placeholder="e.g. Grace Villanueva"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="fld">Email address <span className="req">*</span></label>
                        <input
                          type="email"
                          className="txt"
                          placeholder="grace@esprint.com"
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="fld">New password (optional)</label>
                        <input
                          type="text"
                          className="txt"
                          placeholder="leave blank to keep current"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                        />
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                          Leave empty if not changing password.
                        </div>
                      </div>
                      <div>
                        <label className="fld">Access level</label>
                        <select className="sel" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      {editRole !== 'admin' ? (
                        <div className="full">
                          <label className="fld">Access permission</label>
                          <AccessToggle value={editCanEdit} onChange={setEditCanEdit} />
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            {editCanEdit
                              ? 'Can create, edit, & update jobs'
                              : 'View Only (no editing allowed)'}
                          </div>
                        </div>
                      ) : null}
                      {(editRole === 'service_manager' || editRole === 'branch') && (
                        <div className="full">
                          <label className="fld">
                            Assigned branches
                            {editBranches.length > 0 && (
                              <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--senior)' }}>
                                ({branches.length > 0 && branches.every(b => editBranches.includes(b.id)) ? `All ${branches.length}` : `${editBranches.length} of ${branches.length}`} selected)
                              </span>
                            )}
                          </label>
                          <div className="branch-check" style={{ maxHeight: 120, overflowY: 'auto' }}>
                            <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={branches.length > 0 && branches.every(b => editBranches.includes(b.id))}
                                ref={el => {
                                  if (el) {
                                    const all = branches.length > 0 && branches.every(b => editBranches.includes(b.id))
                                    el.indeterminate = !all && editBranches.length > 0
                                  }
                                }}
                                onChange={e => setEditBranches(e.target.checked ? branches.map(b => b.id) : [])}
                              />
                              Select All
                            </label>
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
                    {editErr && <div className="login-err" style={{ textAlign:'left', marginTop: 8 }}>{editErr}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
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
