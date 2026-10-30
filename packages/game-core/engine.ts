import type { BetAction, GamePhase, PlayerHint, Question } from '../../shared/contracts.js'
import { GAME_POLICIES } from './policies.js'
import { findWinners, splitPot } from './scoring.js'

export const MATCH_ROUNDS = 5
export const MIN_RAISE = 10
export const TURN_TIMEOUT_MS = 30_000
export const LOAN_OPT_IN_MS = GAME_POLICIES.loanOptInMs

export interface EnginePlayer {
  id: string
  chips: number
  debt: number
  loanTaken: boolean
  folded: boolean
  connected: boolean
  streetContribution: number
  roundContribution: number
}

export interface EngineRound {
  number: number
  phase: GamePhase
  pot: number
  rolloverPot: number
  question: Question
  currentBet: number
  lastRaise: number
  actorId: string | null
  deadline: number | null
  acted: string[]
  players: EnginePlayer[]
  hints: Record<string, PlayerHint>
  guesses: Record<string, { value: number; submittedAt: number }>
}

export type EngineAction =
  | { type: 'bet'; playerId: string; action: BetAction; now: number }
  | { type: 'hint'; playerId: string; hint: PlayerHint; now: number }
  | { type: 'hint-timeout'; hints: Record<string, PlayerHint>; now: number }
  | { type: 'guess'; playerId: string; value: number; now: number }
  | { type: 'timeout'; now: number }

export class GameRuleError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'GameRuleError' }
}

// Engine state is plain JSON data. Keep cloning explicit so this module runs
// consistently on Node and Hermes without depending on structuredClone support.
function cloneRound(round: EngineRound): EngineRound {
  return {
    ...round,
    question: { ...round.question },
    players: round.players.map((player) => ({ ...player })),
    acted: [...round.acted],
    hints: Object.fromEntries(Object.entries(round.hints).map(([id, hint]) => [id, { ...hint }])),
    guesses: Object.fromEntries(Object.entries(round.guesses).map(([id, guess]) => [id, { ...guess }])),
  }
}

const byId = (a: EnginePlayer, b: EnginePlayer) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0
const eligible = (round: EngineRound) => round.players.filter((player) => !player.folded && player.chips >= 0).sort(byId)
const playerFor = (round: EngineRound, id: string) => round.players.find((player) => player.id === id)

function nextActor(round: EngineRound, after: string | null): string | null {
  const ordered = [...round.players].sort(byId)
  if (!ordered.length) return null
  const index = after ? ordered.findIndex((player) => player.id === after) : -1
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const candidate = ordered[(index + offset + ordered.length) % ordered.length]!
    if (!candidate.folded && candidate.chips > 0) return candidate.id
  }
  return null
}

function prepareStreet(round: EngineRound, phase: 'question-betting' | 'final-betting', now: number): void {
  round.phase = phase
  round.currentBet = 0
  round.lastRaise = MIN_RAISE
  round.acted = []
  for (const player of round.players) player.streetContribution = 0
  const active = eligible(round).filter((player) => player.chips > 0)
  round.actorId = active[0]?.id ?? null
  round.deadline = round.actorId ? now + TURN_TIMEOUT_MS : null
  if (active.length <= 1) {
    round.actorId = null
    round.deadline = null
    if (phase === 'question-betting') round.phase = 'secret-clue'
    else round.phase = 'round-reveal'
  }
}

function fold(round: EngineRound, player: EnginePlayer): void { player.folded = true }

function settleFolded(round: EngineRound, now: number): void {
  const active = eligible(round)
  if (active.length === 1) {
    round.actorId = null
    round.deadline = null
    if (round.number === MATCH_ROUNDS) round.phase = 'round-reveal'
    else {
      round.rolloverPot += round.pot
      round.pot = 0
      round.phase = 'round-reveal'
    }
    return
  }
  const actor = nextActor(round, round.actorId)
  round.actorId = actor
  round.deadline = actor ? now + TURN_TIMEOUT_MS : null
}

function closeStreet(round: EngineRound, now: number): void {
  const active = eligible(round)
  if (active.length <= 1) { settleFolded(round, now); return }
  if (round.phase === 'question-betting') {
    round.phase = 'secret-clue'
    round.actorId = null
    round.deadline = now + TURN_TIMEOUT_MS
    return
  }
  round.phase = 'round-reveal'
  round.actorId = null
  round.deadline = null
}

function assertActionBeforeDeadline(round: EngineRound, now: number): void {
  if (round.deadline === null || now >= round.deadline) throw new GameRuleError('ACTION_DEADLINE_PASSED')
}

function capUnmatched(round: EngineRound): void {
  const live = eligible(round)
  if (live.length === 0) return
  const cap = Math.min(...live.map((candidate) => candidate.roundContribution + candidate.chips))
  for (const candidate of round.players) {
    const excess = Math.max(0, candidate.roundContribution - cap)
    if (excess === 0) continue
    const refundFromStreet = Math.min(excess, candidate.streetContribution)
    candidate.streetContribution -= refundFromStreet
    candidate.roundContribution -= excess
    candidate.chips += excess
    round.pot -= excess
  }
  round.currentBet = Math.max(0, ...live.map((candidate) => candidate.streetContribution))
}

