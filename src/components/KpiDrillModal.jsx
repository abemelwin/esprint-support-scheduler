import { useApp } from '../lib/AppContext'
import { ymd, fmtD, monthName } from '../lib/dates'
import { TYPES, TYPE_KEYS, ROLES, ROLE_ORDER, STATUS } from '../lib/constants'

export default function KpiDrillModal({ kind, currentMonth, reportMonth, view, onClose }) {
  const { jobs, staff, branches, inScope, scopedBranches, visibleStaff } = useApp()
  const m = view === 'reports' ? reportMonth : currentMonth
  const todayKey = ymd(new Date())
  const todayLbl = fmtD(new Date())
  const branchList = scopedBranches()

  const staffById  = id => staff.find(s => s.id === id)
  const branchById = id => branches.find(b => b.id === id)

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
    title = 'Job Tickets Today — per Branch'
    sub   = `${todayLbl} · ${todayJobs.length} job ticket(s)`
    const tot = {}; TYPE_KEYS.forEach(k => tot[k] = 0)
    const rows = branchList.map(b => {
      const bj = todayJobs.filter(j => j.branch_id === b.id); if (!bj.length) return null
      const c = {}; TYPE_KEYS.forEach(k => { c[k] = bj.filter(j => j.type === k).length; tot[k] += c[k] })
      return { b, bj, c }
    }).filter(Boolean)
    content = (
      <table className="rt">
        <thead><tr><th>Branch</th>{TYPE_KEYS.map(k=><th key={k} className="num">{TYPES[k].label}</th>)}<th className="num">Total</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={TYPE_KEYS.length+2} className="empty-note">No tickets today.</td></tr>}
          {rows.map(({ b, bj, c }) => (
            <tr key={b.id}><td>{b.name} <span style={{color:'var(--muted)'}}>{b.note}</span></td>
              {TYPE_KEYS.map(k=><td key={k} className="num">{c[k]||''}</td>)}
              <td className="num"><b>{bj.length}</b></td></tr>
          ))}
          {rows.length > 0 && <tr className="tot"><td>ALL BRANCHES</td>{TYPE_KEYS.map(k=><td key={k} className="num">{tot[k]}</td>)}<td className="num">{todayJobs.length}</td></tr>}
        </tbody>
      </table>
    )
  }

  else if (kind === 'avail-today') {
    const assigned = new Set(jobs.filter(j => inScope(j) && j.date === todayKey).map(j => j.staff_id))
    title = 'Available Today — per Branch'
    let freeCount = 0
    const rows = branchList.map(b => {
      const homed = visibleStaff().filter(s => s.home_branch_id === b.id); if (!homed.length) return null
      const free = homed.filter(s => !assigned.has(s.id)); freeCount += free.length
      return { b, homed, free }
    }).filter(Boolean)
    sub = `${todayLbl} · ${freeCount} staff with no task today`
    content = (
      <table className="rt">
        <thead><tr><th>Branch</th><th className="num">Free</th><th className="num">Assigned</th><th className="num">Staff</th><th>Available names</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="empty-note">No staff yet.</td></tr>}
          {rows.map(({ b, homed, free }) => (
            <tr key={b.id}>
              <td>{b.name} <span style={{color:'var(--muted)'}}>{b.note}</span></td>
              <td className="num"><b>{free.length}</b></td>
              <td className="num">{homed.length - free.length}</td>
              <td className="num">{homed.length}</td>
              <td>{free.length ? free.map(s => s.name + (s.hotline?' ☎':'')).join(', ') : <span style={{color:'var(--muted)'}}>— none —</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  else if (kind === 'staff') {
    title = 'Total Staff — per Branch'
    const tot = {}; ROLE_ORDER.forEach(r => tot[r] = 0); let totH = 0, totAll = 0
    const rows = branchList.map(b => {
      const homed = visibleStaff().filter(s => s.home_branch_id === b.id); if (!homed.length) return null
      const c = {}; ROLE_ORDER.forEach(r => { c[r] = homed.filter(s => s.role === r).length; tot[r] += c[r] })
      const h = homed.filter(s => s.hotline).length; totH += h; totAll += homed.length
      return { b, homed, c, h }
    }).filter(Boolean)
    sub = `${totAll} staff across ${branchList.length} branch(es)`
    content = (
      <table className="rt">
        <thead><tr><th>Branch</th>{ROLE_ORDER.map(r=><th key={r} className="num">{ROLES[r].short}</th>)}<th className="num">☎</th><th className="num">Total</th></tr></thead>
        <tbody>
          {rows.map(({ b, homed, c, h }) => (
            <tr key={b.id}><td>{b.name} <span style={{color:'var(--muted)'}}>{b.note}</span></td>
              {ROLE_ORDER.map(r=><td key={r} className="num">{c[r]||''}</td>)}
              <td className="num">{h||''}</td><td className="num"><b>{homed.length}</b></td></tr>
          ))}
          {rows.length > 0 && <tr className="tot"><td>ALL BRANCHES</td>{ROLE_ORDER.map(r=><td key={r} className="num">{tot[r]}</td>)}<td className="num">{totH}</td><td className="num">{totAll}</td></tr>}
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
          <thead><tr><th>Branch</th><th className="num">Pending</th><th className="num">Ongoing</th><th className="num">Not successful</th><th className="num">Total</th></tr></thead>
          <tbody>
            {rows.length===0&&<tr><td colSpan={5} className="empty-note">Nothing open. 🎉</td></tr>}
            {rows.map(({b,bj,p,o,f})=>(
              <tr key={b.id}><td>{b.name} <span style={{color:'var(--muted)'}}>{b.note}</span></td>
                <td className="num">{p||''}</td><td className="num">{o||''}</td><td className="num">{f||''}</td>
                <td className="num"><b>{bj.length}</b></td></tr>
            ))}
            {rows.length>0&&<tr className="tot"><td>ALL</td><td className="num">{tp}</td><td className="num">{to}</td><td className="num">{tf}</td><td className="num">{filtered.length}</td></tr>}
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
          <thead><tr><th>Branch</th>{TYPE_KEYS.map(k=><th key={k} className="num">{TYPES[k].label}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {rows.length===0&&<tr><td colSpan={TYPE_KEYS.length+2} className="empty-note">No successful tickets yet.</td></tr>}
            {rows.map(({b,bj,c})=>(
              <tr key={b.id}><td>{b.name} <span style={{color:'var(--muted)'}}>{b.note}</span></td>
                {TYPE_KEYS.map(k=><td key={k} className="num">{c[k]||''}</td>)}
                <td className="num"><b>{bj.length}</b></td></tr>
            ))}
            {rows.length>0&&<tr className="tot"><td>ALL</td>{TYPE_KEYS.map(k=><td key={k} className="num">{tt[k]}</td>)}<td className="num">{filtered.length}</td></tr>}
          </tbody>
        </table>
      )
    }
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ width:'min(680px,96vw)' }}>
        <div className="modal-head"><h3>{title}</h3><div className="spacer" /></div>
        <div className="modal-body">
          <p className="empty-note" style={{ textAlign:'left', padding:'0 0 12px', margin:0 }}>{sub}</p>
          <div className="rtable-wrap">{content}</div>
        </div>
        <div className="modal-foot"><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}
