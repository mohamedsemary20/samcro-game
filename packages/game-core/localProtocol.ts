export interface LocalRoomMember {
  playerId: string
  displayName: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
}

export interface LocalRoomSnapshot<PublicState> {
  roomCode: string
  sequence: number
  status: 'waiting' | 'in-progress' | 'finished' | 'closed'
  members: LocalRoomMember[]
  state: PublicState
}

export type LocalProtocolErrorCode =
  | 'ROOM_CLOSED'
  | 'ROOM_FULL'
  | 'ROOM_NOT_WAITING'
  | 'ROOM_NOT_READY'
  | 'INVALID_PLAYER'
  | 'INVALID_CREDENTIAL'
  | 'INVALID_NAME'
  | 'INVALID_ACTION_ID'
  | 'DUPLICATE_ACTION'
  | 'ACTION_LIMIT'
  | 'STALE_SEQUENCE'
  | 'OUT_OF_TURN'
  | 'HOST_ONLY'
  | 'INVALID_ACTION'

export type LocalProtocolResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: LocalProtocolErrorCode }

export interface LocalRoomProtocolOptions<State, Action, PublicState> {
  roomCode: string
  capacity?: number
  minimumReadyPlayers?: number
  host: { playerId: string; displayName: string; resumeToken: string }
  initialState: State
  createCredential(): string
  projectState(state: State, recipientPlayerId: string): PublicState
  currentActorId(state: State): string | null
  canStart(state: State): boolean
  start(state: State): State
  reduce(state: State, playerId: string, action: Action): State
}

interface MemberRecord extends LocalRoomMember { resumeToken: string }

/**
 * Transport-independent LAN host state machine. It never trusts a client-provided
 * snapshot, balance, turn result, or match outcome; state changes pass through reduce().
 */
export class LocalRoomProtocol<State, Action, PublicState> {
  readonly roomCode: string
  private readonly capacity: number
  private readonly minimumReadyPlayers: number
  private readonly hostPlayerId: string
  private readonly members = new Map<string, MemberRecord>()
  private readonly seenActionIds = new Map<string, Set<string>>()
  private state: State
  private sequence = 0
  private status: LocalRoomSnapshot<PublicState>['status'] = 'waiting'

  constructor(private readonly options: LocalRoomProtocolOptions<State, Action, PublicState>) {
    if (!/^[A-Z0-9]{6,10}$/.test(options.roomCode)) throw new Error('INVALID_ROOM_CODE')
    this.roomCode = options.roomCode
    this.capacity = options.capacity ?? 7
    this.minimumReadyPlayers = options.minimumReadyPlayers ?? 3
    if (!Number.isInteger(this.capacity) || this.capacity < 3 || this.capacity > 7
      || !Number.isInteger(this.minimumReadyPlayers) || this.minimumReadyPlayers < 3 || this.minimumReadyPlayers > this.capacity) {
      throw new Error('INVALID_ROOM_CAPACITY')
    }
    if (!options.host.playerId || !options.host.resumeToken || !options.host.displayName.trim()) throw new Error('INVALID_HOST_CREDENTIAL')
    this.hostPlayerId = options.host.playerId
    this.state = options.initialState
    this.members.set(options.host.playerId, {
      ...options.host,
      isHost: true,
      isReady: false,
      isConnected: true,
    })
    this.seenActionIds.set(options.host.playerId, new Set())
  }

  join(displayName: string): LocalProtocolResult<{ playerId: string; resumeToken: string; snapshot: LocalRoomSnapshot<PublicState> }> {
    if (this.status === 'closed' || this.status === 'finished') return { ok: false, code: 'ROOM_CLOSED' }
    if (this.status !== 'waiting') return { ok: false, code: 'ROOM_NOT_WAITING' }
    const normalizedName = displayName.trim()
    if (!normalizedName || normalizedName.length > 40) return { ok: false, code: 'INVALID_NAME' }
    if (this.members.size >= this.capacity) return { ok: false, code: 'ROOM_FULL' }
    const playerId = this.options.createCredential()
    const resumeToken = this.options.createCredential()
    if (!playerId || !resumeToken || this.members.has(playerId)
      || [...this.members.values()].some((member) => member.resumeToken === resumeToken)) return { ok: false, code: 'INVALID_CREDENTIAL' }
    this.members.set(playerId, { playerId, displayName: normalizedName, isHost: false, isReady: false, isConnected: true, resumeToken })
    this.seenActionIds.set(playerId, new Set())
    this.sequence += 1
    return { ok: true, value: { playerId, resumeToken, snapshot: this.makeSnapshot(playerId) } }
  }

