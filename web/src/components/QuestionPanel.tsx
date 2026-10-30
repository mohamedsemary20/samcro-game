import type { ReactNode } from 'react'
import type { Question } from '../domain/types'
import { SurfaceCard } from './SurfaceCard'
import { StatusBadge } from './StatusBadge'

export function QuestionPanel({
  question,
  roundNumber,
  pot,
  turnLabel,
  isMyTurn = false,
  children,
}: {
  question: Question
  roundNumber: number
  pot: number
  turnLabel: string
  isMyTurn?: boolean
  children?: ReactNode
}) {
  return <SurfaceCard className="question-panel">
    <div className="question-panel-meta">
      <StatusBadge tone="neutral">{question.category}</StatusBadge>
      <span className={`question-turn${isMyTurn ? ' is-mine' : ''}`}>{turnLabel}</span>
      <span className="question-pot">الوعاء <strong><bdi dir="ltr">{pot.toLocaleString('en-US')}</bdi></strong></span>
    </div>
    <span className="question-kicker">السؤال {roundNumber.toLocaleString('ar-EG')}</span>
    <h1 dir="auto">{question.prompt}</h1>
    {children}
    <span className="question-mark" aria-hidden="true">؟</span>
  </SurfaceCard>
}
