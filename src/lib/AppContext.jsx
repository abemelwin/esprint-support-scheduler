import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)   // app_users row
  const [loading, setLoading]         = useState(true)

  const [branches, setBranches] = useState([])
  const [staff,    setStaff]    = useState([])
  const [jobs,     setJobs]     = useState([])
  const [appUsers, setAppUsers] = useState([])

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
    setStaff(data || [])
  }, [])

  const loadJobs = useCallback(async () => {
    const { data } = await supabase.from('jobs').select('*').order('date', { ascending: false })
    setJobs(data || [])
  }, [])

  const loadAppUsers = useCallback(async () => {
    const { data } = await supabase.from('app_users').select('*').order('name')
    setAppUsers(data || [])
  }, [])

  useEffect(() => {
    if (!currentUser) return
    loadBranches()
    loadStaff()
    loadJobs()
    if (currentUser.role === 'admin') loadAppUsers()
  }, [currentUser])

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const ch = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' },    () => loadJobs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' },   () => loadStaff())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' },() => loadBranches())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [currentUser])

  // ── Permissions helpers ───────────────────────────────────────
  const isAdmin          = currentUser?.role === 'admin'
  const isServiceManager = currentUser?.role === 'service_manager'
  const scopedBranchIds  = isAdmin ? null : (currentUser?.branch_ids || [])

  function inScope(job) {
    if (!scopedBranchIds) return true
    return scopedBranchIds.includes(job.branch_id)
  }
  function scopedBranches() {
    if (!scopedBranchIds) return branches
    return branches.filter(b => scopedBranchIds.includes(b.id))
  }
  function visibleStaff() {
    if (!scopedBranchIds) return staff
    return staff.filter(s => scopedBranchIds.includes(s.home_branch_id))
  }

  // ── Auth actions ──────────────────────────────────────────────
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AppContext.Provider value={{
      currentUser, loading, isAdmin, isServiceManager,
      branches, staff, jobs, appUsers,
      inScope, scopedBranches, visibleStaff,
      loadBranches, loadStaff, loadJobs, loadAppUsers,
      signIn, signOut,
      setBranches, setStaff, setJobs, setAppUsers,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
