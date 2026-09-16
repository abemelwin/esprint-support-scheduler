import { useState, useEffect, useRef } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { TYPE_KEYS, ABSENCE_KEYS, TYPES } from '../lib/constants'

const EMPTY = { jt_no:'', staff_id:'', branch_id:'', customer:'', location:'', machine:'', serial_no:'', type:'', type_other:'', status:'pending', status_note:'' }

// ── Searchable staff picker ───────────────────────────────────────────────────
function StaffPicker({ staffList, value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const current  = staffList.find(s => s.id === value)
  const filtered = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(id) { onChange(id); setOpen(false); setSearch('') }

  return (
    <div className="bp-wrap" ref={ref} style={{ width: '100%' }}>
      <button type="button" className="bp-trigger sp-trigger" onClick={() => setOpen(o => !o)}>
        <span className="sp-name">{current ? current.name : 'Select…'}</span>
        <span className="bp-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="bp-dropdown sp-dropdown">
          <div className="bp-search-row">
            <span className="bp-search-icon">🔍</span>
            <input
              className="bp-search"
              autoFocus
              placeholder="Search employee…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>}
          </div>
          <div className="bp-list">
            <div className={`bp-item${!value ? ' active' : ''}`} onClick={() => pick('')}>
              <span className="sp-name" style={{ color: 'var(--muted)' }}>Select…</span>
            </div>
            {filtered.length === 0
              ? <div className="bp-empty">No results</div>
              : filtered.map(s => (
                <div
                  key={s.id}
                  className={`bp-item${s.id === value ? ' active' : ''}`}
                  onClick={() => pick(s.id)}
                >
                  <span className="sp-name">{s.name}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default function JobModal({ payload, onClose }) {
  const { branches, staff, loadJobs, isAdmin, currentUser, visibleStaff, canEditBranch } = useApp()
  const isEdit = !!payload.job
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  // Check if current user has edit permission for this job
  const canEditJob = isEdit
    ? (isAdmin || canEditBranch(payload.job?.branch_id))
    : (isAdmin || canEditBranch())

  const isServiceManager = currentUser?.role === 'service_manager'

  // When creating: only branches user can edit. When viewing: full branch or assigned branches.
  const availableBranches = isAdmin
    ? branches
    : isEdit
      ? branches
      : branches.filter(b => canEditBranch(b.id))

  useEffect(() => {
    if (isEdit) {
      const j = payload.job
      setForm({
        jt_no:       j.jt_no       || '',
        staff_id:    j.staff_id    || '',
        branch_id:   j.branch_id   || '',
        customer:    j.customer    || '',
        location:    j.location    || '',
        machine:     j.machine     || '',
        serial_no:   j.serial_no   || '',
        type:        j.type        || '',
        type_other:  j.type_other  || '',
        status:      j.status      || 'pending',
        status_note: j.status_note || '',
      })
    } else {
      const defaultBranch = currentUser?.main_branch_id || availableBranches[0]?.id || ''
      setForm({ ...EMPTY, branch_id: defaultBranch })
    }
  }, [])

  const set = (k, v) => {
    if (!canEditJob) return
    setForm(f => ({ ...f, [k]: v }))
  }

  // Leave / Absent are "absence" markers, not real work
  const isAbsence        = form.type === 'leave' || form.type === 'absent'
  // JT No. and Customer name are only required for onsite & installation jobs
  const customerRequired = form.type === 'onsite' || form.type === 'installation'
  const jtRequired       = form.type === 'onsite' || form.type === 'installation'

  function validate() {
    if (jtRequired && !form.jt_no.trim())    return 'Netsuite# is required.'
    if (!form.staff_id)        return 'Employee is required.'
    if (!form.branch_id)       return 'Branch is required.'
    if (customerRequired && !form.customer.trim()) return 'Customer name is required.'
    if (!form.type)            return 'Type is required.'
    if (form.type === 'others' && !form.type_other.trim()) return 'Describe the service.'
    if ((form.status === 'fail' || form.status === 'ongoing') && !form.status_note.trim())
      return 'Please provide a reason / note.'
    return null
  }

  async function handleSave() {
    if (!canEditJob) return
    const e = validate(); if (e) { setErr(e); return }
    setBusy(true); setErr('')
    const row = {
      date:        payload.job?.date || payload.date,
      jt_no:       isAbsence ? '' : form.jt_no.trim(),
      staff_id:    form.staff_id,
      branch_id:   form.branch_id,
      customer:    isAbsence ? '' : form.customer.trim(),
      location:    isAbsence ? '' : form.location.trim(),
      machine:     isAbsence ? '' : form.machine.trim(),
      serial_no:   isAbsence ? '' : form.serial_no.trim(),
      type:        form.type,
      type_other:  form.type === 'others' ? form.type_other.trim() : '',
      status:      isAbsence ? 'pending' : form.status,
      status_note: (!isAbsence && (form.status === 'fail' || form.status === 'ongoing')) ? form.status_note.trim() : '',
    }
    let error
    if (isEdit) {
      ;({ error } = await supabase.from('jobs').update(row).eq('id', payload.job.id))
    } else {
      ;({ error } = await supabase.from('jobs').insert(row))
    }
    if (error) { setErr(error.message); setBusy(false); return }
    await loadJobs()
    onClose()
  }

  async function handleDelete() {
    if (!canEditJob) return
    if (!confirm('Delete this job ticket?')) return
    setBusy(true)
    await supabase.from('jobs').delete().eq('id', payload.job.id)
    await loadJobs()
    onClose()
  }

  // Limit staff to those visible in available branches
  const staffList = visibleStaff()
  const showStatusNote = form.status === 'fail' || form.status === 'ongoing'
  const currentBranchObj = branches.find(b => b.id === (form.branch_id || payload.job?.branch_id))

  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3>{isAbsence ? (isEdit ? 'Edit Absence' : 'Mark Absence') : (isEdit ? (canEditJob ? 'Edit Job Ticket' : 'Job Ticket Details') : 'New Job Ticket')}</h3>
            {!canEditJob && (
              <span className="user-branch-badge view" style={{ fontSize: 11 }}>
                🔒 View Only
              </span>
            )}
          </div>
          <div className="spacer" />
          <button className="btn sm ghost" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="modal-body">
          {!canEditJob && (
            <div className="job-view-banner">
              <span>🔒</span>
              <span>
                <strong>Viewing Mode:</strong> You have view-only access to {currentBranchObj ? currentBranchObj.name : 'this branch'}. Changes cannot be saved.
              </span>
            </div>
          )}

          <div className="grid2">
            <div>
              <label className="fld">Date</label>
              <input type="text" className="txt" value={payload.job?.date || payload.date} disabled />
            </div>
            <div>
              <label className="fld">Netsuite# {jtRequired && <span className="req">*</span>}</label>
              <input
                type="text"
                className="txt"
                placeholder="e.g. NS-1050"
                value={form.jt_no}
                disabled={!canEditJob}
                onChange={e => set('jt_no', e.target.value)}
              />
            </div>
            <div>
              <label className="fld">Employee <span className="req">*</span></label>
              {canEditJob ? (
                <StaffPicker
                  staffList={staffList}
                  value={form.staff_id}
                  onChange={v => set('staff_id', v)}
                />
              ) : (
                <input
                  type="text"
                  className="txt"
                  value={staff.find(s => s.id === form.staff_id)?.name || '—'}
                  disabled
                />
              )}
            </div>
            <div>
              <label className="fld">Branch serviced <span className="req">*</span></label>
              <select
                className="sel"
                value={form.branch_id}
                disabled={!canEditJob}
                onChange={e => set('branch_id', e.target.value)}
              >
                <option value="">Select…</option>
                {availableBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} · {b.note}</option>
                ))}
              </select>
            </div>
            {!isAbsence && <>
              <div className="full">
                <label className="fld">Customer name {customerRequired && <span className="req">*</span>}</label>
                <input
                  type="text"
                  className="txt"
                  placeholder="e.g. National Bookstore"
                  value={form.customer}
                  disabled={!canEditJob}
                  onChange={e => set('customer', e.target.value)}
                />
              </div>
              <div className="full">
                <label className="fld">Location</label>
                <input
                  type="text"
                  className="txt"
                  placeholder="e.g. 2F, near foodcourt"
                  value={form.location}
                  disabled={!canEditJob}
                  onChange={e => set('location', e.target.value)}
                />
              </div>
              <div>
                <label className="fld">Machine</label>
                <input
                  type="text"
                  className="txt"
                  placeholder="e.g. Epson L3210"
                  value={form.machine}
                  disabled={!canEditJob}
                  onChange={e => set('machine', e.target.value)}
                />
              </div>
              <div>
                <label className="fld">Serial No.</label>
                <input
                  type="text"
                  className="txt"
                  placeholder="e.g. X4Y123456"
                  value={form.serial_no}
                  disabled={!canEditJob}
                  onChange={e => set('serial_no', e.target.value)}
                />
              </div>
            </>}
            <div className="full">
              <label className="fld">Type <span className="req">*</span></label>
              <div className="seg-radio">
                {TYPE_KEYS.map(t => (
                  <button
                    key={t}
                    type="button"
                    data-v={t}
                    disabled={!canEditJob}
                    className={form.type === t ? 'active' : ''}
                    onClick={() => set('type', t)}
                  >
                    {TYPES[t].label}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <div className="seg-radio absence" style={{ marginTop: 6 }}>
                  {ABSENCE_KEYS.map(t => (
                    <button
                      key={t}
                      type="button"
                      data-v={t}
                      disabled={!canEditJob}
                      className={form.type === t ? 'active' : ''}
                      onClick={() => set('type', t)}
                    >
                      {t === 'leave' ? '🌴 Leave' : '🚫 Absent'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.type === 'others' && (
              <div className="full">
                <label className="fld">Describe the service <span className="req">*</span></label>
                <input
                  type="text"
                  className="txt"
                  placeholder="e.g. Preventive maintenance…"
                  value={form.type_other}
                  disabled={!canEditJob}
                  onChange={e => set('type_other', e.target.value)}
                />
              </div>
            )}
            {!isAbsence && (
              <div className="full">
                <label className="fld">Status</label>
                <div className="seg-radio status" style={{ flexWrap:'wrap' }}>
                  {['pending','ongoing','success','fail'].map(s => (
                    <button
                      key={s}
                      type="button"
                      data-v={s}
                      disabled={!canEditJob}
                      className={form.status === s ? 'active' : ''}
                      onClick={() => set('status', s)}
                    >
                      {s === 'pending' ? '⏳ Pending' : s === 'ongoing' ? '◐ Ongoing' : s === 'success' ? '✓ Successful' : '✕ Not successful'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isAbsence && showStatusNote && (
              <div className="full">
                <label className="fld">{form.status === 'fail' ? 'Reason for failure' : 'Ongoing note'} <span className="req">*</span></label>
                <input
                  type="text"
                  className="txt"
                  placeholder="Enter note…"
                  value={form.status_note}
                  disabled={!canEditJob}
                  onChange={e => set('status_note', e.target.value)}
                />
              </div>
            )}
          </div>
          {err && <div className="login-err" style={{ textAlign:'left', marginTop:8 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          {isEdit && canEditJob && (
            <button className="btn danger" style={{ marginRight:'auto' }} onClick={handleDelete} disabled={busy}>Delete</button>
          )}
          <button className="btn ghost" onClick={onClose}>
            {canEditJob ? 'Cancel' : 'Close'}
          </button>
          {canEditJob && (
            <button className="btn primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Saving…' : isAbsence ? 'Save Absence' : 'Save Job Ticket'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
