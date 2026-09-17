export const ROLES = {
  manager: { label: 'Service Manager',        short: 'Svc Mgr',    color: 'var(--sm-mgr)' },
  bsm:     { label: 'Branch Service Manager', short: 'Branch Mgr', color: 'var(--role-bsm)' },
  senior:  { label: 'Senior FSE',             short: 'Senior',     color: 'var(--senior)' },
  junior:  { label: 'Junior FSE',             short: 'Junior',     color: 'var(--junior)' },
  trainee: { label: 'Trainee',                short: 'Trainee',    color: 'var(--trainee)' },
}
export const ROLE_ORDER = ['manager','bsm','senior','junior','trainee']

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
