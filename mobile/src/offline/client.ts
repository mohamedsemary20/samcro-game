import type { LocalJoinPayload } from './joinPayload'
import type { LocalMatchSnapshot } from '@game-core/localMatch'

export type LanConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'room-closed' | 'room-full' | 'room-unavailable' | 'kicked' | 'host-disconnected' | 'invalid-credential' | 'timeout' | 'network-unavailable'
export type LanMessage = Record<string, unknown> & { type: string }

export interface LocalClientCredentials { playerId: string; resumeToken: string }

export class LocalRoomClient {
  private socket: WebSocket | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manuallyClosed = false
  private hostClosed = false
  private reconnectAttempts = 0
  private lastSequence = -1
  private actionCounter = 0
  private payload: LocalJoinPayload | null = null
  private displayName = ''
  private resume: LocalClientCredentials | undefined

  constructor(
    private readonly onState: (state: LanConnectionState) => void,
    private readonly onSnapshot: (snapshot: LocalMatchSnapshot) => void,
    private readonly onCredentials: (credentials: LocalClientCredentials) => void,
    private readonly onError: (code: string) => void,
  ) {}

  connect(payload: LocalJoinPayload, displayName: string, resume?: LocalClientCredentials): void {
    this.manuallyClosed = false
    this.hostClosed = false
    this.payload = payload
    this.displayName = displayName
    this.resume = resume
    this.open()
  }

  sendAction(input: { sequence: number; action: Record<string, unknown> }): void {
    this.send({ type: 'action', actionId: this.nextActionId(), expectedSequence: input.sequence, action: input.action })
  }

  sendReady(ready: boolean): void { this.send({ type: 'ready', ready }) }
  startMatch(): void { this.send({ type: 'start' }) }
  sync(): void { this.send({ type: 'sync' }) }

  close(): void {
    this.manuallyClosed = true
    this.clearTimers()
    const socket = this.socket
    this.socket = null
    socket?.close(1000, 'client_close')
    this.onState('disconnected')
  }

  private open(): void {
    if (typeof WebSocket === 'undefined') { this.onState('network-unavailable'); return }
    const payload = this.payload
    if (!payload) return
    const resume = this.resume
    const displayName = this.displayName
    const socket = new WebSocket(`ws://${payload.host}:${payload.port}`)
    let failureState: LanConnectionState | null = null
    this.socket = socket
    this.onState(this.reconnectAttempts ? 'reconnecting' : 'connecting')
    const connectTimeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        failureState = 'timeout'
        this.onState('timeout')
        socket.close()
      }
    }, 8_000)
    socket.onopen = () => {
      clearTimeout(connectTimeout)
      socket.send(JSON.stringify(resume
        ? { type: 'resume', room: payload.room, playerId: resume.playerId, resumeToken: resume.resumeToken }
        : { type: 'join', version: 1, room: payload.room, credential: payload.credential, displayName }))
      this.heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'heartbeat' }))
      }, 10_000)
    }
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data.length > 64 * 1024) { socket.close(1008, 'invalid_frame'); return }
      let message: LanMessage
      try {
        const parsed: unknown = JSON.parse(event.data)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof (parsed as { type?: unknown }).type !== 'string') throw new Error()
        message = parsed as LanMessage
      } catch { socket.close(1008, 'invalid_frame'); return }
      if (message.type === 'joined' && typeof message.playerId === 'string' && typeof message.resumeToken === 'string') {
        this.resume = { playerId: message.playerId, resumeToken: message.resumeToken }
        this.onCredentials(this.resume)
      } else if (message.type === 'snapshot') {
        const snapshot = message.snapshot as LocalMatchSnapshot | null
        if (!snapshot || !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < this.lastSequence || !snapshot.state || !Array.isArray(snapshot.members)) return
        this.lastSequence = snapshot.sequence
        this.reconnectAttempts = 0
        this.onSnapshot(snapshot)
        this.onState('connected')
      } else if (message.type === 'error') {
        const code = typeof message.code === 'string' ? message.code : 'INVALID_ACTION'
        this.onError(code)
        const terminalState = code === 'INVALID_CREDENTIAL' ? 'invalid-credential'
          : code === 'ROOM_CLOSED' ? 'room-closed'
            : code === 'ROOM_FULL' ? 'room-full'
              : code === 'ROOM_NOT_WAITING' && !this.resume ? 'room-unavailable'
                : null
        if (terminalState) {
          this.hostClosed = true
          this.clearTimers()
          this.onState(terminalState)
          socket.close(1008, code)
        }
      } else if (message.type === 'kicked') {
        this.hostClosed = true
        this.clearTimers()
        this.onState('kicked')
        socket.close(1008, 'ROOM_REMOVED')
      } else if (message.type === 'closed') { this.hostClosed = true; this.onState('room-closed') }
    }
    socket.onerror = () => {
      failureState = 'network-unavailable'
      this.onState('network-unavailable')
    }
    socket.onclose = () => {
      clearTimeout(connectTimeout)
      if (this.socket === socket) this.socket = null
      this.clearHeartbeat()
      if (this.manuallyClosed) return
      if (this.hostClosed) return
      this.onState(failureState ?? 'host-disconnected')
      if (this.resume && this.reconnectAttempts < 6) {
        const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 10_000)
        this.reconnectAttempts += 1
        this.reconnectTimer = setTimeout(() => this.open(), delay)
      }
    }
  }

  private send(message: Record<string, unknown>): void {
    if (this.socket?.readyState !== WebSocket.OPEN) { this.onState('host-disconnected'); return }
    this.socket.send(JSON.stringify(message))
  }

  private nextActionId(): string {
    this.actionCounter += 1
    return `${Date.now().toString(36)}_${this.actionCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }

  private clearHeartbeat(): void { if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = null }
  private clearTimers(): void {
    this.clearHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }
}
