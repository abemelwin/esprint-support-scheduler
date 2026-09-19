import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase, supabaseSignup } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'
import { REGIONS } from '../lib/constants'

const ROLE_OPTIONS = [
  { value: 'admin',                  label: 'Admin'                   },
  { value: 'service_manager',        label: 'Service Manager'         },
  { value: 'service_coordinator',    label: 'Service Coordinator'     },
  { value: 'branch',                 label: 'Branch User'             },
  { value: 'senior_fse',             label: 'Senior FSE'             },
  { value: 'junior_fse',             label: 'Junior FSE'             },
  { value: 'trainee',                label: 'Trainee'                },
]

const ROLE_LABEL = {
  admin:                  'Admin',
  service_manager:        'Service Manager',
  service_coordinator:    'Service Coordinator',
  senior_fse:             'Senior FSE',
  junior_fse:             'Junior FSE',
  field_service_engineer: 'Junior FSE',
  trainee:                'Trainee',
  branch:                 'Branch User',
}

function getRegionBranchIds(regionKey, allBranches) {
  const codes = REGIONS[regionKey] || []
  return allBranches.filter(b => codes.includes(b.name)).map(b => b.id)
}

function getLuzonBranchIds(allBranches) {
  const codes = [...(REGIONS['North Luzon'] || []), ...(REGIONS['South Luzon'] || [])]
  return allBranches.filter(b => codes.includes(b.name)).map(b => b.id)
}

function getMindanaoBranchIds(allBranches) {
  const codes = [...(REGIONS['North Mindanao'] || []), ...(REGIONS['South Mindanao'] || [])]
  return allBranches.filter(b => codes.includes(b.name)).map(b => b.id)
}

function getVisayasBranchIds(allBranches) {
  const codes = REGIONS['Visayas'] || []
  return allBranches.filter(b => codes.includes(b.name)).map(b => b.id)
}

// ── View Only / Can Edit toggle ───────────────────────────────────────────────
function AccessToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content', marginTop: 2 }}>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          background: !value ? 'var(--accent, #2a78d6)' : 'var(--surface)',
          color:      !value ? '#fff' : 'var(--muted)',
          transition: 'background .15s, color .15s',
        }}
      >
        🔒 View Only
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          border: 'none',
          borderLeft: '1px solid var(--border)',
          cursor: 'pointer',
          background: value ? 'var(--accent, #2a78d6)' : 'var(--surface)',
          color:      value ? '#fff' : 'var(--muted)',
          transition: 'background .15s, color .15s',
        }}
      >
        ✏️ Can Edit
      </button>
    </div>
  )
}

