import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ActionButton } from './components/ActionButton'
import { AppShell } from './components/AppShell'
import { SurfaceCard } from './components/SurfaceCard'
import type { BetAction, LeaderboardEntry, NavigationTab, PrivatePlayerState, PublicGameState, Room, RoomDetails, RoundResult } from './domain/types'
import { validateGuess } from './domain/validation'
import { LiveGamePage } from './pages/LiveGamePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { GameApiError } from './services/contracts'
import type { ApiError } from './domain/types'
import { gameApi } from './services/httpGameApiClient'
import { gameRealtime } from './services/socketGameConnection'
import { isDefinitiveRoomRestoreFailure, isSocketTransportFailure, socketErrorMessage } from './services/socketErrorPolicy'
import './styles.css'

type Player = { id: string; name: string }
const ACTIVE_ROOM_KEY = 'samkaro.active-room-id'

function errorMessage(cause: unknown): string {
  const code = cause instanceof GameApiError ? cause.body.code : ''
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: 'مش لاقيين الغرفة دي. راجع الرمز وجرب تاني.',
    ROOM_FULL: 'الغرفة كملت. خلي صاحبك يفتح غرفة تانية.',
    ROOM_NOT_WAITING: 'اللعب بدأ في الغرفة دي، فمش هينفع تنضم دلوقتي.',
    PLAYERS_NOT_READY: 'لازم ٣ لاعبين على الأقل يبقوا جاهزين عشان تبدأوا.',
    HOST_REQUIRED: 'صاحب الغرفة بس هو اللي يقدر يبدأ المباراة.',
    OUT_OF_TURN: 'استنى دورك. حدّثنا حالة اللعب من الخادم.',
    ACTION_ALREADY_APPLIED: 'وصلنا قرارك. بنحدّث حالة اللعب دلوقتي.',
    RECONNECT_WINDOW_EXPIRED: 'مهلة الرجوع للغرفة انتهت.',
    ROOM_MEMBERSHIP_REQUIRED: 'ما بقيتش عضو في الغرفة دي.',
    QUESTION_BANK_INCOMPLETE: 'مفيش أسئلة معتمدة كفاية للعب دلوقتي. الغرفة زي ما هي؛ جرّب تاني بعدين.',
  }
  if (messages[code]) return messages[code]
  if (cause instanceof GameApiError) return 'ما قدرناش نكمّل الطلب. راجع البيانات وجرب تاني.'
  if (cause instanceof Error) return 'في مشكلة في الاتصال. اتأكد من الشبكة وجرب تاني.'
  return 'حصلت مشكلة غير متوقعة. جرب تاني.'
}

