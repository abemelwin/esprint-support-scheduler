import { useState } from 'react'
import { useApp } from './lib/AppContext'
import LoginPage from './components/LoginPage'
import AppHeader from './components/AppHeader'
import CalendarView from './components/CalendarView'
import ReportsView from './components/ReportsView'
import KpiRow from './components/KpiRow'
import JobModal from './components/JobModal'
import StaffModal from './components/StaffModal'
import BranchModal from './components/BranchModal'
import UsersModal from './components/UsersModal'
import KpiDrillModal from './components/KpiDrillModal'

export default function App() {
  const { currentUser, loading } = useApp()
  const [view,        setView]        = useState('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [reportMonth, setReportMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  // modal states
  const [jobModal,    setJobModal]    = useState(null)   // null | { date, job? }
  const [staffOpen,   setStaffOpen]   = useState(false)
  const [branchOpen,  setBranchOpen]  = useState(false)
  const [usersOpen,   setUsersOpen]   = useState(false)
  const [kpiDrill,    setKpiDrill]    = useState(null)   // null | { kind }

  // calendar filters
  const [filters, setFilters] = useState({ branch: '', emp: '', type: '', status: '' })
  const [rFilters, setRFilters] = useState({ branch: '', emp: '' })

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)' }}>
      Loading…
    </div>
  )
  if (!currentUser) return <LoginPage />

  return (
    <>
      <AppHeader
        view={view}
        setView={setView}
        onStaff={() => setStaffOpen(true)}
        onBranch={() => setBranchOpen(true)}
        onUsers={() => setUsersOpen(true)}
      />
      <main>
        <KpiRow
          view={view}
          currentMonth={currentMonth}
          reportMonth={reportMonth}
          onDrill={kind => setKpiDrill({ kind })}
        />

        {view === 'calendar' ? (
          <CalendarView
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            filters={filters}
            setFilters={setFilters}
            onOpenJob={payload => setJobModal(payload)}
          />
        ) : (
          <ReportsView
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            rFilters={rFilters}
            setRFilters={setRFilters}
          />
        )}

        <div className="footer-note">
          Data is stored in Supabase and syncs in real-time across all users.
        </div>
      </main>

      {jobModal && (
        <JobModal
          payload={jobModal}
          onClose={() => setJobModal(null)}
        />
      )}
      {staffOpen  && <StaffModal  onClose={() => setStaffOpen(false)} />}
      {branchOpen && <BranchModal onClose={() => setBranchOpen(false)} />}
      {usersOpen  && <UsersModal  onClose={() => setUsersOpen(false)} />}
      {kpiDrill   && (
        <KpiDrillModal
          kind={kpiDrill.kind}
          currentMonth={currentMonth}
          reportMonth={reportMonth}
          view={view}
          onClose={() => setKpiDrill(null)}
        />
      )}
    </>
  )
}
