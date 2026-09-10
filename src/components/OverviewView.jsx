import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, monthName } from '../lib/dates'
import { TYPES, STATUS, ROLES, ROLE_ORDER, REGIONS, REGION_COLORS } from '../lib/constants'

const COLLAPSE_THRESHOLD = 4  // collapse task list when >= this many tasks

// ── One staff row: name + their scheduled tasks ──────────────────────────────
function StaffRow({ person, tasks, onOpenJob }) {
  // Separate absence markers (leave / absent) from real work tasks
  const absences   = tasks.filter(j => j.type === 'leave' || j.type === 'absent')
  const workTasks  = tasks.filter(j => j.type !== 'leave' && j.type !== 'absent')

  // Collapse by default when there are many tasks
  const [expanded, setExpanded] = useState(workTasks.length < COLLAPSE_THRESHOLD)

  // Unique customer names from real work
  const customers = [...new Set(workTasks.map(j => (j.customer || '').trim()).filter(Boolean))]

  // Type label(s) shown beside the name (uses "Others: <desc>" when applicable)
  const typeLabel = j => {
    if (j.type === 'others') return j.type_other?.trim() ? `Others: ${j.type_other.trim()}` : 'Others'
    return TYPES[j.type]?.label || j.type
  }

  // Sort work tasks: ongoing first, then by date
  const statusOrder = s => s === 'ongoing' ? 0 : s === 'pending' ? 1 : s === 'success' ? 2 : 3
  workTasks.sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || a.date.localeCompare(b.date))

  // Status summary counts for collapsed view
  const ongoingCount  = workTasks.filter(j => j.status === 'ongoing').length
  const pendingCount  = workTasks.filter(j => j.status === 'pending').length
  const successCount  = workTasks.filter(j => j.status === 'success').length
  const failCount     = workTasks.filter(j => j.status === 'fail').length

  // Absence takes priority in the name suffix
  const absenceLabel = absences.length ? [...new Set(absences.map(a => TYPES[a.type]?.label))].join(', ') : ''
  const workTypes    = [...new Set(workTasks.map(typeLabel))]
  const nameSuffix   = absenceLabel
    ? ` — ${absenceLabel}`
    : (workTypes.length ? ` — ${workTypes.join(', ')}` : '')

  const isCollapsible = workTasks.length >= COLLAPSE_THRESHOLD

  return (
    <div className={`ovl-staff${absences.length ? ' is-absent' : ''}`}>
      <div className="ovl-staff-head">
        <div className="ovl-staff-id">
          <span className="ovl-staff-name">
            {person.name}
            {nameSuffix && (
              <span className={`ovl-name-type${absences.length ? ' absent' : ''}`}>{nameSuffix}</span>
            )}
          </span>
          {!absences.length && (
            <span className="ovl-staff-cust">
              {customers.length ? customers.join(', ') : ''}
            </span>
          )}
        </div>
        {person.hotline && <span className="htag">☎</span>}
        <div className="ovl-spacer" />
        {absences.length
          ? <span className="ovl-badge off">{absenceLabel}</span>
          : workTasks.length === 0
            ? <span className="ovl-badge free">Available</span>
            : (
              <span
                className={`ovl-badge busy${isCollapsible ? ' clickable' : ''}`}
                onClick={isCollapsible ? () => setExpanded(e => !e) : undefined}
                title={isCollapsible ? (expanded ? 'Collapse' : 'Expand') : undefined}
              >
                {workTasks.length} task{workTasks.length !== 1 ? 's' : ''}
                {isCollapsible && !expanded && (
                  <span className="ovl-status-pills">
                    {ongoingCount  > 0 && <span className="pill ongoing">{ongoingCount} ongoing</span>}
                    {pendingCount  > 0 && <span className="pill pending">{pendingCount} pending</span>}
                    {successCount  > 0 && <span className="pill success">{successCount} done</span>}
                    {failCount     > 0 && <span className="pill fail">{failCount} failed</span>}
                  </span>
                )}
                {isCollapsible && <span className="ovl-chevron">{expanded ? '▲' : '▼'}</span>}
              </span>
            )
        }
      </div>

      {workTasks.length > 0 && expanded && (
        <div className="ovl-staff-tasks">
          {workTasks.map(j => (
            <div
              key={j.id}
              className="ovl-task"
              onClick={() => onOpenJob && onOpenJob({ date: j.date, job: j })}
            >
              <span className="ovl-date">{j.date.slice(5)}</span>
              <span className={`ovl-type ${TYPES[j.type]?.cls || ''}`}>
                {TYPES[j.type]?.label || j.type}
              </span>
              <span className="ovl-cust">{j.customer || '—'}</span>
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
function RoleGroup({ role, group, tasksFor, onOpenJob }) {
  const busy  = group.filter(p => tasksFor(p.id).filter(j => j.type !== 'leave' && j.type !== 'absent').length > 0)
  const [open, setOpen] = useState(busy.length > 0)  // expand if anyone has tasks

  return (
    <div className="ovl-role-block">
      <div className="ovl-role-label" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span className="swatch" style={{ background: ROLES[role]?.color }} />
        {ROLES[role]?.label}
        <span className="ovl-role-cnt">{group.length}</span>
        <div style={{ flex: 1 }} />
        {busy.length > 0 && <span className="ovl-role-busy">{busy.length} busy</span>}
        <span className="ovl-chevron" style={{ fontSize: 10, marginLeft: 6 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && group.map(person => (
        <StaffRow
          key={person.id}
          person={person}
          tasks={tasksFor(person.id)}
          onOpenJob={onOpenJob}
        />
      ))}
    </div>
  )
}

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
          <RoleGroup
            key={role}
            role={role}
            group={group}
            tasksFor={tasksFor}
            onOpenJob={onOpenJob}
          />
        )
      })}
    </div>
  )
}

// ── Region section: dropdown of branches ─────────────────────────────────────
function RegionSection({ regionName, currentMonth, onOpenJob, scopedBranchIds }) {
  const { branches, jobs, staff } = useApp()

  const regionCodes    = REGIONS[regionName] || []
  const allRegionBranches = branches.filter(b => regionCodes.includes(b.name))
  // If scoped, only show branches the user is assigned to
  const regionBranches = scopedBranchIds
    ? allRegionBranches.filter(b => scopedBranchIds.includes(b.id))
    : allRegionBranches
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
export default function OverviewView({ currentMonth, setCurrentMonth, onOpenJob, scopedBranchIds }) {
  const { branches } = useApp()

  function prevMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday()   { setCurrentMonth(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) }) }

  // For scoped users (service_manager), only show regions containing their assigned branches
  const visibleRegions = Object.keys(REGIONS).filter(regionName => {
    if (!scopedBranchIds) return true
    const regionCodes    = REGIONS[regionName] || []
    const regionBranches = branches.filter(b => regionCodes.includes(b.name))
    return regionBranches.some(b => scopedBranchIds.includes(b.id))
  })

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
        {visibleRegions.map(regionName => (
          <RegionSection
            key={regionName}
            regionName={regionName}
            currentMonth={currentMonth}
            onOpenJob={onOpenJob}
            scopedBranchIds={scopedBranchIds}
          />
        ))}
      </div>
    </div>
  )
}
