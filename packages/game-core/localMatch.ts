import type { BetAction, GamePhase, PlayerHint } from '../../shared/contracts.js'
import { applyEngineAction, createFundingRound, createRound, GameRuleError, settleRound, type EnginePlayer, type EngineRound } from './engine.js'
import { calculateNetWorth, repayDebtAtMatchEnd, takeEmergencyLoan, STARTING_CHIPS } from './ledger.js'
import type { OfflineQuestion } from './offlineQuestions.js'

export type LocalMatchStatus = 'waiting' | 'in-progress' | 'finished' | 'closed'
export type LocalMatchAction =
  | { type: 'bet'; action: BetAction }
  | { type: 'hint-request' }
  | { type: 'guess'; value: number }
  | { type: 'loan' }

export interface LocalMatchMember {
  playerId: string
  displayName: string
  isHost: boolean
  isReady: boolean
  isConnected: boolean
}

interface MemberRecord extends LocalMatchMember { resumeToken: string }

export interface LocalRoundResult {
  roundNumber: number
  correctAnswer: number
  guesses: Array<{ playerId: string; value: number; submittedAt: number }>
  winnerPlayerIds: string[]
  payouts: Array<{ playerId: string; amount: number }>
}

export interface LocalMatchSnapshot {
  roomCode: string
  sequence: number
  status: LocalMatchStatus
  members: LocalMatchMember[]
  state: {
    phase: GamePhase | 'waiting' | 'finished' | 'closed'
    roundNumber: number
    roundsPerMatch: number
    pot: number
    currentBet: number
    currentActorId: string | null
    deadline: number | null
    question: { id: string; prompt: string; category: string; type: 'year' | 'number' } | null
    players: Array<{ id: string; name: string; chips: number; debt: number; folded: boolean; currentBet: number; isHost: boolean; isReady: boolean; isConnected: boolean }>
    ownHint: PlayerHint | null
    ownGuess: { value: number; submittedAt: number } | null
    result: LocalRoundResult | null
    results: LocalRoundResult[]
    leaderboard: Array<{ playerId: string; displayName: string; score: number; rank: number; debt: number; netWorth: number }>
  }
}

export type LocalMatchError = 'ROOM_CLOSED' | 'ROOM_FULL' | 'ROOM_NOT_WAITING' | 'ROOM_NOT_READY' | 'INVALID_CREDENTIAL'
  | 'INVALID_NAME' | 'DUPLICATE_ACTION' | 'ACTION_LIMIT' | 'STALE_SEQUENCE' | 'HOST_ONLY' | 'INVALID_ACTION'
  | 'OUT_OF_TURN' | 'NOT_MEMBER' | 'QUESTIONS_UNAVAILABLE' | 'PLAYER_NOT_FOUND' | 'CANNOT_REMOVE_HOST'

export type LocalResult<T> = { ok: true; value: T } | { ok: false; code: LocalMatchError }

export interface LocalMatchOptions {
  roomCode: string
  roomId: string
  host: { playerId: string; displayName: string; resumeToken: string }
  questions: OfflineQuestion[]
  createCredential(): string
  now?: () => number
  minimumPlayers?: number
  capacity?: number
}

/**
 * Host-only match authority. Answers and unrequested hints stay in this object;
 * network clients receive recipient-projected snapshots and submit actions only.
 */
export class LocalMatchAuthority {
  readonly roomCode: string
  readonly roomId: string
  readonly minimumPlayers: number
  readonly capacity: number
  private readonly options: LocalMatchOptions
  private readonly members = new Map<string, MemberRecord>()
  private readonly seenActionIds = new Map<string, Set<string>>()
  private readonly questionOrder: OfflineQuestion[]
  private readonly roundResults: LocalRoundResult[] = []
  private sequence = 0
  private status: LocalMatchStatus = 'waiting'
  private round: EngineRound | null = null
  private finalResult: LocalRoundResult | null = null
  private leaderboard: LocalMatchSnapshot['state']['leaderboard'] = []

  constructor(options: LocalMatchOptions) {
    this.options = options
    this.roomCode = options.roomCode
    this.roomId = options.roomId
    this.minimumPlayers = options.minimumPlayers ?? 3
    this.capacity = options.capacity ?? 8
    this.questionOrder = [...options.questions]
    if (!this.roomCode || !this.roomId) throw new Error('INVALID_LOCAL_MATCH_CONFIGURATION')
    this.members.set(options.host.playerId, { ...options.host, isHost: true, isReady: false, isConnected: true })
    this.seenActionIds.set(options.host.playerId, new Set())
  }

