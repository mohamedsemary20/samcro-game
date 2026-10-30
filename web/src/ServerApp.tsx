import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ActionButton } from './components/ActionButton'
import { AppShell } from './components/AppShell'
import { EmptyState } from './components/EmptyState'
import { Icon } from './components/Icon'
import { LoadingState } from './components/LoadingState'
import { Toast } from './components/Toast'
import type { BetAction, LeaderboardEntry, NavigationTab, PrivatePlayerState, PublicGameState, Room, RoomDetails, RoundResult } from './domain/types'
import { validateGuess } from './domain/validation'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LiveGamePage } from './pages/LiveGamePage'
import { RoomLobbyPage } from './pages/RoomLobbyPage'
import { ServerHomePage } from './pages/ServerHomePage'
import { ServerProfilePage } from './pages/ServerProfilePage'
import { GameApiError } from './services/contracts'
import type { ApiError } from './domain/types'
import { gameApi } from './services/httpGameApiClient'
import { gameRealtime } from './services/socketGameConnection'
import { isDefinitiveRoomRestoreFailure, isSocketTransportFailure, isUncertainActionOutcome, RetryableActionKey, socketErrorMessage } from './services/socketErrorPolicy'
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

function roomDetailsFromSummary(summary: Room, player: Player | null): RoomDetails {
  const connected = new Set(summary.connectedPlayerIds ?? [])
  return {
    room: summary,
    players: summary.members ?? summary.playerIds.map((playerId) => ({
      playerId,
      displayName: playerId === player?.id ? player.name : 'Player',
      isHost: summary.hostPlayerId === playerId,
      isReady: summary.readyPlayerIds?.includes(playerId) ?? false,
      isConnected: summary.connectedPlayerIds ? connected.has(playerId) : true,
    })),
  }
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
  const [startingMatch, setStartingMatch] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [connected, setConnected] = useState(false)
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine)
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
  const startLock = useRef(false)
  const createRoomIdempotencyKey = useRef<string | null>(null)
  const startRequestKey = useRef<string | null>(null)
  const retryableAction = useRef(new RetryableActionKey())
  const gameStateRef = useRef<PublicGameState | null>(null)
  const roomRef = useRef(room)
  roomRef.current = room

  useEffect(() => {
    const markOnline = () => setBrowserOnline(true)
    const markOffline = () => setBrowserOnline(false)
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => {
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])

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
    void gameRealtime.connect(roomId).then((initialRoom) => {
      if (disposed) return gameRealtime.disconnect()
      const initialDetails = roomDetailsFromSummary(initialRoom, player)
      roomRef.current = initialDetails
      setRoom(initialDetails)
      setRoomConfirmed(true)
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
        const current = roomRef.current
        const fallback = roomDetailsFromSummary(nextRoom, player)
        const base = current?.room.id === nextRoom.id ? current : fallback
        const knownPlayers = new Map(base.players.map((member) => [member.playerId, member]))
        const updated: RoomDetails = {
          room: nextRoom,
          players: nextRoom.playerIds.map((playerId) => {
            const existing = knownPlayers.get(playerId)
            return {
              playerId,
              displayName: nextRoom.members?.find((member) => member.playerId === playerId)?.displayName ?? existing?.displayName ?? fallback.players.find((member) => member.playerId === playerId)?.displayName ?? 'Player',
              isHost: nextRoom.hostPlayerId === playerId,
              isReady: nextRoom.members?.find((member) => member.playerId === playerId)?.isReady ?? nextRoom.readyPlayerIds?.includes(playerId) ?? false,
              isConnected: nextRoom.members?.find((member) => member.playerId === playerId)?.isConnected ?? (nextRoom.connectedPlayerIds ? nextRoom.connectedPlayerIds.includes(playerId) : existing?.isConnected ?? true),
            }
          }),
        }
        roomRef.current = updated
        setRoom(updated)
        setRoomConfirmed(true)
        if (nextRoom.status === 'finished') void recoverLeaderboard(nextRoom.code)
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
    } catch {
      setNotice('ما قدرناش نحمّل الترتيب دلوقتي. جرّب تحديث الصفحة.')
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
    if (roomRef.current?.room.id !== nextRoom.id) {
      startRequestKey.current = null
      retryableAction.current.clear()
    }
    try { sessionStorage.setItem(ACTIVE_ROOM_KEY, nextRoom.id) } catch { /* This tab can use the room without saved restoration. */ }
    setRoom(roomDetailsFromSummary(nextRoom, player))
    setRoomConfirmed(true)
    setRoomRestoreFailed(false)
    setLeaderboard(null)
    setTab('lobby')
  }

  async function createRoom(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      const idempotencyKey = createRoomIdempotencyKey.current ?? crypto.randomUUID()
      createRoomIdempotencyKey.current = idempotencyKey
      await enterRoom(await gameApi.createRoom(7, idempotencyKey))
      createRoomIdempotencyKey.current = null
    }
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
    startRequestKey.current = null
    retryableAction.current.clear()
    setRoom(null)
    setRoomConfirmed(false)
    setGameState(null)
    setPrivateState(null)
    setRoundResult(null)
    setConnected(false)
    setLeaderboard(null)
    setTab('home')
  }

  async function logout(): Promise<void> {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      leaveRoom()
      await gameApi.logout()
      setPlayer(null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoggingOut(false)
    }
  }

  const socketActionError = (actionError: ApiError): string => {
    const messages: Record<string, string> = {
      PLAYERS_NOT_READY: 'لازم ٣ لاعبين على الأقل يكونوا جاهزين قبل ما تبدأوا.',
      HOST_REQUIRED: 'صاحب الغرفة فقط يقدر يبدأ المباراة.',
      ROOM_NOT_WAITING: 'المباراة بدأت بالفعل أو الغرفة لم تعد تنتظر.',
      ROOM_NOT_JOINED: 'اتصل بالغرفة مرة أخرى ثم حاول بدء المباراة.',
      QUESTION_BANK_INCOMPLETE: 'لا توجد خمسة أسئلة معتمدة بتلميحات معتمدة. لم تتغير الغرفة؛ حاول لاحقًا بعد مراجعة بنك الأسئلة.',
      ACK_TIMEOUT: 'لم يصل تأكيد البدء في الوقت المحدد. حدّث حالة الغرفة قبل إعادة المحاولة.',
      SOCKET_DISCONNECTED: 'انقطع اتصال الغرفة. أعد الاتصال ثم حاول مرة أخرى.',
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
      ACTION_ALREADY_APPLIED: 'الحركة اتسجلت بالفعل. بنحدّث حالة الجولة.',
    }
    return messages[actionError.code] ?? 'الحركة ما اتقبلتش. راجع حالة اللعبة وحاول تاني.'
  }

  async function startMatch(): Promise<void> {
    if (startLock.current || !canStart) return
    startLock.current = true
    setStartingMatch(true)
    setError('')
    try {
      const key = startRequestKey.current ?? crypto.randomUUID()
      startRequestKey.current = key
      const result = await gameRealtime.startMatch(key)
      if (result.ok) {
        startRequestKey.current = null
      } else if (result.error.code === 'ACTION_ALREADY_APPLIED') {
        startRequestKey.current = null
        if (room) gameRealtime.syncGameState(room.room.id)
      } else if (result.error.code === 'ACK_TIMEOUT' || result.error.code === 'SOCKET_DISCONNECTED') {
        setNotice('بنراجع حالة المباراة قبل ما نعيد الطلب.')
        if (room) gameRealtime.syncGameState(room.room.id)
      } else {
        startRequestKey.current = null
        setError(socketActionError(result.error))
      }
    } catch {
      setError('تعذر إرسال طلب بدء المباراة. تحقق من الاتصال ثم حاول مرة أخرى.')
    } finally {
      startLock.current = false
      setStartingMatch(false)
    }
  }

  async function performAction(kind: 'hint' | 'loan' | 'guess' | 'bet', fingerprint: string, action: (idempotencyKey: string) => Promise<import('./domain/types').ActionAcknowledgement>): Promise<void> {
    if (actionLock.current) return
    actionLock.current = true
    setPendingAction(kind)
    setPendingBalanceBefore(kind === 'bet' ? privateState?.availableChips ?? null : null)
    setError('')
    try {
      const idempotencyKey = retryableAction.current.forFingerprint(fingerprint)
      const result = await action(idempotencyKey)
      if (result.ok) {
        retryableAction.current.clear()
        return
      }
      if (result.error.code === 'ACTION_ALREADY_APPLIED') {
        retryableAction.current.clear()
        setNotice('وصلنا قرارك. بنحدّث حالة اللعب دلوقتي.')
        if (room) gameRealtime.syncGameState(room.room.id)
        return
      }
      if (isUncertainActionOutcome(result.error.code)) {
        setNotice('بنراجع حالة الحركة قبل ما نعيدها.')
        if (room) gameRealtime.syncGameState(room.room.id)
        return
      }
      retryableAction.current.clear()
      if (!result.ok) {
        setError(socketActionError(result.error))
      }
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
    void performAction('guess', `${gameState?.session.id}:${gameState?.session.roundNumber}:guess:${result.value}`, (key) => gameRealtime.submitGuess(result.value!, key))
  }

  function submitBet(action: BetAction): void {
    void performAction('bet', `${gameState?.session.id}:${gameState?.session.roundNumber}:${gameState?.session.version}:${JSON.stringify(action)}`, (key) => gameRealtime.submitBet(action, key))
  }

  async function copyRoomCode(): Promise<void> {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.room.code)
      setNotice('نسخنا الرمز، ابعته لأصحابك.')
    } catch {
      setNotice('ما قدرناش ننسخ الرمز. حدده وانسخه بنفسك.')
    }
  }

  async function shareRoom(): Promise<void> {
    if (!room) return
    const shareData = { title: 'غرفة سمكرو', text: `ادخلوا غرفة سمكرو بالرمز ${room.room.code}` }
    try {
      let usedNativeShare = false
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData)
        usedNativeShare = true
      }
      else await navigator.clipboard.writeText(shareData.text)
      setNotice(usedNativeShare ? 'بعتنا دعوة الغرفة.' : 'نسخنا دعوة الغرفة، ابعتها لأصحابك.')
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      setNotice('ما قدرناش نشارك الدعوة. انسخ رمز الغرفة وجرب تاني.')
    }
  }

  const ready = room?.room.readyPlayerIds?.includes(player?.id ?? '') ?? false
  const gameReady = Boolean(connected && gameState && privateState?.playerId === player?.id && privateState?.matchId === gameState.session.id && privateState?.roundNumber === gameState.session.roundNumber)
  const allReady = Boolean(room && room.players.length >= 3 && room.room.readyPlayerIds?.length === room.players.length)
  const canStart = Boolean(connected && room?.room.status === 'waiting' && room.room.hostPlayerId === player?.id && allReady)
  const homePage = <ServerHomePage
    player={player}
    displayName={displayName}
    onDisplayName={setDisplayName}
    onGuestSubmit={createGuest}
    busy={busy}
    online={browserOnline}
    roomCode={roomCode}
    onRoomCode={setRoomCode}
    onCreateRoom={() => void createRoom()}
    onJoinRoom={joinRoom}
    onProfile={() => setTab('profile')}
  />
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
      onRequestHint={() => { void performAction('hint', `hint:${gameState?.session.id}:${gameState?.session.roundNumber}`, (key) => gameRealtime.requestHint(key)) }}
      onRequestLoan={() => { void performAction('loan', `loan:${gameState?.session.id}:${gameState?.session.roundNumber}`, (key) => gameRealtime.requestLoan(key)) }}
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
    content = <LoadingState title="بنجهّز اللعبة" description="بنرجّع جلستك والغرفة اللي كنت فيها…" />
  } else if (!player) {
    content = homePage
  } else if (player && roomRestoreFailed) {
    content = <EmptyState icon="refresh" title="مش قادرين نرجّع الغرفة" description="جلستك لسه محفوظة. راجع اتصالك وحاول تفتح الغرفة تاني.">
      <ActionButton onClick={() => { setError(''); setRoomRestoreFailed(false); setRoomRestoreAttempt((attempt) => attempt + 1) }}>جرّب تاني</ActionButton>
      <ActionButton tone="quiet" onClick={leaveRoom}>ارجع للرئيسية</ActionButton>
    </EmptyState>
  } else if (room && (!connected || !roomConfirmed)) {
    content = <div className="state-card">
      <span className="state-icon"><Icon name="refresh" size={24} /></span>
      <h1>بنوصّلك بالغرفة</h1>
      <p>بنستنى تأكيد الاتصال وحالة اللعب.</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="state-actions"><ActionButton onClick={() => { setError(''); setRoomConnectionAttempt((attempt) => attempt + 1) }}>جرّب الاتصال تاني</ActionButton><ActionButton tone="quiet" onClick={leaveRoom}>سيب الغرفة</ActionButton></div>
    </div>
  } else if (room && tab === 'lobby' && player) {
    content = <RoomLobbyPage
      room={room}
      player={player}
      connected={connected}
      startingMatch={startingMatch}
      canStart={canStart}
      onCopyCode={() => void copyRoomCode()}
      onShare={() => void shareRoom()}
      onToggleReady={() => gameRealtime.setReady(!ready)}
      onStart={() => void startMatch()}
      onLeave={leaveRoom}
    />
  } else if (tab === 'profile' && player) {
    content = <ServerProfilePage
      player={player}
      connected={connected}
      roomCode={room?.room.code ?? null}
      onOpenLobby={() => setTab('lobby')}
      onLogout={() => void logout()}
      loggingOut={loggingOut}
    />
  } else if (tab === 'leaderboard') {
    content = <LeaderboardPage entries={[]} onPlayAgain={() => { setLeaderboard(null); setTab('home') }} />
  } else {
    content = homePage
  }

  const modeLabel = room && connected ? 'متصل بالغرفة' : browserOnline ? 'جاهز للعب' : 'غير متصل'
  const modeTone = room && connected ? 'online' : browserOnline ? 'neutral' : 'offline'

  return <div data-mode="server" dir="rtl">
    <AppShell
      activeTab={tab}
      onNavigate={(nextTab) => { if (nextTab !== 'lobby' || room) setTab(nextTab) }}
      chips={0}
      showNav={Boolean(player && !gameReady)}
      showWallet={false}
      modeLabel={modeLabel}
      modeTone={modeTone}
      playerLabel={player?.name ?? 'ضيف'}
      footerLabel="لعبة تخمين بين الأصحاب"
    >
      {!browserOnline && !gameReady && <div className="offline-banner" role="status">
        <span className="offline-banner-icon"><Icon name="wifiOff" size={19} /></span>
        <span><strong>أنت غير متصل بالإنترنت</strong><small>اللعب الجماعي يحتاج اتصالاً. هنرجع نزامن الغرفة أول ما الشبكة ترجع.</small></span>
        {room && <ActionButton tone="quiet" onClick={() => setRoomConnectionAttempt((attempt) => attempt + 1)}>حاول تاني</ActionButton>}
      </div>}
      {error && !gameReady && <div className="error-banner" role="alert"><Icon name="alert" size={17} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="إغلاق"><Icon name="close" size={17} /></button></div>}
      {notice && <Toast message={notice} tone="success" onDismiss={() => setNotice('')} />}
      {content}
    </AppShell>
  </div>
}
