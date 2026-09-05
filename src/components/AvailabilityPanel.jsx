import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd, addDays, mondayOf } from '../lib/dates'
import { ROLES, ROLE_ORDER } from '../lib/constants'

export default function AvailabilityPanel({ currentMonth }) {
  const { jobs, inScope, visibleStaff, branches } = useApp()
  const [mode,      setMode]      = useState('month')   // 'month' | 'day'
  const [availDay,  setAvailDay]  = useState(ymd(new Date()))

  // build day options for current month
  const dayOptions = useMemo(() => {
    const opts = []
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth()
    const last = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= last; d++) {
      const dt = new Date(y, m, d)
      opts.push({ key: ymd(dt), label: dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) })
    }
    return opts
  }, [currentMonth])

  const roster = visibleStaff()

  function assignedOnDay(dayKey) {
    return new Set(jobs.filter(j => inScope(j) && j.date === dayKey).map(j => j.staff_id))
  }

  function assignedInMonth() {
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth()
    return new Set(
      jobs.filter(j => {
        if (!inScope(j)) return false
        const d = new Date(j.date + 'T00:00:00')
        return d.getFullYear() === y && d.getMonth() === mo
      }).map(j => j.staff_id)
    )
  }

  const assignedSet = mode === 'day' ? assignedOnDay(availDay) : assignedInMonth()
  const free = roster.filter(s => !assignedSet.has(s.id))

  // group by role
  const grouped = ROLE_ORDER.reduce((acc, r) => {
    acc[r] = free.filter(s => s.role === r)
    return acc
  }, {})

  return (
    <div className="panel avail">
      <div className="panel-head"><h2>Available (no task)</h2></div>
      <div style={{ padding:'11px 13px 0' }}>
        <div className="seg">
          <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>This month</button>
          <button className={mode === 'day'   ? 'active' : ''} onClick={() => setMode('day')}>Specific day</button>
        </div>
        {mode === 'day' && (
          <select
            className="sel"
            style={{ marginTop:8, width:'100%' }}
            value={availDay}
            onChange={e => setAvailDay(e.target.value)}
          >
            {dayOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
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
              {grp.map(s => (
                <div key={s.id} className="person free">
                  <div>
                    <div className="pname">{s.name}</div>
                    <div className="pmeta">{branches.find(b => b.id === s.home_branch_id)?.name || '—'}</div>
                  </div>
                  <div className="pspacer" />
                  <span className="badge free">Free</span>
                  {s.hotline && <span className="htag">☎</span>}
                </div>
              ))}
            </div>
          )
        })}
        {free.length === 0 && <div className="empty-note">Everyone is assigned this {mode === 'day' ? 'day' : 'month'}.</div>}
      </div>
    </div>
  )
}
