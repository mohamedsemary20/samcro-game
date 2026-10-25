import type { Question } from '../../../shared/contracts.js'
import { applyEngineAction, createRound, type EnginePlayer, type EngineRound } from '../../src/game/engine.js'

export interface SyntheticGameFixture {
  question: Question
  answer: number
  players: EnginePlayer[]
}

/** Synthetic test data only. It is never read by the production question importer. */
export function makeSyntheticGameFixture(options: {
  roundNumber?: number
  playerIds?: string[]
  answer?: number
  questionType?: 'year' | 'number'
} = {}): SyntheticGameFixture {
  const roundNumber = options.roundNumber ?? 1
  return {
    question: {
      id: `test-question-${roundNumber}`,
      roundNumber,
      prompt: 'Synthetic test question; not production content.',
      category: 'test-only',
      type: options.questionType ?? 'number',
    },
    answer: options.answer ?? 42,
    players: (options.playerIds ?? ['player-c', 'player-a', 'player-b']).map((id) => ({
      id,
      chips: 500,
      debt: 0,
      loanTaken: false,
      folded: false,
      connected: true,
      streetContribution: 0,
      roundContribution: 0,
    })),
  }
}

/** Drives a complete deterministic round to reveal without a database or approved bank row. */
export function makeSyntheticRevealRound(options: {
  roundNumber?: number
  playerIds?: string[]
  guesses?: Record<string, number>
  answer?: number
  questionType?: 'year' | 'number'
  carriedPot?: number
} = {}): { round: EngineRound; answer: number } {
  const fixture = makeSyntheticGameFixture(options)
  let now = 1_000
  let round = createRound(options.roundNumber ?? 1, fixture.question, fixture.players, options.carriedPot ?? 0, now)

  while (round.phase === 'question-betting') {
    round = applyEngineAction(round, { type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: ++now })
  }
  for (const player of round.players.filter((entry) => !entry.folded)) {
    round = applyEngineAction(round, {
      type: 'hint',
      playerId: player.id,
      hint: { questionId: fixture.question.id, range: 'test range', accuracy: 'test accuracy', advisoryNote: 'test-only' },
      now: ++now,
    })
  }
  const guesses = options.guesses ?? Object.fromEntries(round.players.filter((player) => !player.folded).map((player) => [player.id, fixture.answer]))
  for (const [playerId, value] of Object.entries(guesses)) {
    round = applyEngineAction(round, { type: 'guess', playerId, value, now: ++now })
  }
  if (round.phase === 'guess-input') {
    round = applyEngineAction(round, { type: 'timeout', now: round.deadline! })
  }
  while (round.phase === 'final-betting') {
    round = applyEngineAction(round, { type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: ++now })
  }
  return { round, answer: fixture.answer }
}
