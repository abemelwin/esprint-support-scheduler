import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { ymd } from '../lib/dates'
import { ROLES, ROLE_ORDER, TYPES, STATUS, formatBranchSummary, getBranchRegion } from '../lib/constants'

// Designated Manager and Coordinator assignments per branch specified by company structure
const ALL_BRANCH_CODES = ['BAC','BUK','BUT','CAB','CAMSUR','CAV','CDO','CEB','DAV','GENSAN','ILO','ISA','MAK','PAG','PAL','PANG','RIZ','TAC','TAG','ZAM']

const DESIGNATED_MANAGERS = [
  // Service Managers
  {
    nameKey: 'rioja',
    fullName: 'Arnold Rioja',
    role: 'manager',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Admin)',
  },
  {
    nameKey: 'danilo',
    fullName: 'Danilo Carangan',
    role: 'manager',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Admin)',
  },
  {
    nameKey: 'eina',
    fullName: 'Ricky Eina',
    role: 'manager',
    branchCodes: ['MAK'],
    label: '🏢 MAK · Makati',
  },
  {
    nameKey: 'de chavez',
    fullName: 'Limwel De Chavez',
    role: 'manager',
    branchCodes: ['ISA', 'PANG', 'CAB', 'CAMSUR'],
    label: '✏️ ISA, PANG, CAB, CAMSUR',
  },
  // Branch Service Managers
  {
    nameKey: 'almoite',
    fullName: 'Michael Almoite',
    role: 'bsm',
    branchCodes: ['PAL'],
    label: '🏢 PAL · Palawan',
  },
  {
    nameKey: 'coliflores',
    fullName: 'Darel Coliflores',
    role: 'bsm',
    branchCodes: ['TAC'],
    label: '🏢 TAC · Tacloban',
  },
  {
    nameKey: 'calvo',
    fullName: 'Jessriel Calvo',
    role: 'bsm',
    branchCodes: ['CEB'],
    filterMatch: (nameNorm) => nameNorm.includes('jessriel') || (nameNorm.includes('calvo') && !nameNorm.includes('jerus')),
    label: '🏢 CEB · Cebu',
  },
  {
    nameKey: 'sacuan',
    fullName: 'Gerald Sacuan',
    role: 'bsm',
    branchCodes: ['CDO', 'BUT', 'PAG', 'ZAM', 'BUK'],
    label: '✏️ North Mindanao',
  },
  {
    nameKey: 'genabe',
    fullName: 'Martin Genabe',
    role: 'bsm',
    branchCodes: ['TAG', 'DAV', 'GENSAN'],
    label: '✏️ South Mindanao',
  },
  // Service Coordinators
  {
    nameKey: 'venus',
    fullName: 'Venus Liloan',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'angelie',
    fullName: 'Angelie Tamondong',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'arianne',
    fullName: 'Arianne Espinosa',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'philip',
    fullName: 'June Philip Garcia',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'sioco',
    fullName: 'John Trent Sioco',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'natan',
    fullName: 'Dennis Natan',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'yumang',
    fullName: 'Don Alexander Yumang',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
  {
    nameKey: 'templa',
    fullName: 'Marvin Jay Templa',
    role: 'coordinator',
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Coordinator)',
  },
]