  join(displayName: string): LocalResult<{ playerId: string; resumeToken: string; snapshot: LocalMatchSnapshot }> {
    if (this.status !== 'waiting') return { ok: false, code: this.status === 'closed' || this.status === 'finished' ? 'ROOM_CLOSED' : 'ROOM_NOT_WAITING' }
    const name = displayName.trim()
    if (!name || name.length > 40) return { ok: false, code: 'INVALID_NAME' }
    if (this.members.size >= this.capacity) return { ok: false, code: 'ROOM_FULL' }
    const playerId = this.options.createCredential()
    const resumeToken = this.options.createCredential()
    if (!this.validCredential(playerId) || !this.validCredential(resumeToken) || this.members.has(playerId)
      || [...this.members.values()].some((member) => member.resumeToken === resumeToken)) return { ok: false, code: 'INVALID_CREDENTIAL' }
    this.members.set(playerId, { playerId, displayName: name, resumeToken, isHost: false, isReady: false, isConnected: true })
    this.seenActionIds.set(playerId, new Set())
    this.sequence += 1
    return { ok: true, value: { playerId, resumeToken, snapshot: this.snapshot(playerId) } }
  }

  setReady(playerId: string, resumeToken: string, ready: boolean): LocalResult<LocalMatchSnapshot> {
    const member = this.authenticated(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status !== 'waiting') return { ok: false, code: 'ROOM_NOT_WAITING' }
    if (typeof ready !== 'boolean') return { ok: false, code: 'INVALID_ACTION' }
    member.isReady = ready
    this.sequence += 1
    return { ok: true, value: this.snapshot(playerId) }
  }

