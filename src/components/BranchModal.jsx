import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'

export default function BranchModal({ onClose }) {
  const { branches, loadBranches } = useApp()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setBusy(true)
    await supabase.from('branches').insert({ name: name.trim(), note: note.trim() })
    await loadBranches()
    setName(''); setNote('')
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this branch?')) return
    await supabase.from('branches').delete().eq('id', id)
    await loadBranches()
  }

  return (
    <div className="modal-bg open">
      <div className="modal">
        <div className="modal-head"><h3>Manage Branches</h3><div className="spacer" /></div>
        <div className="modal-body">
          <label className="fld">Branch name</label>
          <input type="text" className="txt" placeholder="e.g. SM City Baguio"
            value={name} onChange={e => setName(e.target.value)} />
          <label className="fld" style={{ marginTop:10 }}>Location / note (optional)</label>
          <input type="text" className="txt" placeholder="e.g. North Luzon"
            value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn primary" style={{ marginTop:12 }} onClick={handleAdd} disabled={busy}>
            ＋ Add branch
          </button>

          <div style={{ marginTop:16 }}>
            {branches.map(b => (
              <div key={b.id} className="person" style={{ justifyContent:'space-between', marginBottom:5 }}>
                <div>
                  <div className="pname">{b.name}</div>
                  <div className="pmeta">{b.note}</div>
                </div>
                <button className="btn sm danger" onClick={() => handleDelete(b.id)}>✕</button>
              </div>
            ))}
            {branches.length === 0 && <div className="empty-note">No branches yet.</div>}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
