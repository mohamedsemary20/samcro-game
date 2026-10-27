import type {
  ActionAcknowledgement,
  ClientToServerEvents,
  PrivatePlayerState,
  PublicGameState,
  Room,
  RoundResult,
  ServerToClientEvents,
} from '../domain/types'
import { GameApiError, type GameRealtimeConnection } from './contracts'

interface SocketClient {
  connected: boolean
  connect(): void
  disconnect(): void
  on<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): this
  on(event: 'connect', listener: () => void): this
  on(event: 'connect_error', listener: (error: Error) => void): this
  on(event: 'disconnect', listener: (reason: string) => void): this
  once<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): this
  once(event: 'connect', listener: () => void): this
  once(event: 'connect_error', listener: (error: Error) => void): this
  once<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): this
  off<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): this
  off(event: 'connect_error', listener: (error: Error) => void): this
  off(event: 'disconnect', listener: (reason: string) => void): this
  emit<E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>): this
}

interface SocketFactory {
  (uri: string, options: { withCredentials: boolean; autoConnect: boolean }): SocketClient
}

declare global {
  interface Window { io?: SocketFactory }
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'
const socketOrigin = import.meta.env.VITE_SOCKET_ORIGIN || new URL(apiBase, window.location.origin).origin
let socketClientScript: Promise<void> | null = null

function loadSocketClient(): Promise<void> {
  if (window.io) return Promise.resolve()
  if (socketClientScript) return socketClientScript
  socketClientScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${socketOrigin}/socket.io/socket.io.js`
    script.async = true
    script.onload = () => window.io ? resolve() : reject(new Error('Socket.IO client did not initialize.'))
    script.onerror = () => reject(new Error('Could not load the Socket.IO client from the game server.'))
    document.head.append(script)
  }).catch((error: unknown) => {
    socketClientScript = null
    throw error
  })
  return socketClientScript!
}

export class SocketGameConnection implements GameRealtimeConnection {
  private socket: SocketClient | null = null
  private statusListeners = new Set<(status: 'connected' | 'reconnecting') => void>()

  private notifyStatus(status: 'connected' | 'reconnecting'): void {
    for (const listener of this.statusListeners) listener(status)
  }

  async connect(roomId: string): Promise<void> {
    await loadSocketClient()
    await this.disconnect()
    const factory = window.io
    if (!factory) throw new Error('Socket.IO client is unavailable.')
    const socket = factory(socketOrigin, { withCredentials: true, autoConnect: false })
    this.socket = socket
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Timed out while joining the room.')), 10_000)
      let joined = false
      socket.on('connect', () => {
        this.notifyStatus('connected')
        // Socket.IO reconnects the transport, but the server creates a fresh room membership
        // for each connection. Rejoin so it can send authoritative public/private snapshots.
        socket.emit('room:join', { roomId })
      })
      socket.on('disconnect', () => this.notifyStatus('reconnecting'))
      socket.on('connect_error', () => this.notifyStatus('reconnecting'))
      socket.once('connect_error', (error) => {
        window.clearTimeout(timeout)
        reject(error)
      })
      socket.once('server:error', (error) => {
        window.clearTimeout(timeout)
        reject(new GameApiError(409, error))
      })
      socket.once('room:state', () => {
        if (!joined) {
          joined = true
          window.clearTimeout(timeout)
          resolve()
        }
      })
      socket.connect()
    }).catch(async (error: unknown) => {
      await this.disconnect()
      throw error
    })
  }

  onRoomState(listener: (state: Room) => void): () => void { return this.listen('room:state', listener) }
  onPublicGameState(listener: (state: PublicGameState) => void): () => void { return this.listen('game:state', listener) }
  onPrivatePlayerState(listener: (state: PrivatePlayerState) => void): () => void { return this.listen('player:private', listener) }
  onRoundReveal(listener: (result: RoundResult) => void): () => void { return this.listen('game:reveal', listener) }
  onMatchComplete(listener: (entries: import('../domain/types').LeaderboardEntry[]) => void): () => void { return this.listen('game:complete', listener) }

  onConnectionError(listener: (error: import('../domain/types').ApiError) => void): () => void {
    const socket = this.requireSocket()
    const handleError = (error: Error) => listener({ code: 'SOCKET_CONNECTION', message: error.message })
    const handleDisconnect = (reason: string) => listener({ code: 'SOCKET_DISCONNECTED', message: reason })
    socket.on('connect_error', handleError)
    socket.on('disconnect', handleDisconnect)
    const handleServerError = (error: import('../domain/types').ApiError) => listener(error)
    socket.on('server:error', handleServerError)
    return () => {
      socket.off('connect_error', handleError)
      socket.off('disconnect', handleDisconnect)
      socket.off('server:error', handleServerError)
    }
  }

  onConnectionStatus(listener: (status: 'connected' | 'reconnecting') => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  setReady(ready: boolean): void { this.requireSocket().emit('room:ready', { ready }) }
  leaveRoom(roomId: string): void { this.requireSocket().emit('room:leave', { roomId }) }
  startMatch(idempotencyKey: string): Promise<ActionAcknowledgement> {
    return this.withAcknowledgement((acknowledge) => this.requireSocket().emit('match:start', { idempotencyKey }, acknowledge))
  }
  syncGameState(roomId: string): void { this.requireSocket().emit('game:sync', { roomId }) }
  requestHint(idempotencyKey: string): Promise<ActionAcknowledgement> {
    return this.withAcknowledgement((acknowledge) => this.requireSocket().emit('game:hint.request', { idempotencyKey }, acknowledge))
  }
  requestLoan(idempotencyKey: string): Promise<ActionAcknowledgement> {
    return this.withAcknowledgement((acknowledge) => this.requireSocket().emit('game:loan.request', { idempotencyKey }, acknowledge))
  }
  submitGuess(value: number, idempotencyKey: string): Promise<ActionAcknowledgement> {
    return this.withAcknowledgement((acknowledge) => this.requireSocket().emit('game:guess.submit', { value, idempotencyKey }, acknowledge))
  }
  submitBet(action: import('../domain/types').BetAction, idempotencyKey: string): Promise<ActionAcknowledgement> {
    return this.withAcknowledgement((acknowledge) => this.requireSocket().emit('game:bet.submit', { action, idempotencyKey }, acknowledge))
  }

  async disconnect(): Promise<void> {
    this.socket?.disconnect()
    this.socket = null
    this.notifyStatus('reconnecting')
  }

  private listen<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): () => void {
    const socket = this.requireSocket()
    socket.on(event, listener)
    return () => socket.off(event, listener)
  }

  private requireSocket(): SocketClient {
    if (!this.socket) throw new Error('Realtime connection is not connected.')
    return this.socket
  }

  private withAcknowledgement(send: (acknowledge: (result: ActionAcknowledgement) => void) => unknown): Promise<ActionAcknowledgement> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (result: ActionAcknowledgement) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(result)
      }
      const timer = window.setTimeout(() => finish({ ok: false, error: { code: 'ACK_TIMEOUT', message: 'The server did not confirm the action in time.' } }), 8_000)
      try { send(finish) }
      catch { finish({ ok: false, error: { code: 'SOCKET_DISCONNECTED', message: 'The game connection is unavailable.' } }) }
    })
  }
}

export const gameRealtime = new SocketGameConnection()
