import React from 'react'

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  itemSummary = null,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <div
      className="confirm-modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget && !isBusy) onCancel()
      }}
    >
      <div className="confirm-modal-card" role="dialog" aria-modal="true">
        <div className="confirm-modal-content">
          <div className={`confirm-icon-badge ${confirmVariant}`}>
            {confirmVariant === 'danger' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            )}
            {confirmVariant === 'warning' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {confirmVariant === 'primary' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>

          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-desc">{message}</p>

          {itemSummary && (
            <div className="confirm-summary-box">
              {itemSummary}
            </div>
          )}
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn ghost confirm-btn-cancel"
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === 'danger' ? 'danger-solid' : confirmVariant === 'warning' ? 'warning-solid' : 'primary'} confirm-btn-action`}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <span className="spinner-dots" /> Deleting…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
