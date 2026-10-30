import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { Icon } from './Icon'
import { ActionButton } from './ActionButton'

export function AppDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'تمام',
  cancelLabel = 'إلغاء',
  onConfirm,
  onClose,
  tone = 'primary',
  busy = false,
  showCancel = true,
  icon = 'sparkle',
}: PropsWithChildren<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onClose: () => void
  tone?: 'primary' | 'danger' | 'success'
  busy?: boolean
  showCancel?: boolean
  icon?: 'sparkle' | 'alert' | 'clock' | 'shield' | 'download' | 'door'
}>) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return <dialog
    ref={dialogRef}
    className="app-dialog"
    aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
    onClose={() => { if (open) onClose() }}
  >
    <div className="app-dialog-mark" aria-hidden="true"><Icon name={icon} size={22} /></div>
    <h2 id={titleId}>{title}</h2>
    {description && <p className="app-dialog-description">{description}</p>}
    {children && <div className="app-dialog-content">{children}</div>}
    <div className="app-dialog-actions">
      {showCancel && <ActionButton tone="quiet" onClick={onClose} disabled={busy}>{cancelLabel}</ActionButton>}
      {onConfirm && <ActionButton tone={tone} onClick={onConfirm} loading={busy}>{confirmLabel}</ActionButton>}
    </div>
    <button type="button" className="app-dialog-close" aria-label="إغلاق" onClick={onClose} disabled={busy}><Icon name="close" size={18} /></button>
  </dialog>
}
