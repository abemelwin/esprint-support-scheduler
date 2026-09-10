import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, monthName } from '../lib/dates'
import { TYPES, STATUS, ROLES, ROLE_ORDER, REGIONS, REGION_COLORS } from '../lib/constants'

// ── One staff row: name + their scheduled tasks ──────────────────────────────
function StaffRow({ person, tasks, onOpenJob }) {
  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date))

  // Unique customer names for this staff member
  const customers = [...new Set(sorted.map(j => (j.customer || '').trim()).filter(Boolean))]

  // Type label(s) shown beside the name (uses "Others: <desc>" when applicable)
  const typeLabel = j => {
    if (j.type === 'others') return j.type_other?.trim() ? `Others: ${j.type_other.trim()}` : 'Others'
    return TYPES[j.type]?.label || j.type
  }
  const types = [...new Set(sorted.map(typeLabel))]
  const nameSuffix = types.length ? ` — ${types.join(', ')}` : ''

  return (
    <div className="ovl-staff">
      <div className="ovl-staff-head">
        <div className="ovl-staff-id">
          <span className="ovl-staff-name">
            {person.name}
            {nameSuffix && <span className="ovl-name-type">{nameSuffix}</span>}
          </span>
          <span className="ovl-staff-cust">
            {customers.length ? customers.join(', ') : 'No customer'}
          </span>
        </div>
        {person.hotline && <span className="htag">☎</span>}
        <div className="ovl-spacer" />
        {sorted.length === 0
          ? <span className="ovl-badge free">Available</span>
          : <span className="ovl-badge busy">{sorted.length} task{sorted.length !== 1 ? 's' : ''}</span>}
      </div>

      {sorted.length > 0 && (
        <div className="ovl-staff-tasks">
          {sorted.map(j => (
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
              <span className="ovl-cust">{j.customer || '—'}</span>
              {j.location && <span className="ovl-loc">📍 {j.location}</span>}
              <div className="ovl-spacer" />
              <span className={`pill ${STATUS[j.status]?.cls || ''}`}>
                {STATUS[j.status]?.label || j.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Branch detail: list all its staff grouped by role ────────────────────────
function BranchDetail({ branch, monthPrefix, jobs, staff, onOpenJob }) {
  // Staff whose home branch is this branch
  const branchStaff = staff.filter(s => s.home_branch_id === branch.id)
  // Tasks per staff for the month (for this branch)
  const tasksFor = id =>
    jobs.filter(j => j.staff_id === id && j.branch_id === branch.id && j.date.startsWith(monthPrefix))

  if (branchStaff.length === 0) {
    return <div className="ovl-empty-row">No staff assigned to {branch.name}.</div>
  }

  return (
    <div className="ovl-branch-detail">
      {ROLE_ORDER.map(role => {
        const group = branchStaff.filter(s => s.role === role)
        if (!group.length) return null
        return (
          <div key={role} className="ovl-role-block">
            <div className="ovl-role-label">
              <span className="swatch" style={{ background: ROLES[role]?.color }} />
              {ROLES[role]?.label}
              <span className="ovl-role-cnt">{group.length}</span>
            </div>
            {group.map(person => (
              <StaffRow
                key={person.id}
                person={person}
                tasks={tasksFor(person.id)}
                onOpenJob={onOpenJob}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Region section: dropdown of branches ─────────────────────────────────────
function RegionSection({ regionName, currentMonth, onOpenJob }) {
  const { branches, jobs, staff } = useApp()

  const regionCodes    = REGIONS[regionName] || []
  const regionBranches = branches.filter(b => regionCodes.includes(b.name))
  const regionColor    = REGION_COLORS[regionName]
  const monthPrefix    = ymd(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)).slice(0, 7)

  // Default to first branch in the region
  const [selected, setSelected] = useState(regionBranches[0]?.id || '')
  const branch = regionBranches.find(b => b.id === selected) || regionBranches[0]

  return (
    <div className="ovl-region">
      <div className="ovl-region-head" style={{ borderLeftColor: regionColor }}>
        <div className="ovl-region-label" style={{ color: regionColor }}>{regionName}</div>
        <div className="ovl-region-filter">
          <label>Branch</label>
          <select className="sel" value={selected} onChange={e => setSelected(e.target.value)}>
            {regionBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name} — {b.note}</option>
            ))}
          </select>
        </div>
      </div>

      {branch ? (
        <BranchDetail
          branch={branch}
          monthPrefix={monthPrefix}
          jobs={jobs}
          staff={staff}
          onOpenJob={onOpenJob}
        />
      ) : (
        <div className="ovl-empty-row">No branches configured for {regionName}.</div>
      )}
    </div>
  )
}

// ── Main OverviewView ─────────────────────────────────────────────────────────
export default function OverviewView({ currentMonth, setCurrentMonth, onOpenJob }) {
  function prevMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday()   { setCurrentMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) }) }

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
        <div className="ovl-toolbar-hint">🗺 Pick a branch per region to see each staff's schedule &amp; tasks</div>
      </div>

      <div className="ovl-region-cols">
        {Object.keys(REGIONS).map(regionName => (
          <RegionSection
            key={regionName}
            regionName={regionName}
            currentMonth={currentMonth}
            onOpenJob={onOpenJob}
          />
        ))}
      </div>
    </div>
  )
}
