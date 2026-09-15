import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'

const ROLE_LABEL = {
  service_manager: 'Service Manager',
  employee:        'Employee',
  branch:          'Branch User',
}

const ROLE_OPTIONS = [
  { value: 'service_manager', label: 'Service Manager' },
  { value: 'employee',        label: 'Employee' },
  { value: 'branch',          label: 'Branch User' },
]

// ── Branch checklist with Select All ─────────────────────────────────────────
function BranchChecklist({ regId, branches, branchMap, toggleBranch, setAllBranches }) {
  const selected  = branchMap[regId] || []
  const allIds    = branches.map(b => b.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.includes(id))
  const someChecked = !allChecked && selected.length > 0

  function handleSelectAll(e) {
    setAllBranches(regId, e.target.checked ? allIds : [])
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="fld" style={{ marginBottom: 4 }}>
        Assign branches <span className="req">*</span>
      </div>
      <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
        {/* Select All row */}
        <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked }}
            onChange={handleSelectAll}
          />
          Select All
        </label>
        {branches.map(b => (
          <label key={b.id}>
            <input
              type="checkbox"
              checked={selected.includes(b.id)}
              onChange={() => toggleBranch(regId, b.id)}
            />
            {b.name} · {b.note}
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Resolved card with Edit / View mode ──────────────────────────────────────
function ResolvedCard({ reg, branches, onDelete, onSaveEdit }) {
  const [mode,       setMode]       = useState('view')   // 'view' | 'edit'
  const [editRole,   setEditRole]   = useState(reg.role)
  const [editBranches, setEditBranches] = useState(reg.branch_ids || [])
  const [saving,     setSaving]     = useState(false)
  const [saveErr,    setSaveErr]    = useState('')

  const allIds     = branches.map(b => b.id)
  const allChecked = allIds.length > 0 && allIds.every(id => editBranches.includes(id))
  const someChecked = !allChecked && editBranches.length > 0

  function toggleB(id) {
    setEditBranches(cur =>
      cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    )
  }
  function handleSelectAll(e) {
    setEditBranches(e.target.checked ? allIds : [])
  }

  async function handleSave() {
    if (editBranches.length === 0) { setSaveErr('Assign at least one branch.'); return }
    setSaving(true); setSaveErr('')
    await onSaveEdit(reg, editRole, editBranches)
    setSaving(false)
    setMode('view')
  }

  function cancelEdit() {
    setEditRole(reg.role)
    setEditBranches(reg.branch_ids || [])
    setSaveErr('')
    setMode('view')
  }

  return (
    <div className="reg-card resolved">
      <div className="reg-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="reg-name" style={{ opacity: mode === 'view' ? .7 : 1 }}>{reg.name}</div>
          <div className="reg-meta">{reg.email}</div>
          {reg.note && <div className="reg-meta" style={{ color: 'var(--st-fail)' }}>Note: {reg.note}</div>}

          {/* View mode: show assigned role + branches */}
          {mode === 'view' && (
            <div className="reg-meta" style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span className={`role-tag ${reg.role}`}>{ROLE_LABEL[reg.role] || reg.role}</span>
              {(reg.branch_ids || []).length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {(reg.branch_ids || []).map(id => {
                    const b = branches.find(x => x.id === id)
                    return b ? b.name : id
                  }).join(', ')}
                </span>
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
              <button
                className="btn sm"
                title="Edit role & branches"
                onClick={() => setMode('edit')}
              >✏️ Edit</button>
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

      {/* Edit mode fields */}
      {mode === 'edit' && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Role selector */}
          <div>
            <div className="fld" style={{ marginBottom: 4 }}>Role</div>
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

          {/* Branch checklist with Select All */}
          <div>
            <div className="fld" style={{ marginBottom: 4 }}>
              Branches <span className="req">*</span>
            </div>
            <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
              <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={handleSelectAll}
                />
                Select All
              </label>
              {branches.map(b => (
                <label key={b.id}>
                  <input
                    type="checkbox"
                    checked={editBranches.includes(b.id)}
                    onChange={() => toggleB(b.id)}
                  />
                  {b.name} · {b.note}
                </label>
              ))}
            </div>
          </div>

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

  // branch assignment state per pending reg
  const [branchMap, setBranchMap] = useState({})   // { [regId]: string[] }
  // role override per pending reg (in case admin wants to change before approving)
  const [roleMap,   setRoleMap]   = useState({})   // { [regId]: string }

  function getBranchIds(regId) { return branchMap[regId] || [] }

  function toggleBranch(regId, branchId) {
    setBranchMap(m => {
      const cur = m[regId] || []
      return {
        ...m,
        [regId]: cur.includes(branchId)
          ? cur.filter(b => b !== branchId)
          : [...cur, branchId],
      }
    })
  }

  function setAllBranches(regId, ids) {
    setBranchMap(m => ({ ...m, [regId]: ids }))
  }

  function getRole(reg) { return roleMap[reg.id] || reg.role }
  function setRole(regId, role) { setRoleMap(m => ({ ...m, [regId]: role })) }

  async function handleApprove(reg) {
    const assignedBranches = getBranchIds(reg.id)
    const finalRole = getRole(reg)
    if (assignedBranches.length === 0) {
      setErr(`Please assign at least one branch for ${reg.name} before approving.`); return
    }
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

    // 2. Insert into app_users
    const { error: insertErr } = await supabase.from('app_users').insert({
      auth_id:     uid,
      name:        reg.name,
      email:       reg.email,
      role:        finalRole,
      branch_ids:  assignedBranches,
      is_active:   true,
      is_approved: true,
    })
    if (insertErr) { setErr(insertErr.message); setBusy(null); return }

    // 3. Mark as approved
    await supabase.from('pending_registrations').update({ status: 'approved' }).eq('id', reg.id)
    await loadPendingRegs()
    await loadAppUsers()
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

  // Save edits for a resolved registration (updates app_users record)
  async function handleSaveEdit(reg, newRole, newBranchIds) {
    // find the app_user by email and update role + branch_ids
    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole, branch_ids: newBranchIds })
      .eq('email', reg.email)
    if (error) { console.error(error); return }
    await loadAppUsers()
  }

  const pending  = pendingRegs.filter(r => r.status === 'pending')
  const resolved = pendingRegs.filter(r => r.status !== 'pending')

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 640, width: '100%' }}>
        <div className="modal-head">
          <h3>Registration Requests</h3>
          {pending.length > 0 && (
            <span className="reg-badge">{pending.length} pending</span>
          )}
          <div className="spacer" />
        </div>

        <div className="modal-body">
          {err && <div className="login-err" style={{ textAlign: 'left', marginBottom: 10 }}>{err}</div>}

          {/* ── Pending ── */}
          {pending.length === 0 && (
            <div className="empty-note">No pending registration requests.</div>
          )}

          {pending.map(reg => (
            <div key={reg.id} className="reg-card">
              <div className="reg-card-top">
                <div style={{ flex: 1 }}>
                  <div className="reg-name">{reg.name}</div>
                  <div className="reg-meta">
                    {reg.email}
                  </div>
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
                  >{busy === reg.id ? 'Approving…' : 'Approve'}</button>
                </div>
              </div>

              {/* Role selector for this pending reg */}
              <div style={{ marginTop: 10 }}>
                <div className="fld" style={{ marginBottom: 4 }}>Role</div>
                <select
                  className="txt"
                  style={{ padding: '6px 10px', fontSize: 13 }}
                  value={getRole(reg)}
                  onChange={e => setRole(reg.id, e.target.value)}
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Branch assignment with Select All */}
              <BranchChecklist
                regId={reg.id}
                branches={branches}
                branchMap={branchMap}
                toggleBranch={toggleBranch}
                setAllBranches={setAllBranches}
              />

              {/* Rejection note inline */}
              {rejectId === reg.id && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  <input
                    className="txt"
                    placeholder="Reason for rejection…"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn sm danger" onClick={handleReject} disabled={busy === reg.id}>
                    {busy === reg.id ? '…' : 'Confirm'}
                  </button>
                  <button className="btn sm ghost" onClick={() => setRejectId(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}

          {/* ── Resolved ── */}
          {resolved.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '16px 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Resolved
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
