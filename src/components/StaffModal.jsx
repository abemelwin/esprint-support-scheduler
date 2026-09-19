import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { ROLES, ROLE_ORDER } from '../lib/constants'
import ConfirmModal from './ConfirmModal'

export default function StaffModal({ onClose }) {
  const { staff, branches, appUsers, loadStaff, loadAppUsers } = useApp()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [form, setForm] = useState({ name: '', role: 'senior', home_branch_id: '', hotline: false })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  // Edit & Delete state
  const [editId,        setEditId]        = useState(null)
  const [editForm,      setEditForm]      = useState({ name: '', role: 'senior', home_branch_id: '', hotline: false })
  const [editBusy,      setEditBusy]      = useState(false)
  const [editErr,       setEditErr]       = useState('')
  const [search,        setSearch]        = useState('')
  const [successMsg,    setSuccessMsg]    = useState('')
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  useEffect(() => {
    loadAppUsers()
  }, [])

  function showSuccess(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3500)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleAccountSelect(userId) {
    setSelectedUserId(userId)
    setErr('')
    if (!userId) {
      setForm({ name: '', role: 'senior', home_branch_id: '', hotline: false })
      return
    }
    const u = appUsers.find(x => x.id === userId)
    if (!u) return

    const alreadyStaff = staff.some(s => s.name.trim().toLowerCase() === u.name.trim().toLowerCase())
    if (alreadyStaff) {
      setErr(`Note: "${u.name}" is already registered as a staff member.`)
    }

    let staffRole = 'senior'
    if (u.role === 'admin' || u.role === 'service_manager') staffRole = 'manager'

    const homeBranch = u.main_branch_id || u.branch_ids?.[0] || (branches.length > 0 ? branches[0].id : '')

    setForm({
      name: u.name,
      role: staffRole,
      home_branch_id: homeBranch,
      hotline: homeBranch === 'b13',
    })
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      setErr('Please select an existing account from the dropdown.')
      return
    }
    if (!form.home_branch_id) {
      setErr('Please assign a home branch.')
      return
    }
    const alreadyStaff = staff.some(s => s.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    if (alreadyStaff) {
      setErr(`"${form.name}" is already in the staff list.`)
      return
    }

    setBusy(true)
    setErr('')
    const { error } = await supabase.from('staff').insert({
      name:           form.name.trim(),
      role:           form.role,
      home_branch_id: form.home_branch_id,
      hotline:        form.hotline,
    })
    if (error) {
      setErr(error.message)
      setBusy(false)
      return
    }
    await loadStaff()
    setSelectedUserId('')
    setForm({ name: '', role: 'senior', home_branch_id: '', hotline: false })
    setBusy(false)
    showSuccess(`✓ Staff member "${form.name.trim()}" added!`)
  }

  function startEdit(s) {
    setEditId(s.id)
    setEditForm({
      name:           s.name || '',
      role:           s.role || 'senior',
      home_branch_id: s.home_branch_id || '',
      hotline:        !!s.hotline,
    })
    setEditErr('')
  }

  function cancelEdit() {
    setEditId(null)
    setEditErr('')
  }

  async function handleSaveEdit(id) {
    if (!editForm.name.trim()) {
      setEditErr('Staff name is required.')
      return
    }
    if (!editForm.home_branch_id) {
      setEditErr('Please assign a home branch.')
      return
    }

    setEditBusy(true)
    setEditErr('')

    const { error } = await supabase
      .from('staff')
      .update({
        name:           editForm.name.trim(),
        role:           editForm.role,
        home_branch_id: editForm.home_branch_id,
        hotline:        editForm.hotline,
      })
      .eq('id', id)

    if (error) {
      setEditErr(error.message)
      setEditBusy(false)
      return
    }

    await loadStaff()
    setEditBusy(false)
    setEditId(null)
    showSuccess(`✓ Staff "${editForm.name.trim()}" updated successfully!`)
  }

  function handleDelete(id, name) {
    setDeleteTarget({ id, name })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    await supabase.from('staff').delete().eq('id', deleteTarget.id)
    await loadStaff()
    setDeleteTarget(null)
    setBusy(false)
    showSuccess(`✓ Staff member removed.`)
  }

  const searchTerm = search.trim().toLowerCase()
  const filteredStaff = staff.filter(s => {
    if (!searchTerm) return true
    const matchName = s.name?.toLowerCase().includes(searchTerm)
    const bName = branches.find(b => b.id === s.home_branch_id)?.name?.toLowerCase() || ''
    const matchBranch = bName.includes(searchTerm)
    return matchName || matchBranch
  })

  const grouped = ROLE_ORDER.reduce((acc, r) => {
    acc[r] = filteredStaff.filter(s => {
      if (r === 'coordinator') return s.role === 'coordinator' || s.role === 'service_coordinator'
      if (r === 'manager') return s.role === 'manager' || s.role === 'service_manager'
      if (r === 'senior') return s.role === 'senior' || s.role === 'senior_fse'
      if (r === 'junior') return s.role === 'junior' || s.role === 'junior_fse' || s.role === 'field_service_engineer'
      return s.role === r
    })
    return acc
  }, {})

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 620, width: '100%' }}>
        <div className="modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Manage Staff Roster</h3>
          <button className="btn sm ghost" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="modal-body" style={{ padding: '16px 18px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          
          {/* Toast Notification */}
          {successMsg && (
            <div className="user-success-toast" style={{ marginBottom: 12 }}>
              <span>{successMsg}</span>
              <button className="btn sm ghost" onClick={() => setSuccessMsg('')} style={{ color: 'inherit', padding: '1px 6px' }}>✕</button>
            </div>
          )}

          {/* Add Staff Section */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-1)', marginBottom: 10 }}>
              ＋ Add Staff from Registered Accounts
            </div>
            <div className="grid2" style={{ gap: 10 }}>
              <div className="full">
                <label className="fld">Existing Account <span className="req">*</span></label>
                <select
                  className="sel"
                  value={selectedUserId}
                  onChange={e => handleAccountSelect(e.target.value)}
                >
                  <option value="">-- Select an account ({appUsers.filter(u => !u.email?.toLowerCase().includes('eileen') && !u.name?.toLowerCase().includes('eileen')).length}) --</option>
                  {appUsers
                    .filter(u => !u.email?.toLowerCase().includes('eileen') && !u.name?.toLowerCase().includes('eileen'))
                    .map(u => {
                      const isAdded = staff.some(s => s.name.trim().toLowerCase() === u.name.trim().toLowerCase())
                      return (
                        <option key={u.id} value={u.id}>
                          {isAdded ? '✓ ' : ''}{u.name} — {u.email} ({u.role})
                        </option>
                      )
                    })}
                </select>
              </div>
              {form.name && (
                <div className="full" style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
                  Selected staff name: <strong style={{ color: 'var(--ink-1)' }}>{form.name}</strong>
                </div>
              )}
              <div>
                <label className="fld">Staff Role</label>
                <select className="sel" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
                </select>
              </div>
              <div>
                <label className="fld">Home branch <span className="req">*</span></label>
                <select className="sel" value={form.home_branch_id} onChange={e => set('home_branch_id', e.target.value)}>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.note}</option>)}
                </select>
              </div>
              <div className="full">
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginTop:2 }}>
                  <input type="checkbox" style={{ width:16, height:16, cursor:'pointer' }}
                    checked={form.hotline} onChange={e => set('hotline', e.target.checked)} />
                  ☎ Hotline team (Manila)
                </label>
              </div>
            </div>
            {err && <div className="login-err" style={{ textAlign:'left', marginTop: 8 }}>{err}</div>}
            <button className="btn primary sm" style={{ marginTop: 10 }} onClick={handleAdd} disabled={busy || !selectedUserId}>
              {busy ? 'Adding…' : '＋ Add staff member'}
            </button>
          </div>

          {/* Roster Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div className="ovl-role-search" style={{ flex: 1, margin: 0 }}>
              <span className="ovl-role-search-icon">🔍</span>
              <input
                className="ovl-role-search-input"
                placeholder="Search staff by name or branch…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Total: {filteredStaff.length} staff
            </div>
          </div>

          {/* Staff List by Role */}
          <div>
            {staff.length === 0 && <div className="empty-note">No staff members added yet.</div>}
            {staff.length > 0 && filteredStaff.length === 0 && (
              <div className="empty-note">No staff matching &quot;{search}&quot;.</div>
            )}

            {ROLE_ORDER.map(r => {
              const grp = grouped[r]
              if (!grp || !grp.length) return null
              return (
                <div key={r} className="role-group" style={{ marginBottom: 16 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
                    <span className="swatch" style={{ background: ROLES[r].color, width: 10, height: 10, borderRadius: 2 }} />
                    <span>{ROLES[r].label}</span>
                    <span className="cnt" style={{ fontSize: 11, background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 8 }}>{grp.length}</span>
                  </h3>
                  {grp.map(s => {
                    const isEditing = editId === s.id
                    const branchObj = branches.find(b => b.id === s.home_branch_id)

                    if (isEditing) {
                      return (
                        <div key={s.id} style={{
                          background: 'var(--surface-2)',
                          border: '1px solid color-mix(in srgb, var(--senior) 50%, var(--border))',
                          borderRadius: 8,
                          padding: '12px 14px',
                          margin: '8px 0',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                          <div style={{ fontWeight: 650, fontSize: 11.5, color: 'var(--senior)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                            Edit Staff Role &amp; Branch
                          </div>
                          <div className="grid2" style={{ gap: 8 }}>
                            <div>
                              <label className="fld">Staff Name <span className="req">*</span></label>
                              <input
                                type="text"
                                className="txt"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="fld">Staff Role</label>
                              <select
                                className="sel"
                                value={editForm.role}
                                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                              >
                                {ROLE_ORDER.map(ro => (
                                  <option key={ro} value={ro}>{ROLES[ro].label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="fld">Home branch <span className="req">*</span></label>
                              <select
                                className="sel"
                                value={editForm.home_branch_id}
                                onChange={e => setEditForm(f => ({ ...f, home_branch_id: e.target.value }))}
                              >
                                <option value="">Select branch…</option>
                                {branches.map(b => (
                                  <option key={b.id} value={b.id}>{b.name} · {b.note}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, cursor:'pointer' }}>
                                <input
                                  type="checkbox"
                                  style={{ width:16, height:16, cursor:'pointer' }}
                                  checked={editForm.hotline}
                                  onChange={e => setEditForm(f => ({ ...f, hotline: e.target.checked }))}
                                />
                                ☎ Hotline team
                              </label>
                            </div>
                          </div>
                          {editErr && <div className="login-err" style={{ textAlign:'left', marginTop: 6 }}>{editErr}</div>}
                          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                            <button className="btn primary sm" onClick={() => handleSaveEdit(s.id)} disabled={editBusy}>
                              {editBusy ? 'Saving…' : '✓ Save changes'}
                            </button>
                            <button className="btn ghost sm" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={s.id} className="person" style={{ justifyContent:'space-between', alignItems: 'center', padding: '8px 12px' }}>
                        <div>
                          <div className="pname" style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                          <div className="pmeta" style={{ fontSize: 11.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>
                              🏢 {branchObj ? `${branchObj.name} (${branchObj.note})` : '—'}
                            </span>
                            {s.hotline && <span style={{ color: '#ec4899', fontWeight: 600 }}>· ☎ Hotline</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          <button className="btn sm" onClick={() => startEdit(s)} title="Edit staff role and branch">✎ Edit</button>
                          <button className="btn sm danger" onClick={() => handleDelete(s.id, s.name)} title="Remove staff">✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Staff Member?"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from staff?`}
        confirmText="Remove Staff"
        confirmVariant="danger"
        isBusy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
