import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd } from '../lib/dates'
import { ROLES, ROLE_ORDER, TYPES, STATUS } from '../lib/constants'

export default function AvailabilityPanel({ currentMonth }) {
  const { jobs, inScope, visibleStaff, branches, appUsers, loadStaff, loadAppUsers, loadJobs } = useApp()
  const [mode,         setMode]         = useState('month')   // 'month' | 'day'
  const [availDay,     setAvailDay]     = useState(ymd(new Date()))
  const [search,       setSearch]       = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [refreshing,   setRefreshing]   = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([loadStaff?.(), loadAppUsers?.(), loadJobs?.()])
    setRefreshing(false)
  }

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

  // Helper to get complete branch info for a staff member
  function getStaffBranchInfo(s) {
    const sNameNorm = s.name.trim().toLowerCase()
    const matchedUser = appUsers?.find(u => {
      const uNameNorm = u.name?.trim().toLowerCase() || ''
      if (!uNameNorm) return false
      return uNameNorm === sNameNorm ||
        sNameNorm.includes(uNameNorm) ||
        uNameNorm.includes(sNameNorm)
    })

    if (matchedUser) {
      if (matchedUser.role === 'admin') {
        return { label: '🌐 All Branches (Admin)', isAll: true, branchIds: branches.map(b => b.id) }
      }
      const uCanEdit = matchedUser.can_edit !== false
      const uEditBranches = uCanEdit
        ? (matchedUser.branch_ids || []).filter(b => !(matchedUser.view_branch_ids || []).includes(b))
        : []
      if (uCanEdit && matchedUser.main_branch_id && !uEditBranches.includes(matchedUser.main_branch_id) && !(matchedUser.view_branch_ids || []).includes(matchedUser.main_branch_id)) {
        uEditBranches.unshift(matchedUser.main_branch_id)
      }
      const uViews = matchedUser.view_branch_ids?.length > 0
        ? matchedUser.view_branch_ids
        : (!uCanEdit ? (matchedUser.branch_ids || []) : [])

      const editNames = uEditBranches.map(id => branches.find(b => b.id === id)?.name).filter(Boolean)
      const viewNames = uViews.map(id => branches.find(b => b.id === id)?.name).filter(Boolean)
      const allIds = Array.from(new Set([...(matchedUser.branch_ids || []), ...uEditBranches, ...uViews]))

      if (editNames.length > 0 && viewNames.length > 0) {
        return {
          label: `✏️ ${editNames.join(', ')} · 📍 ${viewNames.join(', ')}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      if (editNames.length > 0) {
        return {
          label: editNames.length === 1 ? `🏢 ${editNames[0]}` : `✏️ ${editNames.join(', ')}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      if (viewNames.length > 0) {
        return {
          label: `📍 ${viewNames.join(', ')}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      const uBranches = matchedUser.branch_ids || []
      if (branches.length > 0 && branches.every(b => uBranches.includes(b.id))) {
        return { label: `🌐 All Branches (${branches.length})`, isAll: true, branchIds: uBranches }
      }
      const bNames = uBranches
        .map(id => branches.find(b => b.id === id)?.name || id)
        .filter(Boolean)
      return { label: bNames.length > 0 ? bNames.join(', ') : '—', isAll: false, branchIds: uBranches }
    }

    const homeB = branches.find(b => b.id === s.home_branch_id)
    return {
      label: homeB ? homeB.name : '—',
      isAll: false,
      branchIds: s.home_branch_id ? [s.home_branch_id] : [],
    }
  }

  // filter by search term and branch
  const searchTerm = search.trim().toLowerCase()
  const filteredRoster = roster.filter(s => {
    if (searchTerm && !s.name.toLowerCase().includes(searchTerm)) return false
    if (branchFilter) {
      const info = getStaffBranchInfo(s)
      if (info.isAll) return true
      if (!info.branchIds.includes(branchFilter)) return false
    }
    return true
  })

  // group by role
  const grouped = ROLE_ORDER.reduce((acc, r) => {
    acc[r] = filteredRoster.filter(s => s.role === r)
    return acc
  }, {})

  return (
    <div className="panel avail">
      <div className="panel-head"><h2>Staff Schedule</h2></div>
      <div style={{ padding: '11px 13px 0' }}>
        <div className="seg-toggle">
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
        {/* Search staff & Branch filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <div className="ovl-role-search" style={{ flex: 1, margin: 0 }}>
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
          <select
            className="sel"
            style={{ width: 'auto', minWidth: 90, fontSize: 12, padding: '4px 6px' }}
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            title="Filter by branch"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
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
                const branchInfo = getStaffBranchInfo(s)
                return (
                  <div key={s.id} className={`person${tasks.length === 0 ? ' free' : ' busy-row'}`}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pname">{s.name}</div>
                      <div className="pmeta" style={{
                        color: branchInfo.isAll ? 'var(--senior)' : 'var(--muted)',
                        fontWeight: branchInfo.isAll ? 600 : 400,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      }} title={branchInfo.label}>
                        {branchInfo.label}
                      </div>
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