  removePlayer(hostId: string, resumeToken: string, targetPlayerId: string): LocalResult<LocalMatchSnapshot> {
    const host = this.authenticated(hostId, resumeToken)
    if (!host) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!host.isHost) return { ok: false, code: 'HOST_ONLY' }
    if (this.status !== 'waiting') return { ok: false, code: 'ROOM_NOT_WAITING' }
    if (targetPlayerId === hostId) return { ok: false, code: 'CANNOT_REMOVE_HOST' }
    if (!this.members.delete(targetPlayerId)) return { ok: false, code: 'PLAYER_NOT_FOUND' }
    this.seenActionIds.delete(targetPlayerId)
    this.sequence += 1
    return { ok: true, value: this.snapshot(hostId) }
  }

  start(playerId: string, resumeToken: string, now = this.currentTime()): LocalResult<LocalMatchSnapshot> {
    const host = this.authenticated(playerId, resumeToken)
    if (!host) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!host.isHost) return { ok: false, code: 'HOST_ONLY' }
    if (this.questionOrder.length < 5) return { ok: false, code: 'QUESTIONS_UNAVAILABLE' }
    const members = [...this.members.values()]
    const ready = members.filter((member) => member.isReady && member.isConnected).length
    if (this.status !== 'waiting' || members.length < this.minimumPlayers || ready !== members.length) return { ok: false, code: 'ROOM_NOT_READY' }
    const players = this.enginePlayers()
    this.round = createRound(1, this.engineQuestion(this.questionOrder[0]!, 1), players, 0, now)
    this.status = 'in-progress'
    this.sequence += 1
    return { ok: true, value: this.snapshot(playerId) }
  }

  dispatch(input: { playerId: string; resumeToken: string; actionId: string; expectedSequence: number; action: LocalMatchAction; now?: number }): LocalResult<LocalMatchSnapshot> {
    const member = this.authenticated(input.playerId, input.resumeToken)
    if (!member || !member.isConnected) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.actionId)) return { ok: false, code: 'INVALID_ACTION' }
    const seen = this.seenActionIds.get(input.playerId)!
    if (seen.has(input.actionId)) return { ok: false, code: 'DUPLICATE_ACTION' }
    if (seen.size >= 10_000) return { ok: false, code: 'ACTION_LIMIT' }
    seen.add(input.actionId)
    if (this.status === 'closed' || this.status === 'finished') return { ok: false, code: 'ROOM_CLOSED' }
    if (this.status !== 'in-progress' || !this.round) return { ok: false, code: 'ROOM_NOT_WAITING' }
    if (input.expectedSequence !== this.sequence) return { ok: false, code: 'STALE_SEQUENCE' }
    const now = input.now ?? this.currentTime()
    try {
      if (input.action.type === 'loan') this.takeLoan(input.playerId, now)
      else if (input.action.type === 'hint-request') this.requestHint(input.playerId, now)
      else if (input.action.type === 'guess') this.round = applyEngineAction(this.round, { type: 'guess', playerId: input.playerId, value: input.action.value, now })
      else this.round = applyEngineAction(this.round, { type: 'bet', playerId: input.playerId, action: input.action.action, now })
      this.completeRevealAndAdvance(now)
      this.sequence += 1
      return { ok: true, value: this.snapshot(input.playerId) }
    } catch (error) {
      if (error instanceof GameRuleError) return { ok: false, code: error.code === 'OUT_OF_TURN' ? 'OUT_OF_TURN' : 'INVALID_ACTION' }
      return { ok: false, code: 'INVALID_ACTION' }
    }
  }

  tick(now = this.currentTime()): boolean {
    if (this.status !== 'in-progress' || !this.round?.deadline || now < this.round.deadline) return false
    try {
      if (this.round.phase === 'secret-clue') {
        const hints: Record<string, PlayerHint> = {}
        for (const player of this.round.players) if (!this.round.hints[player.id]) hints[player.id] = this.makeHint(player.id)
        this.round = applyEngineAction(this.round, { type: 'hint-timeout', hints, now })
      } else {
        this.round = applyEngineAction(this.round, { type: 'timeout', now })
      }
      this.completeRevealAndAdvance(now)
      this.sequence += 1
      return true
    } catch {
      // An invalid or already-advanced timer does not mutate the host snapshot.
      return false
    }
  }

  disconnect(playerId: string, resumeToken: string): LocalResult<void> {
    const member = this.authenticated(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    member.isConnected = false
    this.sequence += 1
    return { ok: true, value: undefined }
  }

  reconnect(playerId: string, resumeToken: string): LocalResult<LocalMatchSnapshot> {
    const member = this.authenticated(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (this.status === 'closed') return { ok: false, code: 'ROOM_CLOSED' }
    member.isConnected = true
    this.sequence += 1
    return { ok: true, value: this.snapshot(playerId) }
  }

  heartbeat(playerId: string, resumeToken: string): boolean {
    return Boolean(this.authenticated(playerId, resumeToken)) && this.status !== 'closed'
  }

  close(playerId: string, resumeToken: string): LocalResult<void> {
    const member = this.authenticated(playerId, resumeToken)
    if (!member) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (!member.isHost) return { ok: false, code: 'HOST_ONLY' }
    this.status = 'closed'
    this.sequence += 1
    return { ok: true, value: undefined }
  }

  snapshot(playerId: string): LocalMatchSnapshot {
    const member = this.members.get(playerId)
    if (!member) throw new Error('NOT_MEMBER')
    const round = this.round
    const players = round?.players ?? this.enginePlayers()
    const question = round?.question
    return {
      roomCode: this.roomCode,
      sequence: this.sequence,
      status: this.status,
      members: [...this.members.values()].map(({ resumeToken: _resumeToken, ...publicMember }) => ({ ...publicMember })),
      state: {
        phase: round?.phase ?? (this.status === 'closed' ? 'closed' : this.status === 'finished' ? 'finished' : 'waiting'),
        roundNumber: round?.number ?? 0,
        roundsPerMatch: 5,
        pot: round?.pot ?? 0,
        currentBet: round?.currentBet ?? 0,
        currentActorId: round?.actorId ?? null,
        deadline: round?.deadline ?? null,
        question: question ? { id: question.id, prompt: question.prompt, category: question.category, type: question.type ?? 'number' } : null,
        players: players.map((player) => {
          const currentMember = this.members.get(player.id)!
          return { id: player.id, name: currentMember.displayName, chips: player.chips, debt: player.debt, folded: player.folded, currentBet: player.streetContribution, isHost: currentMember.isHost, isReady: currentMember.isReady, isConnected: currentMember.isConnected }
        }),
        ownHint: round?.hints[playerId] ?? null,
        ownGuess: round?.guesses[playerId] ? { ...round.guesses[playerId]! } : null,
        result: this.roundResults.at(-1) ?? null,
        results: this.roundResults.map((result) => ({ ...result, guesses: result.guesses.map((guess) => ({ ...guess })), winnerPlayerIds: [...result.winnerPlayerIds], payouts: result.payouts.map((payout) => ({ ...payout })) })),
        leaderboard: this.leaderboard.map((entry) => ({ ...entry })),
      },
    }
  }

  private requestHint(playerId: string, now: number): void {
    if (!this.round) throw new GameRuleError('HINT_PHASE_CLOSED')
    this.round = applyEngineAction(this.round, { type: 'hint', playerId, hint: this.makeHint(playerId), now })
  }

  private makeHint(playerId: string): PlayerHint {
    const question = this.currentOfflineQuestion()
    if (!question) throw new GameRuleError('QUESTION_HINT_UNAVAILABLE')
    return { questionId: question.id, ...question.hint }
  }

  private takeLoan(playerId: string, now: number): void {
    if (!this.round || this.round.phase !== 'round-funding' || this.round.deadline === null || now >= this.round.deadline) throw new GameRuleError('LOAN_WINDOW_CLOSED')
    const player = this.round.players.find((candidate) => candidate.id === playerId)
    if (!player) throw new GameRuleError('PLAYER_NOT_ELIGIBLE')
    const account = takeEmergencyLoan({ chips: player.chips, debt: player.debt, loanTaken: player.loanTaken })
    player.chips = account.chips
    player.debt = account.debt
    player.loanTaken = account.loanTaken
  }

  private completeRevealAndAdvance(now: number): void {
    if (!this.round) return
    if (this.round.phase === 'podium-finish') {
      this.finishMatch()
      return
    }
    if (this.round.phase !== 'round-reveal') return
    const revealed = this.round
    const question = this.currentOfflineQuestion()
    if (!question) throw new Error('QUESTION_UNAVAILABLE')
    const settlement = settleRound(revealed, question.answer)
    for (const payout of settlement.payouts) {
      const winner = revealed.players.find((player) => player.id === payout.playerId)
      if (winner) winner.chips += payout.amount
    }
    const result: LocalRoundResult = {
      roundNumber: revealed.number,
      correctAnswer: question.answer,
      guesses: Object.entries(revealed.guesses).map(([id, guess]) => ({ playerId: id, ...guess })),
      winnerPlayerIds: [...settlement.winners],
      payouts: settlement.payouts.map((payout) => ({ ...payout })),
    }
    this.roundResults.push(result)
    this.finalResult = result
    if (settlement.completed) {
      this.finishMatch()
      return
    }
    const nextNumber = revealed.number + 1
    const nextQuestion = this.questionOrder[nextNumber - 1]
    if (!nextQuestion) throw new Error('QUESTION_BUNDLE_INCOMPLETE')
    const players = revealed.players.map((player) => ({ ...player, folded: false, streetContribution: 0, roundContribution: 0 }))
    const needsFunding = players.some((player) => player.chips < 50)
    this.round = needsFunding
      ? createFundingRound(nextNumber, this.engineQuestion(nextQuestion, nextNumber), players, settlement.carriedPot, now)
      : createRound(nextNumber, this.engineQuestion(nextQuestion, nextNumber), players, settlement.carriedPot, now)
  }

  private finishMatch(): void {
    if (!this.round) return
    this.status = 'finished'
    const ranked = this.round.players.map((player) => {
      const account = repayDebtAtMatchEnd({ chips: player.chips, debt: player.debt, loanTaken: player.loanTaken })
      player.chips = account.chips
      player.debt = account.debt
      return { playerId: player.id, displayName: this.members.get(player.id)!.displayName, score: calculateNetWorth(account), rank: 0, debt: account.debt, netWorth: calculateNetWorth(account) }
    }).sort((left, right) => right.netWorth - left.netWorth || left.playerId.localeCompare(right.playerId))
    this.leaderboard = ranked.map((entry, index) => ({ ...entry, rank: index + 1 }))
    if (this.finalResult && this.finalResult.roundNumber === 5) this.finalResult = { ...this.finalResult }
  }

  private currentOfflineQuestion(): OfflineQuestion | undefined {
    return this.round ? this.questionOrder[this.round.number - 1] : undefined
  }

  private engineQuestion(question: OfflineQuestion, roundNumber: number) {
    return { id: question.id, roundNumber, prompt: question.promptAr, category: question.category, type: question.type }
  }

  private enginePlayers(): EnginePlayer[] {
    return [...this.members.values()].map((member) => ({ id: member.playerId, chips: STARTING_CHIPS, debt: 0, loanTaken: false, folded: false, connected: member.isConnected, streetContribution: 0, roundContribution: 0 }))
  }

  private authenticated(playerId: string, resumeToken: string): MemberRecord | null {
    const member = this.members.get(playerId)
    return member && member.resumeToken === resumeToken ? member : null
  }

  private validCredential(value: string): boolean { return /^[A-Za-z0-9_-]{16,128}$/.test(value) }
  private currentTime(): number { return (this.options.now ?? Date.now)() }
}
