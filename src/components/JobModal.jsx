import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'

const EMPTY = { jt_no:'', staff_id:'', branch_id:'', customer:'', location:'', type:'', type_other:'', status:'pending', status_note:'' }

export default function JobModal({ payload, onClose }) {
  const { branches, staff, loadJobs, isAdmin, currentUser, visibleStaff } = useApp()
  const isEdit = !!payload.job
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  useEffect(() => {
    if (isEdit) {
      const j = payload.job
      setForm({
        jt_no:       j.jt_no       || '',
        staff_id:    j.staff_id    || '',
        branch_id:   j.branch_id   || '',
        customer:    j.customer    || '',
        location:    j.location    || '',
        type:        j.type        || '',
        type_other:  j.type_other  || '',
        status:      j.status      || 'pending',
        status_note: j.status_note || '',
      })
    } else {
      setForm({ ...EMPTY, branch_id: currentUser?.branch_ids?.[0] || '' })
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    if (!form.jt_no.trim())    return 'JT No. is required.'
    if (!form.staff_id)        return 'Employee is required.'
    if (!form.branch_id)       return 'Branch is required.'
    if (!form.customer.trim()) return 'Customer name is required.'
    if (!form.type)            return 'Type is required.'
    if (form.type === 'others' && !form.type_other.trim()) return 'Describe the service.'
    if ((form.status === 'fail' || form.status === 'ongoing') && !form.status_note.trim())
      return 'Please provide a reason / note.'
    return null
  }

  async function handleSave() {
    const e = validate(); if (e) { setErr(e); return }
    setBusy(true); setErr('')
    const row = {
      date:        payload.job?.date || payload.date,
      jt_no:       form.jt_no.trim(),
      staff_id:    form.staff_id,
      branch_id:   form.branch_id,
      customer:    form.customer.trim(),
      location:    form.location.trim(),
      type:        form.type,
      type_other:  form.type === 'others' ? form.type_other.trim() : '',
      status:      form.status,
      status_note: (form.status === 'fail' || form.status === 'ongoing') ? form.status_note.trim() : '',
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
    if (!confirm('Delete this job ticket?')) return
    setBusy(true)
    await supabase.from('jobs').delete().eq('id', payload.job.id)
    await loadJobs()
    onClose()
  }

  const staffList = visibleStaff()
  const showStatusNote = form.status === 'fail' || form.status === 'ongoing'

  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Job Ticket' : 'New Job Ticket'}</h3>
          <div className="spacer" />
        </div>
        <div className="modal-body">
          <div className="grid2">
            <div>
              <label className="fld">Date</label>
              <input type="text" className="txt" value={payload.job?.date || payload.date} disabled />
            </div>
            <div>
              <label className="fld">JT No. <span className="req">*</span></label>
              <input type="text" className="txt" placeholder="e.g. JT-1050"
                value={form.jt_no} onChange={e => set('jt_no', e.target.value)} />
            </div>
            <div>
              <label className="fld">Employee <span className="req">*</span></label>
              <select className="sel" value={form.staff_id} onChange={e => set('staff_id', e.target.value)}>
                <option value="">Select…</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="fld">Branch serviced <span className="req">*</span></label>
              <select className="sel" value={form.branch_id} onChange={e => set('branch_id', e.target.value)}>
                <option value="">Select…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} · {b.note}</option>)}
              </select>
            </div>
            <div className="full">
              <label className="fld">Customer name <span className="req">*</span></label>
              <input type="text" className="txt" placeholder="e.g. National Bookstore"
                value={form.customer} onChange={e => set('customer', e.target.value)} />
            </div>
            <div className="full">
              <label className="fld">Location</label>
              <input type="text" className="txt" placeholder="e.g. 2F, near foodcourt"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="full">
              <label className="fld">Type <span className="req">*</span></label>
              <div className="seg-radio">
                {['installation','onsite','hotline','others'].map(t => (
                  <button key={t} type="button" data-v={t}
                    className={form.type === t ? 'active' : ''}
                    onClick={() => set('type', t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {form.type === 'others' && (
              <div className="full">
                <label className="fld">Describe the service <span className="req">*</span></label>
                <input type="text" className="txt" placeholder="e.g. Preventive maintenance…"
                  value={form.type_other} onChange={e => set('type_other', e.target.value)} />
              </div>
            )}
            <div className="full">
              <label className="fld">Status</label>
              <div className="seg-radio status" style={{ flexWrap:'wrap' }}>
                {['pending','ongoing','success','fail'].map(s => (
                  <button key={s} type="button" data-v={s}
                    className={form.status === s ? 'active' : ''}
                    onClick={() => set('status', s)}>
                    {s === 'pending' ? '⏳ Pending' : s === 'ongoing' ? '◐ Ongoing' : s === 'success' ? '✓ Successful' : '✕ Not successful'}
                  </button>
                ))}
              </div>
            </div>
            {showStatusNote && (
              <div className="full">
                <label className="fld">{form.status === 'fail' ? 'Reason for failure' : 'Ongoing note'} <span className="req">*</span></label>
                <input type="text" className="txt" placeholder="Enter note…"
                  value={form.status_note} onChange={e => set('status_note', e.target.value)} />
              </div>
            )}
          </div>
          {err && <div className="login-err" style={{ textAlign:'left', marginTop:8 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          {isEdit && <button className="btn danger" style={{ marginRight:'auto' }} onClick={handleDelete} disabled={busy}>Delete</button>}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save Job Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
