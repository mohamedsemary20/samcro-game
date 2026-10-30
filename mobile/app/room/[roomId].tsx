import * as Crypto from 'expo-crypto'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { Room } from '../../../shared/contracts'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { connectRoom, withAcknowledgement, type GameSocket } from '@/realtime/connection'
import { colors } from '@/theme/colors'

export default function RoomScreen() {
  const params = useLocalSearchParams<{ roomId: string }>()
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId
  const router = useRouter()
  const { player } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [socket, setSocket] = useState<GameSocket | null>(null)
  const [connection, setConnection] = useState<'connected' | 'reconnecting'>('reconnecting')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!roomId) return
    let active = true
    let liveSocket: GameSocket | null = null
    const onRoom = (state: Room) => setRoom(state)
    const onGame = () => router.replace(`/game/${encodeURIComponent(roomId)}`)
    const onServerError = (serverError: { message: string }) => setError(serverError.message)

    void api.getRoom(roomId).then((details) => { if (active) setRoom(details.room) }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'تعذر استعادة الغرفة.')
    })
    void connectRoom(roomId, setConnection).then((nextSocket) => {
      if (!active) { nextSocket.disconnect(); return }
      liveSocket = nextSocket
      setSocket(nextSocket)
      nextSocket.on('room:state', onRoom)
      nextSocket.on('game:state', onGame)
      nextSocket.on('server:error', onServerError)
      nextSocket.connect()
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'تعذر الاتصال بالغرفة.')
    })

    return () => {
      active = false
      if (liveSocket) {
        liveSocket.off('room:state', onRoom)
        liveSocket.off('game:state', onGame)
        liveSocket.off('server:error', onServerError)
        liveSocket.disconnect()
      }
    }
  }, [roomId, router])

  const myMember = useMemo(() => room?.members?.find((member) => member.playerId === player?.id), [room, player?.id])
  const readyCount = room?.members?.filter((member) => member.isReady).length ?? room?.readyPlayerIds?.length ?? 0
  const isHost = !!room && room.hostPlayerId === player?.id
  const canStart = isHost && readyCount >= 3 && connection === 'connected' && !starting

  const toggleReady = () => {
    if (!socket) return
    socket.emit('room:ready', { ready: !myMember?.isReady })
  }

  const startMatch = async () => {
    if (!socket) return
    setStarting(true)
    setError(null)
    const result = await withAcknowledgement((acknowledge) => socket.emit('match:start', { idempotencyKey: Crypto.randomUUID() }, acknowledge))
    if (!result.ok) setError(result.error.message)
    setStarting(false)
  }

  return (
    <Screen title="غرفة الانتظار" subtitle={room ? `رمز الغرفة: ${room.code}` : 'جارٍ استعادة الغرفة...'}>
      <Panel title="الاتصال" trailing={<View style={[styles.dot, { backgroundColor: connection === 'connected' ? colors.green : colors.orange }]} />}>
        <Text style={ui.body}>{connection === 'connected' ? 'متصل بالخادم' : 'يعيد الاتصال...'}</Text>
      </Panel>
      <Panel title={`اللاعبون · ${room?.members?.length ?? room?.playerIds.length ?? 0}/${room?.capacity ?? 7}`}>
        {room?.members?.map((member) => (
          <View key={member.playerId} style={styles.playerRow}>
            <View style={styles.memberStatus}>
              <Text style={[ui.muted, { color: member.isConnected ? colors.green : colors.muted }]}>{member.isConnected ? 'متصل' : 'غير متصل'}</Text>
              <Text style={[ui.muted, { color: member.isReady ? colors.green : colors.muted }]}>{member.isReady ? 'جاهز' : 'ينتظر'}</Text>
            </View>
            <Text style={ui.body}>{member.displayName}{member.isHost ? ' · المضيف' : ''}{member.playerId === player?.id ? ' · أنت' : ''}</Text>
          </View>
        ))}
        {!room ? <ActivityIndicator color={colors.orange} /> : null}
      </Panel>
      {room && !isHost ? <ActionButton disabled={connection !== 'connected'} onPress={toggleReady} secondary>{myMember?.isReady ? 'إلغاء الجاهزية' : 'أنا جاهز'}</ActionButton> : null}
      {isHost ? <ActionButton disabled={!canStart} onPress={() => void startMatch()}>{starting ? 'جارٍ البدء...' : `ابدأ المباراة · ${readyCount}/3 جاهزين`}</ActionButton> : null}
      {error ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">{error}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
  playerRow: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  memberStatus: { flexDirection: 'row-reverse', gap: 10 },
})