export default function AvailabilityPanel({ currentMonth }) {
  const { jobs, inScope, visibleStaff, branches, staff, appUsers, currentUser, editableBranchIds, scopedBranchIds, loadStaff, loadAppUsers, loadJobs, isAdmin } = useApp()
  const [mode,         setMode]         = useState('month')   // 'month' | 'day'
  const [availDay,     setAvailDay]     = useState(ymd(new Date()))
  const [search,       setSearch]       = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [refreshing,   setRefreshing]   = useState(false)

  const isFieldStaff = currentUser?.role === 'senior_fse' ||
                       currentUser?.role === 'junior_fse' ||
                       currentUser?.role === 'field_service_engineer' ||
                       currentUser?.role === 'trainee'

  const isServiceManager = currentUser?.role === 'service_manager' || currentUser?.role === 'branch'

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

  // Determine current field staff's branch code(s)
  const myBranchCodes = useMemo(() => {
    if (!currentUser) return []
    const ids = [
      ...(currentUser.main_branch_id ? [currentUser.main_branch_id] : []),
      ...(currentUser.edit_branch_ids || []),
      ...(currentUser.branch_ids || []),
      ...(currentUser.view_branch_ids || []),
    ]
    const myStaffObj = staff?.find(s => s.name?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase())
    if (myStaffObj?.home_branch_id && !ids.includes(myStaffObj.home_branch_id)) {
      ids.push(myStaffObj.home_branch_id)
    }
    return Array.from(new Set(ids.map(id => branches.find(b => b.id === id)?.name).filter(Boolean)))
  }, [currentUser, staff, branches])

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
    if (!s) return { label: '—', isAll: false, branchIds: [] }
    const sNameNorm = (s.name || '').trim().toLowerCase()

    // 0. Check if this person is a coordinator or admin
    if (s.role === 'admin') {
      return { label: '🌐 All Branches (Admin)', isAll: true, branchIds: branches.map(b => b.id) }
    }
    if (isPersonCoordinator(s) || s.role === 'coordinator' || s.role === 'service_coordinator') {
      return { label: '🌐 All Branches (Coordinator)', isAll: true, branchIds: branches.map(b => b.id) }
    }

    // 1. Check if user exists in appUsers with custom branch permissions
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
      if (matchedUser.role === 'service_coordinator' || matchedUser.role === 'coordinator') {
        return { label: '🌐 All Branches (Coordinator)', isAll: true, branchIds: branches.map(b => b.id) }
      }
      const uCanEdit = matchedUser.can_edit !== false
      let uEditBranches = []
      if (uCanEdit) {
        if (matchedUser.edit_branch_ids && matchedUser.edit_branch_ids.length > 0) {
          uEditBranches = [...matchedUser.edit_branch_ids]
          if (matchedUser.main_branch_id && !uEditBranches.includes(matchedUser.main_branch_id)) {
            uEditBranches.unshift(matchedUser.main_branch_id)
          }
        } else {
          uEditBranches = (matchedUser.branch_ids || []).filter(b => !(matchedUser.view_branch_ids || []).includes(b))
          if (matchedUser.main_branch_id && !uEditBranches.includes(matchedUser.main_branch_id) && !(matchedUser.view_branch_ids || []).includes(matchedUser.main_branch_id)) {
            uEditBranches.unshift(matchedUser.main_branch_id)
          }
        }
      }

      const uViews = matchedUser.view_branch_ids?.length > 0
        ? matchedUser.view_branch_ids
        : (!uCanEdit ? (matchedUser.branch_ids || []) : [])

      const allIds = Array.from(new Set([...(matchedUser.branch_ids || []), ...uEditBranches, ...uViews]))
      const editLabel = formatBranchSummary(uEditBranches, branches)
      const viewLabel = formatBranchSummary(uViews, branches)

      if (uEditBranches.length > 0 && uViews.length > 0) {
        return {
          label: `✏️ ${editLabel} · 📍 ${viewLabel}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      if (uEditBranches.length > 0) {
        return {
          label: uEditBranches.length === 1 ? `🏢 ${editLabel}` : `✏️ ${editLabel}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      if (uViews.length > 0) {
        return {
          label: `📍 ${viewLabel}`,
          isAll: false,
          branchIds: allIds,
        }
      }

      const uBranches = matchedUser.branch_ids || []
      const sumLabel = formatBranchSummary(uBranches, branches)
      return {
        label: sumLabel !== '—' ? `🏢 ${sumLabel}` : '—',
        isAll: sumLabel === 'All Branches',
        branchIds: uBranches,
      }
    }

    // 2. Check designated manager mapping
    const desMgr = DESIGNATED_MANAGERS.find(m => {
      if (m.filterMatch) return m.filterMatch(sNameNorm)
      return sNameNorm.includes(m.nameKey)
    })
    if (desMgr) {
      const bIds = desMgr.branchCodes.map(c => branches.find(b => b.name === c)?.id).filter(Boolean)
      return {
        label: desMgr.label,
        isAll: false,
        branchIds: bIds,
      }
    }

    const homeB = branches.find(b => b.id === s.home_branch_id)
    if (!homeB) {
      return { label: '—', isAll: false, branchIds: [] }
    }
    return {
      label: `🏢 ${homeB.name}`,
      isAll: false,
      branchIds: [homeB.id],
    }
  }

  // Helper to accurately identify if a person is a Service Coordinator
  function isPersonCoordinator(s) {
    if (!s) return false
    const r = (s.role || '').toLowerCase()
    if (r === 'coordinator' || r === 'service_coordinator') return true

    const sNameNorm = (s.name || '').trim().toLowerCase()
    if (!sNameNorm) return false

    // 1. Check designated managers list for coordinator role
    const desMgr = DESIGNATED_MANAGERS.find(m => {
      if (m.filterMatch) return m.filterMatch(sNameNorm)
      return sNameNorm.includes(m.nameKey)
    })
    if (desMgr && desMgr.role === 'coordinator') return true

    // 2. Check app_users for service_coordinator or coordinator role
    const matchedUser = appUsers?.find(u => {
      const uNameNorm = u.name?.trim().toLowerCase() || ''
      if (!uNameNorm) return false
      return uNameNorm === sNameNorm || sNameNorm.includes(uNameNorm) || uNameNorm.includes(sNameNorm)
    })
    if (matchedUser && (matchedUser.role === 'service_coordinator' || matchedUser.role === 'coordinator')) {
      return true
    }

    return false
  }

  // filter by search term and branch
  const searchTerm = search.trim().toLowerCase()
  const filteredRoster = useMemo(() => {
    if (isFieldStaff) {
      // Find strictly designated managers (exclude coordinators) for this field staff's branch
      const matchedDesManagers = DESIGNATED_MANAGERS.filter(desMgr => {
        if (desMgr.role === 'coordinator') return false
        if (myBranchCodes.length === 0) return true
        return desMgr.branchCodes.some(code => myBranchCodes.includes(code))
      })

      return matchedDesManagers.map(desMgr => {
        const found = staff?.find(s => {
          const sNorm = s.name.trim().toLowerCase()
          if (desMgr.filterMatch) return desMgr.filterMatch(sNorm)
          return sNorm.includes(desMgr.nameKey)
        })

        if (found) {
          return {
            ...found,
            role: desMgr.role,
            _displayLabel: desMgr.label,
          }
        }

        return {
          id: 'des-' + desMgr.nameKey,
          name: desMgr.fullName,
          role: desMgr.role,
          _displayLabel: desMgr.label,
        }
      })
    }

    if (isServiceManager) {
      // Service Manager & Branch: strictly show senior, junior, and trainee under their managed/editable branches
      const myManagedBranchIds = (editableBranchIds && editableBranchIds.length > 0)
        ? editableBranchIds
        : (scopedBranchIds || [])

      const roster = (staff || []).filter(s => {
        if (s.name?.toLowerCase().includes('eileen')) return false
        if (!isAdmin && isPersonCoordinator(s)) return false
        const r = (s.role || '').toLowerCase()
        const isTech = r === 'senior' || r === 'senior_fse' || r === 'junior' || r === 'junior_fse' || r === 'field_service_engineer' || r === 'trainee'
        if (!isTech) return false
        if (myManagedBranchIds.length > 0 && !myManagedBranchIds.includes(s.home_branch_id)) return false
        return true
      })

      return roster.filter(s => {
        if (searchTerm && !s.name.toLowerCase().includes(searchTerm)) return false
        return true
      })
    }

    // Admin & other roles:
    // Only Admin can view service coordinators
    let roster = [...visibleStaff()]

    // Integrate designated managers (and coordinators ONLY if admin)
    DESIGNATED_MANAGERS.forEach(des => {
      if (des.role === 'coordinator' && !isAdmin) return
      const idx = roster.findIndex(s => {
        const sNorm = s.name.trim().toLowerCase()
        if (des.filterMatch) return des.filterMatch(sNorm)
        return sNorm.includes(des.nameKey)
      })
      if (idx >= 0) {
        roster[idx] = { ...roster[idx], role: des.role, _displayLabel: des.label }
      } else {
        roster.push({
          id: 'des-' + des.nameKey,
          name: des.fullName,
          role: des.role,
          _displayLabel: des.label,
        })
      }
    })

    // Also include any appUsers (include service_coordinator ONLY if admin)
    ;(appUsers || []).forEach(u => {
      if (!u.name || u.email?.toLowerCase().includes('eileen')) return
      const isCoord = u.role === 'service_coordinator' || u.role === 'coordinator'
      if (isCoord && !isAdmin) return

      const uNorm = u.name.trim().toLowerCase()
      const existingIdx = roster.findIndex(s => {
        const sNorm = s.name.trim().toLowerCase()
        return sNorm === uNorm || sNorm.includes(uNorm) || uNorm.includes(sNorm)
      })
      if (existingIdx >= 0) {
        if (isCoord && isAdmin) {
          roster[existingIdx] = {
            ...roster[existingIdx],
            role: 'coordinator',
            _displayLabel: '🌐 All Branches (Coordinator)',
          }
        }
      } else if (isCoord || u.role === 'service_manager') {
        roster.push({
          id: u.id,
          name: u.name,
          role: isCoord ? 'coordinator' : u.role === 'service_manager' ? 'manager' : u.role,
          _displayLabel: isCoord ? '🌐 All Branches (Coordinator)' : undefined,
          home_branch_id: u.main_branch_id || u.branch_ids?.[0] || '',
        })
      }
    })

    if (!isAdmin) {
      roster = roster.filter(s => !isPersonCoordinator(s))
    }

    return roster.filter(s => {
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm)) return false
      if (branchFilter) {
        const info = getStaffBranchInfo(s)
        if (info.isAll) return true
        if (!info.branchIds.includes(branchFilter)) return false
      }
      return true
    })
  }, [isFieldStaff, isServiceManager, myBranchCodes, staff, visibleStaff, searchTerm, branchFilter, branches, appUsers, isAdmin])

  // group by role: coordinator group only shown to admin
  const activeRoles = isFieldStaff
    ? ['manager', 'bsm']
    : isServiceManager
      ? ['senior', 'junior', 'trainee']
      : isAdmin
        ? ROLE_ORDER
        : ROLE_ORDER.filter(r => r !== 'coordinator')

  const grouped = activeRoles.reduce((acc, r) => {
    acc[r] = filteredRoster.filter(s => {
      const isCoord = isPersonCoordinator(s)
      if (r === 'coordinator') return isCoord
      if (isCoord) return false
      if (r === 'manager') return s.role === 'manager' || s.role === 'service_manager'
      if (r === 'senior') return s.role === 'senior' || s.role === 'senior_fse'
      if (r === 'junior') return s.role === 'junior' || s.role === 'junior_fse' || s.role === 'field_service_engineer'
      return s.role === r
    })
    return acc
  }, {})

  return (
    <div className="panel avail">
      <div className="panel-head">
        <h2>{isFieldStaff ? 'Assigned Managers' : 'Staff Schedule'}</h2>
      </div>
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
        {/* Search staff & Branch filter (only for non-field staff, branch filter hidden for service managers) */}
        {!isFieldStaff && (
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
            {!isServiceManager && (
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
            )}
          </div>
        )}
      </div>

      <div className="avail-body">
        {activeRoles.map(r => {
          const grp = grouped[r] || []
          if (!grp.length) return null
          return (
            <div key={r} className="role-group">
              <h3>
                <span className="swatch" style={{ background: ROLES[r]?.color }} />
                {ROLES[r]?.label}
                <span className="cnt">{grp.length}</span>
              </h3>
              {grp.map(s => {
                const tasks = tasksFor(s.id)
                const isCoord = isPersonCoordinator(s) || s.role === 'coordinator' || s.role === 'service_coordinator'
                const rawInfo = getStaffBranchInfo(s)
                const branchInfo = isCoord
                  ? { label: '🌐 All Branches (Coordinator)', isAll: true, branchIds: branches.map(b => b.id) }
                  : s._displayLabel
                    ? { label: s._displayLabel, isAll: s._displayLabel.includes('🌐') || s._displayLabel.includes('All Branches'), branchIds: rawInfo.branchIds }
                    : rawInfo
                return (
                  <div key={s.id} className={`person${tasks.length === 0 ? ' free' : ' busy-row'}`}>
                    <div className="person-main">
                      <div className="person-top-row">
                        <div className="pname" title={s.name}>{s.name}</div>
                        <div className="person-status-area">
                          <StaffStatusBadge tasks={tasks} />
                          {s.hotline && <span className="htag" title="Hotline Staff">☎</span>}
                        </div>
                      </div>
                      <div
                        className="pmeta"
                        style={{
                          color: branchInfo.isAll ? 'var(--senior)' : 'var(--muted)',
                          fontWeight: branchInfo.isAll ? 600 : 400,
                        }}
                        title={branchInfo.label}
                      >
                        {branchInfo.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
        {filteredRoster.length === 0 && (
          <div className="empty-note">
            {isFieldStaff ? 'No manager assigned for your branch.' : (searchTerm ? `No staff matching "${search}".` : 'No staff found.')}
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
