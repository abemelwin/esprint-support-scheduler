import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'

const ROLE_LABEL = {
  service_manager: 'Service Manager',
  branch:          'Branch User',
}

export default function RegistrationApprovalModal({ onClose }) {
  const { pendingRegs, branches, loadPendingRegs, loadAppUsers } = useApp()
  const [busy,       setBusy]       = useState(null)   // id being processed
  const [rejectId,   setRejectId]   = useState(null)   // id open for rejection note
  const [rejectNote, setRejectNote] = useState('')
  const [err,        setErr]        = useState('')
  // branch assignment state per pending reg
  const [branchMap, setBranchMap] = useState({})        // { [regId]: string[] }

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

  async function handleApprove(reg) {
    const assignedBranches = getBranchIds(reg.id)
    if ((reg.role === 'service_manager' || reg.role === 'branch') && assignedBranches.length === 0) {
      setErr(`Please assign at least one branch for ${reg.name} before approving.`); return
    }
    setBusy(reg.id); setErr('')

    // 1. Create auth user via signup client (won't disturb admin session)
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
      role:        reg.role,
      branch_ids:  assignedBranches,
      is_active:   true,
      is_approved: true,
    })
    if (insertErr) { setErr(insertErr.message); setBusy(null); return }

    // 3. Mark registration as approved
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
                <div>
                  <div className="reg-name">{reg.name}</div>
                  <div className="reg-meta">
                    {reg.email}
                    <span className={`role-tag ${reg.role}`} style={{ marginLeft: 6 }}>
                      {ROLE_LABEL[reg.role]}
                    </span>
                  </div>
                  <div className="reg-meta" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                    Requested: {new Date(reg.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn sm danger"
                    onClick={() => { setRejectId(reg.id); setRejectNote(''); setErr('') }}
                    disabled={busy === reg.id}
                  >
                    Reject
                  </button>
                  <button
                    className="btn sm primary"
                    onClick={() => handleApprove(reg)}
                    disabled={busy === reg.id}
                  >
                    {busy === reg.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>

              {/* Branch assignment (required before approval) */}
              <div style={{ marginTop: 10 }}>
                <div className="fld" style={{ marginBottom: 4 }}>Assign branches <span className="req">*</span></div>
                <div className="branch-check" style={{ maxHeight: 110, overflowY: 'auto' }}>
                  {branches.map(b => (
                    <label key={b.id}>
                      <input
                        type="checkbox"
                        checked={getBranchIds(reg.id).includes(b.id)}
                        onChange={() => toggleBranch(reg.id, b.id)}
                      />
                      {b.name} · {b.note}
                    </label>
                  ))}
                </div>
              </div>

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
                <div key={reg.id} className="reg-card resolved">
                  <div className="reg-card-top">
                    <div>
                      <div className="reg-name" style={{ opacity: .7 }}>{reg.name}</div>
                      <div className="reg-meta">{reg.email}</div>
                      {reg.note && <div className="reg-meta" style={{ color: 'var(--st-fail)' }}>Note: {reg.note}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`reg-status-badge ${reg.status}`}>
                        {reg.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                      <button className="btn sm ghost" onClick={() => handleDelete(reg.id)}>✕</button>
                    </div>
                  </div>
                </div>
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