function actBet(round: EngineRound, playerId: string, action: BetAction, now: number): void {
  if (round.phase !== 'question-betting' && round.phase !== 'final-betting') throw new GameRuleError('BETTING_CLOSED')
  assertActionBeforeDeadline(round, now)
  if (round.actorId !== playerId) throw new GameRuleError('OUT_OF_TURN')
  const player = playerFor(round, playerId)
  if (!player || player.folded || player.chips <= 0) throw new GameRuleError('PLAYER_NOT_ELIGIBLE')
  const toCall = Math.max(0, round.currentBet - player.streetContribution)
  let increasesBet = false
  if (action.type === 'fold') fold(round, player)
  else if (action.type === 'check') {
    if (toCall !== 0) throw new GameRuleError('CANNOT_CHECK_FACING_BET')
  } else if (action.type === 'call') {
    if (toCall === 0) throw new GameRuleError('NOTHING_TO_CALL')
    const amount = Math.min(toCall, player.chips)
    player.chips -= amount
    player.streetContribution += amount
    player.roundContribution += amount
    round.pot += amount
  } else if (action.type === 'raise') {
    const amount = action.amount
    const increase = amount - toCall
    if (!Number.isSafeInteger(amount) || amount <= toCall || increase < MIN_RAISE) throw new GameRuleError('RAISE_TOO_SMALL')
    if (amount > player.chips) throw new GameRuleError('INSUFFICIENT_CHIPS')
    player.chips -= amount
    player.streetContribution += amount
    player.roundContribution += amount
    round.pot += amount
    round.currentBet = player.streetContribution
    round.lastRaise = increase
    increasesBet = true
  } else {
    const previousBet = round.currentBet
    const amount = player.chips
    if (amount <= 0) throw new GameRuleError('NOTHING_TO_CALL')
    const raiseIncrement = player.streetContribution + amount - previousBet
    if (raiseIncrement > 0 && raiseIncrement < MIN_RAISE) throw new GameRuleError('RAISE_TOO_SMALL')
    player.chips -= amount
    player.streetContribution += amount
    player.roundContribution += amount
    round.pot += amount
    if (raiseIncrement > 0) {
      round.currentBet = player.streetContribution
      round.lastRaise = raiseIncrement
      increasesBet = true
    }
  }

  const active = eligible(round)
  if (active.length <= 1) {
    if (active.length === 1) capUnmatched(round)
    settleFolded(round, now)
    return
  }
  if (action.type === 'fold') capUnmatched(round)
  else if (player.chips === 0) capUnmatched(round)
  if (increasesBet) round.acted = [playerId]
  else if (!round.acted.includes(playerId)) round.acted.push(playerId)
  const pending = active.filter((candidate) => candidate.chips > 0 && (!round.acted.includes(candidate.id) || candidate.streetContribution < round.currentBet))
  if (!pending.length) {
    closeStreet(round, now)
    return
  }
  const next = nextActor(round, playerId)
  round.actorId = next && pending.some((candidate) => candidate.id === next) ? next : pending[0]!.id
  round.deadline = now + TURN_TIMEOUT_MS
}

