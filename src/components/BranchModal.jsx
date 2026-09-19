import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

export default function BranchModal({ onClose }) {
  const { branches, loadBranches } = useApp()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleAdd() {
    if (!name.trim()) return
    setBusy(true)
    await supabase.from('branches').insert({ name: name.trim(), note: note.trim() })
    await loadBranches()
    setName(''); setNote('')
    setBusy(false)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    await supabase.from('branches').delete().eq('id', deleteTarget.id)
    await loadBranches()
    setDeleteTarget(null)
    setBusy(false)
  }

  return (
    <>
      <div className="modal-bg open">
        <div className="modal">
          <div className="modal-head">
            <h3>🏢 Manage Branches</h3>
            <div className="spacer" />
            <button className="btn sm ghost" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <label className="fld">Branch name</label>
            <input
              type="text"
              className="txt"
              placeholder="e.g. SM City Baguio"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <label className="fld" style={{ marginTop: 10 }}>Province / Location (optional)</label>
            <input
              type="text"
              className="txt"
              placeholder="e.g. Benguet / Nueva Ecija"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button className="btn primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={handleAdd} disabled={busy || !name.trim()}>
              ＋ Add branch
            </button>

            <div style={{ marginTop: 16 }}>
              <label className="fld">Active Branches ({branches.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {branches.map(b => (
                  <div key={b.id} className="person" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                    <div>
                      <div className="pname" style={{ fontWeight: 650 }}>{b.name}</div>
                      <div className="pmeta" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.note || 'No location specified'}</div>
                    </div>
                    <button
                      type="button"
                      className="btn sm danger"
                      title={`Remove branch ${b.name}`}
                      onClick={() => setDeleteTarget(b)}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
                {branches.length === 0 && <div className="empty-note">No branches yet.</div>}
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Branch?"
        message={`Are you sure you want to remove branch "${deleteTarget?.name}"? Staff and jobs assigned to this branch may be affected.`}
        confirmText="Remove Branch"
        confirmVariant="danger"
        isBusy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
