import * as SecureStore from 'expo-secure-store'
import { io, type Socket } from 'socket.io-client'
import type { ActionAcknowledgement, ClientToServerEvents, ServerToClientEvents } from '../../../shared/contracts'
import { configuredApiBaseUrl, SESSION_TOKEN_KEY } from '@/api/client'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export async function connectRoom(roomId: string, onStatus: (status: 'connected' | 'reconnecting') => void): Promise<GameSocket> {
  if (!configuredApiBaseUrl) throw new Error('Set EXPO_PUBLIC_API_BASE_URL before using online play.')
  const sessionToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY)
  if (!sessionToken) throw new Error('سجّل الدخول كضيف أولاً.')
  const socketOrigin = process.env.EXPO_PUBLIC_SOCKET_ORIGIN || new URL(configuredApiBaseUrl).origin
  const socket = io(socketOrigin, {
    autoConnect: false,
    auth: (callback) => callback({ sessionToken }),
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
    transports: ['websocket', 'polling'],
  }) as GameSocket

  socket.on('connect', () => {
    onStatus('connected')
    // Every transport reconnect receives a fresh server socket and must restore membership.
    socket.emit('room:join', { roomId })
  })
  socket.on('disconnect', () => onStatus('reconnecting'))
  socket.on('connect_error', () => onStatus('reconnecting'))
  return socket
}

export function withAcknowledgement(send: (acknowledge: (result: ActionAcknowledgement) => void) => void): Promise<ActionAcknowledgement> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: ActionAcknowledgement) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => finish({
      ok: false,
      error: { code: 'ACK_TIMEOUT', message: 'The server did not confirm the action in time.' },
    }), 8_000)
    try { send(finish) } catch {
      finish({ ok: false, error: { code: 'SOCKET_DISCONNECTED', message: 'The game connection is unavailable.' } })
    }
  })
}
