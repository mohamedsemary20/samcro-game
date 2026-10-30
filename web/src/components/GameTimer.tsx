import { useEffect, useState, type CSSProperties } from 'react'
import { Icon } from './Icon'

const DECISION_WINDOW_MS = 30_000

function formatSeconds(seconds: number): string {
  return Math.max(0, seconds).toLocaleString('ar-EG')
}

export function GameTimer({
  deadline,
  active = true,
  windowMs = DECISION_WINDOW_MS,
  className = '',
}: {
  deadline: string | null
  active?: boolean
  windowMs?: number
  className?: string
}) {
  const deadlineMs = deadline ? new Date(deadline).getTime() : null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadlineMs) return
    setNow(Date.now())
    const tick = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(tick)
  }, [deadlineMs])

  if (!deadlineMs || Number.isNaN(deadlineMs)) return null

  const remainingMs = Math.max(0, deadlineMs - now)
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const progress = Math.max(0, Math.min(1, remainingMs / windowMs))
  const urgent = secondsLeft <= 10 && secondsLeft > 0
  const expired = secondsLeft <= 0
  const circumference = 2 * Math.PI * 25
  const dashOffset = circumference * (1 - progress)
  const style = { '--timer-progress': `${progress * 100}%`, '--timer-offset': dashOffset } as CSSProperties

  return <section
    className={`game-timer${urgent ? ' is-urgent' : ''}${expired ? ' is-expired' : ''}${active ? '' : ' is-paused'} ${className}`.trim()}
    role="timer"
    aria-label={expired ? 'انتهى وقت القرار، بانتظار تأكيد الخادم' : `الوقت المتبقي ${secondsLeft} ثانية`}
    style={style}
  >
    <div className="game-timer-copy">
      <span><Icon name="clock" size={15} /> وقت القرار</span>
      <strong>{expired ? 'خلص' : formatSeconds(secondsLeft)}<small>{expired ? '' : 'ث'}</small></strong>
      <em>{!active ? 'بانتظار الاتصال' : expired ? 'بنزامن الجولة…' : urgent ? 'وقت قصير' : 'خد وقتك'}</em>
    </div>
    <svg className="game-timer-ring" viewBox="0 0 58 58" aria-hidden="true">
      <circle className="game-timer-track" cx="29" cy="29" r="25" />
      <circle className="game-timer-value" cx="29" cy="29" r="25" />
    </svg>
  </section>
}
