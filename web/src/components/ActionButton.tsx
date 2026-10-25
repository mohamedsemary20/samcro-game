import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'gold' | 'quiet' | 'danger' | 'green' }>

export function ActionButton({ children, tone = 'gold', className = '', ...props }: Props) {
  return <button className={`button button-${tone} ${className}`} {...props}>{children}</button>
}
