import { useEffect, useRef, useState } from 'react'
import type { BetAction, GamePhase, GameSnapshot, RoundPlayerStatus } from '../domain/types'
import { ActionButton } from '../components/ActionButton'
import { AppDialog } from '../components/AppDialog'
import { GameTimer } from '../components/GameTimer'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { QuestionPanel } from '../components/QuestionPanel'
import { StatusBadge } from '../components/StatusBadge'
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
  snapshot, guessText, feedback, onGuessText, onPhase, onBet, onSubmitGuess, onLeave, onNextRound,
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
  const [changedScores, setChangedScores] = useState<string[]>([])
  const [confirmBet, setConfirmBet] = useState<BetAction | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const previousScores = useRef(new Map<string, number>())
  const lastHintSync = useRef('')
  const { publicState, privateState, result } = snapshot
  const phase = publicState.session.phase
  const currentRound = publicState.session.roundNumber
  const activeIndex = phases.findIndex((item) => item.id === phase)
  const ownPlayer = publicState.players.find((player) => player.id === currentPlayerId)
  const currentActor = publicState.players.find((player) => player.id === publicState.session.currentActorId)
  const amountToCall = Math.max(0, (publicState.session.currentBet ?? 0) - (ownPlayer?.currentBet ?? 0))
  const raiseAmount = Math.min(privateState.availableChips, amountToCall + 10)
  const canAct = online && (!serverAuthoritative || isMyTurn)
  const deadline = publicState.session.decisionDeadline ? new Date(publicState.session.decisionDeadline).getTime() : null
  const ownHintMatchesRound = privateState.roundNumber === currentRound && privateState.hint?.questionId === publicState.question.id
  const personalBeforeRound = privateState.availableChips + privateState.roundContribution
  const bettingPhase = phase === 'question-betting' || phase === 'final-betting'
  const phaseLabel = phases[activeIndex]?.label ?? 'الكشف'
  const turnLabel = bettingPhase
    ? isMyTurn ? 'دورك دلوقتي' : currentActor ? `الدور على ${currentActor.name}` : 'مستنيين الدور'
    : phase === 'guess-input' ? 'وقت التخمين للكل' : phase === 'secret-clue' ? 'وقت التلميح' : phase === 'round-reveal' ? 'لحظة الكشف' : 'بنجهّز الجولة'
  const sortedLeaderboard = [...publicState.leaderboard].sort((a, b) => a.rank - b.rank)
  const scoreFor = (playerId: string) => publicState.leaderboard.find((entry) => entry.playerId === playerId)?.score

  useEffect(() => {
    if (!serverAuthoritative || !result) return
    setShowReveal(true)
    const timer = window.setTimeout(() => setShowReveal(false), 6000)
    return () => window.clearTimeout(timer)
  }, [result, serverAuthoritative])

  useEffect(() => {
    if (!showReveal) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowReveal(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showReveal])

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

  function requestBet(action: BetAction): void {
    if (!canAct || pendingAction === 'bet') return
    if (serverAuthoritative && (action.type === 'fold' || action.type === 'all-in')) {
      setConfirmBet(action)
      return
    }
    onBet(action)
  }

  const betButtons = (final = false) => <div className="bet-actions">
    <ActionButton tone="danger" disabled={!canAct || pendingAction === 'bet'} onClick={() => requestBet({ type: 'fold' })}>انسحب</ActionButton>
    <ActionButton tone="primary" disabled={!canAct || pendingAction === 'bet' || (amountToCall === 0 && serverAuthoritative)} loading={pendingAction === 'bet'} onClick={() => requestBet({ type: amountToCall === 0 ? 'check' : 'call' })}>
      {pendingAction === 'bet' ? 'بنسجّل قرارك…' : amountToCall === 0 ? 'عدّي' : <>كمّل · <bdi dir="ltr">{amountToCall.toLocaleString('en-US')}</bdi></>}
    </ActionButton>
    <ActionButton tone="secondary" disabled={!canAct || pendingAction === 'bet' || raiseAmount < amountToCall + 10 || raiseAmount <= 0} onClick={() => requestBet({ type: 'raise', amount: raiseAmount })}>زوّد · <bdi dir="ltr">{raiseAmount.toLocaleString('en-US')}</bdi></ActionButton>
    <ActionButton tone="quiet" className="all-in-button" disabled={!canAct || pendingAction === 'bet' || privateState.availableChips <= 0} onClick={() => requestBet({ type: 'all-in' })}>كل الفيش · <bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi></ActionButton>
    {final && <span className="muted-text bet-note">آخر قرار ليك في الجولة دي.</span>}
  </div>

  const confirmBetDescription = confirmBet?.type === 'all-in'
    ? 'هتحط كل الفيش المتاحة معاك في الجولة دي. القرار نهائي ومش هينفع ترجع فيه.'
    : 'هتنسحب من الرهان في الجولة دي. القرار نهائي ومش هينفع ترجع فيه.'

  return <div className="game-page">
    <div className="game-topbar">
      <button type="button" className="back-button" onClick={() => setLeaveOpen(true)}>
        <Icon name="door" size={16} /> سيب الطاولة
      </button>
      <div className="game-brand"><span className="brand-mark small" aria-hidden="true"><Icon name="crown" size={15} /></span><strong>سمكرو</strong></div>
      <div className="game-topbar-meta">
        <StatusBadge tone={online ? 'online' : 'danger'} dot pulse={!online}>{online ? 'متصل' : 'بنعيد الاتصال'}</StatusBadge>
        <span className="game-room-code">الغرفة <bdi dir="ltr">{publicState.room.code}</bdi></span>
        <span className="round-pill">الجولة <bdi>{currentRound.toLocaleString('ar-EG')}</bdi> من ٥</span>
      </div>
    </div>

    <ol className="phase-track" aria-label={`مرحلة اللعب: ${phaseLabel}`}>
      {phases.map((item, index) => <li key={item.id} className={`${phase === item.id ? 'active' : ''}${activeIndex > index ? ' done' : ''}`} aria-current={phase === item.id ? 'step' : undefined}>
        <i aria-hidden="true">{activeIndex > index ? <Icon name="check" size={11} /> : index + 1}</i><span>{item.label}</span>
      </li>)}
    </ol>

    <section className="arena-player-bar" aria-label="اللاعبون على الطاولة">
      <div className="arena-player-scroll">
        {publicState.players.map((participant) => {
          const progress = publicState.roundProgress.find((entry) => entry.playerId === participant.id)
          const isTurn = bettingPhase && publicState.session.currentActorId === participant.id
          const offline = participant.isConnected === false
          const score = scoreFor(participant.id)
          return <article key={participant.id} className={`arena-player${isTurn ? ' is-turn' : ''}${participant.id === currentPlayerId ? ' is-self' : ''}${offline ? ' is-offline' : ''}`}>
            <div className="arena-avatar">
              <PlayerAvatar name={participant.name} playerId={participant.id} avatarUrl={participant.avatarUrl} size="sm" />
              <span className={`presence-dot${offline ? '' : ' is-online'}`} aria-hidden="true" />
            </div>
            <div className="arena-player-copy">
              <strong>{participant.name}{participant.id === currentPlayerId && <small>إنت</small>}</strong>
              <small>{isTurn ? 'دوره دلوقتي' : offline ? 'فصل' : participant.isHost ? 'صاحب الغرفة' : progress ? roundStatusLabel(progress.status, phase) : 'معانا'}</small>
            </div>
            {score !== undefined && <span className="arena-player-score"><bdi dir="ltr">{score.toLocaleString('en-US')}</bdi></span>}
          </article>
        })}
      </div>
    </section>

    {!online && <div className="game-feedback" role="status"><Icon name="wifiOff" size={16} /> الاتصال فصل. بنستنى السيرفر يبعت حالة اللعب الصح.</div>}
    {feedback && <div className="game-feedback is-error" role="alert"><Icon name="alert" size={16} /> {feedback}</div>}

    <div className="game-layout">
      <div className="game-main">
        <div className="question-row">
          <QuestionPanel
            question={publicState.question}
            roundNumber={currentRound}
            pot={publicState.session.pot}
            turnLabel={turnLabel}
            isMyTurn={isMyTurn && bettingPhase}
          />
          <GameTimer deadline={deadline ? new Date(deadline).toISOString() : null} active={online} />
        </div>

        <section className="finance-strip" aria-label="رصيدك ورهانك">
          <div><small>{pendingAction === 'bet' ? 'رصيدك قبل الرهان' : 'رصيدك قبل الجولة'}</small><strong><bdi dir="ltr">{(pendingAction === 'bet' ? pendingBalanceBefore ?? privateState.availableChips : personalBeforeRound).toLocaleString('en-US')}</bdi><i>فيش</i></strong></div>
          <div><small>المتحجز في الجولة</small><strong><bdi dir="ltr">{privateState.roundContribution.toLocaleString('en-US')}</bdi><i>فيش</i></strong></div>
          <div><small>المتاح معاك دلوقتي</small><strong><bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi><i>فيش</i></strong></div>
          <StatusBadge tone={pendingAction ? 'warning' : 'success'} dot pulse={Boolean(pendingAction)}>
            {pendingAction === 'bet' ? 'الرهان بيتأكد من السيرفر…' : pendingAction === 'loan' ? 'بنتأكد من السلفة…' : pendingAction ? 'بنتأكد من الحركة…' : 'الرصيد متأكد من السيرفر'}
          </StatusBadge>
        </section>

        <SurfaceCard className="phase-panel">
          <div className="phase-heading">
            <div><span className="eyebrow">إحنا فين؟</span><h2>{phaseTitle(phase)}</h2></div>
            <StatusBadge tone="turn">{phaseLabel}</StatusBadge>
          </div>

          {phase === 'question-betting' && <div className="phase-content">
            <p>{isMyTurn ? 'دورك. هتدخل الرهان ولا هتنسحب؟' : 'مستنيين اللاعب اللي عليه الدور يقرر.'}</p>
            {betButtons()}
          </div>}

          {phase === 'round-funding' && <div className="phase-content">
            <p>بنجهّز الجولة. لو السلفة متاحة ليك، هتلاقيها هنا.</p>
            {privateState.loanAvailable
              ? <ActionButton tone="secondary" disabled={!online || pendingAction === 'loan'} loading={pendingAction === 'loan'} onClick={onRequestLoan}>
                {pendingAction === 'loan' ? 'بنتأكد من السلفة…' : <>اطلب سلفة · <bdi>٢٠٠</bdi> فيش</>}
              </ActionButton>
              : <p className="muted-text">{privateState.loanUnavailableReason === 'already-taken' ? 'السلفة بتتاخد مرة واحدة في المباراة، وإنت استخدمتها قبل كده.' : privateState.loanUnavailableReason === 'balance-sufficient' ? 'رصيدك يكفي دخول الجولة، فمش محتاج سلفة.' : 'فترة طلب السلفة خلصت. هنكمل التجهيز.'}</p>}
          </div>}

          {phase === 'secret-clue' && <div className="phase-content">
            <div className={`hint-card${ownHintMatchesRound && privateState.hint?.exact ? ' is-exact' : ''}`}>
              <span className="hint-lock"><Icon name="sparkle" size={14} /> {ownHintMatchesRound && privateState.hint?.exact ? 'التلميح الدقيق' : 'تلميحك السري'}</span>
              <strong dir="ltr">{ownHintMatchesRound ? privateState.hint?.range : 'بنوصل تلميحك…'}</strong>
              <span>{ownHintMatchesRound ? privateState.hint?.accuracy : ''}</span>
              <p>{ownHintMatchesRound ? privateState.hint?.advisoryNote : 'بنزامن التلميح الخاص بالجولة دي.'}</p>
              <small>التلميح ده ليك إنت بس</small>
            </div>
            {serverAuthoritative && !ownHintMatchesRound && <ActionButton tone="secondary" disabled={!online || pendingAction === 'hint'} loading={pendingAction === 'hint'} onClick={onRequestHint}>{pendingAction === 'hint' ? 'بنتأكد من التلميح…' : 'هات تلميحي'}</ActionButton>}
            {!serverAuthoritative && <ActionButton onClick={() => onPhase('guess-input')}>تمام، خمّن <Icon name="arrow" size={17} /></ActionButton>}
          </div>}

          {phase === 'guess-input' && (!ownHintMatchesRound && serverAuthoritative
            ? <div className="phase-content private-sync" role="status">
              <strong><Icon name="refresh" size={17} /> بنتأكد إن تلميحك وصل الأول.</strong>
              <p>مش هنفتح التخمين غير لما نزامن تلميح الجولة دي.</p>
              <ActionButton tone="secondary" disabled={!online} onClick={onSync}>زامن الجولة</ActionButton>
            </div>
            : <div className="phase-content">
              <p>اكتب رقمك. تخمينك هيفضل سري لحد ما الجولة تخلص.</p>
              <label className="field-label" htmlFor="guess-input">تخميني</label>
              <div className="guess-field"><span aria-hidden="true">؟</span><input id="guess-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={12} value={guessText} disabled={serverAuthoritative && (Boolean(privateState.guess) || pendingAction === 'guess')} onChange={(event) => onGuessText(event.target.value.replace(/\D/g, '').slice(0, 12))} dir="ltr" aria-describedby="guess-help" /></div>
              <small id="guess-help" className="muted-text">أرقام فقط</small>
              <div className="keypad" aria-label="لوحة الأرقام">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((key) => <button key={key} type="button" aria-label={key === '⌫' ? 'مسح آخر رقم' : key === '000' ? 'صفر صفر صفر' : key} disabled={!online || Boolean(privateState.guess) || pendingAction === 'guess'} onClick={() => onGuessText(key === '⌫' ? guessText.slice(0, -1) : `${guessText}${key}`.slice(0, 12))}>{key}</button>)}
              </div>
              <ActionButton disabled={!online || Boolean(privateState.guess) || pendingAction === 'guess' || !guessText.trim()} loading={pendingAction === 'guess'} onClick={onSubmitGuess}>{pendingAction === 'guess' ? 'بنسجّل تخمينك…' : privateState.guess ? 'وصل تخمينك' : 'ثبّت تخميني'} {!pendingAction && !privateState.guess && <Icon name="arrow" size={18} />}</ActionButton>
              {privateState.guess && <p className="submitted-note" role="status"><Icon name="check" size={15} /> السيرفر سجّل تخمينك. مستنيين الباقيين.</p>}
            </div>)}

          {phase === 'final-betting' && <div className="phase-content">
            <p>{isMyTurn ? 'دورك في آخر رهان.' : 'مستنيين قرار اللي عليه الدور.'}</p>
            <div className="balance-row"><span>اللي فاضل معاك</span><strong><bdi dir="ltr">{privateState.availableChips.toLocaleString('en-US')}</bdi><small>فيش</small></strong></div>
            {betButtons(true)}
          </div>}

          {phase === 'round-reveal' && <div className="phase-content reveal-content">
            {result ? <><p>النتيجة وصلت. شوف مين كان أقرب.</p><div className="answer-reveal"><span>الإجابة كانت</span><strong><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong></div></> : <p role="status">مستنيين كشف الإجابة…</p>}
            <div className="your-guess"><span>تخميني</span><strong><bdi dir="ltr">{privateState.guess?.value.toLocaleString('en-US') ?? '—'}</bdi></strong></div>
            {!serverAuthoritative && <ActionButton onClick={onNextRound}>الجولة التالية <Icon name="arrow" size={17} /></ActionButton>}
          </div>}

          {phase === 'podium-finish' && <div className="phase-content"><p role="status">خلصت المباراة. بنحمّل الترتيب النهائي…</p></div>}
        </SurfaceCard>
      </div>

      <aside className="game-side">
        <SurfaceCard className="live-board" aria-label="لوحة الجولة">
          <div className="side-heading">
            <div><span className="eyebrow">متابعة الجولة</span><h2>الطاولة دلوقتي</h2></div>
            <StatusBadge tone="neutral">{publicState.players.length.toLocaleString('ar-EG')}</StatusBadge>
          </div>
          {!publicState.players.length && <p className="empty-copy" role="status">بنوصل قائمة اللعيبة…</p>}
          <div className="round-roster" aria-live="polite">{publicState.players.map((participant, index) => {
            const progress = publicState.roundProgress.find((entry) => entry.playerId === participant.id)
            const revealedGuess = result?.guesses.find((entry) => entry.playerId === participant.id)
            const revealedWager = result?.roundWagers?.find((entry) => entry.playerId === participant.id)
            const revealedPayout = result?.payouts?.find((entry) => entry.playerId === participant.id)?.amount ?? 0
            const winner = result?.winnerPlayerIds.includes(participant.id) ?? false
            const revealAuthorized = Boolean(result)
            const showWager = revealAuthorized ? revealedWager !== undefined : bettingPhase
            return <article className={`round-player${participant.id === currentPlayerId ? ' is-mine' : ''}${winner ? ' is-winner' : ''}`} key={participant.id} style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}>
              <PlayerAvatar name={participant.name} playerId={participant.id} avatarUrl={participant.avatarUrl} size="sm" />
              <div className="round-player-main"><strong>{participant.name}</strong><small>{participant.id === currentPlayerId ? 'إنت' : participant.isHost ? 'صاحب الغرفة' : participant.isConnected === false ? 'فصل من الاتصال' : 'متصل'}</small></div>
              <span className={`round-status${progress?.hasGuess || progress?.status === 'hint-ready' ? ' is-complete' : ''}`}><i />{result ? 'اتكشفت النتيجة' : progress?.hasGuess ? 'سلّم تخمينه' : roundStatusLabel(progress?.status, phase)}</span>
              {showWager && <span className="round-wager">{revealAuthorized ? 'المتحجز' : 'في الرهان الحالي'} <bdi dir="ltr">{(revealAuthorized ? revealedWager?.amount ?? 0 : progress?.currentStreetWager ?? 0).toLocaleString('en-US')}</bdi></span>}
              {revealAuthorized && <span className={`round-outcome${winner ? ' is-win' : ''}`}>{revealedGuess ? <>التخمين <bdi dir="ltr">{revealedGuess.value.toLocaleString('en-US')}</bdi></> : 'من غير تخمين'}<b>{winner ? 'مكسب الجولة' : 'حصيلة الجايزة'} · <bdi dir="ltr">{revealedPayout.toLocaleString('en-US')}</bdi></b></span>}
            </article>
          })}</div>
          {result && <div className="board-answer">الإجابة <strong><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong></div>}
        </SurfaceCard>

        <SurfaceCard className="score-card">
          <div className="side-heading">
            <div><span className="eyebrow">الترتيب دلوقتي</span><h2>مين سابق؟</h2></div>
            <StatusBadge tone="neutral">{sortedLeaderboard.length.toLocaleString('ar-EG')}</StatusBadge>
          </div>
          {sortedLeaderboard.length === 0 && <p className="empty-copy">الترتيب هيظهر أول ما الجولة تبدأ.</p>}
          {sortedLeaderboard.map((entry, index) => { const participant = publicState.players.find((candidate) => candidate.id === entry.playerId); return <div className="score-row" key={entry.playerId}>
            <span className={`score-rank${index === 0 ? ' is-first' : ''}`}>{entry.rank.toLocaleString('ar-EG')}</span>
            <PlayerAvatar name={entry.displayName} playerId={entry.playerId} avatarUrl={participant?.avatarUrl} size="sm" />
            <span className="score-name">{entry.displayName}{entry.playerId === currentPlayerId && <small>إنت</small>}</span>
            <strong className={changedScores.includes(entry.playerId) ? 'is-changed' : ''}><bdi dir="ltr">{entry.score.toLocaleString('en-US')}</bdi><small>فيش</small></strong>
          </div>})}
        </SurfaceCard>

        <SurfaceCard className="private-note">
          <span className="note-icon"><Icon name="shield" size={17} /></span>
          <strong>تلميحك ليك لوحدك</strong>
          <p>الإجابات هتظهر لكل الناس بعد كشف نتيجة الجولة.</p>
        </SurfaceCard>
      </aside>
    </div>

    {showReveal && result && <div className="reveal-overlay" role="dialog" aria-modal="true" aria-label="كشف الجولة" onClick={(event) => { if (event.target === event.currentTarget) setShowReveal(false) }}>
      <div className="reveal-dialog">
        <span className="reveal-particles" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <button type="button" className="reveal-close" aria-label="إغلاق الكشف" onClick={() => setShowReveal(false)}><Icon name="close" size={18} /></button>
        <span className="reveal-spark" aria-hidden="true">؟!</span>
        <span className="eyebrow"><i /> لحظة الكشف</span>
        <h2>الإجابة طلعت</h2>
        <strong className="reveal-answer"><bdi dir="ltr">{result.correctAnswer.toLocaleString('en-US')}</bdi></strong>
        <p>{result.winnerPlayerIds.length ? `الأقرب: ${result.winnerPlayerIds.map((id) => publicState.players.find((player) => player.id === id)?.name ?? 'لاعب').join('، ')}` : 'الجولة دي من غير فائز. نشوف الجاية.'}</p>
        <div className="reveal-guesses">{result.guesses.map((guess) => {
          const name = publicState.players.find((candidate) => candidate.id === guess.playerId)?.name ?? 'لاعب'
          const winner = result.winnerPlayerIds.includes(guess.playerId)
          const exact = guess.value === result.correctAnswer
          return <span className={`${winner ? 'is-winner' : ''}${exact ? ' is-exact' : ''}`} key={guess.playerId}><b>{name}</b><bdi dir="ltr">{guess.value.toLocaleString('en-US')}</bdi><small>{exact ? 'مظبوط' : winner ? 'الأقرب' : 'تخمين تاني'}</small></span>
        })}</div>
      </div>
    </div>}

    <AppDialog
      open={confirmBet !== null}
      title={confirmBet?.type === 'all-in' ? 'تأكيد كل الفيش' : 'تأكيد الانسحاب'}
      description={confirmBetDescription}
      icon="alert"
      tone={confirmBet?.type === 'all-in' ? 'primary' : 'danger'}
      confirmLabel={confirmBet?.type === 'all-in' ? 'حط كل الفيش' : 'انسحب'}
      cancelLabel="رجعني"
      onConfirm={() => { const action = confirmBet; setConfirmBet(null); if (action) onBet(action) }}
      onClose={() => setConfirmBet(null)}
    />

    <AppDialog
      open={leaveOpen}
      title="تسيب الطاولة؟"
      description="هتخرج من الغرفة الحالية. لو المباراة شغالة، هتحتاج ترجع للغرفة قبل ما تقدر تكمل."
      icon="door"
      tone="danger"
      confirmLabel="سيب الطاولة"
      cancelLabel="خليك"
      onConfirm={() => { setLeaveOpen(false); onLeave() }}
      onClose={() => setLeaveOpen(false)}
    />
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

function roundStatusLabel(status: RoundPlayerStatus | undefined, phase: GamePhase): string {
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
