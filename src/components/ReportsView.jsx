import { useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { monthName, weekNumber, mondayOf, addDays, ymd } from '../lib/dates'
import { TYPES, TYPE_KEYS, STATUS, ROLES, ROLE_ORDER } from '../lib/constants'

function esc(s) { return String(s || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])) }

export default function ReportsView({ reportMonth, setReportMonth, rFilters, setRFilters }) {
  const { jobs, staff, branches, inScope } = useApp()

  function prevMonth() { setReportMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setReportMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday()   { setReportMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) }) }

  const staffById  = id => staff.find(s => s.id === id)
  const branchById = id => branches.find(b => b.id === id)

  const monthJobs = useMemo(() => jobs.filter(j => {
    if (!inScope(j)) return false
    if (rFilters.branch && j.branch_id !== rFilters.branch) return false
    if (rFilters.emp    && j.staff_id  !== rFilters.emp)    return false
    const d = new Date(j.date + 'T00:00:00')
    return d.getMonth() === reportMonth.getMonth() && d.getFullYear() === reportMonth.getFullYear()
  }), [jobs, reportMonth, rFilters])

  // Report 1: per employee / week / type
  const r1Rows = useMemo(() => {
    const rows = []
    const empIds = [...new Set(monthJobs.map(j => j.staff_id))]
    empIds.forEach(sid => {
      const empJobs = monthJobs.filter(j => j.staff_id === sid)
      const weeks = [...new Set(empJobs.map(j => ymd(mondayOf(new Date(j.date + 'T00:00:00')))))]
      weeks.sort()
      weeks.forEach(wStart => {
        const wJobs = empJobs.filter(j => ymd(mondayOf(new Date(j.date + 'T00:00:00'))) === wStart)
        const row = { sid, wStart, total: wJobs.length }
        TYPE_KEYS.forEach(t => row[t] = wJobs.filter(j => j.type === t).length)
        rows.push(row)
      })
    })
    return rows
  }, [monthJobs])

  // Report 2: not successful
  const r2Rows = useMemo(() =>
    jobs.filter(j => inScope(j) && (j.status === 'pending' || j.status === 'fail'))
        .sort((a, b) => a.date.localeCompare(b.date))
  , [jobs])

  function csvR1() {
    const header = ['Employee','Week of',...TYPE_KEYS.map(t=>TYPES[t].label),'Total']
    const rows = r1Rows.map(r => {
      const s = staffById(r.sid)
      return [s?.name||r.sid, r.wStart, ...TYPE_KEYS.map(t=>r[t]), r.total]
    })
    dl([header,...rows], `report1-${monthName(reportMonth).replace(' ','_')}.csv`)
  }
  function csvR2() {
    const header = ['Date','JT No','Employee','Branch','Customer','Type','Status','Note']
    const rows = r2Rows.map(j => {
      const s = staffById(j.staff_id); const b = branchById(j.branch_id)
      return [j.date, j.jt_no, s?.name||'—', b?.name||'—', j.customer, j.type, j.status, j.status_note||'']
    })
    dl([header,...rows], 'report2-open-tickets.csv')
  }
  function dl(rows, filename) {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = filename; a.click()
  }

  const wFmt = s => { const d = new Date(s+'T00:00:00'); return `Wk of ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` }

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="month-nav">
          <button className="btn sm" onClick={prevMonth}>◀</button>
          <div className="month-label">{monthName(reportMonth)}</div>
          <button className="btn sm" onClick={nextMonth}>▶</button>
        </div>
        <button className="btn sm" onClick={goToday}>Today</button>
        <div className="sep" />
        <div className="fl">
          <label>Branch</label>
          <select className="sel" value={rFilters.branch} onChange={e => setRFilters(f=>({...f,branch:e.target.value}))}>
            <option value="">All</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="fl">
          <label>Employee</label>
          <select className="sel" value={rFilters.emp} onChange={e => setRFilters(f=>({...f,emp:e.target.value}))}>
            <option value="">All</option>
            {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Report 1 */}
      <div className="report">
        <div className="rhead">
          <div>
            <h2>1 · Service Summary — per Employee / Week / Type</h2>
            <p>{monthName(reportMonth)} · {monthJobs.length} job ticket(s)</p>
          </div>
          <div className="spacer" />
          <button className="btn sm" onClick={csvR1}>⤒ CSV</button>
        </div>
        <div className="rtable-wrap">
          <table className="rt">
            <thead>
              <tr>
                <th>Employee</th><th>Week</th>
                {TYPE_KEYS.map(t=><th key={t} className="num">{TYPES[t].label}</th>)}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {r1Rows.length === 0 && (
                <tr><td colSpan={TYPE_KEYS.length+3} className="empty-note">No job tickets this month.</td></tr>
              )}
              {r1Rows.map((r, i) => {
                const s = staffById(r.sid)
                return (
                  <tr key={i}>
                    <td>{s?.name || r.sid}</td>
                    <td>{wFmt(r.wStart)}</td>
                    {TYPE_KEYS.map(t=><td key={t} className="num">{r[t]||''}</td>)}
                    <td className="num"><b>{r.total}</b></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 2 */}
      <div className="report">
        <div className="rhead">
          <div>
            <h2>2 · Service Not Yet Successful</h2>
            <p>All open job tickets (Pending or Not Successful) — the follow-up backlog across all dates.</p>
          </div>
          <div className="spacer" />
          <button className="btn sm" onClick={csvR2}>⤒ CSV</button>
        </div>
        <div className="rtable-wrap">
          <table className="rt">
            <thead>
              <tr>
                <th>Date</th><th>JT No</th><th>Employee</th><th>Branch</th>
                <th>Customer</th><th>Type</th><th>Status</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {r2Rows.length === 0 && (
                <tr><td colSpan={8} className="empty-note">No open tickets. 🎉</td></tr>
              )}
              {r2Rows.map(j => {
                const s = staffById(j.staff_id); const b = branchById(j.branch_id)
                return (
                  <tr key={j.id}>
                    <td>{j.date}</td>
                    <td><b>{j.jt_no}</b></td>
                    <td>{s?.name||'—'}</td>
                    <td>{b?.name||'—'}</td>
                    <td>{j.customer}</td>
                    <td><span className={`type-tag ${TYPES[j.type]?.cls||''}`}>{TYPES[j.type]?.label||j.type}</span></td>
                    <td><span className={`pill ${STATUS[j.status]?.cls||''}`}>{STATUS[j.status]?.label||j.status}</span></td>
                    <td style={{color:'var(--muted)'}}>{j.status_note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
