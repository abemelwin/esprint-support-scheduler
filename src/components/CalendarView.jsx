import { useState, useMemo, useRef } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import { ymd, monthName, mondayOf, addDays, sameYMD } from '../lib/dates'
import { TYPES, STATUS, DOW, namesMatch } from '../lib/constants'
import { cleanNetsuiteUrl } from '../lib/netsuite'
import AvailabilityPanel from './AvailabilityPanel'
import DayDetailModal from './DayDetailModal'

export default function CalendarView({ currentMonth, setCurrentMonth, filters, setFilters, onOpenJob }) {
  const { jobs, branches, staff, appUsers, inScope, currentUser, isAdmin, canEditBranch, setJobs, loadJobs } = useApp()
  const [draggedJob, setDraggedJob] = useState(null)
  const [dragOverDate, setDragOverDate] = useState(null)
  const [dayDetail, setDayDetail] = useState(null)   // { dateKey, jobs }
  const dragJustEndedRef = useRef(false)

  const isFieldStaff = currentUser?.role === 'senior_fse' ||
                       currentUser?.role === 'junior_fse' ||
                       currentUser?.role === 'field_service_engineer' ||
                       currentUser?.role === 'trainee'

  // Service Coordinator (and other view-only roles) keep the full calendar
  // view + filters, but must NOT be able to open the New/Edit Job Ticket
  // modal â€” same as field staff, clicking a day or chip does nothing.
  const canOpenJobModal = isAdmin || canEditBranch()

  function canDragJob(j) {
    if (isFieldStaff || !canOpenJobModal) return false
    return isAdmin || canEditBranch(j.branch_id)
  }

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

  const staffById   = id => staff.find(s => s.id === id)
  const branchById  = id => branches.find(b => b.id === id)

  // Find matching staff record(s) for currently logged in field staff
  const myStaffIds = useMemo(() => {
    if (!currentUser) return []
    const uName = currentUser.name?.trim().toLowerCase() || ''
    if (!uName) return []
    const uTokens = uName.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 1)

    const matched = staff.filter(s => {
      const sName = s.name.trim().toLowerCase()
      if (sName === uName) return true
      if (sName.includes(uName) || uName.includes(sName)) return true
      const sTokens = sName.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 1)
      const commonTokens = uTokens.filter(t => sTokens.includes(t))
      return commonTokens.length >= 2 || (uTokens.length === 1 && commonTokens.length === 1)
    })
    return matched.map(s => s.id)
  }, [currentUser, staff])

  function isJobAssignedToMe(j) {
    if (!currentUser) return false
    if (myStaffIds.includes(j.staff_id)) return true
    const s = staffById(j.staff_id)
    if (!s) return false
    const uName = currentUser.name?.trim().toLowerCase() || ''
    const sName = s.name.trim().toLowerCase()
    if (sName === uName || sName.includes(uName) || uName.includes(sName)) return true
    const uTokens = uName.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 1)
    const sTokens = sName.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 1)
    const matchedTokens = uTokens.filter(t => sTokens.includes(t))
    return matchedTokens.length >= 2 || (uTokens.length === 1 && matchedTokens.length === 1)
  }

  function filteredJobs(dateKey) {
    return jobs.filter(j => {
      if (!inScope(j)) return false
      if (j.date !== dateKey) return false
      if (isFieldStaff) {
        return isJobAssignedToMe(j)
      }
      if (filters.branch && j.branch_id !== filters.branch) return false
      if (filters.emp    && j.staff_id  !== filters.emp)    return false
      if (filters.type   && j.type      !== filters.type)   return false
      if (filters.status && j.status    !== filters.status) return false
      return true
    })
  }

  // filter dropdowns
  const visibleBranches = branches
  const visibleStaffList = useMemo(() => {
    return (staff || []).filter(s => {
      if (s.name?.toLowerCase().includes('eileen')) return false
      if (!isAdmin) {
        const r = (s.role || '').toLowerCase()
        if (r === 'coordinator' || r === 'service_coordinator') return false
        const matchedUser = appUsers?.find(u => namesMatch(u.name, s.name))
        if (matchedUser && (matchedUser.role === 'coordinator' || matchedUser.role === 'service_coordinator')) return false
      }
      return true
    })
  }, [staff, isAdmin, appUsers])

  return (
    <div>
      {/* toolbar */}
      <div className="toolbar">
        <div className="toolbar-nav-group">
          <div className="month-nav">
            <button className="btn sm" onClick={prevMonth}>â—€</button>
            <div className="month-label">{monthName(currentMonth)}</div>
            <button className="btn sm" onClick={nextMonth}>â–¶</button>
          </div>
          <button className="btn sm today-btn" onClick={goToday}>Today</button>
          {canOpenJobModal && (
            <button
              type="button"
              className="btn primary sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, padding: '5px 12px', borderRadius: 7 }}
              onClick={() => onOpenJob({ date: ymd(new Date()) })}
              title="Create a new job ticket"
            >
              + New Ticket
            </button>
          )}
        </div>

        {!isFieldStaff && (
          <>
            <div className="sep" />
            <div className="toolbar-filters">
              <div className="fl">
                <label>Branch</label>
                <select className="sel" value={filters.branch} onChange={e => setFilters(f => ({...f, branch: e.target.value}))}>
                  <option value="">All Branches</option>
                  {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="fl">
                <label>Employee</label>
                <select className="sel" value={filters.emp} onChange={e => setFilters(f => ({...f, emp: e.target.value}))}>
                  <option value="">All Staff</option>
                  {visibleStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="fl">
                <label>Type</label>
                <select className="sel" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}>
                  <option value="">All Types</option>
                  <option value="installation">Installation</option>
                  <option value="onsite">Onsite</option>
                  <option value="hotline">Hotline</option>
                  <option value="others">Others</option>
                </select>
              </div>
              <div className="fl">
                <label>Status</label>
                <select className="sel" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="success">Successful</option>
                  <option value="fail">Not successful</option>
                </select>
              </div>
              {(filters.branch || filters.emp || filters.type || filters.status) && (
                <button
                  className="btn sm ghost clear-filter-btn"
                  onClick={() => setFilters({ branch: '', emp: '', type: '', status: '' })}
                  title="Reset all filters"
                >
                  âœ• Reset
                </button>
              )}
            </div>
          </>
        )}
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
          <div className="cal-wrap">
            <div className="cal">
              {DOW.map(d => <div key={d} className="dow">{d}</div>)}
              {cells.map(cell => {
                const isOther     = cell.getMonth() !== currentMonth.getMonth()
                const isToday     = sameYMD(cell, today)
                const dateKey     = ymd(cell)
                const dayJobs     = filteredJobs(dateKey)
                const isDragOver  = dragOverDate === dateKey && draggedJob && draggedJob.date !== dateKey

                return (
                  <div
                    key={dateKey}
                    className={`cell${isOther ? ' other' : ''}${isToday ? ' today' : ''}${isDragOver ? ' drag-over' : ''}`}
                    style={{ cursor: (isFieldStaff || !canOpenJobModal) ? 'default' : 'pointer' }}
                    onClick={(isFieldStaff || !canOpenJobModal) ? undefined : () => {
                      if (dragJustEndedRef.current) return
                      onOpenJob({ date: dateKey })
                    }}
                    onDragOver={e => {
                      if (!draggedJob || !canDragJob(draggedJob)) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverDate !== dateKey) {
                        setDragOverDate(dateKey)
                      }
                    }}
                    onDragEnter={e => {
                      if (!draggedJob || !canDragJob(draggedJob)) return
                      e.preventDefault()
                      setDragOverDate(dateKey)
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        if (dragOverDate === dateKey) {
                          setDragOverDate(null)
                        }
                      }
                    }}
                    onDrop={async e => {
                      e.preventDefault()
                      setDragOverDate(null)
                      const jobToMove = draggedJob
                      setDraggedJob(null)

                      if (!jobToMove || !canDragJob(jobToMove)) return
                      if (jobToMove.date === dateKey) return

                      // Optimistic UI update
                      setJobs(prev => prev.map(item => item.id === jobToMove.id ? { ...item, date: dateKey } : item))

                      try {
                        const { error } = await supabase
                          .from('jobs')
                          .update({ date: dateKey })
                          .eq('id', jobToMove.id)

                        if (error) {
                          console.error('Error rescheduling ticket:', error)
                        }
                        await loadJobs()
                      } catch (err) {
                        console.error('Error rescheduling ticket:', err)
                        await loadJobs()
                      }
                    }}
                  >
                    <div className="cell-top-bar">
                      <span className="dnum">{cell.getDate()}</span>
                      {!isFieldStaff && canOpenJobModal && (
                        <button
                          type="button"
                          className="cell-add-btn"
                          title={`Add new ticket on ${dateKey}`}
                          onClick={e => {
                            e.stopPropagation()
                            onOpenJob({ date: dateKey })
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>
                    <div className="jobs">
                      {dayJobs.slice(0, 3).map(j => {
                        const s = staffById(j.staff_id)
                        const cls = TYPES[j.type]?.cls || ''
                        const jtText = j.jt_no || ((j.type === 'leave' || j.type === 'absent') ? TYPES[j.type]?.label : 'â€”')
                        const isAbsence = j.type === 'leave' || j.type === 'absent'
                        const jtLabel = isAbsence ? TYPES[j.type]?.label : j.jt_no

                        if (isFieldStaff) {
                          return (
                            <div
                              key={j.id}
                              className={`jchip ${cls}`}
                              style={{ cursor: 'default', transform: 'none' }}
                              onClick={e => e.stopPropagation()}
                              title={`Netsuite #: ${j.jt_no || 'â€”'}`}
                            >
                              <span className={`st ${STATUS[j.status]?.dot || ''}`} />
                              <span className="jn">{jtText}</span>
                            </div>
                          )
                        }

                        const draggable = canDragJob(j)
                        const isDraggingThis = draggedJob?.id === j.id

                        return (
                          <div
                            key={j.id}
                            draggable={draggable}
                            onDragStart={draggable ? e => {
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', j.id)
                              setDraggedJob(j)
                            } : undefined}
                            onDragEnd={draggable ? () => {
                              setDraggedJob(null)
                              setDragOverDate(null)
                              dragJustEndedRef.current = true
                              setTimeout(() => { dragJustEndedRef.current = false }, 120)
                            } : undefined}
                            className={`jchip ${cls}${isDraggingThis ? ' is-dragging' : ''}${draggable ? ' is-draggable' : ''}`}
                            style={{ cursor: draggable ? 'grab' : (canOpenJobModal ? 'pointer' : 'default') }}
                            title={draggable ? `Drag to reschedule â€¢ NetSuite #: ${jtLabel || 'â€”'}` : undefined}
                            onClick={canOpenJobModal
                              ? e => {
                                  e.stopPropagation()
                                  if (dragJustEndedRef.current) return
                                  onOpenJob({ date: dateKey, job: j })
                                }
                              : e => e.stopPropagation()}
                          >
                            <span className={`st ${STATUS[j.status]?.dot || ''}`} />
                            {j.jt_url && !isAbsence ? (
                              <a
                                className="jn jn-link"
                                href={cleanNetsuiteUrl(j.jt_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                draggable={false}
                                onClick={e => e.stopPropagation()}
                                title={`Open in NetSuite: ${cleanNetsuiteUrl(j.jt_url)}`}
                              >{jtLabel}</a>
                            ) : (
                              <span className="jn">{jtLabel}</span>
                            )}
                            <span className="who">{s?.name?.split(',')[0] || 'â€”'}</span>
                          </div>
                        )
                      })}
                      {dayJobs.length > 3 && (
                        <button
                          type="button"
                          className="cell-more-btn"
                          onClick={e => {
                            e.stopPropagation()
                            setDayDetail({ dateKey, jobs: dayJobs })
                          }}
                        >+{dayJobs.length - 3} more</button>
                      )}
                      {!isFieldStaff && canOpenJobModal && dayJobs.length >= 3 && (
                        <button
                          type="button"
                          className="cell-bottom-add-btn"
                          title={`Add new ticket on ${dateKey}`}
                          onClick={e => {
                            e.stopPropagation()
                            onOpenJob({ date: dateKey })
                          }}
                        >
                          + Add Ticket
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Availability panel */}
        <AvailabilityPanel currentMonth={currentMonth} />
      </div>

      {dayDetail && (
        <DayDetailModal
          dateKey={dayDetail.dateKey}
          jobs={dayDetail.jobs}
          onClose={() => setDayDetail(null)}
          onOpenJob={onOpenJob}
          canOpenJobModal={canOpenJobModal}
        />
      )}
    </div>
  )
}
