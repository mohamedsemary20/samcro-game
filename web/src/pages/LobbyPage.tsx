import { useState } from 'react'
import type { Player, RoomDetails } from '../domain/types'
import { Toast } from '../components/Toast'
import { RoomLobbyPage } from './RoomLobbyPage'

export function LobbyPage({ players, roomCode, ready, onReady, onStart }: {
  players: Player[]; roomCode: string; ready: boolean; onReady: () => void; onStart: () => void
}) {
  const [notice, setNotice] = useState('')
  const self = players.find((player) => player.id === 'you')
  const readyPlayerIds = players.filter((player) => player.id !== 'you' || ready).map((player) => player.id)
  const room: RoomDetails = {
    room: {
      id: 'room-demo',
      code: roomCode,
      hostPlayerId: players.find((player) => player.isHost)?.id ?? 'you',
      playerIds: players.map((player) => player.id),
      status: 'waiting',
      capacity: 7,
      readyPlayerIds,
      connectedPlayerIds: players.map((player) => player.id),
    },
    players: players.map((player) => ({
      playerId: player.id,
      displayName: player.name,
      isHost: player.isHost,
      isReady: readyPlayerIds.includes(player.id),
      isConnected: true,
    })),
  }

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(roomCode)
      setNotice('نسخنا الرمز. تقدر تلزقه في المعاينة.')
    } catch {
      setNotice(`رمز المعاينة: ${roomCode}`)
    }
  }

  async function sharePreview(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`غرفة معاينة سمكرو: ${roomCode}`)
      setNotice('نسخنا دعوة المعاينة. اللعب الحقيقي محتاج غرفة على الخادم.')
    } catch {
      setNotice('ما قدرناش ننسخ. الرمز ظاهر في البطاقة.')
    }
  }

  return <>
    <RoomLobbyPage
      room={room}
      player={{ id: self?.id ?? 'you', name: self?.name ?? 'أنت' }}
      connected
      preview
      startingMatch={false}
      canStart
      onCopyCode={() => void copyCode()}
      onShare={() => void sharePreview()}
      onToggleReady={onReady}
      onStart={onStart}
      onLeave={() => undefined}
    />
    {notice && <Toast message={notice} tone="info" onDismiss={() => setNotice('')} />}
  </>
}