export default function ServerApp() {
  const [tab, setTab] = useState<NavigationTab>('home')
  const [player, setPlayer] = useState<Player | null>(null)
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [roomConfirmed, setRoomConfirmed] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [guessText, setGuessText] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [restoringRoom, setRestoringRoom] = useState(false)
  const [roomRestoreFailed, setRoomRestoreFailed] = useState(false)
  const [roomRestoreAttempt, setRoomRestoreAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [roomConnectionAttempt, setRoomConnectionAttempt] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [gameState, setGameState] = useState<PublicGameState | null>(null)
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [pendingAction, setPendingAction] = useState<'hint' | 'loan' | 'guess' | 'bet' | null>(null)
  const [pendingBalanceBefore, setPendingBalanceBefore] = useState<number | null>(null)
  const actionLock = useRef(false)
  const gameStateRef = useRef<PublicGameState | null>(null)
  const roomRef = useRef(room)
  roomRef.current = room

  useEffect(() => {
    const controller = new AbortController()
    void gameApi.getCurrentPlayer(controller.signal).then(async (current) => {
      setPlayer(current)
      setDisplayName(current.name)
      const savedRoomId = sessionStorage.getItem(ACTIVE_ROOM_KEY)
      if (!savedRoomId) return
      setRestoringRoom(true)
      try {
        const details = await gameApi.getRoom(savedRoomId, controller.signal)
        if (!controller.signal.aborted) {
          setRoom(details)
          setRoomConfirmed(true)
          setRoomRestoreFailed(false)
          setTab('lobby')
        }
      } catch (cause) {
        if (cause instanceof GameApiError && isDefinitiveRoomRestoreFailure({ code: cause.body.code, status: cause.status })) {
          sessionStorage.removeItem(ACTIVE_ROOM_KEY)
          setRoomRestoreFailed(false)
          setError(errorMessage(cause))
        } else if (!controller.signal.aborted) {
          setRoomRestoreFailed(true)
          setError(errorMessage(cause))
        }
      } finally {
        if (!controller.signal.aborted) setRestoringRoom(false)
      }
    }).catch((cause: unknown) => {
      if (cause instanceof GameApiError && cause.status === 401) return
      if (!controller.signal.aborted) setError(errorMessage(cause))
    }).finally(() => { if (!controller.signal.aborted) setCheckingSession(false) })
    return () => controller.abort()
  }, [roomRestoreAttempt])

  useEffect(() => {
    const roomId = room?.room.id
    if (!roomId || !player) return
    let disposed = false
    const stopStatus = gameRealtime.onConnectionStatus((status) => {
      setConnected(status === 'connected')
      if (status === 'reconnecting') {
        setGameState(null)
        gameStateRef.current = null
        setPrivateState(null)
        setRoundResult(null)
        setRoomConfirmed(false)
      } else {
        setError('')
      }
    })
    let stopRoom: (() => void) | undefined
    let stopErrors: (() => void) | undefined
    let stopGame: (() => void) | undefined
    let stopPrivate: (() => void) | undefined
    let stopReveal: (() => void) | undefined
    let stopComplete: (() => void) | undefined

    setConnected(false)
    setRoomConfirmed(false)
    setGameState(null)
    gameStateRef.current = null
    setPrivateState(null)
    setRoundResult(null)
    void gameRealtime.connect(roomId).then(() => {
      if (disposed) return gameRealtime.disconnect()
      stopErrors = gameRealtime.onConnectionError((cause) => {
        const transportFailure = isSocketTransportFailure(cause.code)
        if (transportFailure) {
          setConnected(false)
          setGameState(null)
          setPrivateState(null)
          setRoundResult(null)
        }
        setError(socketErrorMessage(cause))
        if (transportFailure && cause.code !== 'SESSION_EXPIRED') {
          try { gameRealtime.syncGameState(roomId) } catch { /* The socket may be reconnecting. */ }
        }
      })
      stopRoom = gameRealtime.onRoomState((nextRoom: Room) => {
        void gameApi.getRoom(nextRoom.id).then((details) => {
          if (!disposed) {
            setRoom(details)
            setRoomConfirmed(true)
          }
          if (nextRoom.status === 'finished') void recoverLeaderboard(details.room.code)
        }).catch((cause: unknown) => { if (!disposed) setError(errorMessage(cause)) })
      })
      stopGame = gameRealtime.onPublicGameState((next) => {
        const current = gameStateRef.current
        if (current && current.session.id === next.session.id && (current.session.version ?? 0) > (next.session.version ?? 0)) return
        gameStateRef.current = next
        setGameState(next)
        setRoundResult((current) => current && current.roundNumber >= next.session.roundNumber ? current : null)
      })
      stopPrivate = gameRealtime.onPrivatePlayerState((next) => {
        const activeMatchId = gameStateRef.current?.session.id
        if (activeMatchId && next.matchId !== activeMatchId) return
        if (next.playerId === player.id) setPrivateState((current) => current && (
          current.matchId === next.matchId && (
            current.roundNumber > next.roundNumber
            || (current.roundNumber === next.roundNumber && current.stateVersion > next.stateVersion)
          )
        ) ? current : next)
      })
      stopReveal = gameRealtime.onRoundReveal((result) => setRoundResult(result))
      stopComplete = gameRealtime.onMatchComplete((entries) => {
        setLeaderboard(entries)
        setGameState(null)
        gameStateRef.current = null
        setPrivateState(null)
        setRoundResult(null)
        setTab('leaderboard')
      })
      void gameApi.getRoom(roomId).then((details) => {
        if (!disposed) {
          setRoom(details)
          setRoomConfirmed(true)
        }
      }).catch((cause: unknown) => { if (!disposed) setError(errorMessage(cause)) })
      const currentRoom = roomRef.current
      if (currentRoom?.room.status === 'finished') void recoverLeaderboard(currentRoom.room.code)
      else gameRealtime.syncGameState(roomId)
    }).catch((cause: unknown) => {
      if (!disposed) {
        setConnected(false)
        setGameState(null)
        setPrivateState(null)
        setError(errorMessage(cause))
      }
    })
    return () => {
      disposed = true
      stopStatus()
      stopRoom?.()
      stopErrors?.()
      stopGame?.()
      stopPrivate?.()
      stopReveal?.()
      stopComplete?.()
      void gameRealtime.disconnect()
    }
  }, [room?.room.id, player, roomConnectionAttempt])

  async function recoverLeaderboard(roomCodeValue: string): Promise<void> {
    try {
      const matches = await gameApi.getMatchHistory()
      const match = matches.find((entry) => entry.roomCode === roomCodeValue)
      if (!match) return
      const entries = await gameApi.getMatchLeaderboard(match.id)
      setLeaderboard(entries)
      setGameState(null)
      setPrivateState(null)
      setTab('leaderboard')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function createGuest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const nextPlayer = await gameApi.createGuestSession(displayName.trim())
      setPlayer(nextPlayer)
      setDisplayName(nextPlayer.name)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  async function enterRoom(nextRoom: Room): Promise<void> {
    setError('')
    const details = await gameApi.getRoom(nextRoom.id)
    sessionStorage.setItem(ACTIVE_ROOM_KEY, nextRoom.id)
    setRoom(details)
    setRoomRestoreFailed(false)
    setLeaderboard(null)
    setTab('lobby')
  }

  async function createRoom(): Promise<void> {
    setBusy(true)
    setError('')
    try { await enterRoom(await gameApi.createRoom(7)) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await enterRoom(await gameApi.joinRoom(roomCode.trim())) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }

  function leaveRoom(): void {
    if (room) {
      try { gameRealtime.leaveRoom(room.room.id) } catch { /* The transport may already be disconnected. */ }
    }
    sessionStorage.removeItem(ACTIVE_ROOM_KEY)
    setRoom(null)
    setRoomConfirmed(false)
    setGameState(null)
    setPrivateState(null)
    setRoundResult(null)
    setConnected(false)
    setTab('home')
  }

  const socketActionError = (actionError: ApiError): string => {
    const messages: Record<string, string> = {
      OUT_OF_TURN: 'لسه مش دورك. استنى تحديث حالة اللعب.',
      ACTION_DEADLINE_PASSED: 'الوقت خلص. هنحدّثلك حالة الجولة دلوقتي.',
      GUESS_PHASE_CLOSED: 'وقت التخمين خلص. استنى كشف الجولة الجاية.',
      GUESS_ALREADY_LOCKED: 'تخمينك اتسجّل قبل كده.',
      INVALID_GUESS: 'اكتب رقم صحيح من غير كسور.',
      HINT_PHASE_CLOSED: 'مرحلة التلميح خلصت. بنزامن الجولة دلوقتي.',
      HINT_ALREADY_REQUESTED: 'التلميح وصل بالفعل.',
      QUESTION_HINT_UNAVAILABLE: 'التلميح مش متاح للسؤال ده. هنحاول نزامن الجولة تاني.',
      LOAN_WINDOW_CLOSED: 'فترة السلفة خلصت. رصيدك الحالي زي ما هو.',
      LOAN_NOT_NEEDED: 'السلفة مش متاحة لرصيدك الحالي أو اتاخدت قبل كده.',
      INSUFFICIENT_CHIPS: 'الفيش اللي معاك مش كفاية للرهان ده.',
      BETTING_CLOSED: 'مرحلة الرهان خلصت.',
      ACK_TIMEOUT: 'السيرفر ما أكدش الحركة في وقتها. بنراجع حالة الجولة قبل ما تحاول تاني.',
      SOCKET_DISCONNECTED: 'الاتصال اتقطع. أول ما يرجع هنزامن الرصيد والجولة.',
      ACTION_ALREADY_APPLIED: 'الحركة اتسجلت بالفعل. بنحدّث حالة الجولة.',
    }
    return messages[actionError.code] ?? 'الحركة ما اتقبلتش. راجع حالة اللعبة وحاول تاني.'
  }

  async function performAction(kind: 'hint' | 'loan' | 'guess' | 'bet', action: () => Promise<import('./domain/types').ActionAcknowledgement>): Promise<void> {
    if (actionLock.current) return
    actionLock.current = true
    setPendingAction(kind)
    setPendingBalanceBefore(kind === 'bet' ? privateState?.availableChips ?? null : null)
    setError('')
    try {
      const result = await action()
      if (!result.ok) {
        setError(socketActionError(result.error))
        if (room) gameRealtime.syncGameState(room.room.id)
      } else if (room) gameRealtime.syncGameState(room.room.id)
    } catch {
      setError('الحركة ما وصلتش للسيرفر. بنراجع حالة الجولة؛ استنى التأكيد قبل ما تعيدها.')
      if (room) gameRealtime.syncGameState(room.room.id)
    } finally {
      actionLock.current = false
      setPendingAction(null)
      setPendingBalanceBefore(null)
    }
  }

  function submitServerGuess(): void {
    const result = validateGuess(guessText)
    if (result.value === undefined) { setError(result.error ?? 'أدخل تخميناً رقمياً صالحاً.'); return }
    void performAction('guess', () => gameRealtime.submitGuess(result.value!, crypto.randomUUID()))
  }

  function submitBet(action: BetAction): void {
    void performAction('bet', () => gameRealtime.submitBet(action, crypto.randomUUID()))
  }

  async function copyRoomCode(): Promise<void> {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.room.code)
      setNotice('نسخنا الرمز، ابعته لأصحابك')
      window.setTimeout(() => setNotice(''), 2200)
    } catch {
      setNotice('ما قدرناش ننسخ الرمز. حدده وانسخه بنفسك')
      window.setTimeout(() => setNotice(''), 3500)
    }
  }

  const ready = room?.room.readyPlayerIds?.includes(player?.id ?? '') ?? false
  const gameReady = Boolean(connected && gameState && privateState?.playerId === player?.id && privateState?.matchId === gameState.session.id && privateState?.roundNumber === gameState.session.roundNumber)
  const allReady = Boolean(room && room.players.length >= 3 && room.room.readyPlayerIds?.length === room.players.length)
  const canStart = Boolean(connected && room?.room.status === 'waiting' && room.room.hostPlayerId === player?.id && allReady)
  let content

  if (gameReady && gameState && privateState && player) {
    content = <LiveGamePage
      snapshot={{ publicState: gameState, privateState, result: roundResult }}
      guessText={guessText}
      hintType="standard"
      feedback={error}
      onHintType={() => undefined}
      onGuessText={setGuessText}
      onPhase={() => undefined}
      onBet={submitBet}
      onSubmitGuess={submitServerGuess}
      onRequestHint={() => { void performAction('hint', () => gameRealtime.requestHint(crypto.randomUUID())) }}
      onRequestLoan={() => { void performAction('loan', () => gameRealtime.requestLoan(crypto.randomUUID())) }}
      onSync={() => gameRealtime.syncGameState(room!.room.id)}
      pendingAction={pendingAction}
      pendingBalanceBefore={pendingBalanceBefore}
      onNextRound={() => undefined}
      onLeave={leaveRoom}
      serverAuthoritative
      currentPlayerId={player.id}
      isMyTurn={gameState.session.currentActorId === player.id}
      online={connected}
    />
  } else if (leaderboard && tab === 'leaderboard') {
    content = <LeaderboardPage entries={leaderboard} onPlayAgain={() => { setLeaderboard(null); leaveRoom() }} />
  } else if (checkingSession || restoringRoom) {
    content = <section className="sam-state-card" role="status"><span className="sam-spinner" /><h1>بنجهّز اللعبة</h1><p>بنرجّع جلستك والغرفة اللي كنت فيها…</p></section>
  } else if (!player) {
    content = <section className="sam-home">
      <div className="sam-hero-copy">
        <span className="sam-eyebrow"><i /> سمكرو · لعبة التخمين</span>
        <h1>المعلومة ناقصة؟<br /><em>كمّلها بحدسك.</em></h1>
        <p>سؤال واحد، تلميح سرّي، وتخمينات أصحابك. مين فيكم هيقرب من الإجابة؟</p>
        <div className="sam-hero-art" aria-hidden="true"><span className="sam-art-index">جولة ٠١</span><span className="sam-art-number">؟</span><span className="sam-art-answer">قدّرها صح</span><span className="sam-art-stamp">قريب؟</span></div>
      </div>
      <SurfaceCard className="sam-entry-card">
        <span className="sam-eyebrow">أول خطوة</span>
        <h2>اسمك إيه؟</h2>
        <p>اكتب الاسم اللي أصحابك هيشوفوه في اللعبة.</p>
        <form className="sam-form" onSubmit={createGuest}>
          <label htmlFor="guest-name">اسمك</label>
          <input id="guest-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required autoComplete="nickname" placeholder="مثال: مريم" />
          <ActionButton type="submit" disabled={busy || !displayName.trim()}>{busy ? 'بنجهّز دخولك…' : 'يلا نلعب'} <span aria-hidden="true">←</span></ActionButton>
        </form>
        <small className="sam-entry-foot">من غير حساب — اختار اسمك وادخل</small>
      </SurfaceCard>
      <footer className="sam-founder"><bdi lang="en" dir="ltr">Developed by Mohamed Semary</bdi><i aria-hidden="true">✳</i></footer>
    </section>
  } else if (player && roomRestoreFailed) {
    content = <section className="sam-state-card"><span className="sam-state-icon">↻</span><h1>مش قادرين نرجّع الغرفة</h1><p>جلستك لسه محفوظة. راجع اتصالك وحاول تفتح الغرفة تاني.</p><div className="sam-inline-actions"><ActionButton onClick={() => { setError(''); setRoomRestoreFailed(false); setRoomRestoreAttempt((attempt) => attempt + 1) }}>جرّب تاني</ActionButton><ActionButton tone="quiet" onClick={leaveRoom}>ارجع للرئيسية</ActionButton></div></section>
  } else if (room && (!connected || !roomConfirmed)) {
    content = <section className="sam-state-card"><span className="sam-spinner" /><h1>بنوصّلك بالغرفة</h1><p>بنستنى تأكيد الاتصال وحالة اللعب.</p>{error && <p className="sam-inline-error" role="alert">{error}</p>}<div className="sam-inline-actions"><ActionButton onClick={() => { setError(''); setRoomConnectionAttempt((attempt) => attempt + 1) }}>جرّب الاتصال تاني</ActionButton><ActionButton tone="quiet" onClick={leaveRoom}>سيب الغرفة</ActionButton></div></section>
  } else if (room && tab === 'lobby' && player) {
    content = <section className="sam-lobby">
      <div className="sam-page-intro"><span className="sam-eyebrow"><i /> سمكرو · قبل اللعب</span><h1>لمّيتوا بعض؟</h1><p>ابعت الرمز للشلة. لما الكل يبقى جاهز، ابدأوا الجولة.</p></div>
      <SurfaceCard className="sam-room-card">
        <div className="sam-room-top"><div><span className="sam-label">رمز الغرفة</span><button className="sam-room-code" onClick={() => void copyRoomCode()} dir="ltr" aria-label="نسخ رمز الغرفة">{room.room.code}<span>⧉</span></button></div><span className={`sam-status ${connected ? 'is-online' : ''}`}><i />{connected ? 'متصل' : 'جارٍ الاتصال'}</span></div>
        <p className="sam-share-hint">دوس على الرمز عشان تنسخه وتبعته للشلة <span aria-hidden="true">↙</span></p>
        <div className="sam-roster-heading"><h2>مين وصل؟</h2><span>{room.players.length} <b>/</b> {room.room.capacity ?? 7}</span></div>
        <div className="sam-roster" aria-live="polite">
      {room.players.length === 0 && <p className="sam-empty-roster">لسه مستنيين الباقيين…</p>}
          {room.players.map((member, index) => <article className="sam-player-card" key={member.playerId} style={{ animationDelay: `${index * 55}ms` }}>
            <span className={`sam-avatar sam-avatar-${index % 5}`}>{member.displayName.slice(0, 1)}</span>
            <span className="sam-player-copy"><strong>{member.displayName}</strong><small>{member.playerId === player.id ? 'إنت' : member.isHost ? 'صاحب الغرفة' : member.isConnected ? 'معانا' : 'بيحاول يرجع'}</small></span>
            {member.isHost && <span className="sam-host-badge">صاحب الغرفة</span>}
            <span className={`sam-ready-pill ${member.isReady ? 'ready' : ''}`}><i />{member.isReady ? 'جاهز' : member.isConnected ? 'لسه' : 'فصل'}</span>
          </article>)}
          {Array.from({ length: Math.max(0, Math.min(4, (room.room.capacity ?? 7) - room.players.length)) }, (_, index) => <div className="sam-player-slot" key={`slot-${index}`}><span>＋</span><small>مستنيين لاعب</small></div>)}
        </div>
        <div className="sam-lobby-footer"><div className="sam-ready-copy"><strong>{room.players.filter((member) => member.isReady).length} من {room.players.length} جاهزين</strong><small>{room.room.status === 'waiting' ? '٣ لاعبين جاهزين على الأقل عشان تبدأوا' : 'بنجهّز الطاولة دلوقتي'}</small></div><div className="sam-lobby-actions">
          <ActionButton tone={ready ? 'green' : 'quiet'} disabled={!connected || room.room.status !== 'waiting'} onClick={() => gameRealtime.setReady(!ready)}>{ready ? '✓ أنا جاهز' : 'جهّزني'}</ActionButton>
          {room.room.hostPlayerId === player.id && <ActionButton disabled={!canStart} onClick={() => { setError(''); gameRealtime.startMatch(crypto.randomUUID()) }}>ابدأوا اللعب <span aria-hidden="true">←</span></ActionButton>}
          <ActionButton tone="quiet" onClick={leaveRoom}>سيب الغرفة</ActionButton>
        </div></div>
        {room.room.hostPlayerId === player.id && !canStart && room.room.status === 'waiting' && <p className="sam-start-hint">{!connected ? 'الاتصال لسه راجع؛ استنى لحظة وجرب تاني.' : room.players.length < 3 ? 'محتاجين ٣ لاعبين على الأقل.' : 'استنى لما كل الموجودين يجهزوا.'}</p>}
      </SurfaceCard>
    </section>
  } else if (tab === 'profile') {
    content = <section className="sam-state-card"><span className="sam-avatar sam-avatar-1">{player.name.slice(0, 1)}</span><span className="sam-eyebrow">حساب ضيف</span><h1>{player.name}</h1><p>لعبك محفوظ على الجهاز ده.</p><ActionButton tone="quiet" onClick={() => { void gameApi.logout().finally(() => { sessionStorage.removeItem(ACTIVE_ROOM_KEY); setPlayer(null); setRoom(null) }) }}>اخرج من الحساب</ActionButton></section>
  } else if (tab === 'leaderboard') {
    content = <section className="sam-state-card"><span className="sam-state-icon">١</span><h1>لسه مفيش ترتيب</h1><p>الترتيب هيظهر هنا بعد ما تخلصوا أول مباراة.</p></section>
  } else {
    content = <section className="sam-home sam-home-returning">
      <div className="sam-hero-copy"><span className="sam-eyebrow"><i /> سمكرو · رجعت تاني</span><h1>جاهزين لسؤال؟<br /><em>هات الشلة.</em></h1><p>اعملوا غرفة أو ادخلوا برمز صاحبكم. نشوف مين هيقرب أكتر!</p><div className="sam-hero-art" aria-hidden="true"><span className="sam-art-index">سؤال جديد</span><span className="sam-art-number">؟</span><span className="sam-art-answer">قدّرها صح</span><span className="sam-art-stamp">قريب؟</span></div></div>
      <div className="sam-home-actions">
        <SurfaceCard className="sam-action-card sam-create-card"><span className="sam-action-icon">١</span><span className="sam-eyebrow">إنت صاحب السؤال</span><h2>اعمل غرفة</h2><p>لمّ أصحابك وابدأوا اللعب سوا.</p><ActionButton disabled={busy} onClick={() => void createRoom()}>{busy ? 'بنجهّز الغرفة…' : 'اعمل غرفة جديدة'} <span aria-hidden="true">←</span></ActionButton></SurfaceCard>
        <SurfaceCard className="sam-action-card"><span className="sam-action-icon orange">٢</span><span className="sam-eyebrow">معاك رمز؟</span><h2>ادخل الغرفة</h2><p>اكتب الرمز اللي بعتهولك صاحبك.</p><form className="sam-form" onSubmit={joinRoom}><label htmlFor="room-code">رمز الغرفة</label><input id="room-code" dir="ltr" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={10} autoComplete="off" required placeholder="مثال: ABC123" /><ActionButton type="submit" disabled={busy || roomCode.length < 6}>{busy ? 'بندخّلك الغرفة…' : 'ادخل الغرفة'} <span aria-hidden="true">←</span></ActionButton></form></SurfaceCard>
      </div>
      <footer className="sam-founder"><bdi lang="en" dir="ltr">Developed by Mohamed Semary</bdi><i aria-hidden="true">✳</i></footer>
    </section>
  }

  return <div data-mode="server" dir="rtl">
    <AppShell activeTab={tab} onNavigate={(nextTab) => { if (nextTab !== 'lobby' || room) setTab(nextTab) }} chips={0} showNav={Boolean(player && !gameReady)} showWallet={false} modeLabel={connected ? 'متصل بالغرفة' : 'لعبة الأصحاب'} playerLabel={player?.name ?? 'ضيف'} footerLabel="لعبة تخمين بين الأصحاب">
      {error && <div className="sam-error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="إغلاق">×</button></div>}
      {notice && <div className="sam-toast" role="status">{notice}</div>}
      {content}
    </AppShell>
  </div>
}