export default function UsersModal({ onClose }) {
  const {
    appUsers, branches, staff, currentUser, loadAppUsers, loadStaff,
    updateUserRole, updateUserBranches, toggleUserActive,
  } = useApp()

  const [activeTab,    setActiveTab]    = useState('list') // 'list' | 'add'
  const [successMsg,   setSuccessMsg]   = useState('')
  const [refreshing,   setRefreshing]   = useState(false)

  // Hide super admin Eileen from user management list unless logged in as Eileen
  const isSelfEileen = currentUser?.email?.toLowerCase().includes('eileen') || currentUser?.name?.toLowerCase().includes('eileen')
  const baseUsers = appUsers.filter(u => {
    const isEileen = u.email?.toLowerCase().includes('eileen') || u.name?.toLowerCase().includes('eileen')
    if (isEileen && !isSelfEileen) return false
    return true
  })

  function showSuccess(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4500)
  }

  async function handleManualRefresh() {
    setRefreshing(true)
    await Promise.all([loadAppUsers(), loadStaff()])
    setRefreshing(false)
    showSuccess('✓ Directory and staff schedule refreshed!')
  }

  // ── Add user form ─────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'service_manager',
    edit_branch_ids: [], view_branch_ids: [], branch_ids: [], can_edit: true
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  // ── Edit state ────────────────────────────────────────────────
  const [editId,           setEditId]           = useState(null)   // user id being edited
  const [editName,         setEditName]         = useState('')
  const [editEmail,        setEditEmail]        = useState('')
  const [editPassword,     setEditPassword]     = useState('')
  const [editRole,         setEditRole]         = useState('')
  const [editCanEdit,      setEditCanEdit]      = useState(true)
  const [editEditBranches, setEditEditBranches] = useState([])
  const [editViewBranches, setEditViewBranches] = useState([])
  const [editBranchTab,    setEditBranchTab]    = useState('edit') // 'edit' | 'view'
  const [addBranchTab,     setAddBranchTab]     = useState('edit')  // 'edit' | 'view'
  const [editBusy,         setEditBusy]         = useState(false)
  const [editErr,          setEditErr]          = useState('')

  // ── Search & Filter State for Existing Users ─────────────────
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Filtered users logic
  const searchTerm = search.trim().toLowerCase()
  const filteredUsers = baseUsers.filter(u => {
    // 1. User search by name or email
    if (searchTerm) {
      const matchName  = u.name?.toLowerCase().includes(searchTerm)
      const matchEmail = u.email?.toLowerCase().includes(searchTerm)
      if (!matchName && !matchEmail) return false
    }

    // 2. Role filter
    if (roleFilter && u.role !== roleFilter) {
      return false
    }

    // 3. Branch filter
    if (branchFilter) {
      const uMain = u.main_branch_id || u.branch_ids?.[0] || ''
      const uViews = u.view_branch_ids || []
      const uBranches = Array.from(new Set([...(uMain ? [uMain] : []), ...(u.branch_ids || []), ...uViews]))
      const isAllBranchesUser = branches.length > 0 && branches.every(b => uBranches.includes(b.id))
      
      if (branchFilter === '__all__') {
        if (u.role !== 'admin' && !isAllBranchesUser) return false
      } else if (branchFilter === '__unassigned__') {
        if (u.role === 'admin' || uBranches.length > 0) return false
      } else {
        const hasBranch = uBranches.includes(branchFilter)
        const isAdminAccess = u.role === 'admin'
        if (!hasBranch && !isAdminAccess) return false
      }
    }

    // 4. Status / Access filter
    if (statusFilter) {
      const isActive = u.is_active ?? true
      const canEdit  = u.can_edit !== false
      if (statusFilter === 'active'    && !isActive) return false
      if (statusFilter === 'inactive'  && isActive)  return false
      if (statusFilter === 'can_edit'  && !canEdit)  return false
      if (statusFilter === 'view_only' && canEdit)   return false
    }

    return true
  })

  const isFiltered = !!(searchTerm || roleFilter || branchFilter || statusFilter)

  function resetFilters() {
    setSearch('')
    setRoleFilter('')
    setBranchFilter('')
    setStatusFilter('')
  }

  function toggleAddEditBranch(id) {
    setForm(f => {
      const curEdit = f.edit_branch_ids || []
      const nextEdit = curEdit.includes(id)
        ? curEdit.filter(b => b !== id)
        : [...curEdit, id]
      return {
        ...f,
        edit_branch_ids: nextEdit,
      }
    })
  }

  function toggleAddViewBranch(id) {
    setForm(f => {
      const curView = f.view_branch_ids || []
      const nextView = curView.includes(id)
        ? curView.filter(b => b !== id)
        : [...curView, id]
      return {
        ...f,
        view_branch_ids: nextView,
      }
    })
  }

  function toggleEditEditBranch(id) {
    setEditEditBranches(cur =>
      cur.includes(id) ? cur.filter(b => b !== id) : [...cur, id]
    )
  }

  function toggleEditViewBranch(id) {
    setEditViewBranches(cur =>
      cur.includes(id) ? cur.filter(b => b !== id) : [...cur, id]
    )
  }

  function startEdit(u) {
    setEditId(u.id)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditPassword('') // Leave blank unless changing
    setEditRole(u.role)
    setEditCanEdit(u.can_edit !== false)
    
    // Resolve editable branches & view branches
    const canEdit = u.can_edit !== false
    let uEditBranches = []
    let uViewBranches = []

    if (!canEdit) {
      uViewBranches = u.view_branch_ids?.length > 0 ? u.view_branch_ids : (u.branch_ids || [])
    } else {
      if (u.edit_branch_ids && u.edit_branch_ids.length > 0) {
        uEditBranches = [...u.edit_branch_ids]
        if (u.main_branch_id && !uEditBranches.includes(u.main_branch_id)) {
          uEditBranches.unshift(u.main_branch_id)
        }
      } else {
        const viewSet = new Set(u.view_branch_ids || [])
        uEditBranches = (u.branch_ids || []).filter(b => !viewSet.has(b))
        if (u.main_branch_id && !uEditBranches.includes(u.main_branch_id) && !viewSet.has(u.main_branch_id)) {
          uEditBranches.unshift(u.main_branch_id)
        }
      }
      uViewBranches = u.view_branch_ids || []
    }

    setEditEditBranches(uEditBranches)
    setEditViewBranches(uViewBranches)
    setEditErr('')
  }

  function cancelEdit() {
    setEditId(null); setEditErr('')
  }

  async function saveEdit(u) {
    if (!editName.trim()) {
      setEditErr('Full name is required.'); return
    }
    if (!editEmail.trim()) {
      setEditErr('Email address is required.'); return
    }
    if (editPassword.trim() && editPassword.trim().length < 6) {
      setEditErr('Password must be at least 6 characters.'); return
    }

    const needsBranch = editRole !== 'admin'
    if (needsBranch && editEditBranches.length === 0 && editViewBranches.length === 0) {
      setEditErr('Please assign at least one branch (Can Edit or Viewing Only).'); return
    }

    // Check if email already used by another user
    const existingOther = appUsers.find(
      x => x.id !== u.id && x.email?.trim().toLowerCase() === editEmail.trim().toLowerCase()
    )
    if (existingOther) {
      setEditErr('This email is already in use by another user.'); return
    }

    setEditBusy(true); setEditErr('')

    const finalCanEdit = editRole === 'admin' ? true : (editEditBranches.length > 0)
    const combinedBranches = Array.from(new Set([
      ...editEditBranches,
      ...editViewBranches
    ]))
    const mainBranch = editEditBranches[0] || null

    // 1. Update app_users with fallback if main_branch_id / edit_branch_ids / view_branch_ids columns not added yet
    let updateError = null
    const fullPayload = {
      name:            editName.trim(),
      email:           editEmail.trim(),
      role:            editRole,
      main_branch_id:  needsBranch ? mainBranch : null,
      edit_branch_ids: needsBranch ? editEditBranches : [],
      view_branch_ids: needsBranch ? editViewBranches : [],
      branch_ids:      needsBranch ? combinedBranches : [],
      can_edit:        finalCanEdit,
    }

    const { error: err1 } = await supabase
      .from('app_users')
      .update(fullPayload)
      .eq('id', u.id)

    if (err1) {
      if (err1.message?.includes('edit_branch_ids') || err1.message?.includes('main_branch_id') || err1.message?.includes('view_branch_ids')) {
        // Fallback for when SQL migration has not been run yet in Supabase
        const fallbackPayload = {
          name:       editName.trim(),
          email:      editEmail.trim(),
          role:       editRole,
          branch_ids: needsBranch ? combinedBranches : [],
          can_edit:   finalCanEdit,
        }
        const { error: err2 } = await supabase
          .from('app_users')
          .update(fallbackPayload)
          .eq('id', u.id)
        if (err2) updateError = err2
      } else {
        updateError = err1
      }
    }

    if (updateError) {
      setEditErr(updateError.message)
      setEditBusy(false)
      return
    }

    // 2. Update pending_registrations if existing
    if (u.email) {
      try {
        const regUpdates = {
          name:            editName.trim(),
          email:           editEmail.trim(),
          role:            editRole,
          main_branch_id:  needsBranch ? mainBranch : null,
          edit_branch_ids: needsBranch ? editEditBranches : [],
          view_branch_ids: needsBranch ? editViewBranches : [],
          branch_ids:      needsBranch ? combinedBranches : [],
          can_edit:        finalCanEdit,
        }
        if (editPassword.trim()) {
          regUpdates.password = editPassword.trim()
        }
        const { error: regErr } = await supabase
          .from('pending_registrations')
          .update(regUpdates)
          .eq('email', u.email)

        if (regErr && (regErr.message?.includes('edit_branch_ids') || regErr.message?.includes('main_branch_id') || regErr.message?.includes('view_branch_ids'))) {
          await supabase
            .from('pending_registrations')
            .update({
              name:       editName.trim(),
              email:      editEmail.trim(),
              role:       editRole,
              branch_ids: needsBranch ? combinedBranches : [],
              can_edit:   finalCanEdit,
              ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
            })
            .eq('email', u.email)
        }
      } catch (err) {
        console.warn('pending_registrations update skipped:', err)
      }
    }

    // 3. Update auth user credentials (password/email/name) via RPC if available
    if (u.auth_id && (editPassword.trim() || editEmail.trim() !== u.email || editName.trim() !== u.name)) {
      try {
        await supabase.rpc('admin_update_user', {
          target_user_id: u.auth_id,
          new_email:    editEmail.trim() !== u.email ? editEmail.trim() : null,
          new_password: editPassword.trim() ? editPassword.trim() : null,
          new_name:     editName.trim() !== u.name ? editName.trim() : null,
        })
      } catch (rpcErr) {
        console.warn('admin_update_user RPC skipped or unavailable:', rpcErr)
      }
    }

    // 4. Also sync staff table name if staff member exists with matching name
    const matchingStaff = staff.find(s => s.name?.trim().toLowerCase() === u.name?.trim().toLowerCase())
    if (matchingStaff && editName.trim() !== u.name) {
      await supabase.from('staff').update({ name: editName.trim() }).eq('id', matchingStaff.id)
    }

    await Promise.all([loadAppUsers(), loadStaff()])
    setEditBusy(false)
    setEditId(null)
    showSuccess(`✓ User "${editName.trim()}" updated and schedule refreshed!`)
  }

  const needsBranch = form.role !== 'admin'

  async function handleAdd() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr('Name, email and password are required.'); return
    }
    const addEditBranches = form.edit_branch_ids || []
    const addViewBranches = form.view_branch_ids || []
    if (needsBranch && addEditBranches.length === 0 && addViewBranches.length === 0) {
      setErr('Please assign at least one branch (Can Edit or Viewing Only).'); return
    }

    const already = appUsers.find(u => u.email.toLowerCase() === form.email.trim().toLowerCase())
    if (already) { setErr('This email is already in the user list.'); return }

    setBusy(true); setErr('')

    const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
      email:    form.email.trim(),
      password: form.password.trim(),
      options:  { emailRedirectTo: undefined, data: { name: form.name.trim() } },
    })

    if (authError) { setErr(authError.message); setBusy(false); return }

    const uid              = authData?.user?.id
    const isAlreadyInAuth  = authData?.user?.identities?.length === 0

    if (!uid) {
      setErr('Could not create auth user. Make sure "Confirm email" is OFF in Supabase Auth settings.')
      setBusy(false); return
    }
    if (isAlreadyInAuth) {
      setErr('Email already exists in auth. Delete the auth user from Supabase Dashboard first.')
      setBusy(false); return
    }

    const finalCanEdit = form.role === 'admin' ? true : (addEditBranches.length > 0)
    const createdName  = form.name.trim()
    const combinedBranches = Array.from(new Set([
      ...addEditBranches,
      ...addViewBranches,
    ]))
    const mainBranch = addEditBranches[0] || null

    const fullInsert = {
      auth_id:         uid,
      name:            createdName,
      email:           form.email.trim(),
      role:            form.role,
      main_branch_id:  needsBranch ? mainBranch : null,
      edit_branch_ids: needsBranch ? addEditBranches : [],
      view_branch_ids: needsBranch ? addViewBranches : [],
      branch_ids:      needsBranch ? combinedBranches : [],
      can_edit:        finalCanEdit,
      is_active:       true,
      is_approved:     true,
    }

    let insertError = null
    const { error: err1 } = await supabase.from('app_users').insert(fullInsert)
    if (err1) {
      if (err1.message?.includes('edit_branch_ids') || err1.message?.includes('main_branch_id') || err1.message?.includes('view_branch_ids')) {
        const fallbackInsert = {
          auth_id:     uid,
          name:        createdName,
          email:       form.email.trim(),
          role:        form.role,
          branch_ids:  needsBranch ? combinedBranches : [],
          can_edit:    finalCanEdit,
          is_active:   true,
          is_approved: true,
        }
        const { error: err2 } = await supabase.from('app_users').insert(fallbackInsert)
        if (err2) insertError = err2
      } else {
        insertError = err1
      }
    }

    if (insertError) { setErr(insertError.message); setBusy(false); return }

    await Promise.all([loadAppUsers(), loadStaff()])
    setForm({
      name: '', email: '', password: '', role: 'service_manager',
      edit_branch_ids: [], view_branch_ids: [], branch_ids: [], can_edit: true
    })
    setBusy(false)
    setActiveTab('list')
    showSuccess(`✓ User "${createdName}" created and added to directory!`)
  }

  async function handleToggleActive(u) {
    const next = !(u.is_active ?? true)
    await toggleUserActive(u.id, next)
    await Promise.all([loadAppUsers(), loadStaff()])
    showSuccess(`✓ User "${u.name}" ${next ? 'activated' : 'deactivated'}.`)
  }

  const [deleteTarget, setDeleteTarget] = useState(null)

  function handleDelete(id, authId, email, name) {
    setDeleteTarget({ id, authId, email, name })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const { id, authId, email, name } = deleteTarget
    setBusy(true)
    // Also delete the pending_registrations record so the email can re-register
    if (email) {
      await supabase.from('pending_registrations').delete().eq('email', email)
    }
    if (authId) {
      const { error } = await supabase.rpc('delete_auth_user', { user_auth_id: authId })
      if (error) await supabase.from('app_users').delete().eq('id', id)
    } else {
      await supabase.from('app_users').delete().eq('id', id)
    }
    await Promise.all([loadAppUsers(), loadStaff()])
    setDeleteTarget(null)
    setBusy(false)
    showSuccess(`✓ User "${name || email}" removed.`)
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 760, width: '100%' }}>
        {/* ── Modal Head with Segmented Tabs ── */}
        <div className="modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>User Access Management</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="user-tabs-nav">
              <button
                className={`user-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                onClick={() => { setActiveTab('list'); setErr(''); }}
              >
                👥 Users ({baseUsers.length})
              </button>
              <button
                className={`user-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
                onClick={() => { setActiveTab('add'); setErr(''); }}
              >
                ＋ Add User
              </button>
            </div>
            <button className="btn sm ghost" onClick={onClose} title="Close" style={{ fontSize: 14, padding: '4px 8px', borderRadius: 6 }}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '16px 18px' }}>

          {/* Success Toast Banner */}
          {successMsg && (
            <div className="user-success-toast">
              <span>{successMsg}</span>
              <button className="btn sm ghost" onClick={() => setSuccessMsg('')} style={{ color: 'inherit', padding: '1px 6px' }}>✕</button>
            </div>
          )}

          {/* ══════════════ TAB 1: USER LIST ══════════════ */}
          {activeTab === 'list' && (
            <div>
              {/* ── Single-Row Search and Filter Bar ── */}
              <div className="user-filter-bar">
                {/* Search user */}
                <div className="ovl-role-search" style={{ flex: '1 1 180px', minWidth: 160, margin: 0 }}>
                  <span className="ovl-role-search-icon">🔍</span>
                  <input
                    className="ovl-role-search-input"
                    placeholder="Filter by name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <span className="ovl-role-search-clear" onClick={() => setSearch('')}>✕</span>
                  )}
                </div>

                {/* Branch filter */}
                <select
                  className="sel"
                  style={{ fontSize: 12, padding: '5px 8px', flex: '1 1 130px', minWidth: 120 }}
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                >
                  <option value="">All Branches</option>
                  <option value="__all__">🌐 All Branches Access (Admin/Global)</option>
                  <option value="__unassigned__">⚠️ No Branch Assigned</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} · {b.note}</option>
                  ))}
                </select>

                {/* Role filter */}
                <select
                  className="sel"
                  style={{ fontSize: 12, padding: '5px 8px', flex: '0 0 auto', minWidth: 105 }}
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                {/* Status / Access filter */}
                <select
                  className="sel"
                  style={{ fontSize: 12, padding: '5px 8px', flex: '0 0 auto', minWidth: 105 }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                  <option value="can_edit">Can Edit</option>
                  <option value="view_only">View Only</option>
                </select>

                {isFiltered && (
                  <button className="btn-link" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={resetFilters}>
                    ✕ Reset
                  </button>
                )}
              </div>

              {/* Sub-header with counter */}
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                Showing {filteredUsers.length} of {baseUsers.length} users
              </div>

              {/* ── Scrollable User List ── */}
              <div style={{ maxHeight: 'calc(80vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
                {baseUsers.length === 0 && <div className="empty-note">No users yet.</div>}
                {baseUsers.length > 0 && filteredUsers.length === 0 && (
                  <div className="empty-note" style={{ padding: '30px 20px' }}>
                    No users matching your filters.
                    <br />
                    <button className="btn-link" style={{ marginTop: 6 }} onClick={resetFilters}>Clear all filters</button>
                  </div>
                )}

                {filteredUsers.map(u => {
                  const isEditing       = editId === u.id
                  const isActive        = u.is_active ?? true
                  const canEdit         = u.can_edit !== false
                  let uEditBranches     = []
                  let uViewBranches     = []
                  if (!canEdit) {
                    uViewBranches = u.view_branch_ids?.length > 0 ? u.view_branch_ids : (u.branch_ids || [])
                  } else {
                    if (u.edit_branch_ids && u.edit_branch_ids.length > 0) {
                      uEditBranches = [...u.edit_branch_ids]
                      if (u.main_branch_id && !uEditBranches.includes(u.main_branch_id)) {
                        uEditBranches.unshift(u.main_branch_id)
                      }
                    } else {
                      const viewSet = new Set(u.view_branch_ids || [])
                      uEditBranches = (u.branch_ids || []).filter(b => !viewSet.has(b))
                      if (u.main_branch_id && !uEditBranches.includes(u.main_branch_id) && !viewSet.has(u.main_branch_id)) {
                        uEditBranches.unshift(u.main_branch_id)
                      }
                    }
                    uViewBranches = u.view_branch_ids || []
                  }
                  const hasBranches = uEditBranches.length > 0 || uViewBranches.length > 0

                  return (
                    <div key={u.id} className={`user-mgmt-card${!isActive ? ' inactive' : ''}`}>
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="pname" style={{ fontSize: 14 }}>{u.name}</span>
                            <span className={`role-tag ${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span>
                            {u.role !== 'admin' && (
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                                background: canEdit ? '#e8f5e9' : '#fff3e0',
                                color:      canEdit ? '#2e7d32' : '#e65100',
                              }}>
                                {canEdit ? '✏️ Can Edit' : '🔒 View Only'}
                              </span>
                            )}
                            {!isActive && <span className="role-tag" style={{ background: 'var(--st-fail)', color: '#fff' }}>Inactive</span>}
                          </div>
                          <div className="pmeta" style={{ marginTop: 2 }}>{u.email}</div>

                          {/* Enhanced Main & View Branch display */}
                          <div className="user-branch-row">
                            {u.role === 'admin' ? (
                              <span className="user-branch-badge all" title="Administrator has full access to all branches">
                                🌐 All Branches (Admin)
                              </span>
                            ) : !hasBranches ? (
                              <span className="user-branch-badge none" title="No branch assigned to this user">
                                ⚠️ No branch assigned
                              </span>
                            ) : (
                              <>
                                {uEditBranches.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                    <span className="user-branch-label">
                                      {uEditBranches.length === branches.length ? 'Can Edit All:' : `Can Edit (${uEditBranches.length}):`}
                                    </span>
                                    <div className="user-branch-chips">
                                      {uEditBranches.map(id => {
                                        const b = branches.find(x => x.id === id)
                                        const name = b ? b.name : id
                                        return (
                                          <span key={id} className="user-branch-badge main" title={`Full Edit Access: ${name} · ${b?.note || ''}`}>
                                            ✏️ {name}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                {uViewBranches.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: uEditBranches.length > 0 ? 3 : 0 }}>
                                    <span className="user-branch-label">
                                      {uViewBranches.length === branches.length ? 'Viewing Access:' : `Viewing Only (${uViewBranches.length}):`}
                                    </span>
                                    <div className="user-branch-chips">
                                      {uViewBranches.length === branches.length ? (
                                        <span className="user-branch-badge view" title="Global View Only access across all branches">
                                          🌐 All Branches (View Only)
                                        </span>
                                      ) : (
                                        uViewBranches.map(id => {
                                          const b = branches.find(x => x.id === id)
                                          const name = b ? b.name : id
                                          return (
                                            <span key={id} className="user-branch-badge view" title={`View Only: ${name} · ${b?.note || ''}`}>
                                              📍 {name}
                                            </span>
                                          )
                                        })
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        {!isEditing && (
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            <button className="btn sm" onClick={() => startEdit(u)} title="Edit role / access / branches">✎ Edit</button>
                            <button
                              className={`btn sm ${isActive ? 'ghost' : 'primary'}`}
                              onClick={() => handleToggleActive(u)}
                              title={isActive ? 'Deactivate account' : 'Activate account'}
                            >
                              {isActive ? '⏸ Deactivate' : '▶ Activate'}
                            </button>
                            <button className="btn sm danger" onClick={() => handleDelete(u.id, u.auth_id, u.email, u.name)} title="Delete user">✕</button>
                          </div>
                        )}
                      </div>

                      {/* Inline edit panel */}
                      {isEditing && (
                        <div className="user-edit-panel">
                          <div style={{ fontWeight: 650, fontSize: 12, color: 'var(--senior)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            Edit User Details & Branch Access
                          </div>
                          <div className="grid2" style={{ gap: 10 }}>
                            <div>
                              <label className="fld">Full name <span className="req">*</span></label>
                              <input
                                type="text"
                                className="txt"
                                placeholder="e.g. Grace Villanueva"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="fld">Email address <span className="req">*</span></label>
                              <input
                                type="email"
                                className="txt"
                                placeholder="grace@esprint.com"
                                value={editEmail}
                                onChange={e => setEditEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="fld">New password (optional)</label>
                              <input
                                type="text"
                                className="txt"
                                placeholder="leave blank to keep current"
                                value={editPassword}
                                onChange={e => setEditPassword(e.target.value)}
                              />
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                                Leave empty if not changing password.
                              </div>
                            </div>
                            <div>
                              <label className="fld">Roles</label>
                              <select className="sel" value={editRole} onChange={e => setEditRole(e.target.value)}>
                                {ROLE_OPTIONS.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            </div>
                            {editRole !== 'admin' ? (
                              <div className="full">
                                <label className="fld">Overall edit permission</label>
                                <AccessToggle value={editCanEdit} onChange={setEditCanEdit} />
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                                  {editCanEdit
                                    ? 'User can create, edit, & update jobs in their assigned Can Edit branches.'
                                    : 'Global View Only (no editing allowed anywhere)'}
                                </div>
                              </div>
                            ) : (
                              <div className="full" style={{ fontSize: 12, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 10%, transparent)', padding: '8px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--senior) 25%, transparent)' }}>
                                👑 Admin accounts automatically have full edit access and global management across all branches.
                              </div>
                            )}

                            {editRole !== 'admin' && (
                              <div className="full" style={{ marginTop: 4 }}>
                                {/* ── Segmented Switcher between Can Edit & View Only ── */}
                                <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'var(--surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditBranchTab('edit')}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      fontSize: 12.5,
                                      fontWeight: 650,
                                      borderRadius: 6,
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      background: editBranchTab === 'edit' ? 'var(--senior)' : 'transparent',
                                      color: editBranchTab === 'edit' ? '#fff' : 'var(--muted)',
                                      boxShadow: editBranchTab === 'edit' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <span>✏️ Can Edit Branches</span>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '1px 7px',
                                      borderRadius: 10,
                                      background: editBranchTab === 'edit' ? 'rgba(255,255,255,0.28)' : 'var(--surface-3)',
                                      color: editBranchTab === 'edit' ? '#fff' : 'var(--ink-2)',
                                    }}>
                                      {editEditBranches.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditBranchTab('view')}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      fontSize: 12.5,
                                      fontWeight: 650,
                                      borderRadius: 6,
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      background: editBranchTab === 'view' ? '#8b5cf6' : 'transparent',
                                      color: editBranchTab === 'view' ? '#fff' : 'var(--muted)',
                                      boxShadow: editBranchTab === 'view' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <span>📍 View Only Branches</span>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '1px 7px',
                                      borderRadius: 10,
                                      background: editBranchTab === 'view' ? 'rgba(255,255,255,0.28)' : 'var(--surface-3)',
                                      color: editBranchTab === 'view' ? '#fff' : 'var(--ink-2)',
                                    }}>
                                      {editViewBranches.length}
                                    </span>
                                  </button>
                                </div>

                                {/* ── TAB 1: CAN EDIT CHECKLIST ── */}
                                {editBranchTab === 'edit' && (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                        Full Edit Access (create, reschedule, &amp; edit jobs in checked branches):
                                      </span>
                                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => setEditEditBranches(branches.map(b => b.id))}
                                        >
                                          All ({branches.length})
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const luzon = getLuzonBranchIds(branches)
                                            setEditEditBranches(cur => Array.from(new Set([...cur, ...luzon])))
                                          }}
                                        >
                                          + Luzon
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const vis = getVisayasBranchIds(branches)
                                            setEditEditBranches(cur => Array.from(new Set([...cur, ...vis])))
                                          }}
                                        >
                                          + Visayas
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const min = getMindanaoBranchIds(branches)
                                            setEditEditBranches(cur => Array.from(new Set([...cur, ...min])))
                                          }}
                                        >
                                          + Mindanao
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>|</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => setEditEditBranches([])}
                                        >
                                          Clear
                                        </button>
                                      </div>
                                    </div>
                                    <div className="branch-check" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                      <label style={{ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2 }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: 17, height: 17, cursor: 'pointer' }}
                                          checked={branches.length > 0 && editEditBranches.length === branches.length}
                                          ref={el => { if (el) el.indeterminate = editEditBranches.length > 0 && editEditBranches.length < branches.length }}
                                          onChange={e => {
                                            if (e.target.checked) setEditEditBranches(branches.map(b => b.id))
                                            else setEditEditBranches([])
                                          }}
                                        />
                                        <span style={{ color: 'var(--ink-1)' }}>✓ Select All Branches ({branches.length})</span>
                                      </label>
                                      {branches.map(b => (
                                        <label key={b.id} style={{ padding: '7px 9px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            style={{ width: 17, height: 17, cursor: 'pointer' }}
                                            checked={editEditBranches.includes(b.id)}
                                            onChange={() => toggleEditEditBranch(b.id)}
                                          />
                                          <span><strong>{b.name}</strong> · {b.note}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ── TAB 2: VIEW ONLY CHECKLIST ── */}
                                {editBranchTab === 'view' && (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                        Read-Only Access (view calendar schedule, cannot create/edit jobs):
                                      </span>
                                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent, #2a78d6)' }}
                                          onClick={() => setEditViewBranches(branches.map(b => b.id))}
                                        >
                                          🌐 View All (20)
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const nonEdit = branches.filter(b => !editEditBranches.includes(b.id)).map(b => b.id)
                                            setEditViewBranches(nonEdit)
                                          }}
                                        >
                                          Select Remaining ({branches.filter(b => !editEditBranches.includes(b.id)).length})
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const luzon = getLuzonBranchIds(branches)
                                            setEditViewBranches(cur => Array.from(new Set([...cur, ...luzon])))
                                          }}
                                        >
                                          + Luzon
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const vis = getVisayasBranchIds(branches)
                                            setEditViewBranches(cur => Array.from(new Set([...cur, ...vis])))
                                          }}
                                        >
                                          + Visayas
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>·</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => {
                                            const min = getMindanaoBranchIds(branches)
                                            setEditViewBranches(cur => Array.from(new Set([...cur, ...min])))
                                          }}
                                        >
                                          + Mindanao
                                        </button>
                                        <span style={{ color: 'var(--border)' }}>|</span>
                                        <button
                                          type="button"
                                          className="btn-link"
                                          style={{ fontSize: 11 }}
                                          onClick={() => setEditViewBranches([])}
                                        >
                                          Clear
                                        </button>
                                      </div>
                                    </div>
                                    <div className="branch-check" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                      <label style={{ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2 }}>
                                        <input
                                          type="checkbox"
                                          style={{ width: 17, height: 17, cursor: 'pointer' }}
                                          checked={branches.length > 0 && editViewBranches.length === branches.length}
                                          ref={el => { if (el) el.indeterminate = editViewBranches.length > 0 && editViewBranches.length < branches.length }}
                                          onChange={e => {
                                            if (e.target.checked) setEditViewBranches(branches.map(b => b.id))
                                            else setEditViewBranches([])
                                          }}
                                        />
                                        <span style={{ color: 'var(--ink-1)' }}>🌐 Select All Branches ({branches.length}) - View Only</span>
                                      </label>
                                      {branches.map(b => {
                                        const isAlreadyEdit = editEditBranches.includes(b.id)
                                        return (
                                          <label key={b.id} style={{ padding: '7px 9px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input
                                              type="checkbox"
                                              style={{ width: 17, height: 17, cursor: 'pointer' }}
                                              checked={editViewBranches.includes(b.id)}
                                              onChange={() => toggleEditViewBranch(b.id)}
                                            />
                                            <span><strong>{b.name}</strong> · {b.note}</span>
                                            {isAlreadyEdit && (
                                              <span style={{ fontSize: 10, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 12%, transparent)', padding: '1px 6px', borderRadius: 6, marginLeft: 'auto' }}>
                                                ✏️ Edit access
                                              </span>
                                            )}
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {editErr && <div className="login-err" style={{ textAlign:'left', marginTop: 8 }}>{editErr}</div>}
                          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                            <button className="btn primary" onClick={() => saveEdit(u)} disabled={editBusy}>
                              {editBusy ? 'Saving…' : '✓ Save'}
                            </button>
                            <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: ADD USER MANUALLY ══════════════ */}
          {activeTab === 'add' && (
            <div className="user-form-card">
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-1)' }}>Add New User Account</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Create authentication credentials and configure Can Edit vs. View-Only Branch permissions.
                </div>
              </div>

              <div className="grid2" style={{ gap: 12 }}>
                <div>
                  <label className="fld">Full name <span className="req">*</span></label>
                  <input type="text" className="txt" placeholder="e.g. Grace Villanueva"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="fld">Email <span className="req">*</span></label>
                  <input type="email" className="txt" placeholder="grace@esprint.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="fld">Password <span className="req">*</span></label>
                  <input type="text" className="txt" placeholder="set a password"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
                <div>
                  <label className="fld">Roles</label>
                  <select className="sel" value={form.role} onChange={e => set('role', e.target.value)}>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                {form.role !== 'admin' ? (
                  <div className="full">
                    <label className="fld">Overall edit permission</label>
                    <AccessToggle value={form.can_edit} onChange={v => set('can_edit', v)} />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {form.can_edit
                        ? 'User can create, edit, and update job tickets in their assigned Can Edit branches.'
                        : 'User can only view the schedule (View Only everywhere). No editing allowed.'}
                    </div>
                  </div>
                ) : (
                  <div className="full" style={{ fontSize: 12, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 10%, transparent)', padding: '8px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--senior) 25%, transparent)' }}>
                    👑 Admin accounts automatically have full edit access and global management across all branches.
                  </div>
                )}

                {needsBranch && (
                  <div className="full" style={{ marginTop: 4 }}>
                    {/* ── Segmented Switcher between Can Edit & View Only ── */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'var(--surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => setAddBranchTab('edit')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: 12.5,
                          fontWeight: 650,
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: addBranchTab === 'edit' ? 'var(--senior)' : 'transparent',
                          color: addBranchTab === 'edit' ? '#fff' : 'var(--muted)',
                          boxShadow: addBranchTab === 'edit' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>✏️ Can Edit Branches</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 10,
                          background: addBranchTab === 'edit' ? 'rgba(255,255,255,0.28)' : 'var(--surface-3)',
                          color: addBranchTab === 'edit' ? '#fff' : 'var(--ink-2)',
                        }}>
                          {(form.edit_branch_ids || []).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddBranchTab('view')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: 12.5,
                          fontWeight: 650,
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: addBranchTab === 'view' ? '#8b5cf6' : 'transparent',
                          color: addBranchTab === 'view' ? '#fff' : 'var(--muted)',
                          boxShadow: addBranchTab === 'view' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>📍 View Only Branches</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 10,
                          background: addBranchTab === 'view' ? 'rgba(255,255,255,0.28)' : 'var(--surface-3)',
                          color: addBranchTab === 'view' ? '#fff' : 'var(--ink-2)',
                        }}>
                          {(form.view_branch_ids || []).length}
                        </span>
                      </button>
                    </div>

                    {/* ── TAB 1: CAN EDIT CHECKLIST ── */}
                    {addBranchTab === 'edit' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            Full Edit Access (create, reschedule, &amp; edit jobs in checked branches):
                          </span>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                setForm(f => ({
                                  ...f,
                                  edit_branch_ids: branches.map(b => b.id),
                                }))
                              }}
                            >
                              All ({branches.length})
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const luzon = getLuzonBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  edit_branch_ids: Array.from(new Set([...(f.edit_branch_ids || []), ...luzon])),
                                }))
                              }}
                            >
                              + Luzon
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const vis = getVisayasBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  edit_branch_ids: Array.from(new Set([...(f.edit_branch_ids || []), ...vis])),
                                }))
                              }}
                            >
                              + Visayas
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const min = getMindanaoBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  edit_branch_ids: Array.from(new Set([...(f.edit_branch_ids || []), ...min])),
                                }))
                              }}
                            >
                              + Mindanao
                            </button>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => setForm(f => ({ ...f, edit_branch_ids: [] }))}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="branch-check" style={{ maxHeight: 220, overflowY: 'auto' }}>
                          <label style={{ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2 }}>
                            <input
                              type="checkbox"
                              style={{ width: 17, height: 17, cursor: 'pointer' }}
                              checked={branches.length > 0 && (form.edit_branch_ids || []).length === branches.length}
                              ref={el => { if (el) el.indeterminate = (form.edit_branch_ids || []).length > 0 && (form.edit_branch_ids || []).length < branches.length }}
                              onChange={e => {
                                if (e.target.checked) setForm(f => ({ ...f, edit_branch_ids: branches.map(b => b.id) }))
                                else setForm(f => ({ ...f, edit_branch_ids: [] }))
                              }}
                            />
                            <span style={{ color: 'var(--ink-1)' }}>✓ Select All Branches ({branches.length})</span>
                          </label>
                          {branches.map(b => (
                            <label key={b.id} style={{ padding: '7px 9px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                style={{ width: 17, height: 17, cursor: 'pointer' }}
                                checked={(form.edit_branch_ids || []).includes(b.id)}
                                onChange={() => toggleAddEditBranch(b.id)}
                              />
                              <span><strong>{b.name}</strong> · {b.note}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── TAB 2: VIEW ONLY CHECKLIST ── */}
                    {addBranchTab === 'view' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            Read-Only Access (view calendar schedule, cannot create/edit jobs):
                          </span>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent, #2a78d6)' }}
                              onClick={() => {
                                setForm(f => ({
                                  ...f,
                                  view_branch_ids: branches.map(b => b.id),
                                }))
                              }}
                            >
                              🌐 View All (20)
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                setForm(f => ({
                                  ...f,
                                  view_branch_ids: branches.filter(b => !(f.edit_branch_ids || []).includes(b.id)).map(b => b.id),
                                }))
                              }}
                            >
                              Select Remaining ({branches.filter(b => !(form.edit_branch_ids || []).includes(b.id)).length})
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const luzon = getLuzonBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  view_branch_ids: Array.from(new Set([...(f.view_branch_ids || []), ...luzon])),
                                }))
                              }}
                            >
                              + Luzon
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const vis = getVisayasBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  view_branch_ids: Array.from(new Set([...(f.view_branch_ids || []), ...vis])),
                                }))
                              }}
                            >
                              + Visayas
                            </button>
                            <span style={{ color: 'var(--border)' }}>·</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => {
                                const min = getMindanaoBranchIds(branches)
                                setForm(f => ({
                                  ...f,
                                  view_branch_ids: Array.from(new Set([...(f.view_branch_ids || []), ...min])),
                                }))
                              }}
                            >
                              + Mindanao
                            </button>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <button
                              type="button"
                              className="btn-link"
                              style={{ fontSize: 11 }}
                              onClick={() => setForm(f => ({ ...f, view_branch_ids: [] }))}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="branch-check" style={{ maxHeight: 220, overflowY: 'auto' }}>
                          <label style={{ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, position: 'sticky', top: 0, zIndex: 2 }}>
                            <input
                              type="checkbox"
                              style={{ width: 17, height: 17, cursor: 'pointer' }}
                              checked={branches.length > 0 && (form.view_branch_ids || []).length === branches.length}
                              ref={el => { if (el) el.indeterminate = (form.view_branch_ids || []).length > 0 && (form.view_branch_ids || []).length < branches.length }}
                              onChange={e => {
                                if (e.target.checked) setForm(f => ({ ...f, view_branch_ids: branches.map(b => b.id) }))
                                else setForm(f => ({ ...f, view_branch_ids: [] }))
                              }}
                            />
                            <span style={{ color: 'var(--ink-1)' }}>🌐 Select All Branches ({branches.length}) - View Only</span>
                          </label>
                          {branches.map(b => {
                            const isAlreadyEdit = (form.edit_branch_ids || []).includes(b.id)
                            return (
                              <label key={b.id} style={{ padding: '7px 9px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  style={{ width: 17, height: 17, cursor: 'pointer' }}
                                  checked={(form.view_branch_ids || []).includes(b.id)}
                                  onChange={() => toggleAddViewBranch(b.id)}
                                />
                                <span><strong>{b.name}</strong> · {b.note}</span>
                                {isAlreadyEdit && (
                                  <span style={{ fontSize: 10, color: 'var(--senior)', background: 'color-mix(in srgb, var(--senior) 12%, transparent)', padding: '1px 6px', borderRadius: 6, marginLeft: 'auto' }}>
                                    ✏️ Edit access
                                  </span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {err && <div className="login-err" style={{ textAlign:'left', marginTop: 10 }}>{err}</div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn primary" onClick={handleAdd} disabled={busy}>
                  {busy ? 'Creating User…' : '＋ Add user'}
                </button>
                <button className="btn ghost" onClick={() => { setActiveTab('list'); setErr(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove User Permanently?"
        message={`Are you sure you want to permanently remove user "${deleteTarget?.name || deleteTarget?.email}"? This user will no longer be able to log in.`}
        confirmText="Remove User"
        confirmVariant="danger"
        isBusy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
