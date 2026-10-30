import type { PropsWithChildren } from 'react'
import { Icon, type IconName } from './Icon'

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  children,
  className = '',
}: PropsWithChildren<{ icon?: IconName; title: string; description: string; className?: string }>) {
  return <section className={`empty-state ${className}`.trim()}>
    <span className="empty-state-icon" aria-hidden="true"><Icon name={icon} size={24} /></span>
    <h2>{title}</h2>
    <p>{description}</p>
    {children && <div className="empty-state-actions">{children}</div>}
  </section>
}
