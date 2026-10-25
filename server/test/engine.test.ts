import { describe, expect, it } from 'vitest'
import { applyEngineAction, createFundingRound, createRound, settleRound, type EnginePlayer } from '../src/game/engine.js'
import type { Question } from '../../shared/contracts.js'

const question: Question = { id: 'q1', roundNumber: 1, prompt: 'كم عدد؟', category: 'عام', type: 'number' }
const players: EnginePlayer[] = ['c', 'a', 'b'].map((id) => ({
  id, chips: 500, debt: 0, loanTaken: false, folded: false, connected: true, streetContribution: 0, roundContribution: 0,
}))

describe('authoritative round engine', () => {
  it('holds the ante during the optional loan window and collects it after timeout', () => {
    const lowStacks = players.map((player) => ({ ...player, chips: player.id === 'c' ? 40 : 300 }))
    let funding = createFundingRound(2, { ...question, roundNumber: 2 }, lowStacks, 90, 2_000)
    expect(funding.phase).toBe('round-funding')
    expect(funding.pot).toBe(90)
    funding.players.find((player) => player.id === 'c')!.chips += 200
    funding.players.find((player) => player.id === 'c')!.loanTaken = true
    const next = applyEngineAction(funding, { type: 'timeout', now: funding.deadline! })
    expect(next.phase).toBe('question-betting')
    expect(next.pot).toBe(240)
    expect(next.players.find((player) => player.id === 'c')?.chips).toBe(190)
  })

  it('ends without awarding the carried pot when no player can enter after the loan window', () => {
    const exhausted = players.map((player) => ({ ...player, chips: 20, loanTaken: true }))
    const funding = createFundingRound(4, { ...question, roundNumber: 4 }, exhausted, 275, 2_000)
    const next = applyEngineAction(funding, { type: 'timeout', now: funding.deadline! })
    expect(next.phase).toBe('podium-finish')
    expect(next.pot + next.rolloverPot).toBe(275)
  })

  it('starts turn order in stable player ID order and checks through to private hints', () => {
    let round = createRound(1, question, players, 0, 1000)
    expect(round.actorId).toBe('a')
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'check' }, now: 1001 })
    expect(round.actorId).toBe('b')
    round = applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'check' }, now: 1002 })
    round = applyEngineAction(round, { type: 'bet', playerId: 'c', action: { type: 'check' }, now: 1003 })
    expect(round.phase).toBe('secret-clue')
    for (const id of ['a', 'b', 'c']) {
      round = applyEngineAction(round, { type: 'hint', playerId: id, hint: { questionId: 'q1', range: 'قريب', accuracy: 'متوسط', advisoryNote: '' }, now: 1100 })
    }
    expect(round.phase).toBe('guess-input')
  })

  it('never lets a phase timeout skip an eligible player hint', () => {
    let round = createRound(1, question, players, 0, 1000)
    for (let turn = 0; turn < 3; turn += 1) {
      round = applyEngineAction(round, { type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: 1001 + turn })
    }
    expect(round.phase).toBe('secret-clue')
    const hint = (playerId: string) => ({ questionId: 'q1', range: `range-${playerId}`, accuracy: 'close', advisoryNote: '' })
    round = applyEngineAction(round, { type: 'hint', playerId: 'a', hint: hint('a'), now: 1100 })
    round = applyEngineAction(round, { type: 'hint', playerId: 'b', hint: hint('b'), now: 1101 })
    expect(() => applyEngineAction(round, { type: 'timeout', now: round.deadline! })).toThrow('HINTS_INCOMPLETE')
    round = applyEngineAction(round, { type: 'hint-timeout', hints: { c: hint('c') }, now: round.deadline! })
    expect(round.phase).toBe('guess-input')
    expect(Object.keys(round.hints).sort()).toEqual(['a', 'b', 'c'])
    expect(new Set(Object.values(round.hints).map((entry) => entry.range))).toEqual(new Set(['range-a', 'range-b', 'range-c']))
  })

  it('records each eligible guess once and keeps it private in the engine projection', () => {
    let round = createRound(1, question, players, 0, 1000)
    for (let turn = 0; turn < 3; turn += 1) round = applyEngineAction(round, { type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: 1001 + turn })
    for (const id of ['a', 'b', 'c']) round = applyEngineAction(round, { type: 'hint', playerId: id, hint: { questionId: 'q1', range: 'safe', accuracy: 'close', advisoryNote: '' }, now: 1100 })
    round = applyEngineAction(round, { type: 'guess', playerId: 'a', value: 42, now: 1200 })
    expect(round.guesses.a?.value).toBe(42)
    expect(() => applyEngineAction(round, { type: 'guess', playerId: 'a', value: 42, now: 1201 })).toThrow('GUESS_ALREADY_LOCKED')
    expect(Object.keys(round.guesses)).toEqual(['a'])
  })

  it('rejects out-of-turn action, illegal check, and raise below the ten-chip minimum', () => {
    const round = createRound(1, question, players, 0, 1000)
    expect(() => applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'check' }, now: 1001 })).toThrow('OUT_OF_TURN')
    const raised = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'raise', amount: 60 }, now: 1001 })
    expect(raised.pot).toBe(210)
    expect(() => applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'raise', amount: 9 }, now: 1001 })).toThrow('RAISE_TOO_SMALL')
  })

  it('rejects betting, hint, and guess actions at or after the server deadline', () => {
    const round = createRound(1, question, players, 0, 1000)
    expect(round.deadline).not.toBeNull()
    expect(() => applyEngineAction(round, {
      type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: round.deadline!,
    })).toThrow('ACTION_DEADLINE_PASSED')
    expect(() => applyEngineAction(round, {
      type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: round.deadline! - 1,
    })).not.toThrow()

    let clueRound = round
    for (const id of ['a', 'b', 'c']) {
      clueRound = applyEngineAction(clueRound, { type: 'bet', playerId: clueRound.actorId!, action: { type: 'check' }, now: 2000 })
    }
    expect(clueRound.phase).toBe('secret-clue')
    expect(() => applyEngineAction(clueRound, {
      type: 'hint', playerId: 'a', hint: { questionId: 'q1', range: 'range', accuracy: 'accuracy', advisoryNote: '' }, now: clueRound.deadline!,
    })).toThrow('ACTION_DEADLINE_PASSED')
    for (const id of ['a', 'b', 'c']) {
      clueRound = applyEngineAction(clueRound, { type: 'hint', playerId: id, hint: { questionId: 'q1', range: 'range', accuracy: 'accuracy', advisoryNote: '' }, now: 3000 })
    }
    expect(clueRound.phase).toBe('guess-input')
    expect(() => applyEngineAction(clueRound, { type: 'guess', playerId: 'a', value: 1, now: clueRound.deadline! })).toThrow('ACTION_DEADLINE_PASSED')
  })

  it('allows a short all-in call and refunds excess so no side pot remains', () => {
    const shortStack = players.map((player) => ({ ...player, chips: player.id === 'b' ? 120 : 500 }))
    let round = createRound(1, question, shortStack, 0, 1000)
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'raise', amount: 100 }, now: 1001 })
    round = applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'call' }, now: 1002 })
    expect(round.players.find((player) => player.id === 'a')?.chips).toBe(380)
    expect(round.players.find((player) => player.id === 'b')?.chips).toBe(0)
    expect(round.pot).toBe(290)
    round = applyEngineAction(round, { type: 'bet', playerId: 'c', action: { type: 'call' }, now: 1003 })
    expect(round.phase).toBe('secret-clue')
    expect(round.pot).toBe(360)
    expect(round.players.map((player) => player.roundContribution)).toEqual([120, 120, 120])
  })

  it('rejects an all-in raise below the minimum raise increment', () => {
    const shortRaiseStack = players.map((player) => ({ ...player, chips: player.id === 'b' ? 158 : 500 }))
    let round = createRound(1, question, shortRaiseStack, 0, 1000)
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'raise', amount: 100 }, now: 1001 })
    expect(round.players.find((player) => player.id === 'b')?.chips).toBe(108)
    expect(() => applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'all-in' }, now: 1002 })).toThrow('RAISE_TOO_SMALL')
  })

  it('reopens betting after a full all-in raise', () => {
    let round = createRound(1, question, players, 0, 1000)
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'raise', amount: 100 }, now: 1001 })
    round = applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'all-in' }, now: 1002 })
    expect(round.currentBet).toBe(450)
    expect(round.acted).toEqual(['b'])
    expect(round.actorId).toBe('c')
  })

  it('continues stable turn order after the current actor folds', () => {
    let round = createRound(1, question, players, 0, 1000)
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'check' }, now: 1001 })
    expect(round.actorId).toBe('b')
    round = applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'fold' }, now: 1002 })
    expect(round.actorId).toBe('c')
  })

  it('folds the timed-out actor and rolls an early-fold pot into the next round', () => {
    let round = createRound(1, question, players, 0, 1000)
    round = applyEngineAction(round, { type: 'bet', playerId: 'a', action: { type: 'fold' }, now: 1001 })
    round = applyEngineAction(round, { type: 'bet', playerId: 'b', action: { type: 'fold' }, now: 1002 })
    expect(round.phase).toBe('round-reveal')
    const settlement = settleRound(round, 42)
    expect(settlement.winners).toEqual([])
    expect(settlement.carriedPot).toBe(150)
  })

  it('skips a missing guess at timeout and awards an invalid zero-answer round to the sole survivor', () => {
    let round = createRound(5, { ...question, roundNumber: 5 }, players, 0, 1000)
    // Move deterministically through both streets without guess submissions.
    for (const id of ['a', 'b', 'c']) round = applyEngineAction(round, { type: 'bet', playerId: round.actorId!, action: { type: 'check' }, now: 1001 })
    for (const id of ['a', 'b', 'c']) round = applyEngineAction(round, { type: 'hint', playerId: id, hint: { questionId: 'q1', range: '', accuracy: '', advisoryNote: '' }, now: 1100 })
    round = applyEngineAction(round, { type: 'timeout', now: round.deadline! })
    expect(round.phase).toBe('final-betting')
    const final = { ...round, phase: 'round-reveal' as const, players: round.players.map((player) => ({ ...player, folded: player.id !== 'c' })) }
    expect(settleRound(final, 0).winners).toEqual(['c'])
  })
})
