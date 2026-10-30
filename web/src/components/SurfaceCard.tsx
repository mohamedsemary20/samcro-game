import type { PropsWithChildren } from 'react'

export function SurfaceCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`surface-card ${className}`.trim()}>{children}</section>
}
