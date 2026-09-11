import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd } from '../lib/dates'
import { ROLES, ROLE_ORDER, TYPES, STATUS } from '../lib/constants'

export default function AvailabilityPanel({ currentMonth }) {
  const { jobs, inScope, visibleStaff, branches } = useApp()
  const [mode,     setMode]     = useState('month')   // 'month' | 'day'
  const [availDay, setAvailDay] = useState(ymd(new Date()))
  const [search,   setSearch]   = useState('')

  // build day options for current month
  const dayOptions = useMemo(() => {
    const opts = []
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth()
    const last = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const dt = new Date(y, m, d)
      opts.push({
        key: ymd(dt),
        label: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      })
    }
    return opts
  }, [currentMonth])

  const roster = visibleStaff()

  // tasks for the selected period
  function tasksFor(staffId) {
    if (mode === 'day') {
      return jobs.filter(j => inScope(j) && j.staff_id === staffId && j.date === availDay
        && j.type !== 'leave' && j.type !== 'absent')
    }
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth()
    return jobs.filter(j => {
      if (!inScope(j) || j.staff_id !== staffId) return false
      if (j.type === 'leave' || j.type === 'absent') return false
      const d = new Date(j.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === mo
    })
  }

  // filter by search term
  const searchTerm = search.trim().toLowerCase()
  const filteredRoster = searchTerm
    ? roster.filter(s => s.name.toLowerCase().includes(searchTerm))
    : roster

  // group by role
  const grouped = ROLE_ORDER.reduce((acc, r) => {
    acc[r] = filteredRoster.filter(s => s.role === r)
    return acc
  }, {})

  return (
    <div className="panel avail">
      <div className="panel-head"><h2>Staff Schedule</h2></div>
      <div style={{ padding: '11px 13px 0' }}>
        <div className="seg">
          <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>This month</button>
          <button className={mode === 'day'   ? 'active' : ''} onClick={() => setMode('day')}>Specific day</button>
        </div>
        {mode === 'day' && (
          <select
            className="sel"
            style={{ marginTop: 8, width: '100%' }}
            value={availDay}
            onChange={e => setAvailDay(e.target.value)}
          >
            {dayOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
        {/* Search staff */}
        <div className="ovl-role-search" style={{ marginTop: 8 }}>
          <span className="ovl-role-search-icon">🔍</span>
          <input
            className="ovl-role-search-input"
            placeholder="Search staff…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>
          )}
        </div>
      </div>

      <div className="avail-body">
        {ROLE_ORDER.map(r => {
          const grp = grouped[r]
          if (!grp.length) return null
          return (
            <div key={r} className="role-group">
              <h3>
                <span className="swatch" style={{ background: ROLES[r].color }} />
                {ROLES[r].label}
                <span className="cnt">{grp.length}</span>
              </h3>
              {grp.map(s => {
                const tasks = tasksFor(s.id)
                const branchName = branches.find(b => b.id === s.home_branch_id)?.name || '—'
                return (
                  <div key={s.id} className={`person${tasks.length === 0 ? ' free' : ' busy-row'}`}>
                    <div>
                      <div className="pname">{s.name}</div>
                      <div className="pmeta">{branchName}</div>
                    </div>
                    <div className="pspacer" />
                    <StaffStatusBadge tasks={tasks} />
                    {s.hotline && <span className="htag">☎</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
        {filteredRoster.length === 0 && (
          <div className="empty-note">
            {searchTerm ? `No staff matching "${search}".` : 'No staff found.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Badge showing task status(es) for a staff member ─────────────────────────
function StaffStatusBadge({ tasks }) {
  if (tasks.length === 0) {
    return <span className="badge free">Free</span>
  }

  if (tasks.length === 1) {
    const t = tasks[0]
    const typeLabel = t.type === 'others' && t.type_other?.trim()
      ? t.type_other.trim()
      : TYPES[t.type]?.label || t.type
    const st = STATUS[t.status]
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span className={`type-tag ${TYPES[t.type]?.cls || ''}`}>{typeLabel}</span>
        <span className={`pill ${st?.cls || ''}`}>{st?.label || t.status}</span>
      </div>
    )
  }

  // multiple tasks — show count + status summary pills
  const ongoingCount = tasks.filter(t => t.status === 'ongoing').length
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const successCount = tasks.filter(t => t.status === 'success').length
  const failCount    = tasks.filter(t => t.status === 'fail').length

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{tasks.length} tasks</span>
      {ongoingCount > 0 && <span className="pill ongoing">{ongoingCount} ongoing</span>}
      {pendingCount > 0 && <span className="pill pending">{pendingCount} next</span>}
      {successCount > 0 && <span className="pill success">{successCount} done</span>}
      {failCount    > 0 && <span className="pill fail">{failCount} failed</span>}
    </div>
  )
}
