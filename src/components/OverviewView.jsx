import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, monthName, mondayOf, addDays, sameYMD } from '../lib/dates'
import { TYPES, STATUS, DOW, REGIONS, REGION_COLORS } from '../lib/constants'

// ── Mini calendar for a single branch ────────────────────────────────────────
function BranchCalendar({ branch, currentMonth, jobs, staff, onOpenJob }) {
  const firstDay    = currentMonth
  const firstMon    = mondayOf(firstDay)
  const lastOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)
  const lastMon     = mondayOf(lastOfMonth)
  const gridEnd     = addDays(lastMon, 6)

  const cells = []
  let cur = new Date(firstMon)
  while (cur <= gridEnd) { cells.push(new Date(cur)); cur = addDays(cur, 1) }

  const today     = new Date()
  const staffById = id => staff.find(s => s.id === id)

  function dayJobs(dateKey) {
    return jobs.filter(j => j.branch_id === branch.id && j.date === dateKey)
  }

  const monthJobs = jobs.filter(j => j.branch_id === branch.id && j.date.startsWith(ymd(firstDay).slice(0, 7)))
  const successCount = monthJobs.filter(j => j.status === 'success').length
  const failCount    = monthJobs.filter(j => j.status === 'fail').length
  const ongoingCount = monthJobs.filter(j => j.status === 'ongoing').length
  const pendingCount = monthJobs.filter(j => j.status === 'pending').length

  return (
    <div className="ov-branch-card">
      {/* Branch header */}
      <div className="ov-branch-head">
        <div className="ov-branch-title">
          <span className="ov-branch-code">{branch.name}</span>
          <span className="ov-branch-full">{branch.note}</span>
        </div>
        <div className="ov-branch-stats">
          {monthJobs.length > 0 && <>
            {successCount > 0 && <span className="ov-stat success">✓ {successCount}</span>}
            {ongoingCount > 0 && <span className="ov-stat ongoing">● {ongoingCount}</span>}
            {pendingCount > 0 && <span className="ov-stat pending">○ {pendingCount}</span>}
            {failCount    > 0 && <span className="ov-stat fail">✗ {failCount}</span>}
          </>}
          {monthJobs.length === 0 && <span className="ov-stat muted">No jobs</span>}
        </div>
      </div>

      {/* Mini calendar grid */}
      <div className="ov-cal">
        {DOW.map(d => <div key={d} className="ov-dow">{d.slice(0,1)}</div>)}
        {cells.map(cell => {
          const isOther = cell.getMonth() !== currentMonth.getMonth()
          const isToday = sameYMD(cell, today)
          const dateKey = ymd(cell)
          const dJobs   = dayJobs(dateKey)
          return (
            <div
              key={dateKey}
              className={`ov-cell${isOther ? ' other' : ''}${isToday ? ' today' : ''}${dJobs.length > 0 ? ' has-jobs' : ''}`}
              onClick={() => !isOther && onOpenJob && onOpenJob({ date: dateKey })}
              title={dJobs.length > 0 ? `${dJobs.length} job${dJobs.length > 1 ? 's' : ''}` : ''}
            >
              <span className="ov-dnum">{cell.getDate()}</span>
              {dJobs.length > 0 && (
                <div className="ov-chips">
                  {dJobs.slice(0, 3).map(j => {
                    const s   = staffById(j.staff_id)
                    const cls = TYPES[j.type]?.cls || ''
                    return (
                      <div
                        key={j.id}
                        className={`ov-chip ${cls}`}
                        onClick={e => { e.stopPropagation(); onOpenJob && onOpenJob({ date: dateKey, job: j }) }}
                        title={`${j.jt_no} · ${s?.name?.split(',')[0] || '—'}`}
                      >
                        <span className={`st ${STATUS[j.status]?.dot || ''}`} />
                        <span className="ov-jn">{j.jt_no}</span>
                      </div>
                    )
                  })}
                  {dJobs.length > 3 && (
                    <div className="ov-chip ov-more">+{dJobs.length - 3}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Region section (Luzon / Visayas / Mindanao) ───────────────────────────────
function RegionSection({ regionName, currentMonth, onOpenJob }) {
  const { branches, jobs, staff } = useApp()

  // Get branches belonging to this region (match by short-code name)
  const regionCodes    = REGIONS[regionName] || []
  const regionBranches = branches.filter(b => regionCodes.includes(b.name))

  // Branch filter within this region
  const [selectedBranch, setSelectedBranch] = useState('')

  const displayBranches = selectedBranch
    ? regionBranches.filter(b => b.id === selectedBranch)
    : regionBranches

  const regionColor = REGION_COLORS[regionName]

  // Region-level stats
  const monthPrefix   = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)).slice(0, 7)
  const regionJobs    = jobs.filter(j =>
    regionBranches.some(b => b.id === j.branch_id) && j.date.startsWith(monthPrefix)
  )
  const regionSuccess = regionJobs.filter(j => j.status === 'success').length
  const regionTotal   = regionJobs.length

  return (
    <div className="ov-region">
      {/* Region header */}
      <div className="ov-region-head" style={{ borderLeftColor: regionColor }}>
        <div className="ov-region-label" style={{ color: regionColor }}>
          {regionName}
        </div>
        <div className="ov-region-meta">
          <span>{regionBranches.length} branch{regionBranches.length !== 1 ? 'es' : ''}</span>
          {regionTotal > 0 && (
            <span className="ov-region-rate">
              {regionSuccess}/{regionTotal} jobs · {Math.round(regionSuccess / regionTotal * 100)}% done
            </span>
          )}
        </div>

        {/* Branch filter for this region */}
        <div className="ov-region-filter">
          <label>Branch</label>
          <select
            className="sel"
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
          >
            <option value="">All ({regionBranches.length})</option>
            {regionBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name} — {b.note}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Branch calendars grid */}
      {displayBranches.length === 0 ? (
        <div className="ov-empty">No branches configured for {regionName}.</div>
      ) : (
        <div className="ov-branch-grid">
          {displayBranches.map(b => (
            <BranchCalendar
              key={b.id}
              branch={b}
              currentMonth={currentMonth}
              jobs={jobs}
              staff={staff}
              onOpenJob={onOpenJob}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main OverviewView ─────────────────────────────────────────────────────────
export default function OverviewView({ currentMonth, setCurrentMonth, onOpenJob }) {
  function prevMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday()   {
    setCurrentMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  }

  const [expanded, setExpanded] = useState({ Luzon: true, Visayas: true, Mindanao: true })
  function toggle(r) { setExpanded(e => ({ ...e, [r]: !e[r] })) }

  return (
    <div className="ov-root">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="month-nav">
          <button className="btn sm" onClick={prevMonth}>◀</button>
          <div className="month-label">{monthName(currentMonth)}</div>
          <button className="btn sm" onClick={nextMonth}>▶</button>
        </div>
        <button className="btn sm" onClick={goToday}>Today</button>
        <div className="sep" />
        <div className="ov-toolbar-hint">
          🗺 Regional overview — click any job to edit, click an empty day to add
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.keys(REGIONS).map(r => (
            <button
              key={r}
              className={`btn sm${expanded[r] ? '' : ' ghost'}`}
              style={{ borderColor: expanded[r] ? REGION_COLORS[r] : undefined, color: expanded[r] ? REGION_COLORS[r] : undefined }}
              onClick={() => toggle(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Region sections */}
      {Object.keys(REGIONS).map(regionName => (
        expanded[regionName] && (
          <RegionSection
            key={regionName}
            regionName={regionName}
            currentMonth={currentMonth}
            onOpenJob={onOpenJob}
          />
        )
      ))}
    </div>
  )
}
