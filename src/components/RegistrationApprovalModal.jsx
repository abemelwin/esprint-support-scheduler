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

// ── Branch checklist with Select All ─────────────────────────────────────────
function BranchChecklist({ regId, branches, branchMap, toggleBranch, setAllBranches }) {
  const selected   = branchMap[regId] || []
  const allIds     = branches.map(b => b.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.includes(id))
  const someChecked = !allChecked && selected.length > 0

  return (
    <div style={{ marginTop: 10 }}>
      <div className="fld" style={{ marginBottom: 4 }}>
        Assign branches <span className="req">*</span>
      </div>
      <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
        <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked }}
            onChange={e => setAllBranches(regId, e.target.checked ? allIds : [])}
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
  const [mode,         setMode]         = useState('view')
  const [editRole,     setEditRole]     = useState(reg.role)
  const [editCanEdit,  setEditCanEdit]  = useState(reg.can_edit !== false)  // default true
  const [editBranches, setEditBranches] = useState(reg.branch_ids || [])
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState('')

  const allIds     = branches.map(b => b.id)
  const allChecked = allIds.length > 0 && allIds.every(id => editBranches.includes(id))
  const someChecked = !allChecked && editBranches.length > 0

  function toggleB(id) {
    setEditBranches(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
  }

  async function handleSave() {
    if (editBranches.length === 0) { setSaveErr('Assign at least one branch.'); return }
    setSaving(true); setSaveErr('')
    await onSaveEdit(reg, editRole, editBranches, editCanEdit)
    setSaving(false)
    setMode('view')
  }

  function cancelEdit() {
    setEditRole(reg.role)
    setEditCanEdit(reg.can_edit !== false)
    setEditBranches(reg.branch_ids || [])
    setSaveErr('')
    setMode('view')
  }

  const canEdit = reg.can_edit !== false  // resolved card shows current value

  return (
    <div className="reg-card resolved">
      <div className="reg-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="reg-name" style={{ opacity: mode === 'view' ? .7 : 1 }}>{reg.name}</div>
          <div className="reg-meta">{reg.email}</div>
          {reg.note && <div className="reg-meta" style={{ color: 'var(--st-fail)' }}>Note: {reg.note}</div>}

          {mode === 'view' && (
            <div className="reg-meta" style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              <span className={`role-tag ${reg.role}`}>{ROLE_LABEL[reg.role] || reg.role}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                background: canEdit ? '#e8f5e9' : '#fff3e0',
                color:      canEdit ? '#2e7d32' : '#e65100',
              }}>
                {canEdit ? '✏️ Can Edit' : '👁 View Only'}
              </span>
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

          {/* Access level toggle */}
          <div>
            <div className="fld" style={{ marginBottom: 4 }}>Access type</div>
            <AccessToggle value={editCanEdit} onChange={setEditCanEdit} />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              {editCanEdit
                ? 'User can create, edit, and update job tickets.'
                : 'User can only view the schedule. No editing allowed.'}
            </div>
          </div>

          {/* Branches */}
          <div>
            <div className="fld" style={{ marginBottom: 4 }}>Branches <span className="req">*</span></div>
            <div className="branch-check" style={{ maxHeight: 130, overflowY: 'auto' }}>
              <label style={{ borderBottom: '1px solid var(--border)', marginBottom: 4, paddingBottom: 4, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={e => setEditBranches(e.target.checked ? allIds : [])}
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

  const [branchMap,  setBranchMap]  = useState({})    // { [regId]: string[] }
  const [roleMap,    setRoleMap]    = useState({})    // { [regId]: string }
  const [canEditMap, setCanEditMap] = useState({})    // { [regId]: boolean }

  function getBranchIds(regId) { return branchMap[regId] || [] }
  function toggleBranch(regId, branchId) {
    setBranchMap(m => {
      const cur = m[regId] || []
      return { ...m, [regId]: cur.includes(branchId) ? cur.filter(b => b !== branchId) : [...cur, branchId] }
    })
  }
  function setAllBranches(regId, ids) { setBranchMap(m => ({ ...m, [regId]: ids })) }

  function getRole(reg)    { return roleMap[reg.id]    ?? reg.role }
  function getCanEdit(reg) { return canEditMap[reg.id] ?? true }   // default: Can Edit
  function setRole(id, v)    { setRoleMap(m => ({ ...m, [id]: v })) }
  function setCanEdit(id, v) { setCanEditMap(m => ({ ...m, [id]: v })) }

  async function handleApprove(reg) {
    const assignedBranches = getBranchIds(reg.id)
    if (assignedBranches.length === 0) {
      setErr(`Please assign at least one branch for ${reg.name} before approving.`); return
    }
    const finalRole    = getRole(reg)
    const finalCanEdit = getCanEdit(reg)
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
      can_edit:    finalCanEdit,
      is_active:   true,
      is_approved: true,
    })
    if (insertErr) { setErr(insertErr.message); setBusy(null); return }

    // 3. Mark as approved
    await supabase.from('pending_registrations').update({ status: 'approved', can_edit: finalCanEdit }).eq('id', reg.id)
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

  async function handleSaveEdit(reg, newRole, newBranchIds, newCanEdit) {
    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole, branch_ids: newBranchIds, can_edit: newCanEdit })
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
          {pending.length > 0 && <span className="reg-badge">{pending.length} pending</span>}
          <div className="spacer" />
        </div>

        <div className="modal-body">
          {err && <div className="login-err" style={{ textAlign: 'left', marginBottom: 10 }}>{err}</div>}

          {/* ── Pending ── */}
          {pending.length === 0 && <div className="empty-note">No pending registration requests.</div>}

          {pending.map(reg => (
            <div key={reg.id} className="reg-card">
              <div className="reg-card-top">
                <div style={{ flex: 1 }}>
                  <div className="reg-name">{reg.name}</div>
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
                  >{busy === reg.id ? 'Approving…' : 'Approve'}</button>
                </div>
              </div>

              {/* Role */}
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

              {/* Access type toggle */}
              <div style={{ marginTop: 10 }}>
                <div className="fld" style={{ marginBottom: 4 }}>Access type</div>
                <AccessToggle value={getCanEdit(reg)} onChange={v => setCanEdit(reg.id, v)} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  {getCanEdit(reg)
                    ? 'User can create, edit, and update job tickets.'
                    : 'User can only view the schedule. No editing allowed.'}
                </div>
              </div>

              {/* Branch assignment */}
              <BranchChecklist
                regId={reg.id}
                branches={branches}
                branchMap={branchMap}
                toggleBranch={toggleBranch}
                setAllBranches={setAllBranches}
              />

              {/* Rejection note */}
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
