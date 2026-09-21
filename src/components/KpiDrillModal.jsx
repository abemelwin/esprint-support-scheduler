import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, fmtD, monthName } from '../lib/dates'
import { TYPES, TYPE_KEYS, ROLES, ROLE_ORDER, STATUS, namesMatch } from '../lib/constants'

function AvailableNamesDropdown({ staffList }) {
  const [selected, setSelected] = useState('')

  if (!staffList || staffList.length === 0) {
    return <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>— none —</span>
  }

  return (
    <div style={{ minWidth: 220, maxWidth: 300, display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        className="sel"
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{
          width: '100%',
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'var(--surface-2)',
          cursor: 'pointer',
          fontWeight: selected ? 600 : 500,
        }}
        title="Click to view all available staff"
      >
        <option value="">
          👥 {staffList.length} Available Staff (Click to view)
        </option>
        {staffList.map((s, idx) => (
          <option key={s.id || idx} value={s.id || s.name}>
            {idx + 1}. {s.name} {s.hotline ? '☎ Hotline' : ''}
          </option>
        ))}
      </select>
      {selected && (
        <button
          type="button"
          onClick={() => setSelected('')}
          className="btn ghost sm"
          style={{ padding: '2px 6px', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}
          title="Reset selection"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default function KpiDrillModal({ kind, currentMonth, reportMonth, view, onClose }) {
  const { jobs, staff, appUsers, branches, inScope, scopedBranches, visibleStaff, isAdmin, scopedBranchIds } = useApp()
  const m = view === 'reports' ? reportMonth : currentMonth
  const todayKey = ymd(new Date())
  const todayLbl = fmtD(new Date())
  const branchList = scopedBranches()

  const staffById  = id => staff.find(s => s.id === id)
  const branchById = id => branches.find(b => b.id === id)

  const activeStaffList = (staff || []).filter(s => {
    if (s.name?.toLowerCase().includes('eileen')) return false
    if (!isAdmin) {
      const r = (s.role || '').toLowerCase()
      if (r === 'coordinator' || r === 'service_coordinator') return false
      const matchedUser = appUsers?.find(u => namesMatch(u.name, s.name))
      if (matchedUser && (matchedUser.role === 'coordinator' || matchedUser.role === 'service_coordinator')) return false
    }
    return true
  })

  function getBranchHomedStaff(branchId) {
    return activeStaffList.filter(s => {
      if (!scopedBranchIds) return s.home_branch_id === branchId
      return s.home_branch_id === branchId && scopedBranchIds.includes(s.home_branch_id)
    })
  }

  function monthJobs() {
    return jobs.filter(j => {
      if (!inScope(j)) return false
      const d = new Date(j.date + 'T00:00:00')
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
    })
  }

  let title = '', sub = '', content = null

  if (kind === 'job-today') {
    const todayJobs = jobs.filter(j => inScope(j) && j.date === todayKey)
    title = 'Ongoing Today — per Branch'
    sub   = `${todayLbl} · ${todayJobs.length} job ticket(s)`
    const tot = {}; TYPE_KEYS.forEach(k => tot[k] = 0)
    const rows = branchList.map(b => {
      const bj = todayJobs.filter(j => j.branch_id === b.id); if (!bj.length) return null
      const c = {}; TYPE_KEYS.forEach(k => { c[k] = bj.filter(j => j.type === k).length; tot[k] += c[k] })
      return { b, bj, c }
    }).filter(Boolean)
    content = (
      <table className="rt">
        <thead>
          <tr>
            <th style={{ minWidth: 170, paddingLeft: 18 }}>Branch</th>
            {TYPE_KEYS.map(k => (
              <th key={k} className="num" style={{ minWidth: 70, padding: '9px 10px' }}>{TYPES[k].label}</th>
            ))}
            <th className="num" style={{ minWidth: 54, paddingRight: 18 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={TYPE_KEYS.length + 2} className="empty-note">No tickets today.</td></tr>}
          {rows.map(({ b, bj, c }) => (
            <tr key={b.id}>
              <td style={{ minWidth: 170, paddingLeft: 18 }}>
                <span style={{ fontWeight: 750, color: 'var(--ink-1)' }}>{b.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11.5, marginLeft: 6 }}>· {b.note}</span>
              </td>
              {TYPE_KEYS.map(k => (
                <td key={k} className="num" style={{ padding: '9px 10px' }}>
                  {c[k] > 0 ? <span style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{c[k]}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}
                </td>
              ))}
              <td className="num" style={{ paddingRight: 18 }}>
                <b style={{ color: 'var(--senior)', fontSize: 13 }}>{bj.length}</b>
              </td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="tot">
              <td style={{ paddingLeft: 18 }}><b>ALL BRANCHES</b></td>
              {TYPE_KEYS.map(k => (
                <td key={k} className="num" style={{ padding: '9px 10px' }}>
                  {tot[k] > 0 ? <b>{tot[k]}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}
                </td>
              ))}
              <td className="num" style={{ paddingRight: 18 }}><b style={{ fontSize: 13.5 }}>{todayJobs.length}</b></td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  else if (kind === 'avail-today') {
    const assigned = new Set(jobs.filter(j => inScope(j) && j.date === todayKey).map(j => j.staff_id))
    title = 'Available Today — per Branch'
    let freeCount = 0
    const rows = branchList.map(b => {
      const homed = getBranchHomedStaff(b.id); if (!homed.length) return null
      const free = homed.filter(s => !assigned.has(s.id)); freeCount += free.length
      return { b, homed, free }
    }).filter(Boolean)
    sub = `${todayLbl} · ${freeCount} staff with no task today`
    content = (
      <table className="rt">
        <thead>
          <tr>
            <th style={{ minWidth: 170, paddingLeft: 18 }}>Branch</th>
            <th className="num" style={{ minWidth: 50, padding: '9px 10px' }}>Free</th>
            <th className="num" style={{ minWidth: 65, padding: '9px 10px' }}>Assigned</th>
            <th className="num" style={{ minWidth: 50, padding: '9px 10px' }}>Staff</th>
            <th style={{ minWidth: 240, paddingRight: 18 }}>Available names</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="empty-note">No staff yet.</td></tr>}
          {rows.map(({ b, homed, free }) => (
            <tr key={b.id}>
              <td style={{ minWidth: 170, paddingLeft: 18 }}>
                <span style={{ fontWeight: 750, color: 'var(--ink-1)' }}>{b.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11.5, marginLeft: 6 }}>· {b.note}</span>
              </td>
              <td className="num" style={{ padding: '9px 10px' }}>
                <b style={{ color: free.length > 0 ? 'var(--st-success-ink, #059669)' : 'var(--muted)' }}>{free.length}</b>
              </td>
              <td className="num" style={{ padding: '9px 10px' }}>{homed.length - free.length}</td>
              <td className="num" style={{ padding: '9px 10px' }}><b>{homed.length}</b></td>
              <td style={{ paddingRight: 18 }}><AvailableNamesDropdown staffList={free} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  else if (kind === 'staff') {
    title = 'Total Staff — per Branch'
    const activeRoles = isAdmin ? ROLE_ORDER : ROLE_ORDER.filter(r => r !== 'coordinator')
    const tot = {}; activeRoles.forEach(r => tot[r] = 0); let totH = 0, totAll = 0
    const rows = branchList.map(b => {
      const homed = getBranchHomedStaff(b.id); if (!homed.length) return null
      const c = {}; activeRoles.forEach(r => { c[r] = homed.filter(s => s.role === r).length; tot[r] += c[r] })
      const h = homed.filter(s => s.hotline).length; totH += h; totAll += homed.length
      return { b, homed, c, h }
    }).filter(Boolean)
    sub = `${totAll} staff across ${branchList.length} branch(es)`
    content = (
      <table className="rt">
        <thead>
          <tr>
            <th style={{ minWidth: 170, paddingLeft: 18 }}>Branch</th>
            {activeRoles.map(r => (
              <th key={r} className="num" style={{ minWidth: 56, padding: '9px 10px' }}>
                <span title={ROLES[r].label}>{ROLES[r].short}</span>
              </th>
            ))}
            <th className="num" style={{ minWidth: 44, padding: '9px 10px' }} title="Hotline Team">☎</th>
            <th className="num" style={{ minWidth: 54, paddingRight: 18 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={activeRoles.length + 3} className="empty-note">No staff found.</td></tr>}
          {rows.map(({ b, homed, c, h }) => (
            <tr key={b.id}>
              <td style={{ minWidth: 170, paddingLeft: 18 }}>
                <span style={{ fontWeight: 750, color: 'var(--ink-1)' }}>{b.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 11.5, marginLeft: 6 }}>· {b.note}</span>
              </td>
              {activeRoles.map(r => (
                <td key={r} className="num" style={{ padding: '9px 10px' }}>
                  {c[r] > 0 ? <span style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{c[r]}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}
                </td>
              ))}
              <td className="num" style={{ padding: '9px 10px' }}>
                {h > 0 ? <span style={{ fontWeight: 700, color: '#ec4899' }}>{h}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}
              </td>
              <td className="num" style={{ paddingRight: 18 }}>
                <b style={{ color: 'var(--senior)', fontSize: 13 }}>{homed.length}</b>
              </td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="tot">
              <td style={{ paddingLeft: 18 }}><b>ALL BRANCHES</b></td>
              {activeRoles.map(r => (
                <td key={r} className="num" style={{ padding: '9px 10px' }}>
                  {tot[r] > 0 ? <b>{tot[r]}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}
                </td>
              ))}
              <td className="num" style={{ padding: '9px 10px' }}>
                {totH > 0 ? <b style={{ color: '#ec4899' }}>{totH}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}
              </td>
              <td className="num" style={{ paddingRight: 18 }}><b style={{ fontSize: 13.5 }}>{totAll}</b></td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  else {
    const wantOpen = kind === 'open'
    const mj = monthJobs()
    const filtered = wantOpen ? mj.filter(j => j.status !== 'success') : mj.filter(j => j.status === 'success')
    title = (wantOpen ? 'Not Yet Successful' : 'Successful') + ' — per Branch'
    sub   = `${monthName(m)} · ${filtered.length} job ticket(s)`
    if (wantOpen) {
      let tp=0,to=0,tf=0
      const rows = branchList.map(b => {
        const bj = filtered.filter(j => j.branch_id === b.id); if (!bj.length) return null
        const p=bj.filter(j=>j.status==='pending').length, o=bj.filter(j=>j.status==='ongoing').length, f=bj.filter(j=>j.status==='fail').length
        tp+=p; to+=o; tf+=f
        return { b, bj, p, o, f }
      }).filter(Boolean)
      content = (
        <table className="rt">
          <thead>
            <tr>
              <th style={{ minWidth: 170, paddingLeft: 18 }}>Branch</th>
              <th className="num" style={{ minWidth: 65, padding: '9px 10px' }}>Pending</th>
              <th className="num" style={{ minWidth: 65, padding: '9px 10px' }}>Ongoing</th>
              <th className="num" style={{ minWidth: 90, padding: '9px 10px' }}>Not successful</th>
              <th className="num" style={{ minWidth: 54, paddingRight: 18 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="empty-note">Nothing open. 🎉</td></tr>}
            {rows.map(({ b, bj, p, o, f }) => (
              <tr key={b.id}>
                <td style={{ minWidth: 170, paddingLeft: 18 }}>
                  <span style={{ fontWeight: 750, color: 'var(--ink-1)' }}>{b.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11.5, marginLeft: 6 }}>· {b.note}</span>
                </td>
                <td className="num" style={{ padding: '9px 10px' }}>{p > 0 ? <span style={{ fontWeight: 600 }}>{p}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}</td>
                <td className="num" style={{ padding: '9px 10px' }}>{o > 0 ? <span style={{ fontWeight: 600, color: 'var(--st-ongoing)' }}>{o}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}</td>
                <td className="num" style={{ padding: '9px 10px' }}>{f > 0 ? <span style={{ fontWeight: 600, color: 'var(--st-fail)' }}>{f}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}</td>
                <td className="num" style={{ paddingRight: 18 }}><b>{bj.length}</b></td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="tot">
                <td style={{ paddingLeft: 18 }}><b>ALL BRANCHES</b></td>
                <td className="num" style={{ padding: '9px 10px' }}>{tp > 0 ? <b>{tp}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}</td>
                <td className="num" style={{ padding: '9px 10px' }}>{to > 0 ? <b style={{ color: 'var(--st-ongoing)' }}>{to}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}</td>
                <td className="num" style={{ padding: '9px 10px' }}>{tf > 0 ? <b style={{ color: 'var(--st-fail)' }}>{tf}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}</td>
                <td className="num" style={{ paddingRight: 18 }}><b style={{ fontSize: 13.5 }}>{filtered.length}</b></td>
              </tr>
            )}
          </tbody>
        </table>
      )
    } else {
      const tt={}; TYPE_KEYS.forEach(k=>tt[k]=0)
      const rows = branchList.map(b => {
        const bj = filtered.filter(j => j.branch_id === b.id); if (!bj.length) return null
        const c={}; TYPE_KEYS.forEach(k=>{c[k]=bj.filter(j=>j.type===k).length; tt[k]+=c[k]})
        return {b,bj,c}
      }).filter(Boolean)
      content = (
        <table className="rt">
          <thead>
            <tr>
              <th style={{ minWidth: 170, paddingLeft: 18 }}>Branch</th>
              {TYPE_KEYS.map(k => (
                <th key={k} className="num" style={{ minWidth: 70, padding: '9px 10px' }}>{TYPES[k].label}</th>
              ))}
              <th className="num" style={{ minWidth: 54, paddingRight: 18 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={TYPE_KEYS.length + 2} className="empty-note">No successful tickets yet.</td></tr>}
            {rows.map(({ b, bj, c }) => (
              <tr key={b.id}>
                <td style={{ minWidth: 170, paddingLeft: 18 }}>
                  <span style={{ fontWeight: 750, color: 'var(--ink-1)' }}>{b.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11.5, marginLeft: 6 }}>· {b.note}</span>
                </td>
                {TYPE_KEYS.map(k => (
                  <td key={k} className="num" style={{ padding: '9px 10px' }}>
                    {c[k] > 0 ? <span style={{ fontWeight: 600 }}>{c[k]}</span> : <span style={{ color: 'var(--muted)', opacity: 0.35 }}>—</span>}
                  </td>
                ))}
                <td className="num" style={{ paddingRight: 18 }}><b style={{ color: 'var(--st-success-ink, #059669)', fontSize: 13 }}>{bj.length}</b></td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="tot">
                <td style={{ paddingLeft: 18 }}><b>ALL BRANCHES</b></td>
                {TYPE_KEYS.map(k => (
                  <td key={k} className="num" style={{ padding: '9px 10px' }}>
                    {tt[k] > 0 ? <b>{tt[k]}</b> : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>}
                  </td>
                ))}
                <td className="num" style={{ paddingRight: 18 }}><b style={{ fontSize: 13.5 }}>{filtered.length}</b></td>
              </tr>
            )}
          </tbody>
        </table>
      )
    }
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ width:'min(860px,96vw)' }}>
        <div className="modal-head"><h3>{title}</h3><div className="spacer" /></div>
        <div className="modal-body" style={{ padding: '16px 20px 20px' }}>
          <p className="empty-note" style={{ textAlign:'left', padding:'0 0 12px', margin:0, fontSize: 13, color: 'var(--muted)' }}>{sub}</p>
          <div className="rtable-wrap">{content}</div>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}
