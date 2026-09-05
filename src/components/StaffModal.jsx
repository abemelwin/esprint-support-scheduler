import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { ROLES, ROLE_ORDER } from '../lib/constants'

export default function StaffModal({ onClose }) {
  const { staff, branches, loadStaff } = useApp()
  const [form, setForm] = useState({ name:'', role:'junior', home_branch_id:'', hotline: false })
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleAdd() {
    if (!form.name.trim() || !form.home_branch_id) return
    setBusy(true)
    await supabase.from('staff').insert({
      name:           form.name.trim(),
      role:           form.role,
      home_branch_id: form.home_branch_id,
      hotline:        form.hotline,
    })
    await loadStaff()
    setForm({ name:'', role:'junior', home_branch_id:'', hotline: false })
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
              <label className="fld">Name</label>
              <input type="text" className="txt" placeholder="e.g. Juan Dela Cruz"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="fld">Role</label>
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
          <button className="btn primary" style={{ marginTop:10 }} onClick={handleAdd} disabled={busy}>
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
