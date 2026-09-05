export function parseYMD(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function ymd(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function sameYMD(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function fmtD(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function monthName(d) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function weekNumber(d) {
  const mon = mondayOf(d)
  // ISO-ish week within the year
  const start = new Date(d.getFullYear(), 0, 1)
  const diff = mon - start
  return Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1
}
