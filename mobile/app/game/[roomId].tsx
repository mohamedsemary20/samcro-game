import * as Crypto from 'expo-crypto'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { BetAction, PrivatePlayerState, PublicGameState, RoundResult } from '../../../shared/contracts'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { connectRoom, withAcknowledgement, type GameSocket } from '@/realtime/connection'
import { colors } from '@/theme/colors'

const phaseLabels: Record<PublicGameState['session']['phase'], string> = {
  'round-funding': 'نافذة القرض',
  'question-betting': 'رهانات السؤال',
  'secret-clue': 'التلميح السري',
  'guess-input': 'إرسال التوقع',
  'final-betting': 'الرهان الأخير',
  'round-reveal': 'كشف النتيجة',
  'podium-finish': 'نهاية المباراة',
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ roomId: string }>()
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId
  const router = useRouter()
  const { player } = useAuth()
  const [game, setGame] = useState<PublicGameState | null>(null)
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null)
  const [socket, setSocket] = useState<GameSocket | null>(null)
  const [status, setStatus] = useState<'connected' | 'reconnecting'>('reconnecting')
  const [guess, setGuess] = useState('')
  const [raiseAmount, setRaiseAmount] = useState('60')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<RoundResult | null>(null)

  useEffect(() => {
    if (!roomId) return
    let active = true
    let liveSocket: GameSocket | null = null
    const onGame = (next: PublicGameState) => setGame((current) => {
      if (current && current.session.version !== undefined && next.session.version !== undefined && next.session.version < current.session.version) return current
      return next
    })
    const onPrivate = (next: PrivatePlayerState) => setPrivateState((current) => !current || next.stateVersion >= current.stateVersion ? next : current)
    const onReveal = (next: RoundResult) => setReveal(next)
    const onComplete = (entries: import('../../../shared/contracts').LeaderboardEntry[]) => {
      const query = encodeURIComponent(JSON.stringify(entries))
      router.replace(`/results?entries=${query}`)
    }
    const onServerError = (serverError: { message: string }) => setError(serverError.message)

    void Promise.all([api.getPublicGameState(roomId), api.getPrivatePlayerState()]).then(([publicState, ownState]) => {
      if (active) {
        setGame(publicState)
        setPrivateState(ownState)
      }
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'تعذر استعادة المباراة.') })

    void connectRoom(roomId, setStatus).then((nextSocket) => {
      if (!active) { nextSocket.disconnect(); return }
      liveSocket = nextSocket
      setSocket(nextSocket)
      nextSocket.on('game:state', onGame)
      nextSocket.on('player:private', onPrivate)
      nextSocket.on('game:reveal', onReveal)
      nextSocket.on('game:complete', onComplete)
      nextSocket.on('server:error', onServerError)
      nextSocket.on('room:state', () => nextSocket.emit('game:sync', { roomId }))
      nextSocket.connect()
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'تعذر الاتصال بالمباراة.') })

    return () => {
      active = false
      if (liveSocket) liveSocket.disconnect()
    }
  }, [roomId, router])

  useEffect(() => {
    const deadline = game?.session.decisionDeadline
    if (!deadline) { setRemaining(null); return }
    const update = () => setRemaining(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    update()
    const timer = setInterval(update, 1_000)
    return () => clearInterval(timer)
  }, [game?.session.decisionDeadline])

  const progress = useMemo(() => game?.roundProgress.find((item) => item.playerId === player?.id), [game, player?.id])
  const isActor = game?.session.currentActorId === player?.id
  const toCall = Math.max(0, (game?.session.currentBet ?? 0) - (progress?.currentStreetWager ?? 0))
  const phase = game?.session.phase

  const send = async (operation: (acknowledge: (result: import('../../../shared/contracts').ActionAcknowledgement) => void) => void) => {
    if (!socket) { setError('الاتصال غير متاح حالياً.'); return }
    setBusy(true)
    setError(null)
    const result = await withAcknowledgement(operation)
    if (!result.ok) setError(result.error.message)
    setBusy(false)
  }
  const requestHint = () => send((ack) => socket?.emit('game:hint.request', { idempotencyKey: Crypto.randomUUID() }, ack))
  const requestLoan = () => send((ack) => socket?.emit('game:loan.request', { idempotencyKey: Crypto.randomUUID() }, ack))
  const submitGuess = () => {
    const value = Number(guess)
    if (!/^\d{1,12}$/.test(guess) || !Number.isSafeInteger(value)) { setError('اكتب توقعاً صحيحاً من أرقام فقط.'); return }
    void send((ack) => socket?.emit('game:guess.submit', { value, idempotencyKey: Crypto.randomUUID() }, ack))
  }
  const submitBet = (action: BetAction) => send((ack) => socket?.emit('game:bet.submit', { action, idempotencyKey: Crypto.randomUUID() }, ack))

  return (
    <Screen title={game ? `الجولة ${game.session.roundNumber}` : 'ساحة اللعب'} subtitle={game ? `${phaseLabels[game.session.phase]} · ${status === 'connected' ? 'متصل' : 'يعيد الاتصال'}` : 'جارٍ استعادة حالة المباراة...'}>
      <Panel title="السؤال" trailing={remaining === null ? undefined : <Text style={styles.timer}>{remaining}ث</Text>}>
        {game ? <>
          <Text style={ui.muted}>{game.question.category}</Text>
          <Text style={ui.body}>{game.question.prompt}</Text>
          <Text style={ui.muted}>الجائزة الحالية: {game.session.pot}</Text>
        </> : <ActivityIndicator color={colors.orange} />}
      </Panel>
      {privateState ? <Panel title="معلوماتك الخاصة">
        <Text style={ui.body}>رصيدك: {privateState.availableChips}</Text>
        {privateState.hint ? <Text style={ui.body}>التلميح: {privateState.hint.range} · {privateState.hint.accuracy}</Text> : null}
        {privateState.goldenHint ? <Text style={ui.body}>{privateState.goldenHint}</Text> : null}
        {privateState.guess ? <Text style={ui.muted}>تم تسجيل توقعك.</Text> : null}
      </Panel> : null}
      {phase === 'round-funding' && privateState?.loanAvailable ? <ActionButton disabled={busy || status !== 'connected'} onPress={() => void requestLoan()}>طلب قرض طارئ</ActionButton> : null}
      {phase === 'secret-clue' && !privateState?.hint && !progress?.hasHint ? <ActionButton disabled={busy || status !== 'connected'} onPress={() => void requestHint()}>اطلب تلميحك الخاص</ActionButton> : null}
      {phase === 'guess-input' && !privateState?.guess && !progress?.hasGuess ? <Panel title="توقعك">
        <TextField keyboardType="number-pad" label="اكتب رقماً صحيحاً" maxLength={12} onChangeText={setGuess} placeholder="0" value={guess} />
        <ActionButton disabled={busy || status !== 'connected'} onPress={submitGuess}>تأكيد التوقع</ActionButton>
      </Panel> : null}
      {(phase === 'question-betting' || phase === 'final-betting') && isActor ? <Panel title="دورك في الرهان">
        <Text style={ui.muted}>{toCall > 0 ? `المطلوب لمجاراة الرهان: ${toCall}` : 'يمكنك الفحص أو بدء رهان.'}</Text>
        <View style={styles.actions}>
          <ActionButton disabled={busy || status !== 'connected'} onPress={() => void submitBet(toCall > 0 ? { type: 'call' } : { type: 'check' })}>{toCall > 0 ? 'مجاراة' : 'فحص'}</ActionButton>
          <ActionButton disabled={busy || status !== 'connected'} onPress={() => void submitBet({ type: 'fold' })} secondary>انسحاب</ActionButton>
        </View>
        <TextField keyboardType="number-pad" label="قيمة الزيادة" maxLength={8} onChangeText={setRaiseAmount} value={raiseAmount} />
        <ActionButton disabled={busy || status !== 'connected'} onPress={() => {
          const amount = Number(raiseAmount)
          if (!Number.isSafeInteger(amount) || amount <= 0) { setError('قيمة الزيادة يجب أن تكون رقماً موجباً.'); return }
          void submitBet({ type: 'raise', amount })
        }} secondary>زيادة الرهان</ActionButton>
      </Panel> : null}
      {phase === 'round-reveal' && reveal ? <Panel title="النتيجة"><Text style={ui.body}>الإجابة الصحيحة: {reveal.correctAnswer}</Text></Panel> : null}
      {game?.leaderboard?.length ? <Panel title="الترتيب الحالي">
        {game.leaderboard.slice(0, 5).map((entry) => <Text key={entry.playerId} style={ui.body}>{entry.rank}. {entry.displayName} · {entry.score}</Text>)}
      </Panel> : null}
      {phase !== 'round-funding' && phase !== 'question-betting' && phase !== 'secret-clue' && phase !== 'guess-input' && phase !== 'final-betting' && !game ? <ActivityIndicator color={colors.orange} /> : null}
      {error ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">{error}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  timer: { color: colors.orange, fontFamily: 'Cairo', fontWeight: '700', fontSize: 17 },
  actions: { flexDirection: 'row-reverse', gap: 10 },
})
