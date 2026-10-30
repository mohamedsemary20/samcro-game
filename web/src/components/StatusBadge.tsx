import type { PropsWithChildren } from 'react'

export type StatusTone = 'online' | 'offline' | 'ready' | 'waiting' | 'turn' | 'warning' | 'danger' | 'neutral' | 'success'

export function StatusBadge({
  tone = 'neutral',
  children,
  dot = false,
  pulse = false,
  className = '',
}: PropsWithChildren<{ tone?: StatusTone; dot?: boolean; pulse?: boolean; className?: string }>) {
  return <span className={`status-badge status-${tone}${pulse ? ' status-pulse' : ''} ${className}`.trim()}>
    {dot && <i aria-hidden="true" />}
    {children}
  </span>
}
