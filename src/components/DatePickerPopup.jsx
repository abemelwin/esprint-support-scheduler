import { useState, useRef, useEffect } from 'react'
import { ymd } from '../lib/dates'

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ── Shared floating calendar date picker ────────────────────────────────────
export default function DatePickerPopup({ value, onChange }) {
  const [open,     setOpen]     = useState(false)
  const [pickYear, setPickYear] = useState(null)   // null = follow value
  const [pickMon,  setPickMon]  = useState(null)
  const ref = useRef(null)

  const selDate  = value ? new Date(value + 'T00:00:00') : new Date()
  const viewYear = pickYear ?? selDate.getFullYear()
  const viewMon  = pickMon  ?? selDate.getMonth()
  const today    = ymd(new Date())

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function prevMon() {
    if (viewMon === 0) { setPickYear(viewYear - 1); setPickMon(11) }
    else               { setPickYear(viewYear); setPickMon(viewMon - 1) }
  }
  function nextMon() {
    if (viewMon === 11) { setPickYear(viewYear + 1); setPickMon(0) }
    else                { setPickYear(viewYear); setPickMon(viewMon + 1) }
  }

  function pickDay(d) {
    onChange(ymd(new Date(viewYear, viewMon, d)))
    setOpen(false)
  }

  const firstDow  = new Date(viewYear, viewMon, 1).getDay()
  const daysInMon = new Date(viewYear, viewMon + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMon; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(viewYear, viewMon, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const triggerLabel = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Pick a date'

  return (
    <div className="dcp-wrap" ref={ref}>
      <button className="dcp-trigger" onClick={() => setOpen(o => !o)}>
        <span className="dcp-icon">📅</span>
        <span className="dcp-label">{triggerLabel}</span>
        <span className="dcp-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="dcp-popup">
          <div className="dcp-head">
            <button className="dcp-nav" onClick={prevMon}>‹</button>
            <span className="dcp-month-label">{monthLabel}</span>
            <button className="dcp-nav" onClick={nextMon}>›</button>
          </div>

          <div className="dcp-grid">
            {DOW_LABELS.map(d => (
              <span key={d} className="dcp-dow">{d}</span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const iso     = ymd(new Date(viewYear, viewMon, d))
              const isToday = iso === today
              const isSel   = iso === value
              return (
                <button
                  key={d}
                  className={`dcp-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}`}
                  onClick={() => pickDay(d)}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="dcp-footer">
            <button className="dcp-today-btn" onClick={() => {
              const n = new Date()
              setPickYear(n.getFullYear())
              setPickMon(n.getMonth())
              onChange(ymd(n))
              setOpen(false)
            }}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}
