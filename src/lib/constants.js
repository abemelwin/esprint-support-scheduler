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
}
export const TYPE_KEYS = ['installation','onsite','hotline','others']

export const STATUS = {
  pending: { label: 'Pending',        cls: 'pending', dot: 'pending' },
  ongoing: { label: 'Ongoing',        cls: 'ongoing', dot: 'ongoing' },
  success: { label: 'Successful',     cls: 'success', dot: 'success' },
  fail:    { label: 'Not successful', cls: 'fail',    dot: 'fail' },
}

export const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export const SEED_BRANCHES = [
  { id:'b1',  name:'BAC',    note:'Bacolod' },
  { id:'b2',  name:'BUK',    note:'Bukidnon' },
  { id:'b3',  name:'BUT',    note:'Butuan' },
  { id:'b4',  name:'CAB',    note:'Cabanatuan' },
  { id:'b5',  name:'CAMSUR', note:'Camarines Sur' },
  { id:'b6',  name:'CAV',    note:'Cavite' },
  { id:'b7',  name:'CDO',    note:'Cagayan De Oro' },
  { id:'b8',  name:'CEB',    note:'Cebu' },
  { id:'b9',  name:'DAV',    note:'Davao' },
  { id:'b10', name:'GENSAN', note:'General Santos' },
  { id:'b11', name:'ILO',    note:'Iloilo' },
  { id:'b12', name:'ISA',    note:'Isabela' },
  { id:'b13', name:'MAK',    note:'Makati' },
  { id:'b14', name:'PAG',    note:'Pagadian' },
  { id:'b15', name:'PAL',    note:'Palawan' },
  { id:'b16', name:'PANG',   note:'Pangasinan' },
  { id:'b17', name:'RIZ',    note:'Rizal' },
  { id:'b18', name:'TAC',    note:'Tacloban' },
  { id:'b19', name:'TAG',    note:'Tagum' },
  { id:'b20', name:'ZAM',    note:'Zamboanga' },
]
