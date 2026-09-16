import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { ROLES, ROLE_ORDER } from '../lib/constants'

export default function StaffModal({ onClose }) {
  const { staff, branches, appUsers, loadStaff, loadAppUsers } = useApp()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [form, setForm] = useState({ name:'', role:'senior', home_branch_id:'', hotline: false })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  useEffect(() => {
    loadAppUsers()
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleAccountSelect(userId) {
    setSelectedUserId(userId)
    setErr('')
    if (!userId) {
      setForm({ name:'', role:'senior', home_branch_id:'', hotline: false })
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

    const homeBranch = u.branch_ids?.[0] || (branches.length > 0 ? branches[0].id : '')

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
    setForm({ name:'', role:'senior', home_branch_id:'', hotline: false })
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this staff member?')) return
    await supabase.from('staff').delete().eq('id', id)
    await loadStaff()
  }

  const grouped = ROLE_ORDER.reduce((acc, r) => {
    acc[r] = staff.filter(s => s.role === r)
    return acc
  }, {})

  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-head"><h3>Manage Staff</h3><div className="spacer" /></div>
        <div className="modal-body">
          <div className="grid2">
            <div className="full">
              <label className="fld">Existing Account <span className="req">*</span></label>
              <select
                className="sel"
                value={selectedUserId}
                onChange={e => handleAccountSelect(e.target.value)}
              >
                <option value="">-- Select an existing account ({appUsers.length}) --</option>
                {appUsers.map(u => {
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
              <label className="fld">Home branch</label>
              <select className="sel" value={form.home_branch_id} onChange={e => set('home_branch_id', e.target.value)}>
                <option value="">Select…</option>
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
          {err && <div className="login-err" style={{ textAlign:'left', marginTop: 6 }}>{err}</div>}
          <button className="btn primary" style={{ marginTop:10 }} onClick={handleAdd} disabled={busy || !selectedUserId}>
            ＋ Add staff
          </button>

          <div style={{ marginTop:14 }}>
            {ROLE_ORDER.map(r => {
              const grp = grouped[r]; if (!grp.length) return null
              return (
                <div key={r} className="role-group">
                  <h3><span className="swatch" style={{ background: ROLES[r].color }} />{ROLES[r].label} <span className="cnt">{grp.length}</span></h3>
                  {grp.map(s => (
                    <div key={s.id} className="person" style={{ justifyContent:'space-between' }}>
                      <div>
                        <div className="pname">{s.name}</div>
                        <div className="pmeta">{branches.find(b => b.id === s.home_branch_id)?.name || '—'}{s.hotline ? ' · ☎' : ''}</div>
                      </div>
                      <button className="btn sm danger" onClick={() => handleDelete(s.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Done</button></div>
      </div>
    </div>
  )
}
