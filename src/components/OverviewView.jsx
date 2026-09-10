import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, monthName } from '../lib/dates'
import { TYPES, STATUS, REGIONS, REGION_COLORS } from '../lib/constants'

// ── Single branch block: tasks done + who is available ───────────────────────
function BranchBlock({ branch, currentMonth, jobs, staff, onOpenJob }) {
  const monthPrefix = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)).slice(0, 7)

  // Jobs for this branch this month, newest first
  const branchJobs = jobs
    .filter(j => j.branch_id === branch.id && j.date.startsWith(monthPrefix))
    .sort((a, b) => b.date.localeCompare(a.date))

  const staffById = id => staff.find(s => s.id === id)

  // Staff whose home branch is this branch
  const homeStaff  = staff.filter(s => s.home_branch_id === branch.id)
  // Which of them have a job this month
  const busyIds    = new Set(branchJobs.map(j => j.staff_id))
  const freeStaff  = homeStaff.filter(s => !busyIds.has(s.id))

  const [open, setOpen] = useState(true)

  return (
    <div className="ovl-branch">
      <div className="ovl-branch-head" onClick={() => setOpen(o => !o)}>
        <span className="ovl-caret">{open ? '▾' : '▸'}</span>
        <span className="ovl-branch-code">{branch.name}</span>
        <span className="ovl-branch-full">{branch.note}</span>
        <div className="ovl-spacer" />
        <span className="ovl-count">{branchJobs.length} task{branchJobs.length !== 1 ? 's' : ''}</span>
        <span className="ovl-count free">{freeStaff.length} free</span>
      </div>

      {open && (
        <div className="ovl-branch-body">
          {/* Tasks done */}
          <div className="ovl-section-label">Tasks this month</div>
          {branchJobs.length === 0 ? (
            <div className="ovl-empty-row">No tasks logged.</div>
          ) : (
            <div className="ovl-task-list">
              {branchJobs.map(j => {
                const s = staffById(j.staff_id)
                return (
                  <div
                    key={j.id}
                    className="ovl-task"
                    onClick={() => onOpenJob && onOpenJob({ date: j.date, job: j })}
                  >
                    <span className="ovl-date">{j.date.slice(5)}</span>
                    <span className={`ovl-type ${TYPES[j.type]?.cls || ''}`}>
                      {TYPES[j.type]?.label || j.type}
                    </span>
                    <span className="ovl-jn">{j.jt_no}</span>
                    <span className="ovl-who">{s?.name || 'Unassigned'}</span>
                    <span className="ovl-cust">{j.customer || '—'}</span>
                    <div className="ovl-spacer" />
                    <span className={`pill ${STATUS[j.status]?.cls || ''}`}>
                      {STATUS[j.status]?.label || j.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Available staff */}
          <div className="ovl-section-label">Available (no task)</div>
          {freeStaff.length === 0 ? (
            <div className="ovl-empty-row">Everyone here has a task.</div>
          ) : (
            <div className="ovl-avail-list">
              {freeStaff.map(s => (
                <span key={s.id} className="ovl-avail-chip">
                  {s.name.split(',')[0]}
                  {s.hotline && <span className="htag" style={{ marginLeft: 4 }}>☎</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Region section ────────────────────────────────────────────────────────────
function RegionSection({ regionName, currentMonth, onOpenJob }) {
  const { branches, jobs, staff } = useApp()

  const regionCodes    = REGIONS[regionName] || []
  const regionBranches = branches.filter(b => regionCodes.includes(b.name))

  const [selectedBranch, setSelectedBranch] = useState('')
  const displayBranches = selectedBranch
    ? regionBranches.filter(b => b.id === selectedBranch)
    : regionBranches

  const regionColor = REGION_COLORS[regionName]

  const monthPrefix   = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)).slice(0, 7)
  const regionJobs    = jobs.filter(j =>
    regionBranches.some(b => b.id === j.branch_id) && j.date.startsWith(monthPrefix)
  )
  const regionSuccess = regionJobs.filter(j => j.status === 'success').length
  const regionTotal   = regionJobs.length

  return (
    <div className="ovl-region">
      <div className="ovl-region-head" style={{ borderLeftColor: regionColor }}>
        <div className="ovl-region-label" style={{ color: regionColor }}>{regionName}</div>
        <div className="ovl-region-meta">
          <span>{regionBranches.length} branch{regionBranches.length !== 1 ? 'es' : ''}</span>
          {regionTotal > 0 && (
            <span className="ovl-region-rate">
              {regionSuccess}/{regionTotal} done · {Math.round(regionSuccess / regionTotal * 100)}%
            </span>
          )}
        </div>
        <div className="ovl-region-filter">
          <label>Branch</label>
          <select className="sel" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
            <option value="">All ({regionBranches.length})</option>
            {regionBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name} — {b.note}</option>
            ))}
          </select>
        </div>
      </div>

      {displayBranches.length === 0 ? (
        <div className="ovl-empty-row">No branches configured for {regionName}.</div>
      ) : (
        <div className="ovl-branch-list">
          {displayBranches.map(b => (
            <BranchBlock
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
  function goToday()   { setCurrentMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) }) }

  const [expanded, setExpanded] = useState({ Luzon: true, Visayas: true, Mindanao: true })
  function toggle(r) { setExpanded(e => ({ ...e, [r]: !e[r] })) }

  return (
    <div className="ovl-root">
      <div className="toolbar">
        <div className="month-nav">
          <button className="btn sm" onClick={prevMonth}>◀</button>
          <div className="month-label">{monthName(currentMonth)}</div>
          <button className="btn sm" onClick={nextMonth}>▶</button>
        </div>
        <button className="btn sm" onClick={goToday}>Today</button>
        <div className="sep" />
        <div className="ovl-toolbar-hint">🗺 Regional overview — tasks &amp; availability per branch</div>
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
