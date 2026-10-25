import { useEffect, useRef, useState } from 'react'
import type { BetAction, GamePhase, GameSnapshot } from '../domain/types'
import { ActionButton } from '../components/ActionButton'
import { SurfaceCard } from '../components/SurfaceCard'

const phases: { id: GamePhase; label: string }[] = [
  { id: 'round-funding', label: 'التجهيز' },
  { id: 'question-betting', label: 'الرهان' },
  { id: 'secret-clue', label: 'التلميح' },
  { id: 'guess-input', label: 'التخمين' },
  { id: 'final-betting', label: 'آخر رهان' },
  { id: 'round-reveal', label: 'الكشف' },
]

export function LiveGamePage({
  snapshot, guessText, feedback, onGuessText, onPhase, onBet, onSubmitGuess, onLeave,
  serverAuthoritative = false, currentPlayerId, onRequestHint, onRequestLoan, onSync, isMyTurn = true, online = true, pendingAction = null, pendingBalanceBefore,
}: {
  snapshot: GameSnapshot
  guessText: string
  hintType: 'standard' | 'golden'
  feedback: string
  onHintType: (value: 'standard' | 'golden') => void
  onGuessText: (value: string) => void
  onPhase: (phase: GamePhase) => void
  onBet: (action: BetAction) => void
  onSubmitGuess: () => void
  onNextRound: () => void
  onLeave: () => void
  serverAuthoritative?: boolean
  currentPlayerId?: string
  onRequestHint?: () => void
  onRequestLoan?: () => void
  onSync?: () => void
  pendingAction?: 'hint' | 'loan' | 'guess' | 'bet' | null
  pendingBalanceBefore?: number | null
  isMyTurn?: boolean
  online?: boolean
}) {
  const [showReveal, setShowReveal] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [changedScores, setChangedScores] = useState<string[]>([])
  const previousScores = useRef(new Map<string, number>())
  const lastHintSync = useRef('')
  const { publicState, privateState, result } = snapshot
  const phase = publicState.session.phase
  const currentRound = publicState.session.roundNumber
  const activeIndex = phases.findIndex((item) => item.id === phase)
  const ownPlayer = publicState.players.find((player) => player.id === currentPlayerId)
  const amountToCall = Math.max(0, (publicState.session.currentBet ?? 0) - (ownPlayer?.currentBet ?? 0))
  const raiseAmount = Math.min(privateState.availableChips, amountToCall + 10)
  const canAct = online && (!serverAuthoritative || isMyTurn)
  const deadline = publicState.session.decisionDeadline ? new Date(publicState.session.decisionDeadline).getTime() : null
  const ownHintMatchesRound = privateState.roundNumber === currentRound && privateState.hint?.questionId === publicState.question.id
  const personalBeforeRound = privateState.availableChips + privateState.roundContribution

  useEffect(() => {
    if (!serverAuthoritative || !result) return
    setShowReveal(true)
    const timer = window.setTimeout(() => setShowReveal(false), 6000)
    return () => window.clearTimeout(timer)
  }, [result, serverAuthoritative])

  useEffect(() => {
    if (!deadline) { setSecondsLeft(null); return }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [deadline])

  useEffect(() => {
    if (!serverAuthoritative || !online || phase !== 'guess-input' || ownHintMatchesRound || !onSync) return
    const syncKey = `${publicState.session.id}:${currentRound}:${publicState.question.id}`
    if (lastHintSync.current === syncKey) return
    lastHintSync.current = syncKey
    onSync()
  }, [serverAuthoritative, online, phase, ownHintMatchesRound, onSync, publicState.session.id, currentRound, publicState.question.id])

  useEffect(() => {
    const nextScores = new Map(publicState.leaderboard.map((entry) => [entry.playerId, entry.score]))
    const changed = serverAuthoritative
      ? [...nextScores].filter(([id, score]) => previousScores.current.has(id) && previousScores.current.get(id) !== score).map(([id]) => id)
      : []
    previousScores.current = nextScores
    if (changed.length === 0) return
    setChangedScores(changed)
    const timer = window.setTimeout(() => setChangedScores([]), 850)
    return () => window.clearTimeout(timer)
  }, [publicState.leaderboard, serverAuthoritative])

  const phaseLabel = phases[activeIndex]?.label ?? 'الكشف'
  const betButtons = (final = false) => <div className="sam-bet-actions">
    <ActionButton tone="danger" disabled={!canAct || pendingAction === 'bet'} onClick={() => onBet({ type: 'fold' })}>انسحب</ActionButton>
    <ActionButton tone="quiet" disabled={!canAct || pendingAction === 'bet' || (amountToCall === 0 && serverAuthoritative)} onClick={() => onBet({ type: amountToCall === 0 ? 'check' : 'call' })}>{pendingAction === 'bet' ? 'بنسجّل قرارك…' : amountToCall === 0 ? 'عدّي' : <>كمّل · <bdi dir="ltr">{amountToCall.toLocaleString('en-US')}</bdi></>}</ActionButton>
    <ActionButton tone="green" disabled={!canAct || pendingAction === 'bet' || raiseAmount < amountToCall + 10 || raiseAmount <= 0} onClick={() => onBet({ type: 'raise', amount: raiseAmount })}>زوّد · <bdi dir="ltr">{raiseAmount.toLocaleString('en-US')}</bdi></ActionButton>
    <ActionButton tone="gold" disabled={!canAct || pendingAction === 'bet' || privateState.availableChips <= 0} onClick={() => onBet({ type: 'all-in' })}>حطّ كل اللي معاك · <bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi></ActionButton>
    {final && <span className="sam-muted-note">آخر قرار ليك في الجولة دي.</span>}
  </div>

  return <div className="sam-game">
    <div className="sam-game-topline">
      <button className="sam-back-link" onClick={onLeave}>← سيب الطاولة</button>
      <div className="sam-game-brand"><strong>سمكرو</strong><span>لعبة الأصحاب</span></div>
      <span className="sam-game-room">الغرفة <bdi dir="ltr">{publicState.room.code}</bdi></span>
      <span className="sam-round-pill">الجولة <bdi>{currentRound.toLocaleString('ar-EG')}</bdi> من ٥</span>
    </div>
    <ol className="sam-phase-track" aria-label={`مرحلة اللعب: ${phaseLabel}`}>
      {phases.map((item, index) => <li key={item.id} className={`${phase === item.id ? 'active' : ''} ${activeIndex > index ? 'done' : ''}`}><i>{index + 1}</i><span>{item.label}</span></li>)}
    </ol>

    {!online && <div className="sam-game-feedback" role="status">الاتصال فصل. مستنيين نرجع لحالة اللعب الصح.</div>}
    {feedback && <div className="sam-game-feedback" role="status">{feedback}</div>}
    <div className="sam-game-layout">
      <section className="sam-game-main">
        <SurfaceCard className="sam-question-card">
          <div className="sam-question-meta"><span>{publicState.question.category}</span><span className="sam-pot">الرهان <strong><bdi dir="ltr">{publicState.session.pot.toLocaleString('en-US')}</bdi></strong></span></div>
          <span className="sam-question-kicker">السؤال رقم {currentRound.toLocaleString('ar-EG')}</span>
          <h1>{publicState.question.prompt}</h1>
          {secondsLeft !== null && <div className={`sam-countdown ${secondsLeft <= 8 ? 'urgent' : ''}`} aria-label={`فاضل ${secondsLeft} ثانية`}><span>فاضل</span><strong><bdi>{secondsLeft}</bdi><small>ث</small></strong></div>}
        </SurfaceCard>

        <section className="sam-own-finance" aria-label="رصيدك ورهانك">
          <div><small>{pendingAction === 'bet' ? 'رصيدك قبل الرهان' : 'رصيدك قبل الجولة'}</small><strong><bdi dir="ltr">{(pendingAction === 'bet' ? pendingBalanceBefore ?? privateState.availableChips : personalBeforeRound).toLocaleString('en-US')}</bdi><i>فيشة</i></strong></div>
          <div><small>المتحجز في الجولة</small><strong><bdi dir="ltr">{privateState.roundContribution.toLocaleString('en-US')}</bdi><i>فيشة</i></strong></div>
          <div><small>المتاح معاك دلوقتي</small><strong><bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi><i>فيشة</i></strong></div>
          <span className={`sam-finance-status ${pendingAction ? 'pending' : ''}`} role="status">{pendingAction === 'bet' ? 'الرهان بيتأكد من السيرفر…' : pendingAction === 'loan' ? 'بنتأكد من السلفة والرصيد…' : pendingAction ? 'بنتأكد من الحركة…' : 'الرصيد والرهان متأكدين من السيرفر'}</span>
        </section>

        <SurfaceCard className="sam-phase-card">
          <div className="sam-phase-heading"><div><span className="sam-eyebrow">إحنا فين؟</span><h2>{phaseTitle(phase)}</h2></div><span className="sam-phase-badge">{phaseLabel}</span></div>

          {phase === 'question-betting' && <div className="sam-phase-content"><p>{isMyTurn ? 'دورك. هتدخل الرهان ولا هتنسحب؟' : 'مستنيين اللاعب اللي عليه الدور يقرر.'}</p>{betButtons()}</div>}

          {phase === 'round-funding' && <div className="sam-phase-content"><p>بنجهّز الجولة. لو السلفة متاحة ليك، هتلاقيها هنا.</p>{privateState.loanAvailable ? <ActionButton disabled={!online || pendingAction === 'loan'} onClick={onRequestLoan}>{pendingAction === 'loan' ? 'بنتأكد من السلفة…' : <>اطلب سلفة · <bdi>٢٠٠</bdi> فيشة</>}</ActionButton> : <p className="sam-muted-note">{privateState.loanUnavailableReason === 'already-taken' ? 'السلفة بتتاخد مرة واحدة في المباراة، وإنت استخدمتها قبل كده.' : privateState.loanUnavailableReason === 'balance-sufficient' ? 'رصيدك يكفي دخول الجولة، فمش محتاج سلفة.' : 'فترة طلب السلفة خلصت. هنكمل التجهيز.'}</p>}</div>}

          {phase === 'secret-clue' && <div className="sam-phase-content"><div className={`sam-hint-card${ownHintMatchesRound && privateState.hint?.exact ? ' is-exact' : ''}`}><span className="sam-hint-lock">{ownHintMatchesRound && privateState.hint?.exact ? 'التلميح الدقيق' : 'تلميحك السري'}</span><strong><bdi dir="ltr">{ownHintMatchesRound ? privateState.hint?.range : 'بنوصل تلميحك…'}</bdi></strong><span>{ownHintMatchesRound ? privateState.hint?.accuracy : ''}</span><p>{ownHintMatchesRound ? privateState.hint?.advisoryNote : 'بنزامن التلميح الخاص بالجولة دي.'}</p><small>التلميح ده ليك إنت بس</small></div>{serverAuthoritative && !ownHintMatchesRound && <ActionButton disabled={!online || pendingAction === 'hint'} onClick={onRequestHint}>{pendingAction === 'hint' ? 'بنتأكد من التلميح…' : 'هات تلميحي'}</ActionButton>}{!serverAuthoritative && <ActionButton onClick={() => onPhase('guess-input')}>تمام، خمّن ←</ActionButton>}</div>}

          {phase === 'guess-input' && (!ownHintMatchesRound && serverAuthoritative ? <div className="sam-phase-content sam-private-sync" role="status"><strong>بنتأكد إن تلميحك وصل الأول.</strong><p>مش هنفتح التخمين غير لما نزامن تلميح الجولة دي.</p><ActionButton tone="quiet" disabled={!online} onClick={onSync}>زامن الجولة</ActionButton></div> : <div className="sam-phase-content"><p>اكتب رقمك. تخمينك هيفضل سري لحد ما الجولة تخلص.</p><label className="sam-field-label" htmlFor="guess-input">تخميني</label><div className="sam-guess-field"><span aria-hidden="true">؟</span><input id="guess-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={12} value={guessText} disabled={serverAuthoritative && (Boolean(privateState.guess) || pendingAction === 'guess')} onChange={(event) => onGuessText(event.target.value.replace(/\D/g, '').slice(0, 12))} dir="ltr" aria-describedby="guess-help" /></div><small id="guess-help" className="sam-muted-note">اكتب أرقام بس</small><div className="sam-keypad" aria-label="لوحة الأرقام">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((key) => <button key={key} type="button" disabled={!online || Boolean(privateState.guess) || pendingAction === 'guess'} onClick={() => onGuessText(key === '⌫' ? guessText.slice(0, -1) : `${guessText}${key}`.slice(0, 12))}>{key}</button>)}</div><ActionButton disabled={!online || Boolean(privateState.guess) || pendingAction === 'guess' || !guessText.trim()} onClick={onSubmitGuess}>{pendingAction === 'guess' ? 'بنسجّل تخمينك…' : privateState.guess ? 'وصل تخمينك ✓' : 'ثبّت تخميني'} <span aria-hidden="true">←</span></ActionButton>{privateState.guess && <p className="sam-submitted-note" role="status">تمام، السيرفر سجّل تخمينك. مستنيين الباقيين.</p>}</div>)}

          {phase === 'final-betting' && <div className="sam-phase-content"><p>{isMyTurn ? 'دورك في آخر رهان.' : 'مستنيين قرار اللي عليه الدور.'}</p><div className="sam-balance"><span>اللي فاضل معاك</span><strong><bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi><small>فيشة</small></strong></div>{betButtons(true)}</div>}

          {phase === 'round-reveal' && <div className="sam-phase-content sam-reveal-content">{result ? <><p>النتيجة وصلت. شوف مين كان أقرب.</p><div className="sam-answer-reveal"><span>الإجابة كانت</span><strong><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong></div></> : <p role="status">مستنيين كشف الإجابة…</p>}<div className="sam-your-guess"><span>تخميني</span><strong><bdi dir="ltr">{privateState.guess?.value.toLocaleString('en-US') ?? '—'}</bdi></strong></div></div>}

          {phase === 'podium-finish' && <div className="sam-phase-content"><p>خلصت المباراة. بنحمّل الترتيب النهائي…</p></div>}
        </SurfaceCard>
      </section>

      <aside className="sam-game-side">
        <SurfaceCard className="sam-live-board" aria-label="لوحة الجولة">
          <div className="sam-side-heading"><div><span className="sam-eyebrow">متابعة الجولة</span><h2>الطاولة دلوقتي</h2></div><span className="sam-pot-mini">{publicState.players.length}</span></div>
          {!publicState.players.length && <p className="sam-board-empty" role="status">بنوصل قائمة اللعيبة…</p>}
          <div className="sam-round-roster" aria-live="polite">{publicState.players.map((participant, index) => {
            const progress = publicState.roundProgress.find((entry) => entry.playerId === participant.id)
            const revealedGuess = result?.guesses.find((entry) => entry.playerId === participant.id)
            const revealedWager = result?.roundWagers?.find((entry) => entry.playerId === participant.id)
            const revealedPayout = result?.payouts?.find((entry) => entry.playerId === participant.id)?.amount ?? 0
            const winner = result?.winnerPlayerIds.includes(participant.id) ?? false
            const revealAuthorized = Boolean(result)
            const showWager = revealAuthorized ? revealedWager !== undefined : phase === 'question-betting' || phase === 'final-betting'
            return <article className={`sam-round-player ${participant.id === currentPlayerId ? 'mine' : ''} ${winner ? 'winner' : ''}`} key={participant.id} style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}>
              <span className={`sam-round-avatar sam-avatar-${index % 5}`}>{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : participant.name.slice(0, 1)}</span>
              <div className="sam-round-player-main"><strong>{participant.name}</strong><small>{participant.id === currentPlayerId ? 'إنت' : participant.isHost ? 'صاحب الغرفة' : participant.isConnected === false ? 'فصل من الاتصال' : 'متصل'}</small></div>
              <span className={`sam-round-status ${progress?.hasGuess || progress?.status === 'hint-ready' ? 'complete' : ''}`}><i />{result ? 'اتكشفت النتيجة' : progress?.hasGuess ? 'سلّم تخمينه' : roundStatusLabel(progress?.status, phase)}</span>
              {showWager && <span className="sam-round-wager">{revealAuthorized ? 'المتحجز' : 'في الرهان الحالي'} <bdi dir="ltr">{(revealAuthorized ? revealedWager?.amount ?? 0 : progress?.currentStreetWager ?? 0).toLocaleString('en-US')}</bdi></span>}
              {revealAuthorized && <span className={`sam-round-outcome ${winner ? 'win' : ''}`}>{revealedGuess ? <>التخمين <bdi dir="ltr">{revealedGuess.value.toLocaleString('en-US')}</bdi></> : 'من غير تخمين'}<b>{winner ? 'مكسب الجولة' : 'حصيلة الجايزة'} · <bdi dir="ltr">{revealedPayout.toLocaleString('en-US')}</bdi></b></span>}
            </article>
          })}</div>
          {result && <div className="sam-board-answer">الإجابة <strong><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong></div>}
        </SurfaceCard>
        <SurfaceCard className="sam-score-card"><div className="sam-side-heading"><div><span className="sam-eyebrow">الترتيب دلوقتي</span><h2>مين سابق؟</h2></div><span className="sam-pot-mini">{publicState.players.length}</span></div>{[...publicState.leaderboard].sort((a, b) => a.rank - b.rank).map((entry, index) => { const participant = publicState.players.find((candidate) => candidate.id === entry.playerId); return <div className="sam-score-row" key={entry.playerId}><span className={`sam-rank ${index === 0 ? 'first' : ''}`}>{entry.rank}</span><span className={`sam-avatar sam-avatar-${index % 5}`}>{participant?.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : entry.displayName.slice(0, 1)}</span><span className="sam-score-name">{entry.displayName}{entry.playerId === currentPlayerId && <small>إنت</small>}</span><strong className={changedScores.includes(entry.playerId) ? 'changed' : ''}><bdi dir="ltr">{entry.score.toLocaleString('en-US')}</bdi><small>فيشة</small></strong></div>})}</SurfaceCard>
        <SurfaceCard className="sam-private-note"><span>!</span><strong>تلميحك ليك لوحدك</strong><p>الإجابات هتظهر لكل الناس بعد كشف نتيجة الجولة.</p></SurfaceCard>
      </aside>
    </div>

    {showReveal && result && <div className="sam-reveal-overlay" role="dialog" aria-live="assertive" aria-label="كشف الجولة"><div className="sam-reveal-dialog"><span className="sam-reveal-spark" aria-hidden="true">؟!</span><span className="sam-eyebrow">لحظة الكشف</span><h2>الإجابة طلعت</h2><strong className="sam-reveal-answer"><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong><p>{result.winnerPlayerIds.length ? `الأقرب: ${result.winnerPlayerIds.map((id) => publicState.players.find((player) => player.id === id)?.name ?? 'لاعب').join('، ')}` : 'الجولة دي من غير فائز. نشوف الجاية.'}</p><div className="sam-reveal-guesses">{result.guesses.map((guess) => { const name = publicState.players.find((candidate) => candidate.id === guess.playerId)?.name ?? 'لاعب'; const winner = result.winnerPlayerIds.includes(guess.playerId); const exact = guess.value === result.correctAnswer; return <span className={`${winner ? 'winner' : ''} ${exact ? 'exact' : ''}`} key={guess.playerId}><b>{name}</b><bdi dir="ltr">{guess.value.toLocaleString('en-US')}</bdi><small>{exact ? 'مظبوط' : winner ? 'الأقرب' : 'تخمين تاني'}</small></span>})}</div></div></div>}
  </div>
}

function phaseTitle(phase: GamePhase) {
  switch (phase) {
    case 'round-funding': return 'تجهيز الجولة'
    case 'question-betting': return 'الرهان'
    case 'secret-clue': return 'التلميح السري'
    case 'guess-input': return 'وقت التخمين'
    case 'final-betting': return 'آخر رهان'
    case 'round-reveal': return 'كشف النتيجة'
    case 'podium-finish': return 'نهاية اللعب'
  }
}

function roundStatusLabel(status: import('../domain/types').RoundPlayerStatus | undefined, phase: GamePhase): string {
  if (status === 'folded') return 'انسحب من الجولة'
  if (status === 'hint-pending') return 'مستني التلميح'
  if (status === 'hint-ready') return 'التلميح جاهز'
  if (status === 'guessing') return 'بيفكر في التخمين'
  if (status === 'guess-submitted') return 'سلّم تخمينه'
  if (status === 'funding') return 'بيجهّز للجولة'
  if (status === 'betting') return 'عليه الدور'
  if (status === 'revealed') return 'اتكشفت النتيجة'
  if (phase === 'question-betting' || phase === 'final-betting') return 'مستنيين قرار اللاعب'
  if (phase === 'secret-clue') return 'مستني التلميح'
  if (phase === 'guess-input') return 'مستنيين باقي اللعيبة'
  return 'متابع الجولة'
}
