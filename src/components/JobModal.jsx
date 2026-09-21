import { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { TYPE_KEYS, ABSENCE_KEYS, TYPES, namesMatch } from '../lib/constants'
import { extractHrefFromHtml, cleanNetsuiteUrl } from '../lib/netsuite'
import ConfirmModal from './ConfirmModal'

const EMPTY = { jt_no:'', jt_url:'', staff_id:'', branch_id:'', customer:'', location:'', machine:'', serial_no:'', type:'', type_other:'', status:'pending', status_note:'' }

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
      <button
        type="button"
        className={`bp-trigger sp-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span className="sp-avatar">
            {current ? current.name.charAt(0).toUpperCase() : '👤'}
          </span>
          <span className="sp-name" style={{ color: current ? 'var(--ink-1)' : 'var(--muted)' }}>
            {current ? current.name : 'Select employee…'}
          </span>
        </div>
        <span className="bp-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bp-dropdown sp-dropdown">
          <div className="bp-search-row">
            <span className="bp-search-icon">🔍</span>
            <input
              className="bp-search"
              autoFocus
              placeholder="Search employee by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>}
          </div>
          <div className="bp-list">
            <div className={`bp-item${!value ? ' active' : ''}`} onClick={() => pick('')}>
              <span className="sp-name" style={{ color: 'var(--muted)' }}>— Clear Selection —</span>
            </div>
            {filtered.length === 0
              ? <div className="bp-empty">No matching employees</div>
              : filtered.map(s => (
                <div
                  key={s.id}
                  className={`bp-item${s.id === value ? ' active' : ''}`}
                  onClick={() => pick(s.id)}
                >
                  <span className="sp-avatar-sm">{s.name.charAt(0).toUpperCase()}</span>
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
  const { branches, staff, appUsers, loadJobs, loadStaff, isAdmin, currentUser, canEditBranch } = useApp()
  const isEdit = !!payload.job
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUrlField, setShowUrlField] = useState(false)

  // Check if current user has edit permission for this job
  const canEditJob = isEdit
    ? (isAdmin || canEditBranch(payload.job?.branch_id))
    : (isAdmin || canEditBranch())

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
        jt_url:      j.jt_url      || '',
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
    if (form.type === 'others' && !form.type_other.trim()) return 'Please describe the service.'
    if ((form.status === 'fail' || form.status === 'ongoing') && !form.status_note.trim())
      return form.status === 'fail' ? 'Please provide the reason for failure.' : 'Please provide an ongoing note.'
    return null
  }

  async function resolveValidStaffId(selectedStaffId) {
    if (!selectedStaffId) return null

    // 1. Check if selectedStaffId already exists in staff table
    const inStaff = (staff || []).find(s => s.id === selectedStaffId)
    if (inStaff) return inStaff.id

    // 2. Check if employee exists in staffList or appUsers
    const emp = (staffList || []).find(s => s.id === selectedStaffId) || (appUsers || []).find(u => u.id === selectedStaffId)
    if (!emp) return selectedStaffId

    // 3. Check if there is already a staff record matching the name
    const matchByName = (staff || []).find(s => s.name?.trim().toLowerCase() === emp.name?.trim().toLowerCase())
    if (matchByName) return matchByName.id

    // 4. Auto-insert to `staff` table so foreign key constraint succeeds
    let mappedRole = 'junior'
    const r = (emp.role || '').toLowerCase()
    if (r.includes('senior') || r === 'senior_fse') mappedRole = 'senior'
    else if (r.includes('trainee') || r === 'trainee') mappedRole = 'trainee'
    else if (r.includes('manager') || r === 'service_manager') mappedRole = 'manager'
    else if (r.includes('bsm')) mappedRole = 'bsm'

    const homeBranch = emp.home_branch_id || emp.main_branch_id || (emp.branch_ids && emp.branch_ids[0]) || form.branch_id || null

    const { data: newStaff, error: staffInsertErr } = await supabase
      .from('staff')
      .insert({
        name: emp.name.trim(),
        role: mappedRole,
        home_branch_id: homeBranch,
        hotline: false,
      })
      .select('id')
      .single()

    if (!staffInsertErr && newStaff?.id) {
      if (loadStaff) await loadStaff()
      return newStaff.id
    }

    return selectedStaffId
  }

  async function handleSave() {
    if (!canEditJob) return
    const e = validate(); if (e) { setErr(e); return }
    setBusy(true); setErr('')

    const validStaffId = await resolveValidStaffId(form.staff_id)

    const row = {
      date:        payload.job?.date || payload.date,
      jt_no:       isAbsence ? '' : form.jt_no.trim(),
      jt_url:      isAbsence ? '' : cleanNetsuiteUrl(form.jt_url),
      staff_id:    validStaffId,
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

  async function handleConfirmDelete() {
    if (!canEditJob || !payload.job?.id) return
    setBusy(true)
    const { error } = await supabase.from('jobs').delete().eq('id', payload.job.id)
    if (error) {
      setErr(error.message)
      setBusy(false)
      setShowDeleteConfirm(false)
      return
    }
    await loadJobs()
    setShowDeleteConfirm(false)
    onClose()
  }

  // Combined staff list: all existing staff + app users (merged without duplicates)
  const staffList = useMemo(() => {
    let list = [...(staff || [])]

    ;(appUsers || []).forEach(u => {
      if (!u.name || u.email?.toLowerCase().includes('eileen')) return
      const uNorm = u.name.trim().toLowerCase()
      const alreadyExists = list.some(s => {
        const sNorm = s.name.trim().toLowerCase()
        return sNorm === uNorm || sNorm.includes(uNorm) || uNorm.includes(sNorm)
      })
      if (!alreadyExists) {
        list.push({
          id: u.id,
          name: u.name,
          role: u.role || 'junior',
          home_branch_id: u.main_branch_id || u.branch_ids?.[0] || '',
        })
      }
    })

    if (!isAdmin) {
      list = list.filter(s => {
        const r = (s.role || '').toLowerCase()
        if (r === 'coordinator' || r === 'service_coordinator') return false
        const matchedUser = appUsers?.find(u => namesMatch(u.name, s.name))
        if (matchedUser && (matchedUser.role === 'coordinator' || matchedUser.role === 'service_coordinator')) return false
        return true
      })
    }

    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [staff, appUsers, isAdmin])

  const handleStaffChange = (staffId) => {
    if (!canEditJob) return
    if (!staffId) {
      setForm(f => ({ ...f, staff_id: '' }))
      return
    }

    const staffMember = staffList.find(s => s.id === staffId) || (staff || []).find(s => s.id === staffId)
    const matchingAppUser = (appUsers || []).find(u =>
      u.id === staffId ||
      (staffMember?.name && u.name?.trim().toLowerCase() === staffMember.name.trim().toLowerCase())
    )

    const homeBranch =
      staffMember?.home_branch_id ||
      staffMember?.main_branch_id ||
      matchingAppUser?.main_branch_id ||
      matchingAppUser?.branch_ids?.[0]

    setForm(f => {
      const branchExists = homeBranch && branches.some(b => b.id === homeBranch)
      return {
        ...f,
        staff_id: staffId,
        ...(branchExists ? { branch_id: homeBranch } : {})
      }
    })
  }

  const displayedBranches = useMemo(() => {
    if (!form.branch_id) return availableBranches
    if (availableBranches.some(b => b.id === form.branch_id)) return availableBranches
    const extraBranch = branches.find(b => b.id === form.branch_id)
    return extraBranch ? [...availableBranches, extraBranch] : availableBranches
  }, [availableBranches, branches, form.branch_id])

  const showStatusNote = form.status === 'fail' || form.status === 'ongoing'
  const currentBranchObj = branches.find(b => b.id === (form.branch_id || payload.job?.branch_id))
  const assignedStaffObj = staffList.find(s => s.id === form.staff_id)
  const jobDateFormatted = payload.job?.date || payload.date

  return (
    <>
      <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
        <div className="modal job-modal-card">
          <div className="modal-head">
            <div className="job-modal-head-title">
              <span className={`modal-badge-icon ${isAbsence ? 'absence' : 'ticket'}`}>
                {isAbsence ? '🌴' : isEdit ? '📝' : '➕'}
              </span>
              <div>
                <h3>
                  {isAbsence 
                    ? (isEdit ? 'Edit Absence' : 'Mark Absence') 
                    : (isEdit ? (canEditJob ? 'Edit Job Ticket' : 'Job Ticket Details') : 'New Job Ticket')}
                </h3>
                <div className="modal-head-subtitle">
                  <span>📅 {jobDateFormatted}</span>
                  {currentBranchObj && <span>· 🏢 {currentBranchObj.name}</span>}
                </div>
              </div>
              {!canEditJob && (
                <span className="user-branch-badge view" style={{ fontSize: 11, marginLeft: 6 }}>
                  🔒 View Only
                </span>
              )}
            </div>
            <div className="spacer" />
            <button className="btn sm ghost modal-close-btn" onClick={onClose} title="Close">✕</button>
          </div>

          <div className="modal-body job-modal-body">
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
                <div className="input-with-icon">
                  <span className="input-icon">📅</span>
                  <input type="text" className="txt readonly-input" value={jobDateFormatted} disabled />
                </div>
              </div>

              <div>
                <label className="fld">
                  <span>Netsuite# {jtRequired && <span className="req">*</span>}</span>
                  {form.jt_url && (
                    <a
                      href={cleanNetsuiteUrl(form.jt_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ns-link-badge"
                      title={`Open in NetSuite: ${cleanNetsuiteUrl(form.jt_url)}`}
                    >
                      🔗 Open in NetSuite
                    </a>
                  )}
                </label>
                <div className="input-with-icon">
                  <span className="input-icon">🔖</span>
                  <input
                    type="text"
                    className="txt"
                    placeholder="e.g. NS-1050"
                    value={form.jt_no}
                    disabled={!canEditJob}
                    onChange={e => set('jt_no', e.target.value)}
                    onPaste={e => {
                      if (!canEditJob) return
                      const html      = e.clipboardData?.getData('text/html')
                      const plainText = e.clipboardData?.getData('text/plain') || ''

                      // If user pastes a full URL directly into jt_no box
                      if (/^https?:\/\//i.test(plainText.trim()) || /netsuite\.com/i.test(plainText.trim()) || plainText.trim().startsWith('/app/')) {
                        const directUrl = cleanNetsuiteUrl(plainText.trim())
                        setForm(f => ({ ...f, jt_url: directUrl }))
                        return
                      }

                      const url = extractHrefFromHtml(html, plainText.trim())
                      if (url) {
                        setForm(f => ({ ...f, jt_url: cleanNetsuiteUrl(url) }))
                      }
                    }}
                  />
                </div>

                {/* NetSuite URL helper & preview toolbar */}
                {canEditJob && (
                  <div style={{ marginTop: 5, fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    {form.jt_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ color: 'var(--st-success-ink, #059669)', fontWeight: 650, whiteSpace: 'nowrap' }}>✓ Link saved</span>
                        <a
                          href={cleanNetsuiteUrl(form.jt_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--senior)', textDecoration: 'underline', fontWeight: 600, whiteSpace: 'nowrap' }}
                          title={cleanNetsuiteUrl(form.jt_url)}
                        >
                          🔗 Test link
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>Tip: Copying from NetSuite automatically captures link</span>
                    )}
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ padding: '1px 6px', fontSize: 11, whiteSpace: 'nowrap' }}
                      onClick={() => setShowUrlField(v => !v)}
                    >
                      {showUrlField ? '▴ Hide URL' : form.jt_url ? '✎ Edit URL' : '＋ Add URL manually'}
                    </button>
                  </div>
                )}

                {showUrlField && canEditJob && (
                  <div style={{ marginTop: 6, background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                      NetSuite Record URL
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="txt sm"
                        style={{ fontSize: 11.5, flex: 1 }}
                        placeholder="https://system.netsuite.com/app/crm/support/supportcase.nl?id=..."
                        value={form.jt_url}
                        onChange={e => set('jt_url', cleanNetsuiteUrl(e.target.value))}
                      />
                      {form.jt_url && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ color: 'var(--st-fail)', padding: '2px 8px', fontSize: 11 }}
                          onClick={() => set('jt_url', '')}
                          title="Remove URL"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="fld">Employee <span className="req">*</span></label>
                {canEditJob ? (
                  <StaffPicker
                    staffList={staffList}
                    value={form.staff_id}
                    onChange={handleStaffChange}
                  />
                ) : (
                  <input
                    type="text"
                    className="txt"
                    value={assignedStaffObj?.name || '—'}
                    disabled
                  />
                )}
              </div>

              <div>
                <label className="fld">Branch Serviced <span className="req">*</span></label>
                <select
                  className="sel"
                  value={form.branch_id}
                  disabled={!canEditJob}
                  onChange={e => set('branch_id', e.target.value)}
                >
                  <option value="">Select Branch…</option>
                  {displayedBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} · {b.note}</option>
                  ))}
                </select>
              </div>

              {!isAbsence && (
                <>
                  <div className="full">
                    <label className="fld">Customer Name {customerRequired && <span className="req">*</span>}</label>
                    <div className="input-with-icon">
                      <span className="input-icon">🏢</span>
                      <input
                        type="text"
                        className="txt"
                        placeholder="e.g. National Bookstore / SM Store"
                        value={form.customer}
                        disabled={!canEditJob}
                        onChange={e => set('customer', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="full">
                    <label className="fld">Location / Department</label>
                    <div className="input-with-icon">
                      <span className="input-icon">📍</span>
                      <input
                        type="text"
                        className="txt"
                        placeholder="e.g. 2F, Near Admin Office"
                        value={form.location}
                        disabled={!canEditJob}
                        onChange={e => set('location', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="fld">Machine Model</label>
                    <div className="input-with-icon">
                      <span className="input-icon">🖨️</span>
                      <input
                        type="text"
                        className="txt"
                        placeholder="e.g. Epson L3210 / WF-C579R"
                        value={form.machine}
                        disabled={!canEditJob}
                        onChange={e => set('machine', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="fld">Serial Number</label>
                    <div className="input-with-icon">
                      <span className="input-icon">🔢</span>
                      <input
                        type="text"
                        className="txt"
                        placeholder="e.g. X4Y123456"
                        value={form.serial_no}
                        disabled={!canEditJob}
                        onChange={e => set('serial_no', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="full">
                <label className="fld">Job Type <span className="req">*</span></label>
                <div className="seg-radio enhanced-seg">
                  {TYPE_KEYS.map(t => (
                    <button
                      key={t}
                      type="button"
                      data-v={t}
                      disabled={!canEditJob}
                      className={form.type === t ? 'active' : ''}
                      onClick={() => set('type', t)}
                    >
                      <span className="seg-btn-icon">
                        {t === 'installation' && '🛠️'}
                        {t === 'onsite' && '🚗'}
                        {t === 'hotline' && '📞'}
                        {t === 'others' && '⚙️'}
                      </span>
                      <span>{TYPES[t].label}</span>
                    </button>
                  ))}
                </div>

                {isAdmin && (
                  <div className="seg-radio absence enhanced-seg" style={{ marginTop: 8 }}>
                    {ABSENCE_KEYS.map(t => (
                      <button
                        key={t}
                        type="button"
                        data-v={t}
                        disabled={!canEditJob}
                        className={form.type === t ? 'active' : ''}
                        onClick={() => set('type', t)}
                      >
                        <span className="seg-btn-icon">{t === 'leave' ? '🌴' : '🚫'}</span>
                        <span>{t === 'leave' ? 'On Leave' : 'Mark Absent'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.type === 'others' && (
                <div className="full">
                  <label className="fld">Describe Service <span className="req">*</span></label>
                  <input
                    type="text"
                    className="txt"
                    placeholder="e.g. Preventive maintenance, network config…"
                    value={form.type_other}
                    disabled={!canEditJob}
                    onChange={e => set('type_other', e.target.value)}
                  />
                </div>
              )}

              {!isAbsence && (
                <div className="full">
                  <label className="fld">Status</label>
                  <div className="seg-radio status enhanced-seg" style={{ flexWrap:'wrap' }}>
                    {['pending','ongoing','success','fail'].map(s => (
                      <button
                        key={s}
                        type="button"
                        data-v={s}
                        disabled={!canEditJob}
                        className={form.status === s ? 'active' : ''}
                        onClick={() => set('status', s)}
                      >
                        <span className="seg-btn-icon">
                          {s === 'pending' && '⏳'}
                          {s === 'ongoing' && '◐'}
                          {s === 'success' && '✓'}
                          {s === 'fail' && '✕'}
                        </span>
                        <span>
                          {s === 'pending' ? 'Pending' : s === 'ongoing' ? 'Ongoing' : s === 'success' ? 'Successful' : 'Not successful'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isAbsence && showStatusNote && (
                <div className="full">
                  <div className={`status-note-container ${form.status === 'fail' ? 'is-fail' : 'is-ongoing'}`}>
                    <label className="fld note-fld">
                      {form.status === 'fail' ? '⚠️ Reason for failure' : '📝 Ongoing note'} <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="txt"
                      placeholder={form.status === 'fail' ? 'e.g. Missing parts, client rescheduled…' : 'e.g. Waiting for parts delivery…'}
                      value={form.status_note}
                      disabled={!canEditJob}
                      onChange={e => set('status_note', e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>

            {err && (
              <div className="modal-alert-err">
                <span>⚠️</span>
                <span>{err}</span>
              </div>
            )}
          </div>

          <div className="modal-foot">
            {isEdit && canEditJob && (
              <button
                type="button"
                className="btn danger-subtle"
                style={{ marginRight: 'auto' }}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Delete Ticket
              </button>
            )}

            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
              {canEditJob ? 'Cancel' : 'Close'}
            </button>

            {canEditJob && (
              <button type="button" className="btn primary" onClick={handleSave} disabled={busy}>
                {busy ? (
                  <>
                    <span className="spinner-dots" /> Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {isAbsence ? 'Save Absence' : 'Save Job Ticket'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sleek Custom Confirm Modal for Delete */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Job Ticket?"
        message="Are you sure you want to permanently delete this job ticket? This action cannot be undone."
        confirmText="Delete Ticket"
        cancelText="Keep Ticket"
        confirmVariant="danger"
        isBusy={busy}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        itemSummary={
          <div className="confirm-ticket-details">
            {form.jt_no && (
              <div className="confirm-detail-row">
                <span className="detail-label">Netsuite#:</span>
                <span className="detail-val font-bold">#{form.jt_no}</span>
              </div>
            )}
            {form.customer && (
              <div className="confirm-detail-row">
                <span className="detail-label">Customer:</span>
                <span className="detail-val">{form.customer}</span>
              </div>
            )}
            <div className="confirm-detail-row">
              <span className="detail-label">Employee:</span>
              <span className="detail-val">{assignedStaffObj?.name || '—'}</span>
            </div>
            <div className="confirm-detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-val">{jobDateFormatted}</span>
            </div>
            {currentBranchObj && (
              <div className="confirm-detail-row">
                <span className="detail-label">Branch:</span>
                <span className="detail-val">{currentBranchObj.name}</span>
              </div>
            )}
          </div>
        }
      />
    </>
  )
}
