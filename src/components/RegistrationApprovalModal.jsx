import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'

const ROLE_LABEL = {
  admin:                  'Admin',
  service_manager:        'Service Manager',
  service_coordinator:    'Service Coordinator',
  field_service_engineer: 'Field Service Engineer',
  branch:                 'Branch User',
}

const ROLE_OPTIONS = [
  { value: 'field_service_engineer', label: 'Field Service Engineer' },
  { value: 'service_coordinator',    label: 'Service Coordinator'     },
  { value: 'service_manager',        label: 'Service Manager'         },
  { value: 'branch',                 label: 'Branch User'             },
  { value: 'admin',                  label: 'Admin'                   },
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

// ── Main modal ────────────────────────────────────────────────────────────────
export default function RegistrationApprovalModal({ onClose }) {
  const { pendingRegs, branches, appUsers, loadPendingRegs, loadAppUsers } = useApp()
  const [busy,       setBusy]       = useState(null)
  const [rejectId,   setRejectId]   = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [err,        setErr]        = useState('')

  // Cleanup any old non-pending rows on mount
  useState(() => {
    supabase.from('pending_registrations').delete().neq('status', 'pending').then(() => {
      loadPendingRegs()
    })
  })

  // Mapping states per pending reg ID
  const [roleMap,         setRoleMap]         = useState({}) // { [regId]: string }
  const [editBranchesMap, setEditBranchesMap] = useState({}) // { [regId]: string[] }
  const [viewBranchesMap, setViewBranchesMap] = useState({}) // { [regId]: string[] }

  function getRole(reg)         { return roleMap[reg.id] || reg.role || 'branch' }
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

    // Check if user already exists in app_users
    const existingAppUser = (appUsers || []).find(
      u => u.email?.trim().toLowerCase() === reg.email?.trim().toLowerCase()
    )

    if (existingAppUser) {
      // 1. User is already in app_users — update their permissions and activate
      const updatePayload = {
        name:            reg.name.trim(),
        role:            finalRole,
        main_branch_id:  finalRole !== 'admin' ? mainBranch : null,
        view_branch_ids: finalRole !== 'admin' ? viewBranches : [],
        branch_ids:      finalRole !== 'admin' ? combinedBranches : [],
        can_edit:        finalCanEdit,
        is_active:       true,
        is_approved:     true,
      }
      const { error: updErr } = await supabase
        .from('app_users')
        .update(updatePayload)
        .eq('id', existingAppUser.id)

      if (updErr && (updErr.message?.includes('main_branch_id') || updErr.message?.includes('view_branch_ids'))) {
        await supabase.from('app_users').update({
          name:        reg.name.trim(),
          role:        finalRole,
          branch_ids:  finalRole !== 'admin' ? combinedBranches : [],
          can_edit:    finalCanEdit,
          is_active:   true,
          is_approved: true,
        }).eq('id', existingAppUser.id)
      }
    } else {
      // 2. User not in app_users yet — create auth account and insert
      let uid = null
      const { data: authData, error: authErr } = await supabaseSignup.auth.signUp({
        email:    reg.email.trim(),
        password: reg.password,
        options:  { emailRedirectTo: undefined, data: { name: reg.name.trim() } },
      })

      if (authErr && !authErr.message?.toLowerCase().includes('already')) {
        setErr(authErr.message)
        setBusy(null)
        return
      }

      uid = authData?.user?.id

      const fullPayload = {
        auth_id:         uid,
        name:            reg.name.trim(),
        email:           reg.email.trim().toLowerCase(),
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
            name:        reg.name.trim(),
            email:       reg.email.trim().toLowerCase(),
            role:        finalRole,
            branch_ids:  finalRole !== 'admin' ? combinedBranches : [],
            can_edit:    finalCanEdit,
            is_active:   true,
            is_approved: true,
          }
          const { error: insertErr2 } = await supabase.from('app_users').insert(fallbackPayload)
          if (insertErr2) insertError = insertErr2
        } else if (insertErr1.message?.toLowerCase().includes('duplicate') || insertErr1.message?.toLowerCase().includes('unique')) {
          // If already existing by email, update it
          await supabase.from('app_users').update({
            name:            reg.name.trim(),
            role:            finalRole,
            main_branch_id:  finalRole !== 'admin' ? mainBranch : null,
            view_branch_ids: finalRole !== 'admin' ? viewBranches : [],
            branch_ids:      finalRole !== 'admin' ? combinedBranches : [],
            can_edit:        finalCanEdit,
            is_active:       true,
            is_approved:     true,
          }).eq('email', reg.email.trim().toLowerCase())
        } else {
          insertError = insertErr1
        }
      }

      if (insertError && !insertError.message?.toLowerCase().includes('duplicate') && !insertError.message?.toLowerCase().includes('unique')) {
        setErr(insertError.message)
        setBusy(null)
        return
      }
    }

    // 3. Remove from pending_registrations once approved
    await supabase.from('pending_registrations').delete().eq('id', reg.id)

    await Promise.all([loadPendingRegs(), loadAppUsers()])
    setBusy(null)
  }

  async function handleReject(id) {
    setBusy(id); setErr('')
    await supabase.from('pending_registrations').delete().eq('id', id)
    await loadPendingRegs()
    setRejectId(null); setRejectNote(''); setBusy(null)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this registration request?')) return
    await supabase.from('pending_registrations').delete().eq('id', id)
    await loadPendingRegs()
  }

  const pending = pendingRegs.filter(r => r.status === 'pending')

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
          {pending.length === 0 && (
            <div className="empty-note" style={{ padding: '36px 16px', fontSize: 13.5 }}>
              ✨ No pending registration requests.
            </div>
          )}

          {pending.map(reg => {
            const currentRole = getRole(reg)
            const editBranches = getEditBranches(reg)
            const viewBranches = getViewBranches(reg)
            const alreadyInUsers = (appUsers || []).some(
              u => u.email?.trim().toLowerCase() === reg.email?.trim().toLowerCase()
            )

            return (
              <div key={reg.id} className="reg-card">
                <div className="reg-card-top">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="reg-name" style={{ fontSize: 15 }}>{reg.name}</span>
                      {alreadyInUsers && (
                        <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                          ✓ In Directory
                        </span>
                      )}
                    </div>
                    <div className="reg-meta">{reg.email}</div>
                    <div className="reg-meta" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                      Requested: {new Date(reg.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      className="btn sm danger"
                      onClick={() => handleReject(reg.id)}
                      disabled={busy === reg.id}
                    >Reject</button>
                    <button
                      className="btn sm primary"
                      onClick={() => handleApprove(reg)}
                      disabled={busy === reg.id}
                    >{busy === reg.id ? 'Approving…' : '✓ Approve & Activate'}</button>
                    <button
                      className="btn sm ghost"
                      onClick={() => handleDelete(reg.id)}
                      disabled={busy === reg.id}
                      title="Delete request"
                    >✕</button>
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
              </div>
            )
          })}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
