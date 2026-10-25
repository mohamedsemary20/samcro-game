export type NavigationTab = 'home' | 'lobby' | 'leaderboard' | 'profile'
export type {
  ActionAcknowledgement,
  ApiError,
  BetAction,
  ClientToServerEvents,
  GamePhase,
  GameSession,
  LeaderboardEntry,
  GuestSessionResponse,
  Player,
  PlayerGuess,
  PlayerHint,
  PrivatePlayerState,
  PublicGameState,
  Question,
  Room,
  RoomDetails,
  RoomMemberState,
  RoomStatus,
  RoundResult,
  RoundPlayerProgress,
  RoundPlayerStatus,
  ServerToClientEvents,
} from '../../../shared/contracts'
import type { PlayerHint, PrivatePlayerState, PublicGameState, Question, RoundResult } from '../../../shared/contracts'

export interface DemoRoundFixture {
  question: Question
  answer: number
  goldenHintAnswer: string
  hint: PlayerHint
}

export interface GameSnapshot {
  publicState: PublicGameState
  privateState: PrivatePlayerState
  result: RoundResult | null
}

export interface UserProfile {
  name: string
  avatarUrl?: string
  title: string
  level: number
  xp: number
  maxXp: number
  chips: number
  maxBet: number
  winRate: number
  totalRounds: number
  cardSkinTitle: string
  tableFeltTitle: string
  soundEffects: boolean
  hapticFeedback: boolean
}

export interface ChatMessage {
  id: string
  senderName: string
  text: string
  isUser: boolean
}