export function applyEngineAction(current: EngineRound, action: EngineAction): EngineRound {
  const round = cloneRound(current)
  if (action.type === 'bet') actBet(round, action.playerId, action.action, action.now)
  else if (action.type === 'timeout') {
    if (round.deadline === null || action.now < round.deadline) throw new GameRuleError('TIMEOUT_NOT_REACHED')
    if (round.phase === 'guess-input') {
      prepareStreet(round, 'final-betting', action.now)
    } else if (round.phase === 'round-funding') {
      if (!round.players.some((player) => player.chips >= 50)) {
        round.phase = 'podium-finish'
        round.actorId = null
        round.deadline = null
      } else {
        const funded = createRound(round.number, round.question, round.players, round.pot + round.rolloverPot, action.now)
        Object.assign(round, funded)
      }
    } else if (round.phase === 'secret-clue') {
      // A timer must never move a player past a missing private hint. The
      // authoritative service fills any missing eligible hints first.
      throw new GameRuleError('HINTS_INCOMPLETE')
    } else {
      if (!round.actorId) throw new GameRuleError('ACTOR_MISSING')
      const actor = playerFor(round, round.actorId)
      if (!actor) throw new GameRuleError('ACTOR_MISSING')
      fold(round, actor)
      if (eligible(round).length === 1) capUnmatched(round)
      settleFolded(round, action.now)
    }
  } else if (action.type === 'hint-timeout') {
    if (round.phase !== 'secret-clue') throw new GameRuleError('HINT_PHASE_CLOSED')
    for (const player of eligible(round)) {
      if (round.hints[player.id]) continue
      const hint = action.hints[player.id]
      if (!hint || hint.questionId !== round.question.id) throw new GameRuleError('HINTS_INCOMPLETE')
      round.hints[player.id] = hint
    }
    if (!eligible(round).every((player) => round.hints[player.id])) throw new GameRuleError('HINTS_INCOMPLETE')
    round.phase = 'guess-input'
    round.deadline = action.now + TURN_TIMEOUT_MS
  } else if (action.type === 'hint') {
    if (round.phase !== 'secret-clue') throw new GameRuleError('HINT_PHASE_CLOSED')
    assertActionBeforeDeadline(round, action.now)
    if (!eligible(round).some((player) => player.id === action.playerId)) throw new GameRuleError('PLAYER_NOT_ELIGIBLE')
    if (round.hints[action.playerId]) throw new GameRuleError('HINT_ALREADY_REQUESTED')
    if (action.hint.questionId !== round.question.id) throw new GameRuleError('HINT_QUESTION_MISMATCH')
    round.hints[action.playerId] = action.hint
    const active = eligible(round)
    if (active.every((player) => round.hints[player.id])) {
      round.phase = 'guess-input'
      round.deadline = action.now + TURN_TIMEOUT_MS
    }
  } else if (action.type === 'guess') {
    if (round.phase !== 'guess-input') throw new GameRuleError('GUESS_PHASE_CLOSED')
    assertActionBeforeDeadline(round, action.now)
    if (!eligible(round).some((player) => player.id === action.playerId)) throw new GameRuleError('PLAYER_NOT_ELIGIBLE')
    if (!Number.isSafeInteger(action.value) || action.value < 0) throw new GameRuleError('INVALID_GUESS')
    if (round.guesses[action.playerId]) throw new GameRuleError('GUESS_ALREADY_LOCKED')
    round.guesses[action.playerId] = { value: action.value, submittedAt: action.now }
    if (eligible(round).every((player) => round.guesses[player.id])) prepareStreet(round, 'final-betting', action.now)
  }
  return round
}

/** Caps unmatched excess after a fold, returning it to the contributing stack. */
export function refundUnmatched(round: EngineRound): EngineRound {
  const next = cloneRound(round)
  capUnmatched(next)
  return next
}

export function createRound(number: number, question: Question, players: EnginePlayer[], carriedPot: number, now: number): EngineRound {
  const round: EngineRound = {
    number, phase: 'question-betting', pot: carriedPot, rolloverPot: 0, question,
    currentBet: 0, lastRaise: MIN_RAISE, actorId: null, deadline: null, acted: [],
    players: players.map((player) => ({ ...player, folded: player.chips < 50, streetContribution: 0, roundContribution: 0 })).sort(byId),
    hints: {}, guesses: {},
  }
  for (const player of round.players) {
    if (player.folded) continue
    player.chips -= 50
    player.roundContribution += 50
    round.pot += 50
  }
  prepareStreet(round, 'question-betting', now)
  return round
}

/** Gives players below the ante one short, optional loan window before chips are collected. */
export function createFundingRound(number: number, question: Question, players: EnginePlayer[], carriedPot: number, now: number): EngineRound {
  return {
    number,
    phase: 'round-funding',
    pot: carriedPot,
    rolloverPot: 0,
    question,
    currentBet: 0,
    lastRaise: MIN_RAISE,
    actorId: null,
    deadline: now + LOAN_OPT_IN_MS,
    acted: [],
    players: players.map((player) => ({ ...player, folded: false, streetContribution: 0, roundContribution: 0 })).sort(byId),
    hints: {},
    guesses: {},
  }
}

export interface Settlement {
  winners: string[]
  payouts: Array<{ playerId: string; amount: number }>
  carriedPot: number
  completed: boolean
}

/** Resolves only server-held answers; callers publish the result after this transition commits. */
export function settleRound(round: EngineRound, answer: number): Settlement {
  if (round.phase !== 'round-reveal') throw new GameRuleError('ROUND_NOT_READY_TO_REVEAL')
  const live = eligible(round)
  if (!live.length) throw new GameRuleError('NO_ELIGIBLE_PLAYER')
  const scoredWinners = findWinners(answer, round.question.type ?? 'number',
    Object.entries(round.guesses).map(([playerId, guess]) => ({ playerId, value: guess.value })),
    new Set(live.map((player) => player.id)))
  const winners = scoredWinners.length
    ? scoredWinners
    : round.number === MATCH_ROUNDS
      ? [live[live.length - 1]!.id]
      : []
  if (!winners.length) {
    return round.number < MATCH_ROUNDS
      ? { winners: [], payouts: [], carriedPot: round.pot + round.rolloverPot, completed: false }
      : { winners: [], payouts: [], carriedPot: round.pot + round.rolloverPot, completed: true }
  }
  const total = round.pot + round.rolloverPot
  const payouts = splitPot(total, winners)
  return { winners, payouts, carriedPot: 0, completed: round.number === MATCH_ROUNDS }
}
