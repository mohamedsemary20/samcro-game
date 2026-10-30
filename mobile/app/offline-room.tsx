import { useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import QRCode from 'react-native-qrcode-svg'
import { Alert, Pressable, Text, View } from 'react-native'
import type { LocalMatchAction, LocalMatchSnapshot } from '@game-core/localMatch'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { OfflineGameControls } from '@/components/OfflineGameControls'
import { OfflineLobbyControls } from '@/components/OfflineLobbyControls'
import { MatchResultsPanel } from '@/components/MatchResultsPanel'
import { OfflineConnectionStatus } from '@/components/OfflineConnectionStatus'
import { colors, typeStyles } from '@/theme/colors'
import { useOfflineRuntime } from '@/offline/useOfflineRuntime'
import { clearOfflineRuntime, setOfflineRuntime } from '@/offline/runtime'
import { offlineQuestionReadiness } from '@/offline/questionPack'

function connectionText(connection: string): string {
  const labels: Record<string, string> = {
    connected: 'متصل', connecting: 'جارٍ الاتصال', reconnecting: 'إعادة الاتصال', disconnected: 'غير متصل',
    'host-disconnected': 'انقطع اتصال المضيف', 'room-closed': 'أغلق المضيف الغرفة',
    'room-full': 'الغرفة ممتلئة', 'room-unavailable': 'الغرفة لا تستقبل لاعبين الآن',
    kicked: 'أزالك المضيف من الغرفة',
    'network-unavailable': 'الشبكة المحلية غير متاحة', timeout: 'انتهت مهلة الاتصال',
    'invalid-credential': 'بيانات الغرفة غير صالحة',
  }
  return labels[connection] ?? connection
}

function phaseText(phase: string): string {
  const labels: Record<string, string> = {
    'round-funding': 'نافذة القرض', 'question-betting': 'المراهنة الأولى', 'secret-clue': 'التلميحات الخاصة',
    'guess-input': 'تسجيل الإجابات', 'final-betting': 'المراهنة النهائية', 'round-reveal': 'كشف النتيجة',
    'podium-finish': 'النتائج النهائية', waiting: 'انتظار اللاعبين', finished: 'انتهت المباراة', closed: 'أغلقت الغرفة',
  }
  return labels[phase] ?? phase
}

function offlineErrorText(code: string): string {
  const labels: Record<string, string> = {
    QUESTION_BANK_INCOMPLETE: 'لا يمكن بدء المباراة قبل اعتماد خمسة أسئلة محلية على الأقل.',
    QUESTIONS_UNAVAILABLE: 'لا توجد أسئلة محلية معتمدة كافية لبدء المباراة.',
    ROOM_NOT_READY: 'يلزم انضمام اللاعبين وجعل الجميع جاهزين قبل البدء.',
    ROOM_FULL: 'وصلت الغرفة إلى الحد الأقصى للاعبين.',
    ROOM_NOT_WAITING: 'هذا الإجراء متاح في غرفة الانتظار فقط.',
    HOST_ONLY: 'هذا الإجراء متاح للمضيف فقط.',
    PLAYER_NOT_FOUND: 'لم يعد اللاعب موجودًا في الغرفة.',
    CANNOT_REMOVE_HOST: 'لا يمكن إزالة مضيف الغرفة.',
    OUT_OF_TURN: 'انتظر حتى يحين دورك.',
    DUPLICATE_ACTION: 'تم إرسال هذا الإجراء من قبل.',
    STALE_SEQUENCE: 'تغيرت حالة المباراة. انتظر تحديث الغرفة ثم حاول مجددًا.',
    INVALID_ACTION: 'الإجراء غير صالح لهذه المرحلة.',
    INVALID_CREDENTIAL: 'بيانات الانضمام لم تعد صالحة.',
  }
  return labels[code] ?? 'تعذر إكمال الإجراء في الغرفة المحلية.'
}

export default function OfflineRoomScreen() {
  useKeepAwake()
  const runtime = useOfflineRuntime()
  const host = runtime.host
  const [snapshot, setSnapshot] = useState<LocalMatchSnapshot | null>(runtime.snapshot)
  const [qrAddress, setQrAddress] = useState('')
  const [guess, setGuess] = useState('')
  const [raiseAmount, setRaiseAmount] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!host) return
    return host.subscribe((next) => {
      setSnapshot(next)
      setOfflineRuntime({ snapshot: next })
    })
  }, [host])

  useEffect(() => {
    if (!runtime.client) return
    setSnapshot(runtime.snapshot)
  }, [runtime.client, runtime.snapshot])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  const uriEntries = host?.joinUris ?? []
  const chosenUri = useMemo(() => uriEntries.find((entry) => entry.address === qrAddress) ?? uriEntries[0], [uriEntries, qrAddress])
  const playerId = runtime.playerId
  const ownPlayer = snapshot?.state.players.find((player) => player.id === playerId)
  const ownMember = snapshot?.members.find((member) => member.playerId === playerId)
  const isHost = Boolean(host)
  const game = snapshot?.state
  const isGame = snapshot?.status === 'in-progress' || snapshot?.status === 'finished'

  const sendAction = (action: LocalMatchAction) => {
    if (!snapshot || !playerId) return
    if (host) {
      const result = host.dispatchHost(action)
      if (!result.ok) setOfflineRuntime({ error: offlineErrorText(result.code ?? 'INVALID_ACTION') })
    } else runtime.client?.sendAction({ sequence: snapshot.sequence, action })
  }

  const ready = () => {
    if (host) host.setHostReady(!ownMember?.isReady)
    else runtime.client?.sendReady(!ownMember?.isReady)
  }

  const start = () => {
    const result = host?.startMatch()
    if (result && !result.ok) setOfflineRuntime({ error: offlineErrorText(result.code ?? 'ROOM_NOT_READY') })
  }

  const removePlayer = (memberId: string, displayName: string) => Alert.alert('إزالة اللاعب؟', `سيتم فصل ${displayName} عن الغرفة المحلية.`, [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'إزالة اللاعب', style: 'destructive', onPress: () => {
      void host?.removePlayer(memberId).then((result) => {
        if (!result.ok) setOfflineRuntime({ error: offlineErrorText(result.code ?? 'PLAYER_NOT_FOUND') })
      })
    } },
  ])

  const closeRoom = () => Alert.alert('إنهاء الغرفة؟', 'سيُفصل جميع اللاعبين عن المضيف المحلي.', [
    { text: 'متابعة اللعب', style: 'cancel' },
    { text: 'إنهاء الغرفة', style: 'destructive', onPress: () => {
      if (host) void host.stop()
      runtime.client?.close()
      clearOfflineRuntime()
      router.replace('/offline')
    } },
  ])

  if (!snapshot || !game) {
    return <Screen title="الغرفة المحلية"><Panel><Text style={ui.body}>{connectionText(runtime.connection)}</Text><Text style={ui.muted}>بانتظار مصادقة المضيف وإرسال الحالة الحالية…</Text></Panel></Screen>
  }

  const timeLeft = game.deadline === null ? null : Math.max(0, Math.ceil((game.deadline - now) / 1000))
  const minimumRaiseAmount = Math.max(10, game.currentBet - (ownPlayer?.currentBet ?? 0) + 10)

  return (
    <Screen title={isGame ? `الجولة ${game.roundNumber} من ${game.roundsPerMatch}` : `غرفة ${snapshot.roomCode}`} subtitle={`الحالة: ${connectionText(runtime.connection)} · ${phaseText(game.phase)}`}>
      <Panel title={isGame ? 'ساحة اللعب' : 'اللاعبون'} trailing={<Text style={{ color: colors.orange, fontFamily: typeStyles.display, fontWeight: '700' }}>{isHost ? 'مضيف' : 'لاعب'}</Text>}>
        <OfflineConnectionStatus state={runtime.connection} />
        {!isGame && chosenUri ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Text style={ui.body}>امسح الرمز للانضمام دون إنترنت</Text>
            <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 12 }}><QRCode value={chosenUri.uri} size={220} backgroundColor="#ffffff" color="#111214" /></View>
            {uriEntries.length > 1 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>{uriEntries.map((entry) => <Pressable key={entry.address} onPress={() => setQrAddress(entry.address)} style={{ borderWidth: 1, borderColor: qrAddress === entry.address ? colors.orange : colors.border, borderRadius: 12, padding: 8 }}><Text style={{ color: colors.text }}>{entry.address}</Text></Pressable>)}</View> : null}
            <Text style={[ui.muted, { writingDirection: 'ltr', textAlign: 'center' }]}>{chosenUri.address}:{host?.port}</Text>
            <Text style={ui.muted}>رمز الغرفة: {snapshot.roomCode}</Text>
            <Text selectable style={[ui.muted, { writingDirection: 'ltr', textAlign: 'center' }]}>رمز الانضمام اليدوي: {host?.joinCredential}</Text>
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          {snapshot.members.map((member, index) => {
            const player = game.players.find((entry) => entry.id === member.playerId)
            return <View key={member.playerId} style={{ alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 16, flexDirection: 'row-reverse', gap: 12, padding: 12 }}>
              <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: index % 2 ? colors.orangeSoft : '#29313a', borderRadius: 21 }}><Text style={{ color: colors.orange, fontFamily: typeStyles.display, fontWeight: '700', fontSize: 18 }}>{member.displayName.slice(0, 1)}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontFamily: typeStyles.display, fontWeight: '700', textAlign: 'right' }}>{member.displayName}{member.playerId === playerId ? ' (أنت)' : ''}</Text>
                <Text style={ui.muted}>{member.isHost ? 'المضيف' : member.isReady ? 'جاهز' : 'بانتظار الجاهزية'} · {member.isConnected ? 'متصل' : 'انقطع الاتصال'}</Text>
              </View>
              {player ? <Text style={{ color: colors.orange, fontFamily: typeStyles.display }}>{player.chips} رقاقة</Text> : null}
              {isHost && !isGame && !member.isHost ? <Pressable accessibilityRole="button" accessibilityLabel={`إزالة ${member.displayName}`} onPress={() => removePlayer(member.playerId, member.displayName)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: colors.red, fontFamily: typeStyles.display }}>إزالة</Text></Pressable> : null}
            </View>
          })}
        </View>
        {!isGame ? <>
          <OfflineLobbyControls isReady={Boolean(ownMember?.isReady)} isHost={isHost} canStart={Boolean(host?.canStart)} approvedCount={offlineQuestionReadiness.approvedCount} requiredCount={offlineQuestionReadiness.requiredCount} onReady={ready} onStart={start} />
          <Text style={ui.muted}>يبقى المضيف في التطبيق والشاشة مفتوحة طوال المباراة. توقف الغرفة عند إغلاق المضيف.</Text>
        </> : null}
      </Panel>

      {isGame && snapshot.status === 'in-progress' ? <>
        <Panel title={game.question?.category ?? 'السؤال'}>
          <Text style={[ui.body, { fontSize: 22 }]}>{game.question?.prompt}</Text>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
            <Text style={ui.muted}>الرصيد: {ownPlayer?.chips ?? 0}</Text><Text style={ui.muted}>الصندوق: {game.pot}</Text>
          </View>
          {timeLeft !== null ? <Text accessibilityRole="timer" style={[ui.body, { color: timeLeft < 6 ? colors.red : colors.orange, textAlign: 'center' }]}>{timeLeft} ثانية</Text> : null}
          {game.phase === 'round-funding' && ownPlayer && ownPlayer.chips < 50 ? <ActionButton disabled={runtime.connection !== 'connected'} onPress={() => sendAction({ type: 'loan' })}>طلب قرض طارئ · 200</ActionButton> : null}
          {game.phase === 'secret-clue' && !game.ownHint ? <ActionButton disabled={runtime.connection !== 'connected'} onPress={() => sendAction({ type: 'hint-request' })}>طلب تلميح خاص</ActionButton> : null}
          {game.ownHint ? <View style={{ borderColor: colors.orange, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 }}><Text style={ui.body}>تلميحك الخاص</Text><Text style={ui.muted}>{game.ownHint.range} · {game.ownHint.accuracy}</Text><Text style={ui.muted}>{game.ownHint.advisoryNote}</Text></View> : null}
          {game.phase === 'guess-input' && !game.ownGuess ? <>
            <TextField label="إجابتك الرقمية" value={guess} onChangeText={setGuess} keyboardType="number-pad" maxLength={12} />
            <ActionButton disabled={runtime.connection !== 'connected'} onPress={() => { const value = Number(guess); if (Number.isSafeInteger(value) && value >= 0) sendAction({ type: 'guess', value }) }}>تأكيد الإجابة</ActionButton>
          </> : null}
          <OfflineGameControls phase={game.phase} actorId={game.currentActorId} playerId={playerId} currentBet={game.currentBet} personalBet={ownPlayer?.currentBet ?? 0} disabled={runtime.connection !== 'connected'} onAction={(action) => sendAction({ type: 'bet', action })} />
          {(game.phase === 'question-betting' || game.phase === 'final-betting') && game.currentActorId === playerId && ownPlayer ? <>
            <TextField label="مبلغ الزيادة (يشمل مجاراة الرهان)" value={raiseAmount || String(minimumRaiseAmount)} onChangeText={setRaiseAmount} keyboardType="number-pad" maxLength={8} />
            <ActionButton secondary disabled={runtime.connection !== 'connected'} onPress={() => {
              const amount = Number(raiseAmount || minimumRaiseAmount)
              if (!Number.isSafeInteger(amount) || amount < minimumRaiseAmount || amount > ownPlayer.chips) {
                setOfflineRuntime({ error: `أدخل مبلغًا من ${minimumRaiseAmount} إلى ${ownPlayer.chips} رقاقة.` })
                return
              }
              sendAction({ type: 'bet', action: { type: 'raise', amount } })
            }}>زيادة الرهان</ActionButton>
          </> : null}
        </Panel>
        <Panel title="أرصدة اللاعبين">
          {game.players.map((player) => <View key={player.id} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 8 }}><Text style={ui.body}>{player.name}{player.id === game.currentActorId ? ' · دوره' : ''}{player.folded ? ' · منسحب' : ''}</Text><Text style={ui.muted}>{player.chips} رقاقة</Text></View>)}
        </Panel>
      </> : null}

      {snapshot.status === 'finished' ? <MatchResultsPanel entries={game.leaderboard.map((entry) => ({ playerId: entry.playerId, displayName: entry.displayName, score: entry.netWorth, rank: entry.rank }))} answer={game.result?.correctAnswer} /> : null}

      {runtime.error ? <Text accessibilityRole="alert" style={[ui.body, { color: colors.red }]}>{runtime.error}</Text> : null}
      <ActionButton secondary onPress={closeRoom}>{isHost ? 'إنهاء الغرفة' : 'مغادرة الغرفة'}</ActionButton>
    </Screen>
  )
}
