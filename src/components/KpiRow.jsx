import { useApp } from '../lib/AppContext'
import { ymd, fmtD } from '../lib/dates'

export default function KpiRow({ view, currentMonth, reportMonth, onDrill }) {
  const { jobs, staff, inScope, visibleStaff } = useApp()

  const m = view === 'reports' ? reportMonth : currentMonth
  const monthJobs = jobs.filter(j => {
    if (!inScope(j)) return false
    const d = new Date(j.date + 'T00:00:00')
    return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
  })

  const roster    = visibleStaff()
  const total     = roster.length
  const rosterIds = new Set(roster.map(s => s.id))

  const todayKey  = ymd(new Date())
  const todayLbl  = fmtD(new Date())
  const todayJobs = jobs.filter(j => inScope(j) && j.date === todayKey)
  const todayAssigned = new Set(todayJobs.map(j => j.staff_id))
  const availToday = total - [...todayAssigned].filter(id => rosterIds.has(id)).length

  const success = monthJobs.filter(j => j.status === 'success').length
  const open    = monthJobs.filter(j => j.status !== 'success').length
  const failed  = monthJobs.filter(j => j.status === 'fail').length
  const ongoing = monthJobs.filter(j => j.status === 'ongoing').length
  const pending = monthJobs.filter(j => j.status === 'pending').length
  const rate    = monthJobs.length ? Math.round(success / monthJobs.length * 100) : 0

  return (
    <div className="kpis">
      <KpiCard reportKind="job-today" label="Job Tickets Today" value={todayJobs.length}
        foot={<>▸ {todayLbl} · per branch</>}
        onDrill={onDrill} />
      <KpiCard reportKind="success" label="Successful (mo.)" value={success}
        foot={<>▸ {rate}% success rate</>} cls="accent-good"
        prefix={<span className="dot" style={{background:'var(--st-success)'}} />}
        onDrill={onDrill} />
      <KpiCard reportKind="open" label="Not Yet Successful (mo.)" value={open}
        foot={<>▸ {failed} failed · {ongoing} ongoing · {pending} pending</>}
        cls={open ? 'accent-warn' : ''}
        prefix={<span className="dot" style={{background:'var(--st-fail)'}} />}
        onDrill={onDrill} />
      <KpiCard reportKind="avail-today" label="Available Today" value={availToday}
        foot={<>▸ {todayLbl} · per branch</>}
        onDrill={onDrill} />
      <KpiCard reportKind="staff" label="Total Staff" value={total}
        foot={<>▸ per-branch headcount</>}
        onDrill={onDrill} />
    </div>
  )
}

function KpiCard({ reportKind, label, value, foot, cls, prefix, onDrill }) {
  return (
    <div className={`kpi clickable ${cls || ''}`} onClick={() => onDrill(reportKind)}>
      <div className="label">{label}</div>
      <div className="value">{prefix}{value}</div>
      <div className="foot">{foot}</div>
    </div>
  )
}
