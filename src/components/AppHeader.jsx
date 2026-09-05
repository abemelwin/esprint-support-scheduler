import { useState, useRef } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'

export default function AppHeader({ view, setView, onStaff, onBranch, onUsers }) {
  const { currentUser, isAdmin, signOut, loadBranches, loadStaff, loadJobs } = useApp()
  const fileRef = useRef()

  function toggleTheme() {
    const html = document.documentElement
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  }

  async function handleExport() {
    const [{ data: branches }, { data: staff }, { data: jobs }] = await Promise.all([
      supabase.from('branches').select('*'),
      supabase.from('staff').select('*'),
      supabase.from('jobs').select('*'),
    ])
    const blob = new Blob([JSON.stringify({ branches, staff, jobs }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `esprint-schedule-${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.branches) {
        await supabase.from('branches').upsert(data.branches, { onConflict: 'id' })
        loadBranches()
      }
      if (data.staff) {
        await supabase.from('staff').upsert(data.staff, { onConflict: 'id' })
        loadStaff()
      }
      if (data.jobs) {
        await supabase.from('jobs').upsert(data.jobs, { onConflict: 'id' })
        loadJobs()
      }
      alert('Import successful!')
    } catch {
      alert('Invalid file.')
    }
    e.target.value = ''
  }

  const roleLabel = currentUser?.role === 'admin' ? 'Admin' : 'Branch'

  return (
    <header className="app">
      <div className="brand">
        <div className="logo">ES</div>
        <div>
          <h1>Support Team Scheduler</h1>
          <div className="sub">ES Print Group of Companies · Field Service</div>
        </div>
      </div>

      <div className="tabs">
        <button
          data-view="calendar"
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >📅 Schedule</button>
        <button
          data-view="reports"
          className={view === 'reports' ? 'active' : ''}
          onClick={() => setView('reports')}
        >📊 Reports</button>
      </div>

      <div className="spacer" />

      <div className="user-chip">
        <span className={`role-tag ${currentUser?.role}`}>{roleLabel}</span>
        <span className="uname">{currentUser?.name}</span>
      </div>

      <button className="btn ghost" onClick={toggleTheme} title="Toggle light/dark">🌓</button>

      {isAdmin && <>
        <button className="btn" onClick={onUsers}>🔑 Users</button>
        <button className="btn" onClick={onStaff}>👥 Staff</button>
        <button className="btn" onClick={onBranch}>＋ Branch</button>
        <button className="btn" onClick={() => fileRef.current.click()}>⤓ Import</button>
        <button className="btn" onClick={handleExport}>⤒ Export</button>
      </>}

      <button className="btn" onClick={signOut}>⏻ Sign out</button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
    </header>
  )
}
