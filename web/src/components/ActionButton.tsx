import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Tone = 'primary' | 'secondary' | 'quiet' | 'danger' | 'success' | 'gold' | 'green'
type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone
  loading?: boolean
  block?: boolean
}>

export function ActionButton({ children, tone = 'primary', loading = false, block = false, className = '', disabled, ...props }: Props) {
  return <button
    className={`button button-${tone}${block ? ' button-block' : ''} ${className}`.trim()}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <span className="button-spinner" aria-hidden="true" />}
    {children}
  </button>
}
