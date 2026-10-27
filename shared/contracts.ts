/** Wire-safe contracts shared by the browser and the server. Never add secret answers here. */
export type GamePhase =
  | 'round-funding'
  | 'question-betting'
  | 'secret-clue'
  | 'guess-input'
  | 'final-betting'
  | 'round-reveal'
  | 'podium-finish'

export type RoomStatus = 'waiting' | 'in-progress' | 'finished'
export type PlayerStatus = 'normal' | 'ready' | 'called' | 'raised' | 'folded' | 'thinking'

export interface Player {
  id: string
  name: string
  avatarUrl?: string
  /** Kept optional for local demo fixtures; never sent in public server state. */
  chips?: number
  currentBet: number
  status: PlayerStatus
  isHost: boolean
  isConnected?: boolean
}

export interface Room {
  id: string
  code: string
  hostPlayerId: string
  playerIds: string[]
  status: RoomStatus
  capacity?: number
  readyPlayerIds?: string[]
}

export interface RoomMemberState {
  playerId: string
  displayName: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
}

export interface RoomDetails {
  room: Room
  players: RoomMemberState[]
}

export interface GameSession {
  id: string
  roomId: string
  roundNumber: number
  phase: GamePhase
  pot: number
  questionId: string
  currentBet?: number
  currentActorId?: string | null
  decisionDeadline?: string | null
  version?: number
}

/** Safe public metadata only. The answer remains in the server question repository. */
export interface Question {
  id: string
  roundNumber: number
  prompt: string
  category: string
  type?: 'year' | 'number'
}

export interface PlayerHint {
  questionId: string
  range: string
  accuracy: string
  advisoryNote: string
  /** Private recipient-only rendering hint; omitted for numeric ranges. */
  exact?: true
}

export interface PlayerGuess {
  playerId: string
  value: number
  submittedAt: number
}

export type BetAction =
  | { type: 'check' }
  | { type: 'fold' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
  | { type: 'all-in' }

export interface LeaderboardEntry {
  playerId: string
  displayName: string
  score: number
  rank: number
  debt?: number
  netWorth?: number
}

/** Broadcast-safe state. No correct answer, private hints, or unrevealed guesses. */
export interface PublicGameState {
  room: Room
  session: GameSession
  question: Question
  players: Player[]
  /** Server-derived progress only. Guesses and hints remain private until reveal. */
  roundProgress: RoundPlayerProgress[]
  leaderboard: LeaderboardEntry[]
}

export type RoundPlayerStatus = 'funding' | 'betting' | 'hint-pending' | 'hint-ready' | 'guessing' | 'guess-submitted' | 'waiting' | 'folded' | 'revealed'
export interface RoundPlayerProgress {
  playerId: string
  status: RoundPlayerStatus
  hasHint: boolean
  hasGuess: boolean
  /** Existing public per-street wager, never a remaining balance. */
  currentStreetWager: number
}

/** Sent only to sockets authenticated as this player. */
export interface PrivatePlayerState {
  playerId: string
  matchId: string
  roundNumber: number
  /** Monotonic server snapshot version used to discard stale private updates. */
  stateVersion: number
  hint: PlayerHint | null
  goldenHint: string | null
  guess: PlayerGuess | null
  availableChips: number
  /** Personal committed contribution (ante plus wagers) for the current round. */
  roundContribution: number
  debt?: number
  loanAvailable?: boolean
  loanUnavailableReason?: 'balance-sufficient' | 'already-taken' | 'window-closed'
}

/** Answer and guesses are safe to send only after the reveal transition. */
export interface RoundResult {
  roundNumber: number
  correctAnswer: number
  guesses: PlayerGuess[]
  winnerPlayerIds: string[]
  payouts?: Array<{ playerId: string; amount: number }>
  /** Contributions are only disclosed after the server-authorized reveal. */
  roundWagers?: Array<{ playerId: string; amount: number }>
}

export interface GuestSessionResponse {
  player: { id: string; name: string }
  expiresAt: string
}

export interface ApiError {
  code: string
  message: string
  requestId?: string
}

export type ActionAcknowledgement = { ok: true } | { ok: false; error: ApiError }

export interface RoomReadyPayload { ready: boolean }
export interface GuessSubmitPayload { value: number; idempotencyKey: string }
export interface BetSubmitPayload { action: BetAction; idempotencyKey: string }

/** Socket event payload map used by both the client adapter and server handlers. */
export interface ClientToServerEvents {
  'room:join': (payload: { roomId: string }) => void
  'room:leave': (payload: { roomId: string }) => void
  'room:ready': (payload: RoomReadyPayload) => void
  'match:start': (payload: { idempotencyKey: string }, acknowledge?: (result: ActionAcknowledgement) => void) => void
  'game:sync': (payload: { roomId: string }) => void
  'game:hint.request': (payload: { idempotencyKey: string }, acknowledge?: (result: ActionAcknowledgement) => void) => void
  'game:loan.request': (payload: { idempotencyKey: string }, acknowledge?: (result: ActionAcknowledgement) => void) => void
  'game:guess.submit': (payload: GuessSubmitPayload, acknowledge?: (result: ActionAcknowledgement) => void) => void
  'game:bet.submit': (payload: BetSubmitPayload, acknowledge?: (result: ActionAcknowledgement) => void) => void
}

export interface ServerToClientEvents {
  'room:state': (state: Room) => void
  'game:state': (state: PublicGameState) => void
  'player:private': (state: PrivatePlayerState) => void
  'game:reveal': (result: RoundResult) => void
  'game:complete': (entries: LeaderboardEntry[]) => void
  'session:reconnected': (payload: { playerId: string; roomId: string }) => void
  'server:error': (error: ApiError) => void
}
