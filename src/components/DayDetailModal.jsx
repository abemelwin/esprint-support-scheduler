import { useApp } from '../lib/AppContext'
import { TYPES, STATUS } from '../lib/constants'
import { buildNetsuiteUrl } from '../lib/netsuite'
import { parseYMD } from '../lib/dates'

export default function DayDetailModal({ dateKey, jobs, onClose, onOpenJob, canOpenJobModal }) {
  const { staff, branches } = useApp()

  const staffById  = id => staff.find(s => s.id === id)
  const branchById = id => branches.find(b => b.id === id)

  const date = parseYMD(dateKey)
  const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 'min(560px, 96vw)' }}>
        <div className="modal-head">
          <div>
            <h3 style={{ margin: 0 }}>📅 {label}</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {jobs.length} job ticket{jobs.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="spacer" />
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: '10px 14px' }}>
          {jobs.length === 0 && (
            <div className="empty-note">No job tickets on this day.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {jobs.map(j => {
              const s   = staffById(j.staff_id)
              const b   = branchById(j.branch_id)
              const cls = TYPES[j.type]?.cls || ''
              const isAbsence = j.type === 'leave' || j.type === 'absent'

              return (
                <div
                  key={j.id}
                  className={`day-detail-row jchip ${cls}`}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 9,
                    cursor: canOpenJobModal ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minHeight: 'unset',
                  }}
                  onClick={canOpenJobModal ? () => { onOpenJob({ date: dateKey, job: j }); onClose() } : undefined}
                >
                  {/* Top row: status dot + NS# (linked) + type tag + status pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`st ${STATUS[j.status]?.dot || ''}`} />
                    {j.jt_no && !isAbsence ? (
                      <a
                        className="jn jn-link"
                        href={buildNetsuiteUrl(j.jt_no)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`Open in NetSuite: Case ${j.jt_no}`}
                      >{j.jt_no || '--'}</a>
                    ) : (
                      <span className="jn">{isAbsence ? TYPES[j.type]?.label : (j.jt_no || '—')}</span>
                    )}
                    {!isAbsence && (
                      <span className={`type-tag ${cls}`}>{TYPES[j.type]?.label}</span>
                    )}
                    <span className={`pill ${STATUS[j.status]?.cls || ''}`} style={{ marginLeft: 'auto' }}>
                      {STATUS[j.status]?.label || j.status}
                    </span>
                  </div>

                  {/* Bottom row: employee + branch + customer */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--ink-2)' }}>
                    {s && <span>👤 {s.name}</span>}
                    {b && <span>📍 {b.name}</span>}
                    {j.customer && <span>🏢 {j.customer}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-foot">
          {canOpenJobModal && (
            <button
              className="btn primary sm"
              onClick={() => { onOpenJob({ date: dateKey }); onClose() }}
            >＋ Add Ticket</button>
          )}
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
