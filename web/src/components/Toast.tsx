import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

export function Toast({ message, tone = 'success', onDismiss, duration = 4600 }: {
  message: string
  tone?: 'success' | 'info' | 'error'
  onDismiss: () => void
  duration?: number
}) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => dismissRef.current(), duration)
    return () => window.clearTimeout(timer)
  }, [message, duration])

  if (!message) return null

  return <div className={`toast toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
    <span className="toast-icon" aria-hidden="true"><Icon name={tone === 'error' ? 'alert' : tone === 'info' ? 'info' : 'check'} size={17} /></span>
    <span className="toast-message">{message}</span>
    <button type="button" className="toast-close" aria-label="إغلاق التنبيه" onClick={onDismiss}><Icon name="close" size={16} /></button>
  </div>
}
