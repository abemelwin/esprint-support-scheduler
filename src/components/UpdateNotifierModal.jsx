import { useState, useEffect } from 'react'

export default function UpdateNotifierModal() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)

  const currentVersion = typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : null

  async function checkForUpdate() {
    if (!currentVersion || dismissed) return
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data && data.version && data.version !== currentVersion) {
        setHasUpdate(true)
      }
    } catch {
      // Ignore network errors during polling
    }
  }

  useEffect(() => {
    // Initial check after 4 seconds
    const initTimer = setTimeout(checkForUpdate, 4000)

    // Check periodically every 30 seconds
    const interval = setInterval(checkForUpdate, 30000)

    // Check whenever tab becomes active
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkForUpdate)

    return () => {
      clearTimeout(initTimer)
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkForUpdate)
    }
  }, [currentVersion, dismissed])

  async function handleReload() {
    setUpdating(true)
    try {
      // Clear all browser cache storage if supported
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
    } catch {
      // ignore
    }
    // Hard reload with cache buster query
    const cleanUrl = window.location.href.split('?')[0]
    window.location.href = `${cleanUrl}?v=${Date.now()}`
  }

  if (!hasUpdate || dismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        maxWidth: 380,
        width: 'calc(100vw - 32px)',
        background: 'var(--surface-1, #1e293b)',
        color: 'var(--ink-1, #f8fafc)',
        borderRadius: 14,
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px var(--border, rgba(255,255,255,0.15))',
        padding: '16px 18px',
        animation: 'slideUpBounce 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            fontSize: 22,
            background: 'linear-gradient(135deg, #0284c7, #7c3aed)',
            width: 42,
            height: 42,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
          }}
        >
          🚀
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>
              May Bagong Update!
            </h4>
            <button
              onClick={() => {
                setDismissed(true)
                setTimeout(() => setDismissed(false), 5 * 60 * 1000) // Re-show after 5 mins if not updated
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Later"
            >
              ✕
            </button>
          </div>

          <p style={{ margin: '6px 0 12px', fontSize: 12, lineHeight: 1.45, color: 'var(--muted, #cbd5e1)' }}>
            May bagong deployment ang system. I-update para magamit agad ang mga pinakabagong features at roles.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReload}
              disabled={updating}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: updating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {updating ? 'Updating…' : '🔄 Update & Refresh'}
            </button>

            <button
              onClick={() => {
                setDismissed(true)
                setTimeout(() => setDismissed(false), 5 * 60 * 1000)
              }}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--surface-2, #334155)',
                color: 'var(--ink-2, #e2e8f0)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