  setReady(playerId: string, resumeToken: string, ready: boolean): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status !== 'waiting') return { ok: false, code: 'ROOM_NOT_WAITING' }
    if (typeof ready !== 'boolean') return { ok: false, code: 'INVALID_ACTION' }
    member.isReady = ready
    this.sequence += 1
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  startMatch(playerId: string, resumeToken: string): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!member.isHost) return { ok: false, code: 'HOST_ONLY' }
    const readyCount = [...this.members.values()].filter((entry) => entry.isReady && entry.isConnected).length
    if (this.status !== 'waiting' || readyCount < this.minimumReadyPlayers || !this.options.canStart(this.state)) {
      return { ok: false, code: 'ROOM_NOT_READY' }
    }
    this.state = this.options.start(this.state)
    this.status = 'in-progress'
    this.sequence += 1
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  dispatch(input: { playerId: string; resumeToken: string; actionId: string; expectedSequence: number; action: Action }): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(input.playerId, input.resumeToken)
    if (!member || !member.isConnected) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.actionId)) return { ok: false, code: 'INVALID_ACTION_ID' }
    const seen = this.seenActionIds.get(input.playerId)!
    if (seen.has(input.actionId)) return { ok: false, code: 'DUPLICATE_ACTION' }
    if (seen.size >= 10_000) return { ok: false, code: 'ACTION_LIMIT' }
    // Reserve every well-formed action ID, including rejected actions, to prevent payload substitution.
    seen.add(input.actionId)
    if (this.status === 'closed' || this.status === 'finished') return { ok: false, code: 'ROOM_CLOSED' }
    if (input.expectedSequence !== this.sequence) return { ok: false, code: 'STALE_SEQUENCE' }
    const actorId = this.options.currentActorId(this.state)
    if (actorId !== null && actorId !== input.playerId) return { ok: false, code: 'OUT_OF_TURN' }
    try {
      this.state = this.options.reduce(this.state, input.playerId, input.action)
      this.sequence += 1
      return { ok: true, value: this.makeSnapshot(input.playerId) }
    } catch {
      return { ok: false, code: 'INVALID_ACTION' }
    }
  }

  reconnect(playerId: string, resumeToken: string): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    member.isConnected = true
    this.sequence += 1
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  disconnect(playerId: string, resumeToken: string): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    member.isConnected = false
    this.sequence += 1
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  heartbeat(playerId: string, resumeToken: string): LocalProtocolResult<{ sequence: number }> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    member.isConnected = true
    return { ok: true, value: { sequence: this.sequence } }
  }

  finish(playerId: string, resumeToken: string): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!member.isHost) return { ok: false, code: 'HOST_ONLY' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    if (this.status !== 'in-progress') return { ok: false, code: 'ROOM_NOT_READY' }
    this.status = 'finished'
    this.sequence += 1
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  shutdown(playerId: string, resumeToken: string): LocalProtocolResult<void> {
    const member = this.authenticate(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!member.isHost) return { ok: false, code: 'HOST_ONLY' }
    this.status = 'closed'
    this.sequence += 1
    return { ok: true, value: undefined }
  }

  sync(playerId: string, resumeToken: string): LocalProtocolResult<LocalRoomSnapshot<PublicState>> {
    if (!this.authenticate(playerId, resumeToken)) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    return { ok: true, value: this.makeSnapshot(playerId) }
  }

  private makeSnapshot(playerId: string): LocalRoomSnapshot<PublicState> {
    return {
      roomCode: this.roomCode,
      sequence: this.sequence,
      status: this.status,
      members: [...this.members.values()].map(({ resumeToken: _token, ...member }) => ({ ...member })),
      state: this.options.projectState(this.state, playerId),
    }
  }

  private authenticate(playerId: string, resumeToken: string): MemberRecord | null {
    const member = this.members.get(playerId)
    return member && member.resumeToken === resumeToken ? member : null
  }
}
