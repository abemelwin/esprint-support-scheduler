export const ROLES = {
  manager:     { label: 'Service Manager',        short: 'Svc Mgr',     color: 'var(--sm-mgr)' },
  bsm:         { label: 'Branch Service Manager', short: 'Branch Mgr',  color: 'var(--role-bsm)' },
  coordinator: { label: 'Service Coordinator',    short: 'Coord',       color: '#0284c7' },
  senior:      { label: 'Senior FSE',             short: 'Senior',      color: 'var(--senior)' },
  junior:      { label: 'Junior FSE',             short: 'Junior',      color: 'var(--junior)' },
  trainee:     { label: 'Trainee',                short: 'Trainee',     color: 'var(--trainee)' },
}
export const ROLE_ORDER = ['manager','bsm','coordinator','senior','junior','trainee']

export const TYPES = {
  installation: { label: 'Installation', cls: 't-install' },
  onsite:       { label: 'Onsite',       cls: 't-onsite' },
  hotline:      { label: 'Hotline',      cls: 't-hotline' },
  others:       { label: 'Others',       cls: 't-others' },
  leave:        { label: 'Leave',        cls: 't-leave' },
  absent:       { label: 'Absent',       cls: 't-absent' },
}
// Work types shown for regular job tickets
export const TYPE_KEYS = ['installation','onsite','hotline','others']
// Absence types (admin only) — not real work, used to mark staff unavailable
export const ABSENCE_KEYS = ['leave','absent']

export const STATUS = {
  pending: { label: 'Pending',        cls: 'pending', dot: 'pending' },
  ongoing: { label: 'Ongoing',        cls: 'ongoing', dot: 'ongoing' },
  success: { label: 'Successful',     cls: 'success', dot: 'success' },
  fail:    { label: 'Not successful', cls: 'fail',    dot: 'fail' },
}

export const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Regional grouping by branch short-code (branch.name)
export const REGIONS = {
  'North Luzon':    ['CAB','ISA','PANG'],
  'South Luzon':    ['CAV','CAMSUR','MAK','PAL','RIZ'],
  'Visayas':        ['BAC','CEB','ILO','TAC'],
  'North Mindanao': ['BUK','BUT','CDO','PAG','ZAM'],
  'South Mindanao': ['DAV','GENSAN','TAG'],
}

export const REGION_COLORS = {
  'North Luzon':    '#2a78d6',
  'South Luzon':    '#0ea5e9',
  'Visayas':        '#b5179e',
  'North Mindanao': '#1baf7a',
  'South Mindanao': '#10b981',
}

export function getBranchRegion(branchCode) {
  if (!branchCode) return null
  for (const [region, codes] of Object.entries(REGIONS)) {
    if (codes.includes(branchCode)) return region
  }
  return null
}

export function formatBranchSummary(branchIds, allBranches = []) {
  if (!branchIds || branchIds.length === 0) return '—'
  if (allBranches.length > 0 && allBranches.every(b => branchIds.includes(b.id))) {
    return 'All Branches'
  }

  const branchCodes = branchIds
    .map(id => allBranches.find(b => b.id === id)?.name || id)
    .filter(Boolean)

  if (branchCodes.length === 0) return '—'

  // If only 1 branch, display the branch code directly
  if (branchCodes.length === 1) {
    return branchCodes[0]
  }

  // If multiple branches, display ONLY the region(s)
  const uniqueRegions = Array.from(
    new Set(branchCodes.map(code => getBranchRegion(code)).filter(Boolean))
  )

  // Check if it spans all of Luzon
  const hasNorthLuzon = uniqueRegions.includes('North Luzon')
  const hasSouthLuzon = uniqueRegions.includes('South Luzon')
  if (hasNorthLuzon && hasSouthLuzon && uniqueRegions.length === 2) {
    return 'Luzon'
  }

  // Check if it spans all of Mindanao
  const hasNorthMindanao = uniqueRegions.includes('North Mindanao')
  const hasSouthMindanao = uniqueRegions.includes('South Mindanao')
  if (hasNorthMindanao && hasSouthMindanao && uniqueRegions.length === 2) {
    return 'Mindanao'
  }

  if (uniqueRegions.length > 0) {
    return uniqueRegions.join(', ')
  }

  return branchCodes.join(', ')
}

