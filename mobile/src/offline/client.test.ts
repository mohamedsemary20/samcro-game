import { LocalRoomClient } from './client'
import type { LocalMatchSnapshot } from '@game-core/localMatch'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []
  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  constructor(readonly url: string) { FakeWebSocket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.({} as Event) }
  receive(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent) }
  close() { this.readyState = FakeWebSocket.CLOSED; this.onclose?.({} as CloseEvent) }
}

const roomSnapshot = (sequence: number): LocalMatchSnapshot => ({
  roomCode: 'AB23CD', sequence, status: 'waiting', members: [],
  state: { phase: 'waiting', roundNumber: 0, roundsPerMatch: 5, pot: 0, currentBet: 0, currentActorId: null, deadline: null,
    question: null, players: [], ownHint: null, ownGuess: null, result: null, results: [], leaderboard: [] },
})

const joinPayload = { version: 1 as const, host: '192.168.1.20', port: 3210, room: 'AB23CD', credential: 'a'.repeat(48), expiresAt: Date.now() + 60_000 }

describe('LocalRoomClient', () => {
  let priorWebSocket: typeof WebSocket
  afterEach(() => {
    for (const socket of FakeWebSocket.instances) socket.close()
    FakeWebSocket.instances = []
    globalThis.WebSocket = priorWebSocket
    jest.useRealTimers()
  })

  beforeEach(() => {
    priorWebSocket = globalThis.WebSocket
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  })

  it('joins with a scoped credential, receives a snapshot, and sends readiness and sequenced actions', () => {
    const states: string[] = []
    const snapshots: LocalMatchSnapshot[] = []
    const credentials = jest.fn()
    const client = new LocalRoomClient((state) => states.push(state), (snapshot) => snapshots.push(snapshot), credentials, jest.fn())
    client.connect(joinPayload, 'Guest')
    const socket = FakeWebSocket.instances[0]!
    socket.open()
    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'join', version: 1, room: 'AB23CD', credential: joinPayload.credential, displayName: 'Guest' })
    socket.receive({ type: 'joined', playerId: 'player-1', resumeToken: 'resume-token-secret' })
    socket.receive({ type: 'snapshot', snapshot: roomSnapshot(5) })
    socket.receive({ type: 'snapshot', snapshot: roomSnapshot(4) })
    client.sendReady(true)
    client.sendAction({ sequence: 5, action: { type: 'bet', action: { type: 'check' } } })
    expect(credentials).toHaveBeenCalledWith({ playerId: 'player-1', resumeToken: 'resume-token-secret' })
    expect(snapshots.map((snapshot) => snapshot.sequence)).toEqual([5])
    expect(states.at(-1)).toBe('connected')
    expect(JSON.parse(socket.sent[1]!)).toEqual({ type: 'ready', ready: true })
    const action = JSON.parse(socket.sent[2]!)
    expect(action).toMatchObject({ type: 'action', expectedSequence: 5, action: { type: 'bet' } })
    expect(action.actionId.length).toBeGreaterThanOrEqual(8)
    client.close()
  })

  it('reconnects with the private resume credential and marks room shutdown as final', () => {
    jest.useFakeTimers()
    const states: string[] = []
    const client = new LocalRoomClient((state) => states.push(state), jest.fn(), jest.fn(), jest.fn())
    client.connect(joinPayload, 'Guest', { playerId: 'player-1', resumeToken: 'private-resume' })
    const first = FakeWebSocket.instances[0]!
    first.open()
    first.receive({ type: 'snapshot', snapshot: roomSnapshot(1) })
    first.close()
    jest.advanceTimersByTime(1_000)
    const second = FakeWebSocket.instances[1]!
    second.open()
    expect(JSON.parse(second.sent[0]!)).toEqual({ type: 'resume', room: 'AB23CD', playerId: 'player-1', resumeToken: 'private-resume' })
    second.receive({ type: 'snapshot', snapshot: roomSnapshot(2) })
    second.receive({ type: 'closed' })
    second.close()
    expect(states).toContain('room-closed')
    expect(FakeWebSocket.instances).toHaveLength(2)
    client.close()
  })

  it('shows host removal as a terminal state and does not reconnect the removed player', () => {
    jest.useFakeTimers()
    const states: string[] = []
    const client = new LocalRoomClient((state) => states.push(state), jest.fn(), jest.fn(), jest.fn())
    client.connect(joinPayload, 'Guest', { playerId: 'player-1', resumeToken: 'private-resume' })
    const socket = FakeWebSocket.instances[0]!
    socket.open()
    socket.receive({ type: 'kicked' })
    jest.advanceTimersByTime(20_000)
    expect(states.at(-1)).toBe('kicked')
    expect(FakeWebSocket.instances).toHaveLength(1)
    client.close()
  })

  it.each([
    ['ROOM_FULL', 'room-full'],
    ['ROOM_NOT_WAITING', 'room-unavailable'],
    ['INVALID_CREDENTIAL', 'invalid-credential'],
  ])('closes rejected initial joins for %s', (code, state) => {
    const states: string[] = []
    const client = new LocalRoomClient((connection) => states.push(connection), jest.fn(), jest.fn(), jest.fn())
    client.connect(joinPayload, 'Guest')
    const socket = FakeWebSocket.instances[0]!
    socket.open()
    socket.receive({ type: 'error', code })
    expect(states.at(-1)).toBe(state)
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED)
    client.close()
  })

  it('keeps a connection timeout visible when the handshake socket closes', () => {
    jest.useFakeTimers()
    const states: string[] = []
    const client = new LocalRoomClient((connection) => states.push(connection), jest.fn(), jest.fn(), jest.fn())
    client.connect(joinPayload, 'Guest')
    jest.advanceTimersByTime(8_000)
    expect(states.at(-1)).toBe('timeout')
    expect(FakeWebSocket.instances).toHaveLength(1)
    client.close()
  })
})
