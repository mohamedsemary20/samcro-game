import type {
  ActionAcknowledgement,
  ApiError,
  BetAction,
  GuestSessionResponse,
  PrivatePlayerState,
  PublicGameState,
  Room,
  RoomDetails,
  RoundResult,
} from '../domain/types'

export interface GameApiClient {
  getCurrentPlayer(signal?: AbortSignal): Promise<{ id: string; name: string }>
  createGuestSession(displayName: string): Promise<GuestSessionResponse['player']>
  createRoom(capacity?: number): Promise<Room>
  joinRoom(code: string): Promise<Room>
  getRoom(roomId: string, signal?: AbortSignal): Promise<RoomDetails>
  getPublicGameState(roomId: string, signal?: AbortSignal): Promise<PublicGameState>
  getPrivatePlayerState(signal?: AbortSignal): Promise<PrivatePlayerState>
  getMatchHistory(signal?: AbortSignal): Promise<Array<{ id: string; roomCode: string; finishedAt: string | null }>>
  getMatchLeaderboard(matchId: string, signal?: AbortSignal): Promise<import('../domain/types').LeaderboardEntry[]>
  logout(): Promise<void>
}

export interface GameRealtimeConnection {
  connect(roomId: string): Promise<void>
  onRoomState(listener: (room: Room) => void): () => void
  onPublicGameState(listener: (state: PublicGameState) => void): () => void
  onPrivatePlayerState(listener: (state: PrivatePlayerState) => void): () => void
  onRoundReveal(listener: (result: RoundResult) => void): () => void
  onMatchComplete(listener: (entries: import('../domain/types').LeaderboardEntry[]) => void): () => void
  onConnectionError(listener: (error: ApiError) => void): () => void
  onConnectionStatus(listener: (status: 'connected' | 'reconnecting') => void): () => void
  leaveRoom(roomId: string): void
  setReady(ready: boolean): void
  startMatch(idempotencyKey: string): void
  syncGameState(roomId: string): void
  requestHint(idempotencyKey: string): Promise<ActionAcknowledgement>
  requestLoan(idempotencyKey: string): Promise<ActionAcknowledgement>
  submitGuess(value: number, idempotencyKey: string): Promise<ActionAcknowledgement>
  submitBet(action: BetAction, idempotencyKey: string): Promise<ActionAcknowledgement>
  disconnect(): Promise<void>
}

export class GameApiError extends Error {
  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message)
    this.name = 'GameApiError'
  }
}
