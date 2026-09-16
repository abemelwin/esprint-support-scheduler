import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'

const ROLE_LABEL = {
  admin:           'Admin',
  service_manager: 'Service Manager',
  branch:          'Branch User',
}

const ROLE_OPTIONS = [
  { value: 'service_manager', label: 'Service Manager' },
  { value: 'branch',          label: 'Branch User'     },
  { value: 'admin',           label: 'Admin'           },
]

// ── Segmented Branch Selector (Can Edit vs View Only) ────────────────────────
function BranchAssignmentSection({ branches, editBranches, viewBranches, onToggleEdit, onToggleView, onSelectAllEdit, onSelectAllView }) {
  const [tab, setTab] = useState('edit') // 'edit' | 'view'
  const allIds = branches.map(b => b.id)

  const allEditChecked  = allIds.length > 0 && allIds.every(id => editBranches.includes(id))
  const someEditChecked = !allEditChecked && editBranches.length > 0

  const allViewChecked  = allIds.length > 0 && allIds.every(id => viewBranches.includes(id))
  const someViewChecked = !allViewChecked && viewBranches.length > 0

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, background: 'var(--surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setTab('edit')}
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 650,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'edit' ? '#2e7d32' : 'transparent',
            color: tab === 'edit' ? '#fff' : 'var(--ink-2)',
            boxShadow: tab === 'edit' ? '0 1px 4px rgba(46,125,50,0.3)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>✏️ Can Edit</span>
          <span style={{ fontSize: 11, background: tab === 'edit' ? 'rgba(255,255,255,0.25)' : 'var(--surface-1)', padding: '1px 6px', borderRadius: 99 }}>
            {editBranches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('view')}
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: 12,
            fontWeight: 650,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: tab === 'view' ? 'var(--accent, #2a78d6)' : 'transparent',
            color: tab === 'view' ? '#fff' : 'var(--ink-2)',
            boxShadow: tab === 'view' ? '0 1px 4px rgba(42,120,214,0.3)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>📍 View Only</span>
          <span style={{ fontSize: 11, background: tab === 'view' ? 'rgba(255,255,255,0.25)' : 'var(--surface-1)', padding: '1px 6px', borderRadius: 99 }}>
            {viewBranches.length}
          </span>
        </button>
      </div>

      {tab === 'edit' ? (
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
            Select branches where this user can <strong>create, edit, and update tickets</strong>:
          </div>
          <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
            <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={allEditChecked}
                ref={el => { if (el) el.indeterminate = someEditChecked }}
                onChange={e => onSelectAllEdit(e.target.checked ? allIds : [])}
              />
              Select All (Can Edit)
            </label>
            {branches.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px' }}>
                <input
                  type="checkbox"
                  checked={editBranches.includes(b.id)}
                  onChange={() => onToggleEdit(b.id)}
                />
                <span style={{ fontWeight: editBranches.includes(b.id) ? 600 : 400 }}>
                  {b.name} · {b.note}
                </span>
                {viewBranches.includes(b.id) && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
                    (currently view only)
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
            Select branches this user can <strong>view schedules & reports only</strong> (no editing):
          </div>
          <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
            <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={allViewChecked}
                ref={el => { if (el) el.indeterminate = someViewChecked }}
                onChange={e => onSelectAllView(e.target.checked ? allIds : [])}
              />
              Select All (View Only)
            </label>
            {branches.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px' }}>
                <input
                  type="checkbox"
                  checked={viewBranches.includes(b.id)}
                  onChange={() => onToggleView(b.id)}
                />
                <span style={{ fontWeight: viewBranches.includes(b.id) ? 600 : 400 }}>
                  {b.name} · {b.note}
                </span>
                {editBranches.includes(b.id) && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
                    (currently can edit)
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Resolved card with Edit / View mode ──────────────────────────────────────
function ResolvedCard({ reg, branches, onDelete, onSaveEdit }) {
  const [mode,             setMode]             = useState('view')
  const [editRole,         setEditRole]         = useState(reg.role || 'branch')
  const [editEditBranches, setEditEditBranches] = useState(() => {
    if (reg.can_edit === false) return []
    const viewSet = new Set(reg.view_branch_ids || [])
    return (reg.branch_ids || []).filter(b => !viewSet.has(b))
  })
  const [editViewBranches, setEditViewBranches] = useState(() => {
    if (reg.can_edit === false) return reg.branch_ids || []
    return reg.view_branch_ids || []
  })
  const [saving,           setSaving]           = useState(false)
  const [saveErr,          setSaveErr]          = useState('')

  function toggleEdit(id) {
    setEditEditBranches(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
    setEditViewBranches(cur => cur.filter(x => x !== id))
  }

  function toggleView(id) {
    setEditViewBranches(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
    setEditEditBranches(cur => cur.filter(x => x !== id))
  }

  function selectAllEdit(ids) {
    setEditEditBranches(ids)
    if (ids.length > 0) {
      setEditViewBranches([])
    }
  }

  function selectAllView(ids) {
    setEditViewBranches(ids)
    if (ids.length > 0) {
      setEditEditBranches([])
    }
  }

  async function handleSave() {
    if (editRole !== 'admin' && editEditBranches.length === 0 && editViewBranches.length === 0) {
      setSaveErr('Assign at least one branch.'); return
    }
    setSaving(true); setSaveErr('')
    await onSaveEdit(reg, editRole, editEditBranches, editViewBranches)
    setSaving(false)
    setMode('view')
  }

  function cancelEdit() {
    setEditRole(reg.role || 'branch')
    const viewSet = new Set(reg.view_branch_ids || [])
    setEditEditBranches(reg.can_edit === false ? [] : (reg.branch_ids || []).filter(b => !viewSet.has(b)))
    setEditViewBranches(reg.can_edit === false ? (reg.branch_ids || []) : (reg.view_branch_ids || []))
    setSaveErr('')
    setMode('view')
  }

  const canEdit = reg.can_edit !== false
  const activeEditBranches = canEdit ? (reg.branch_ids || []).filter(b => !(reg.view_branch_ids || []).includes(b)) : []
  const activeViewBranches = canEdit ? (reg.view_branch_ids || []) : (reg.branch_ids || [])

  return (
    <div className="reg-card resolved">
      <div className="reg-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="reg-name" style={{ opacity: mode === 'view' ? .85 : 1 }}>{reg.name}</div>
          <div className="reg-meta">{reg.email}</div>
          {reg.note && <div className="reg-meta" style={{ color: 'var(--st-fail)' }}>Note: {reg.note}</div>}

          {mode === 'view' && (
            <div className="reg-meta" style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                <span className={`role-tag ${reg.role}`}>{ROLE_LABEL[reg.role] || reg.role}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                  background: canEdit ? '#e8f5e9' : '#fff3e0',
                  color:      canEdit ? '#2e7d32' : '#e65100',
                }}>
                  {canEdit ? '✏️ Can Edit' : '🔒 View Only'}
                </span>
                {reg.role === 'admin' && (
                  <span className="user-branch-badge all" style={{ fontSize: 10.5 }}>🌐 All Branches (Admin)</span>
                )}
              </div>

              {reg.role !== 'admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                  {activeEditBranches.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#2e7d32' }}>Can Edit:</span>
                      {activeEditBranches.map(id => {
                        const b = branches.find(x => x.id === id)
                        return (
                          <span key={id} className="user-branch-badge main" style={{ fontSize: 10.5 }}>
                            ✏️ {b ? b.name : id}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {activeViewBranches.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>View Only:</span>
                      {activeViewBranches.map(id => {
                        const b = branches.find(x => x.id === id)
                        return (
                          <span key={id} className="user-branch-badge view" style={{ fontSize: 10.5 }}>
                            📍 {b ? b.name : id}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {activeEditBranches.length === 0 && activeViewBranches.length === 0 && (
                    <span className="user-branch-badge none" style={{ fontSize: 10.5 }}>⚠️ No branches assigned</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexShrink: 0 }}>
          {mode === 'view' && (
            <>
              <span className={`reg-status-badge ${reg.status}`}>
                {reg.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
              </span>
              <button className="btn sm" title="Edit" onClick={() => setMode('edit')}>✏️ Edit</button>
              <button className="btn sm ghost" onClick={() => onDelete(reg.id)}>✕</button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <button className="btn sm primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save'}
              </button>
              <button className="btn sm ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {mode === 'edit' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Role */}
          <div>
            <div className="fld" style={{ marginBottom: 4 }}>Role Designation</div>
            <select
              className="txt"
              style={{ padding: '6px 10px', fontSize: 13 }}
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Branches Section */}
          {editRole !== 'admin' ? (
            <BranchAssignmentSection
              branches={branches}
              editBranches={editEditBranches}
              viewBranches={editViewBranches}
              onToggleEdit={toggleEdit}
              onToggleView={toggleView}
              onSelectAllEdit={selectAllEdit}
              onSelectAllView={selectAllView}
            />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 10%, transparent)', padding: '8px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--senior) 25%, transparent)' }}>
              👑 Admin accounts automatically have full edit access and global management across all branches.
            </div>
          )}

          {saveErr && <div className="login-err" style={{ textAlign: 'left' }}>{saveErr}</div>}
        </div>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function RegistrationApprovalModal({ onClose }) {
  const { pendingRegs, branches, loadPendingRegs, loadAppUsers } = useApp()
  const [busy,       setBusy]       = useState(null)
  const [rejectId,   setRejectId]   = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [err,        setErr]        = useState('')

  // Mapping states per pending reg ID
  const [roleMap,         setRoleMap]         = useState({}) // { [regId]: string }
  const [editBranchesMap, setEditBranchesMap] = useState({}) // { [regId]: string[] }
  const [viewBranchesMap, setViewBranchesMap] = useState({}) // { [regId]: string[] }

  function getRole(reg)         { return roleMap[reg.id] || 'branch' }
  function getEditBranches(reg) { return editBranchesMap[reg.id] || [] }
  function getViewBranches(reg) { return viewBranchesMap[reg.id] || [] }

  function setRole(id, v) { setRoleMap(m => ({ ...m, [id]: v })) }

  function toggleEditBranch(regId, branchId) {
    setEditBranchesMap(m => {
      const cur = m[regId] || []
      const next = cur.includes(branchId) ? cur.filter(b => b !== branchId) : [...cur, branchId]
      return { ...m, [regId]: next }
    })
    setViewBranchesMap(m => {
      const cur = m[regId] || []
      return { ...m, [regId]: cur.filter(b => b !== branchId) }
    })
  }

  function toggleViewBranch(regId, branchId) {
    setViewBranchesMap(m => {
      const cur = m[regId] || []
      const next = cur.includes(branchId) ? cur.filter(b => b !== branchId) : [...cur, branchId]
      return { ...m, [regId]: next }
    })
    setEditBranchesMap(m => {
      const cur = m[regId] || []
      return { ...m, [regId]: cur.filter(b => b !== branchId) }
    })
  }

  function selectAllEditBranches(regId, ids) {
    setEditBranchesMap(m => ({ ...m, [regId]: ids }))
    if (ids.length > 0) {
      setViewBranchesMap(m => ({ ...m, [regId]: [] }))
    }
  }

  function selectAllViewBranches(regId, ids) {
    setViewBranchesMap(m => ({ ...m, [regId]: ids }))
    if (ids.length > 0) {
      setEditBranchesMap(m => ({ ...m, [regId]: [] }))
    }
  }

  async function handleApprove(reg) {
    const finalRole    = getRole(reg)
    const editBranches = getEditBranches(reg)
    const viewBranches = getViewBranches(reg)

    if (finalRole !== 'admin' && editBranches.length === 0 && viewBranches.length === 0) {
      setErr(`Please assign at least one branch for ${reg.name} (Can Edit or View Only) before approving.`); return
    }

    const finalCanEdit = finalRole === 'admin' ? true : (editBranches.length > 0)
    const combinedBranches = Array.from(new Set([...editBranches, ...viewBranches]))
    const mainBranch = editBranches[0] || null

    setBusy(reg.id); setErr('')

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabaseSignup.auth.signUp({
      email:    reg.email,
      password: reg.password,
      options:  { emailRedirectTo: undefined },
    })
    if (authErr) { setErr(authErr.message); setBusy(null); return }

    const uid = authData?.user?.id
    if (!uid) {
      setErr('Could not create auth account. Make sure "Confirm email" is OFF in Supabase Auth settings.')
      setBusy(null); return
    }

    // 2. Insert into app_users with fallback
    const fullPayload = {
      auth_id:         uid,
      name:            reg.name,
      email:           reg.email,
      role:            finalRole,
      main_branch_id:  finalRole !== 'admin' ? mainBranch : null,
      view_branch_ids: finalRole !== 'admin' ? viewBranches : [],
      branch_ids:      finalRole !== 'admin' ? combinedBranches : [],
      can_edit:        finalCanEdit,
      is_active:       true,
      is_approved:     true,
    }

    let insertError = null
    const { error: insertErr1 } = await supabase.from('app_users').insert(fullPayload)
    if (insertErr1) {
      if (insertErr1.message?.includes('main_branch_id') || insertErr1.message?.includes('view_branch_ids')) {
        const fallbackPayload = {
          auth_id:     uid,
          name:        reg.name,
          email:       reg.email,
          role:        finalRole,
          branch_ids:  finalRole !== 'admin' ? combinedBranches : [],
          can_edit:    finalCanEdit,
          is_active:   true,
          is_approved: true,
        }
        const { error: insertErr2 } = await supabase.from('app_users').insert(fallbackPayload)
        if (insertErr2) insertError = insertErr2
      } else {
        insertError = insertErr1
      }
    }

    if (insertError) { setErr(insertError.message); setBusy(null); return }

    // 3. Mark as approved in pending_registrations
    await supabase.from('pending_registrations').update({
      status:     'approved',
      role:       finalRole,
      branch_ids: combinedBranches,
      can_edit:   finalCanEdit,
    }).eq('id', reg.id)

    await Promise.all([loadPendingRegs(), loadAppUsers()])
    setBusy(null)
  }

  async function handleReject() {
    if (!rejectNote.trim()) { setErr('Please enter a reason for rejection.'); return }
    setBusy(rejectId); setErr('')
    await supabase.from('pending_registrations')
      .update({ status: 'rejected', note: rejectNote.trim() })
      .eq('id', rejectId)
    await loadPendingRegs()
    setRejectId(null); setRejectNote(''); setBusy(null)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this registration request permanently?')) return
    await supabase.from('pending_registrations').delete().eq('id', id)
    await loadPendingRegs()
  }

  async function handleSaveEdit(reg, newRole, newEditBranches, newViewBranches) {
    const finalCanEdit = newRole === 'admin' ? true : (newEditBranches.length > 0)
    const combinedBranches = Array.from(new Set([...newEditBranches, ...newViewBranches]))
    const mainBranch = newEditBranches[0] || null

    const fullPayload = {
      role:            newRole,
      main_branch_id:  newRole !== 'admin' ? mainBranch : null,
      view_branch_ids: newRole !== 'admin' ? newViewBranches : [],
      branch_ids:      newRole !== 'admin' ? combinedBranches : [],
      can_edit:        finalCanEdit,
    }

    const { error: err1 } = await supabase
      .from('app_users')
      .update(fullPayload)
      .eq('email', reg.email)

    if (err1 && (err1.message?.includes('main_branch_id') || err1.message?.includes('view_branch_ids'))) {
      await supabase
        .from('app_users')
        .update({
          role:       newRole,
          branch_ids: newRole !== 'admin' ? combinedBranches : [],
          can_edit:   finalCanEdit,
        })
        .eq('email', reg.email)
    }

    await supabase.from('pending_registrations').update({
      role:       newRole,
      branch_ids: combinedBranches,
      can_edit:   finalCanEdit,
    }).eq('id', reg.id)

    await Promise.all([loadPendingRegs(), loadAppUsers()])
  }

  const pending  = pendingRegs.filter(r => r.status === 'pending')
  const resolved = pendingRegs.filter(r => r.status !== 'pending')

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 680, width: '100%' }}>
        <div className="modal-head">
          <div>
            <h3 style={{ margin: 0 }}>Registration Approvals & Designation</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Set user role and branch access permissions (Can Edit vs View Only) upon approval.
            </div>
          </div>
          <div className="spacer" />
          {pending.length > 0 && <span className="reg-badge">{pending.length} pending</span>}
          <button className="btn sm ghost" onClick={onClose} style={{ marginLeft: 8 }}>✕</button>
        </div>

        <div className="modal-body">
          {err && <div className="login-err" style={{ textAlign: 'left', marginBottom: 10 }}>{err}</div>}

          {/* ── Pending ── */}
          {pending.length === 0 && <div className="empty-note">No pending registration requests.</div>}

          {pending.map(reg => {
            const currentRole = getRole(reg)
            const editBranches = getEditBranches(reg)
            const viewBranches = getViewBranches(reg)

            return (
              <div key={reg.id} className="reg-card">
                <div className="reg-card-top">
                  <div style={{ flex: 1 }}>
                    <div className="reg-name" style={{ fontSize: 15 }}>{reg.name}</div>
                    <div className="reg-meta">{reg.email}</div>
                    <div className="reg-meta" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                      Requested: {new Date(reg.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn sm danger"
                      onClick={() => { setRejectId(reg.id); setRejectNote(''); setErr('') }}
                      disabled={busy === reg.id}
                    >Reject</button>
                    <button
                      className="btn sm primary"
                      onClick={() => handleApprove(reg)}
                      disabled={busy === reg.id}
                    >{busy === reg.id ? 'Approving…' : '✓ Approve & Activate'}</button>
                  </div>
                </div>

                {/* Role Designation */}
                <div style={{ marginTop: 12 }}>
                  <div className="fld" style={{ marginBottom: 4 }}>Designated Role <span className="req">*</span></div>
                  <select
                    className="txt"
                    style={{ padding: '6px 10px', fontSize: 13 }}
                    value={currentRole}
                    onChange={e => setRole(reg.id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Branch Designation (Can Edit vs View Only) */}
                {currentRole !== 'admin' ? (
                  <BranchAssignmentSection
                    branches={branches}
                    editBranches={editBranches}
                    viewBranches={viewBranches}
                    onToggleEdit={bId => toggleEditBranch(reg.id, bId)}
                    onToggleView={bId => toggleViewBranch(reg.id, bId)}
                    onSelectAllEdit={ids => selectAllEditBranches(reg.id, ids)}
                    onSelectAllView={ids => selectAllViewBranches(reg.id, ids)}
                  />
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 10%, transparent)', padding: '8px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--senior) 25%, transparent)' }}>
                    👑 Admin accounts automatically have full edit access and global management across all branches.
                  </div>
                )}

                {/* Rejection note */}
                {rejectId === reg.id && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <input
                      className="txt"
                      placeholder="Reason for rejection…"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button className="btn sm danger" onClick={handleReject} disabled={busy === reg.id}>
                      {busy === reg.id ? '…' : 'Confirm'}
                    </button>
                    <button className="btn sm ghost" onClick={() => setRejectId(null)}>Cancel</button>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Resolved ── */}
          {resolved.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '18px 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Resolved / Approved Users ({resolved.length})
              </div>
              {resolved.map(reg => (
                <ResolvedCard
                  key={reg.id}
                  reg={reg}
                  branches={branches}
                  onDelete={handleDelete}
                  onSaveEdit={handleSaveEdit}
                />
              ))}
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
