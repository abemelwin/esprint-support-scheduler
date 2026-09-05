import { useApp } from '../lib/AppContext'
import { ymd, monthName, mondayOf, addDays, sameYMD } from '../lib/dates'
import { TYPES, STATUS, DOW } from '../lib/constants'
import AvailabilityPanel from './AvailabilityPanel'

export default function CalendarView({ currentMonth, setCurrentMonth, filters, setFilters, onOpenJob }) {
  const { jobs, branches, staff, inScope } = useApp()

  function prevMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday()   { setCurrentMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) }) }

  // build calendar grid (Mon-start)
  const firstDay   = currentMonth
  const firstMon   = mondayOf(firstDay)
  const lastOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)
  const lastMon    = mondayOf(lastOfMonth)
  const gridEnd    = addDays(lastMon, 6)

  const cells = []
  let cur = new Date(firstMon)
  while (cur <= gridEnd) { cells.push(new Date(cur)); cur = addDays(cur, 1) }

  const today = new Date()

  function filteredJobs(dateKey) {
    return jobs.filter(j => {
      if (!inScope(j)) return false
      if (j.date !== dateKey) return false
      if (filters.branch && j.branch_id !== filters.branch) return false
      if (filters.emp    && j.staff_id  !== filters.emp)    return false
      if (filters.type   && j.type      !== filters.type)   return false
      if (filters.status && j.status    !== filters.status) return false
      return true
    })
  }

  const staffById   = id => staff.find(s => s.id === id)
  const branchById  = id => branches.find(b => b.id === id)

  // filter dropdowns
  const visibleBranches = branches
  const visibleStaffList = staff

  return (
    <div>
      {/* toolbar */}
      <div className="toolbar">
        <div className="month-nav">
          <button className="btn sm" onClick={prevMonth}>◀</button>
          <div className="month-label">{monthName(currentMonth)}</div>
          <button className="btn sm" onClick={nextMonth}>▶</button>
        </div>
        <button className="btn sm" onClick={goToday}>Today</button>
        <div className="sep" />
        <div className="fl">
          <label>Branch</label>
          <select className="sel" value={filters.branch} onChange={e => setFilters(f => ({...f, branch: e.target.value}))}>
            <option value="">All</option>
            {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="fl">
          <label>Employee</label>
          <select className="sel" value={filters.emp} onChange={e => setFilters(f => ({...f, emp: e.target.value}))}>
            <option value="">All</option>
            {visibleStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="fl">
          <label>Type</label>
          <select className="sel" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}>
            <option value="">All</option>
            <option value="installation">Installation</option>
            <option value="onsite">Onsite</option>
            <option value="hotline">Hotline</option>
            <option value="others">Others</option>
          </select>
        </div>
        <div className="fl">
          <label>Status</label>
          <select className="sel" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="ongoing">Ongoing</option>
            <option value="success">Successful</option>
            <option value="fail">Not successful</option>
          </select>
        </div>
      </div>

      <div className="layout">
        {/* Calendar panel */}
        <div className="panel">
          <div className="panel-head">
            <h2>Monthly Schedule</h2>
            <div className="spacer" />
            <div className="legend">
              <span className="li"><span className="swatch" style={{background:'var(--t-install)'}} />Installation</span>
              <span className="li"><span className="swatch" style={{background:'var(--t-onsite)'}} />Onsite</span>
              <span className="li"><span className="swatch" style={{background:'var(--t-hotline)'}} />Hotline</span>
              <span className="li"><span className="swatch" style={{background:'var(--t-others)'}} />Others</span>
              <span className="li"><span className="dot" style={{background:'var(--st-success)'}} />Done</span>
              <span className="li"><span className="dot" style={{background:'var(--st-ongoing)'}} />Ongoing</span>
              <span className="li"><span className="dot" style={{background:'var(--st-pending)'}} />Pending</span>
              <span className="li"><span className="dot" style={{background:'var(--st-fail)'}} />Failed</span>
            </div>
          </div>
          <div className="cal">
            {DOW.map(d => <div key={d} className="dow">{d}</div>)}
            {cells.map(cell => {
              const isOther  = cell.getMonth() !== currentMonth.getMonth()
              const isToday  = sameYMD(cell, today)
              const dateKey  = ymd(cell)
              const dayJobs  = filteredJobs(dateKey)
              return (
                <div
                  key={dateKey}
                  className={`cell${isOther ? ' other' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => onOpenJob({ date: dateKey })}
                >
                  <span className="dnum">{cell.getDate()}</span>
                  <div className="jobs">
                    {dayJobs.map(j => {
                      const s = staffById(j.staff_id)
                      const cls = TYPES[j.type]?.cls || ''
                      return (
                        <div
                          key={j.id}
                          className={`jchip ${cls}`}
                          onClick={e => { e.stopPropagation(); onOpenJob({ date: dateKey, job: j }) }}
                        >
                          <span className={`st ${STATUS[j.status]?.dot || ''}`} />
                          <span className="jn">{j.jt_no}</span>
                          <span className="who">{s?.name?.split(',')[0] || '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                  <span className="addhint">＋</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Availability panel */}
        <AvailabilityPanel currentMonth={currentMonth} />
      </div>
    </div>
  )
}
