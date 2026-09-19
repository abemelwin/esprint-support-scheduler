import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)   // app_users row
  const [loading, setLoading]         = useState(true)

  const [branches,     setBranches]     = useState([])
  const [staff,        setStaff]        = useState([])
  const [jobs,         setJobs]         = useState([])
  const [appUsers,     setAppUsers]     = useState([])
  const [pendingRegs,  setPendingRegs]  = useState([])   // pending_registrations

  // ── Auth session ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) loadProfile(session.user.id)
      else { setCurrentUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_id', uid)
      .single()
    setCurrentUser(data || null)
    setLoading(false)
  }

  // ── Data loaders ──────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }, [])

  const loadStaff = useCallback(async () => {
    const { data } = await supabase.from('staff').select('*').order('name')
    const filtered = (data || []).filter(s => !s.name?.toLowerCase().includes('eileen'))
    setStaff(filtered)
  }, [])

  const loadJobs = useCallback(async () => {
    const { data } = await supabase.from('jobs').select('*').order('date', { ascending: false })
    setJobs(data || [])
  }, [])

  const loadAppUsers = useCallback(async () => {
    const { data } = await supabase.from('app_users').select('*').order('name')
    setAppUsers(data || [])
  }, [])

  const loadPendingRegs = useCallback(async () => {
    const { data } = await supabase
      .from('pending_registrations')
      .select('*')
      .order('created_at', { ascending: false })
    setPendingRegs(data || [])
  }, [])

  useEffect(() => {
    if (!currentUser) return
    loadBranches()
    loadStaff()
    loadJobs()
    loadAppUsers()
    if (currentUser.role === 'admin') {
      loadPendingRegs()
    }
  }, [currentUser])

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return

    // Unique channel name per session avoids a stale/duplicate channel
    // silently failing to (re)subscribe after hot reloads or re-logins.
    const ch = supabase
      .channel(`db-changes-${currentUser.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' },                   () => loadJobs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' },                  () => loadStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' },               () => loadBranches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' },              () => loadAppUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_registrations' },  () => {
        if (currentUser.role === 'admin') loadPendingRegs()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Re-pull once on (re)connect so we never show stale data
          // after a dropped socket / tab wake-up.
          loadJobs()
        }
      })

    // Safety net: when the tab regains focus or comes back online,
    // refresh jobs in case a realtime event was missed while hidden.
    const refreshOnWake = () => { if (document.visibilityState === 'visible') loadJobs() }
    document.addEventListener('visibilitychange', refreshOnWake)
    window.addEventListener('online', refreshOnWake)

    return () => {
      supabase.removeChannel(ch)
      document.removeEventListener('visibilitychange', refreshOnWake)
      window.removeEventListener('online', refreshOnWake)
    }
  }, [currentUser])

  // ── Account management helpers (admin only) ───────────────────
  async function updateUserRole(userId, newRole) {
    const { error } = await supabase
      .from('app_users')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) await loadAppUsers()
    return error
  }

  async function updateUserBranches(userId, branchIds) {
    const { error } = await supabase
      .from('app_users')
      .update({ branch_ids: branchIds })
      .eq('id', userId)
    if (!error) await loadAppUsers()
    return error
  }

  async function toggleUserActive(userId, isActive) {
    const { error } = await supabase
      .from('app_users')
      .update({ is_active: isActive })
      .eq('id', userId)
    if (!error) await loadAppUsers()
    return error
  }

  async function updateUserCanEdit(userId, canEdit) {
    const { error } = await supabase
      .from('app_users')
      .update({ can_edit: canEdit })
      .eq('id', userId)
    if (!error) await loadAppUsers()
    return error
  }

  // ── Permissions helpers ───────────────────────────────────────
  const isAdmin          = currentUser?.role === 'admin'
  const isServiceManager = currentUser?.role === 'service_manager'
  // Roles that can view job tickets but must never create/edit them.
  const VIEW_ONLY_ROLES  = ['service_coordinator', 'senior_fse', 'junior_fse', 'field_service_engineer', 'trainee', 'employee']
  const isViewOnlyRole   = VIEW_ONLY_ROLES.includes(currentUser?.role)

  // All branches accessible (Main + Assigned + View-only + Edit)
  const scopedBranchIds = isAdmin
    ? null
    : Array.from(new Set([
        ...(currentUser?.main_branch_id ? [currentUser.main_branch_id] : []),
        ...(currentUser?.edit_branch_ids || []),
        ...(currentUser?.branch_ids || []),
        ...(currentUser?.view_branch_ids || []),
      ]))

  // Branch IDs where the user has edit/create permissions
  const editableBranchIds = isAdmin
    ? null
    : (isViewOnlyRole || currentUser?.can_edit === false)
      ? []
      : (currentUser?.edit_branch_ids && currentUser.edit_branch_ids.length > 0)
        ? Array.from(new Set([
            ...(currentUser.main_branch_id ? [currentUser.main_branch_id] : []),
            ...currentUser.edit_branch_ids,
          ]))
        : currentUser?.main_branch_id
          ? Array.from(new Set([
              currentUser.main_branch_id,
              ...(currentUser.branch_ids || []).filter(id => !(currentUser.view_branch_ids || []).includes(id)),
            ]))
          : (currentUser?.branch_ids || []).filter(id => !(currentUser?.view_branch_ids || []).includes(id))

  function canEditBranch(branchId) {
    if (!currentUser) return false
    if (isAdmin) return true
    if (isViewOnlyRole) return false
    if (currentUser.can_edit === false) return false
    if (!branchId) return (editableBranchIds === null || editableBranchIds.length > 0)
    if (editableBranchIds === null) return true
    return editableBranchIds.includes(branchId)
  }

  function inScope(job) {
    if (!scopedBranchIds) return true
    return scopedBranchIds.includes(job.branch_id)
  }
  function scopedBranches() {
    if (!scopedBranchIds) return branches
    return branches.filter(b => scopedBranchIds.includes(b.id))
  }
  function visibleStaff() {
    const activeStaff = staff.filter(s => !s.name?.toLowerCase().includes('eileen'))
    if (!scopedBranchIds) return activeStaff
    return activeStaff.filter(s => scopedBranchIds.includes(s.home_branch_id))
  }

  // ── Auth actions ──────────────────────────────────────────────
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }
  async function signOut() {
    await supabase.auth.signOut()
  }

  // Count of pending registration requests (for badge)
  const pendingRegCount = pendingRegs.filter(r => r.status === 'pending').length

  return (
    <AppContext.Provider value={{
      currentUser, loading, isAdmin, isServiceManager,
      branches, staff, jobs, appUsers, pendingRegs, pendingRegCount,
      inScope, scopedBranches, visibleStaff, canEditBranch, editableBranchIds, scopedBranchIds,
      loadBranches, loadStaff, loadJobs, loadAppUsers, loadPendingRegs,
      signIn, signOut,
      setBranches, setStaff, setJobs, setAppUsers,
      updateUserRole, updateUserBranches, toggleUserActive, updateUserCanEdit,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