export const SEED_BRANCHES = [
  { id:'b1',  name:'BAC',    note:'Negros Occidental' },
  { id:'b2',  name:'BUK',    note:'Bukidnon' },
  { id:'b3',  name:'BUT',    note:'Agusan del Norte' },
  { id:'b4',  name:'CAB',    note:'Nueva Ecija' },
  { id:'b5',  name:'CAMSUR', note:'Camarines Sur' },
  { id:'b6',  name:'CAV',    note:'Cavite' },
  { id:'b7',  name:'CDO',    note:'Misamis Oriental' },
  { id:'b8',  name:'CEB',    note:'Cebu' },
  { id:'b9',  name:'DAV',    note:'Davao del Sur' },
  { id:'b10', name:'GENSAN', note:'South Cotabato' },
  { id:'b11', name:'ILO',    note:'Iloilo' },
  { id:'b12', name:'ISA',    note:'Isabela' },
  { id:'b13', name:'MAK',    note:'Metro Manila' },
  { id:'b14', name:'PAG',    note:'Zamboanga del Sur' },
  { id:'b15', name:'PAL',    note:'Palawan' },
  { id:'b16', name:'PANG',   note:'Pangasinan' },
  { id:'b17', name:'RIZ',    note:'Rizal' },
  { id:'b18', name:'TAC',    note:'Leyte' },
  { id:'b19', name:'TAG',    note:'Davao del Norte' },
  { id:'b20', name:'ZAM',    note:'Zamboanga del Sur' },
]

export function namesMatch(n1, n2) {
  if (!n1 || !n2) return false
  const s1 = n1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()
  const s2 = n2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()
  if (s1 === s2 || s1.includes(s2) || s2.includes(s1)) return true
  const words1 = s1.split(/\s+/).filter(w => w.length > 2)
  const words2 = s2.split(/\s+/).filter(w => w.length > 2)
  const matches = words1.filter(w => words2.includes(w))
  return matches.length >= 2 || (words1.length === 1 && words2.includes(words1[0])) || (words2.length === 1 && words1.includes(words2[0]))
}

export const ALL_BRANCH_CODES = ['BAC','BUK','BUT','CAB','CAMSUR','CAV','CDO','CEB','DAV','GENSAN','ILO','ISA','MAK','PAG','PAL','PANG','RIZ','TAC','TAG','ZAM']

export const DESIGNATED_MANAGERS = [
  // Service Managers / Admins
  {
    nameKey: 'rioja',
    fullName: 'Arnold Rioja',
    role: 'manager',
    isAdmin: true,
    branchCodes: ALL_BRANCH_CODES,
    label: '🌐 All Branches (Admin)',
  },
  {
    nameKey: 'danilo',
    fullName: 'Danilo Carangan',
    role: 'manager',
    isAdmin: true,
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

/**
 * Returns true if a person or user is an Admin or Service Coordinator (not field staff / technician).
 */
export function isAdminOrCoordinator(person, appUsers = []) {
  if (!person) return false
  const r = (person.role || '').toLowerCase()
  if (r === 'admin' || r === 'coordinator' || r === 'service_coordinator') return true

  const pName = (person.name || '').trim().toLowerCase()
  if (!pName) return false
  if (pName.includes('eileen')) return true

  // Check matching app_users record
  if (appUsers && appUsers.length > 0) {
    const matchedUser = appUsers.find(u => u.name && namesMatch(u.name, person.name))
    if (matchedUser) {
      const ur = (matchedUser.role || '').toLowerCase()
      if (ur === 'admin' || ur === 'service_coordinator' || ur === 'coordinator') return true
    }
  }

  // Check designated managers/coordinators
  const des = DESIGNATED_MANAGERS.find(m => {
    if (m.filterMatch) return m.filterMatch(pName)
    return pName.includes(m.nameKey) || (m.fullName && namesMatch(m.fullName, person.name))
  })
  if (des) {
    if (des.role === 'coordinator' || des.isAdmin || des.label?.includes('Admin') || des.label?.includes('Coordinator')) {
      return true
    }
  }

  return false
}


