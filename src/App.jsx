import { useState, useEffect } from 'react'
import { useApp } from './lib/AppContext'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import AppHeader from './components/AppHeader'
import CalendarView from './components/CalendarView'
import ReportsView from './components/ReportsView'
import OverviewView from './components/OverviewView'
import KpiRow from './components/KpiRow'
import JobModal from './components/JobModal'
import StaffModal from './components/StaffModal'
import BranchModal from './components/BranchModal'
import UsersModal from './components/UsersModal'
import KpiDrillModal from './components/KpiDrillModal'
import RegistrationApprovalModal from './components/RegistrationApprovalModal'
import UpdateNotifierModal from './components/UpdateNotifierModal'

// Arnold is identified by his app_users name. Swap to email check if preferred:
// const isArnold = currentUser?.email === 'arnold@esprint.com'
const ARNOLD_NAME = 'Arnold'

export default function App() {
  const { currentUser, loading, pendingRegCount } = useApp()

  // 'login' | 'register' — controls pre-auth screen
  const [authView, setAuthView] = useState('login')

  const [view,         setView]        = useState('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [reportMonth, setReportMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })

  // modal states
  const [jobModal,      setJobModal]      = useState(null)   // null | { date, job? }
  const [staffOpen,     setStaffOpen]     = useState(false)
  const [branchOpen,    setBranchOpen]    = useState(false)
  const [usersOpen,     setUsersOpen]     = useState(false)
  const [kpiDrill,      setKpiDrill]      = useState(null)   // null | { kind }
  const [regApprovalOpen, setRegApprovalOpen] = useState(false)

  // calendar filters
  const [filters,  setFilters]  = useState({ branch: '', emp: '', type: '', status: '' })
  const [rFilters, setRFilters] = useState({ branch: '', emp: '' })

  // Arnold check — matches if the user's name contains 'Arnold'
  const isArnold               = !!(currentUser?.name?.includes(ARNOLD_NAME))
  const isServiceManager       = currentUser?.role === 'service_manager'
  const isServiceCoordinator   = currentUser?.role === 'service_coordinator'
  const isSeniorFSE            = currentUser?.role === 'senior_fse'
  const isJuniorFSE            = currentUser?.role === 'junior_fse' || currentUser?.role === 'field_service_engineer'
  const isTrainee              = currentUser?.role === 'trainee'
  const isEmployee             = currentUser?.role === 'employee'
  const isBranch               = currentUser?.role === 'branch'
  const isAdmin                = currentUser?.role === 'admin'
  const isReadOnlyUser         = currentUser?.role !== 'admin' && (isEmployee || isServiceCoordinator || isSeniorFSE || isJuniorFSE || isTrainee || currentUser?.can_edit === false)
  const canViewOverview        = !isBranch && (isAdmin || isArnold || isServiceManager || isServiceCoordinator)

  // Reset to calendar whenever a non-overview user logs in
  useEffect(() => {
    if (currentUser && !canViewOverview) {
      setView('calendar')
    }
  }, [currentUser?.id])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)' }}>
      Loading…
    </div>
  )

  // ── Pre-auth screens ──────────────────────────────────────────
  if (!currentUser) {
    if (authView === 'register') {
      return <RegisterPage onBack={() => setAuthView('login')} />
    }
    return <LoginPage onRegister={() => setAuthView('register')} />
  }

  return (
    <>
      <AppHeader
        view={view}
        setView={setView}
        onStaff={() => setStaffOpen(true)}
        onBranch={() => setBranchOpen(true)}
        onUsers={() => setUsersOpen(true)}
        onRegApproval={() => setRegApprovalOpen(true)}
        isArnold={isArnold}
        currentUser={currentUser}
        pendingRegCount={pendingRegCount}
      />
      <main>
        <KpiRow
          view={view}
          currentMonth={currentMonth}
          reportMonth={reportMonth}
          onDrill={kind => setKpiDrill({ kind })}
          filters={view === 'calendar' ? filters : null}
        />

        {view === 'calendar' || (view === 'overview' && !canViewOverview) ? (
          <CalendarView
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            filters={filters}
            setFilters={setFilters}
            onOpenJob={payload => setJobModal(payload)}
          />
        ) : view === 'reports' ? (
          <ReportsView
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            rFilters={rFilters}
            setRFilters={setRFilters}
          />
        ) : (
          <OverviewView
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            onOpenJob={payload => setJobModal(payload)}
            scopedBranchIds={
              (isAdmin || isServiceCoordinator)
                ? null
                : (isServiceManager || isBranch || isReadOnlyUser)
                  ? (currentUser?.branch_ids || [])
                  : null
            }
            readOnly={isReadOnlyUser}
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
      {staffOpen      && <StaffModal  onClose={() => setStaffOpen(false)} />}
      {branchOpen     && <BranchModal onClose={() => setBranchOpen(false)} />}
      {usersOpen      && <UsersModal  onClose={() => setUsersOpen(false)} />}
      {regApprovalOpen && (
        <RegistrationApprovalModal onClose={() => setRegApprovalOpen(false)} />
      )}
      {kpiDrill && (
        <KpiDrillModal
          kind={kpiDrill.kind}
          currentMonth={currentMonth}
          reportMonth={reportMonth}
          view={view}
          filters={view === 'calendar' ? filters : (view === 'reports' ? rFilters : null)}
          onClose={() => setKpiDrill(null)}
        />
      )}

      {/* Auto-detect new deployments and prompt user to refresh */}
      <UpdateNotifierModal />
    </>
  )
}
