import type { Prisma } from '@prisma/client'
import type { GamePhase, LeaderboardEntry, PlayerHint, PrivatePlayerState, PublicGameState, RoundResult } from '../../../shared/contracts.js'
import { prisma } from '../db/prisma.js'
import { HttpError } from '../http/errors.js'
import { NoApprovedQuestionsError, PrismaQuestionRepository, toPublicQuestion, type GameQuestion, type QuestionRepository } from '../questions/questionRepository.js'
import { applyEngineAction, createFundingRound, createRound, settleRound, type EngineAction, type EnginePlayer, type EngineRound } from './engine.js'
import { calculateNetWorth, repayDebtAtMatchEnd, STARTING_CHIPS, takeEmergencyLoan } from './chipLedger.js'

const questions = new PrismaQuestionRepository({ allowLocalTestPool: process.env.SAMKARO_ENABLE_TEST_QUESTION_POOL === '1' })
const asJson = (value: EngineRound): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
function parseState(value: Prisma.JsonValue | null): EngineRound {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(500, 'GAME_STATE_MISSING', 'The saved game state is unavailable.')
  return value as unknown as EngineRound
}
function safeNumber(value: bigint): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('UNSAFE_CHIP_BALANCE')
  return result
}
function loanUnavailableReason(state: EngineRound, player: EnginePlayer): PrivatePlayerState['loanUnavailableReason'] {
  if (state.phase !== 'round-funding') return 'window-closed'
  if (player.loanTaken) return 'already-taken'
  if (player.chips >= 50) return 'balance-sufficient'
  return undefined
}

export async function startAuthoritativeMatch(roomId: string, playerId: string, sessionId: string, idempotencyKey: string, questionRepository?: QuestionRepository) {
  return prisma.$transaction(async (tx) => {
    const priorAction = await tx.gameAction.findUnique({ where: { idempotencyKey } })
    if (priorAction) {
      if (priorAction.playerId !== playerId || priorAction.type !== 'MATCH_START') throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Request key has already been used.')
      const round = await tx.gameRound.findFirst({ where: { matchId: priorAction.matchId }, orderBy: { number: 'desc' } })
      if (!round) throw new HttpError(500, 'GAME_STATE_MISSING', 'The current game state is unavailable.')
      return { matchId: priorAction.matchId, roundId: round.id, roomId, round: parseState(round.engineState) }
    }
    const room = await tx.room.findUnique({ where: { id: roomId }, include: { members: { where: { leftAt: null }, orderBy: { playerId: 'asc' } } } })
    if (!room || !room.members.some((member) => member.playerId === playerId)) throw new HttpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not an active member of this room.')
    if (room.hostPlayerId !== playerId) throw new HttpError(403, 'HOST_REQUIRED', 'Only the host can start this match.')
    if (room.status !== 'WAITING') throw new HttpError(409, 'ROOM_NOT_WAITING', 'This room is not waiting for a match.')
    if (room.members.length < 3 || room.members.some((member) => !member.isReady)) throw new HttpError(409, 'PLAYERS_NOT_READY', 'At least three players must be ready.')
    const selectedQuestions: GameQuestion[] = []
    try {
      for (let round = 0; round < 5; round += 1) {
        selectedQuestions.push(await (questionRepository ?? questions).selectUnused(tx, selectedQuestions.map((question) => question.id)))
      }
    } catch (error) {
      if (error instanceof NoApprovedQuestionsError) throw new HttpError(503, 'QUESTION_BANK_INCOMPLETE', 'Five approved questions with approved hints are required to start a match.')
      throw error
    }
    const participants = room.members.map((member) => ({ id: member.playerId, chips: STARTING_CHIPS, debt: 0, loanTaken: false, folded: false, connected: member.disconnectedAt === null, streetContribution: 0, roundContribution: 0 }))
    const match = await tx.gameMatch.create({ data: { roomId, roundNumber: 1, phase: 'question-betting', questionIds: selectedQuestions.map((question) => question.id), participants: { create: participants.map((participant) => ({ playerId: participant.id, chips: BigInt(participant.chips) })) } } })
    const question = selectedQuestions[0]!
    const roundState = createRound(1, toPublicQuestion(question, 1), participants, 0, Date.now())
    const round = await tx.gameRound.create({ data: {
      matchId: match.id, number: 1, phase: roundState.phase, questionId: question.id,
      pot: BigInt(roundState.pot), currentBet: BigInt(roundState.currentBet), actorPlayerId: roundState.actorId,
      deadlineAt: roundState.deadline === null ? null : new Date(roundState.deadline), engineState: asJson(roundState),
    } })
    for (const participant of roundState.players) {
      const original = participants.find((candidate) => candidate.id === participant.id)!
      if (original.chips !== participant.chips) {
        await tx.matchParticipant.update({ where: { matchId_playerId: { matchId: match.id, playerId: participant.id } }, data: { chips: BigInt(participant.chips) } })
        await tx.chipTransaction.create({ data: {
          playerId: participant.id, matchId: match.id, amount: -50n, kind: 'ANTE', roundNumber: 1,
          idempotencyKey: `${match.id}:round:1:ante:${participant.id}`,
        } })
      }
    }
    await tx.room.update({ where: { id: roomId }, data: { status: 'IN_PROGRESS' } })
    await tx.gameMatch.update({ where: { id: match.id }, data: { pot: BigInt(roundState.pot) } })
    await tx.gameAction.create({ data: { matchId: match.id, playerId, sessionId, idempotencyKey, type: 'MATCH_START', payload: { roomId } } })
    return { matchId: match.id, roundId: round.id, roomId, round: roundState }
  }, { isolationLevel: 'Serializable' })
}

export interface AppliedGameAction {
  publicState: PublicGameState
  privateStates: PrivatePlayerState[]
  reveal?: RoundResult
  completion?: LeaderboardEntry[]
}

export async function getGameSnapshot(roomId: string, playerId: string): Promise<AppliedGameAction> {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.matchParticipant.findFirst({ where: { playerId, match: { roomId, status: 'ACTIVE' } }, select: { playerId: true } })
    if (!membership) throw new HttpError(403, 'MATCH_MEMBERSHIP_REQUIRED', 'You are not part of this match.')
    const match = await tx.gameMatch.findFirst({ where: { roomId, status: 'ACTIVE' }, orderBy: { startedAt: 'desc' } })
    if (!match) throw new HttpError(409, 'NO_ACTIVE_MATCH', 'There is no active match for this room.')
    const round = await tx.gameRound.findFirst({ where: { matchId: match.id, number: match.roundNumber }, include: { question: true } })
    if (!round) throw new HttpError(500, 'ROUND_STATE_MISSING', 'The current round is unavailable.')
    const state = parseState(round.engineState)
    const publicState = await buildPublicState(tx, roomId, match.id, state)
    const privateStates = state.players.map((player) => ({
      playerId: player.id, matchId: match.id, roundNumber: state.number, stateVersion: publicState.session.version ?? 0, hint: state.hints[player.id] ?? null, goldenHint: null,
      guess: state.guesses[player.id] ? { playerId: player.id, value: state.guesses[player.id]!.value, submittedAt: state.guesses[player.id]!.submittedAt } : null,
      availableChips: player.chips, roundContribution: player.roundContribution, debt: player.debt, loanAvailable: state.phase === 'round-funding' && player.chips < 50 && !player.loanTaken,
      ...(loanUnavailableReason(state, player) ? { loanUnavailableReason: loanUnavailableReason(state, player)! } : {}),
    }))
    return { publicState, privateStates }
  })
}

export async function getPublicGameState(roomId: string, playerId: string): Promise<PublicGameState> {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.roomMember.findUnique({ where: { roomId_playerId: { roomId, playerId } }, select: { leftAt: true } })
    if (!membership || membership.leftAt) throw new HttpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not an active member of this room.')
    const match = await tx.gameMatch.findFirst({ where: { roomId, status: 'ACTIVE' }, orderBy: { startedAt: 'desc' } })
    if (!match) throw new HttpError(409, 'NO_ACTIVE_MATCH', 'There is no active match for this room.')
    const round = await tx.gameRound.findFirst({ where: { matchId: match.id, number: match.roundNumber } })
    if (!round) throw new HttpError(500, 'ROUND_STATE_MISSING', 'The current round is unavailable.')
    return buildPublicState(tx, roomId, match.id, parseState(round.engineState))
  })
}

export async function getPrivatePlayerState(playerId: string): Promise<PrivatePlayerState> {
  const participant = await prisma.matchParticipant.findFirst({
    where: { playerId, match: { status: 'ACTIVE' } }, orderBy: { match: { startedAt: 'desc' } },
    include: { match: { include: { rounds: { orderBy: { number: 'desc' }, take: 1 } } } },
  })
  if (!participant?.match.rounds[0]) throw new HttpError(409, 'NO_ACTIVE_MATCH', 'There is no active match for this player.')
  const state = parseState(participant.match.rounds[0].engineState)
  const player = state.players.find((entry) => entry.id === playerId)
  if (!player) throw new HttpError(403, 'MATCH_MEMBERSHIP_REQUIRED', 'You are not part of this match.')
  return {
    playerId, matchId: participant.match.id, roundNumber: state.number, stateVersion: participant.match.version, hint: state.hints[playerId] ?? null, goldenHint: null,
    guess: state.guesses[playerId] ? { playerId, value: state.guesses[playerId]!.value, submittedAt: state.guesses[playerId]!.submittedAt } : null,
    availableChips: safeNumber(participant.chips), roundContribution: player.roundContribution, debt: safeNumber(participant.debt),
    loanAvailable: state.phase === 'round-funding' && player.chips < 50 && !player.loanTaken,
    ...(loanUnavailableReason(state, player) ? { loanUnavailableReason: loanUnavailableReason(state, player)! } : {}),
  }
}

export async function applyAuthoritativeAction(input: {
  roomId: string; playerId: string; sessionId: string; idempotencyKey: string;
  action: EngineAction | { type: 'hint-request'; playerId: string; now: number }
  questionRepository?: QuestionRepository
}): Promise<AppliedGameAction> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.gameMatch.findFirst({ where: { roomId: input.roomId, status: 'ACTIVE' }, orderBy: { startedAt: 'desc' } })
    if (!match) throw new HttpError(409, 'NO_ACTIVE_MATCH', 'There is no active match for this room.')
    const member = await tx.matchParticipant.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: input.playerId } } })
    if (!member) throw new HttpError(403, 'MATCH_MEMBERSHIP_REQUIRED', 'You are not part of this match.')
    const duplicate = await tx.gameAction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (duplicate) {
      if (duplicate.playerId !== input.playerId || duplicate.matchId !== match.id) throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Action key has already been used.')
      throw new HttpError(409, 'ACTION_ALREADY_APPLIED', 'This action was already applied; refresh the game state.')
    }
    const current = await tx.gameRound.findFirst({ where: { matchId: match.id, number: match.roundNumber }, include: { question: { include: { hint: true } } } })
    if (!current) throw new HttpError(500, 'ROUND_STATE_MISSING', 'The current round is unavailable.')
    const state = parseState(current.engineState)
    let action: EngineAction
    const repository = input.questionRepository ?? questions
    if (input.action.type === 'hint-request') {
      // Repeated requests still pass through the engine's duplicate guard, but
      // must not reroll a hint that is already persisted for this player/round.
      const existingHint = state.hints[input.playerId]
      if (existingHint) {
        action = { type: 'hint', playerId: input.playerId, hint: existingHint, now: input.action.now }
      } else {
        let availableQuestion: GameQuestion
        try {
          availableQuestion = repository.getHintForPlayer
            ? await repository.getHintForPlayer(tx, current.questionId, input.playerId, state.players.map((player) => player.id))
            : await repository.getApprovedById(tx, current.questionId)
        }
        catch (error) {
          if (error instanceof NoApprovedQuestionsError) throw new HttpError(503, 'QUESTION_HINT_UNAVAILABLE', 'This question has no available hint.')
          throw error
        }
        const hint: PlayerHint = { questionId: current.questionId, ...availableQuestion.hint }
        action = { type: 'hint', playerId: input.playerId, hint, now: input.action.now }
      }
    } else if (input.action.type === 'timeout' && state.phase === 'secret-clue') {
      // Missing private hint requests are repaired server-side at the deadline;
      // a room-wide timer can no longer move any eligible player past a hint.
      const hints: Record<string, PlayerHint> = {}
      for (const player of state.players.filter((entry) => !entry.folded && entry.chips >= 0 && !state.hints[entry.id])) {
        try {
          const question = repository.getHintForPlayer
            ? await repository.getHintForPlayer(tx, current.questionId, player.id, state.players.map((entry) => entry.id))
            : await repository.getApprovedById(tx, current.questionId)
          hints[player.id] = { questionId: current.questionId, ...question.hint }
        } catch (error) {
          if (error instanceof NoApprovedQuestionsError) throw new HttpError(503, 'QUESTION_HINT_UNAVAILABLE', 'This question has no available hint.')
          throw error
        }
      }
      action = { type: 'hint-timeout', hints, now: input.action.now }
    } else action = input.action
    let next: EngineRound
    try { next = applyEngineAction(state, action) }
    catch (error) {
      const code = error instanceof Error ? error.message : 'INVALID_ACTION'
      throw new HttpError(409, code, 'The action is not valid in the current game state.')
    }
    await tx.gameRound.update({ where: { id: current.id }, data: {
      phase: next.phase, pot: BigInt(next.pot), currentBet: BigInt(next.currentBet), actorPlayerId: next.actorId,
      deadlineAt: next.deadline === null ? null : new Date(next.deadline), engineState: asJson(next),
    } })
    await tx.gameMatch.update({ where: { id: match.id }, data: { phase: next.phase, roundNumber: next.number, pot: BigInt(next.pot), version: { increment: 1 } } })
    for (const player of next.players) {
      const previous = state.players.find((entry) => entry.id === player.id)!
      if (player.chips !== previous.chips) {
        await tx.matchParticipant.update({ where: { matchId_playerId: { matchId: match.id, playerId: player.id } }, data: { chips: BigInt(player.chips) } })
        await tx.chipTransaction.create({ data: {
          playerId: player.id, matchId: match.id, amount: BigInt(player.chips - previous.chips),
          kind: player.chips > previous.chips ? 'REFUND' : action.type === 'timeout' && state.phase === 'round-funding' ? 'ANTE' : 'BET',
          roundNumber: next.number,
          idempotencyKey: `${input.idempotencyKey}:chip:${player.id}`,
        } })
      }
    }
    if (action.type === 'hint') await tx.playerHintRecord.upsert({
      where: { roundId_playerId: { roundId: current.id, playerId: input.playerId } },
      create: { roundId: current.id, playerId: input.playerId, range: action.hint.range, accuracy: action.hint.accuracy, note: action.hint.advisoryNote },
      update: {},
    })
    if (action.type === 'hint-timeout') {
      for (const [playerId, hint] of Object.entries(action.hints)) await tx.playerHintRecord.upsert({
        where: { roundId_playerId: { roundId: current.id, playerId } },
        create: { roundId: current.id, playerId, range: hint.range, accuracy: hint.accuracy, note: hint.advisoryNote },
        update: {},
      })
    }
    if (action.type === 'guess') await tx.playerGuessRecord.upsert({
      where: { roundId_playerId: { roundId: current.id, playerId: input.playerId } },
      create: { roundId: current.id, playerId: input.playerId, value: BigInt(action.value) },
      update: {},
    })
    const socketActionType = action.type === 'bet' ? `BET_${action.action.type.toUpperCase()}` : action.type.toUpperCase()
    await tx.gameAction.create({ data: {
      matchId: match.id, playerId: input.playerId, sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey, type: socketActionType,
      payload: action.type === 'bet' ? { action: action.action } : action.type === 'guess' ? { value: action.value } : { type: action.type },
    } })
    let reveal: RoundResult | undefined
    let completion: LeaderboardEntry[] | undefined
    let visibleState = next
    if (next.phase === 'podium-finish') {
      await finishMatch(tx, match.id, next.pot + next.rolloverPot)
      completion = await loadLeaderboard(tx, match.id)
      await tx.gameRound.update({ where: { id: current.id }, data: { phase: 'podium-finish', pot: BigInt(next.pot), rolloverPot: BigInt(next.rolloverPot), deadlineAt: null, engineState: asJson(next) } })
    } else if (next.phase === 'round-reveal') {
      const answer = Number(current.question.answer)
      const settlement = settleRound(next, answer)
      reveal = {
        roundNumber: next.number, correctAnswer: answer,
        guesses: Object.entries(next.guesses).map(([playerId, guess]) => ({ playerId, value: guess.value, submittedAt: guess.submittedAt })),
        roundWagers: next.players.map((player) => ({ playerId: player.id, amount: player.roundContribution })),
        winnerPlayerIds: settlement.winners, payouts: settlement.payouts,
      }
      if (settlement.winners.length) {
        for (const payout of settlement.payouts) {
          await tx.matchParticipant.update({ where: { matchId_playerId: { matchId: match.id, playerId: payout.playerId } }, data: { chips: { increment: BigInt(payout.amount) } } })
          await tx.chipTransaction.create({ data: {
            playerId: payout.playerId, matchId: match.id, amount: BigInt(payout.amount), kind: 'PAYOUT', roundNumber: next.number,
            idempotencyKey: `${match.id}:round:${next.number}:payout:${payout.playerId}`,
          } })
        }
      }
      await tx.gameRound.update({ where: { id: current.id }, data: { revealedAt: new Date(), rolloverPot: BigInt(settlement.carriedPot) } })
      if (next.number === 5) {
        await finishMatch(tx, match.id, settlement.carriedPot)
        completion = await loadLeaderboard(tx, match.id)
      } else {
        const advanced = await advanceRound(tx, match.id, next, settlement.carriedPot, input.questionRepository ?? questions)
        visibleState = advanced
        if (advanced.phase === 'podium-finish') completion = await loadLeaderboard(tx, match.id)
      }
    }
    const publicState = await buildPublicState(tx, input.roomId, match.id, visibleState)
    const participantBalances = await tx.matchParticipant.findMany({ where: { matchId: match.id } })
    const privateStates = visibleState.players.map((player) => ({
      playerId: player.id,
      matchId: match.id,
      roundNumber: visibleState.number,
      stateVersion: publicState.session.version ?? 0,
      hint: visibleState.hints[player.id] ?? null,
      goldenHint: null,
      guess: visibleState.guesses[player.id] ? { playerId: player.id, value: visibleState.guesses[player.id]!.value, submittedAt: visibleState.guesses[player.id]!.submittedAt } : null,
      availableChips: safeNumber(participantBalances.find((entry) => entry.playerId === player.id)?.chips ?? 0n),
      roundContribution: player.roundContribution,
      debt: safeNumber(participantBalances.find((entry) => entry.playerId === player.id)?.debt ?? 0n),
      loanAvailable: visibleState.phase === 'round-funding' && player.chips < 50 && !player.loanTaken,
      ...(loanUnavailableReason(visibleState, player) ? { loanUnavailableReason: loanUnavailableReason(visibleState, player)! } : {}),
    }))
    return { publicState, privateStates, ...(reveal ? { reveal } : {}), ...(completion ? { completion } : {}) }
  }, { isolationLevel: 'Serializable' })
}

export async function requestEmergencyLoan(input: { roomId: string; playerId: string; sessionId: string; idempotencyKey: string }): Promise<AppliedGameAction> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.gameMatch.findFirst({ where: { roomId: input.roomId, status: 'ACTIVE' }, orderBy: { startedAt: 'desc' } })
    if (!match) throw new HttpError(409, 'NO_ACTIVE_MATCH', 'There is no active match for this room.')
    const participant = await tx.matchParticipant.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: input.playerId } } })
    if (!participant) throw new HttpError(403, 'MATCH_MEMBERSHIP_REQUIRED', 'You are not part of this match.')
    const duplicate = await tx.gameAction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (duplicate) {
      if (duplicate.playerId !== input.playerId || duplicate.matchId !== match.id) throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Action key has already been used.')
      throw new HttpError(409, 'ACTION_ALREADY_APPLIED', 'This action was already applied; refresh the game state.')
    }
    const round = await tx.gameRound.findFirst({ where: { matchId: match.id, number: match.roundNumber } })
    if (!round) throw new HttpError(500, 'ROUND_STATE_MISSING', 'The current round is unavailable.')
    const state = parseState(round.engineState)
    if (state.phase !== 'round-funding') throw new HttpError(409, 'LOAN_WINDOW_CLOSED', 'Emergency loans are available only during the pre-round funding window.')
    if (state.deadline === null || Date.now() >= state.deadline) throw new HttpError(409, 'LOAN_WINDOW_CLOSED', 'The pre-round funding window has expired.')
    const player = state.players.find((candidate) => candidate.id === input.playerId)
    if (!player || player.chips >= 50 || player.loanTaken) throw new HttpError(409, 'LOAN_NOT_NEEDED', 'A loan is only available once to a player who cannot pay the ante.')
    const account = takeEmergencyLoan({ chips: safeNumber(participant.chips), debt: safeNumber(participant.debt), loanTaken: participant.loanTaken })
    player.chips = account.chips
    player.debt = account.debt
    player.loanTaken = account.loanTaken
    await tx.matchParticipant.update({ where: { matchId_playerId: { matchId: match.id, playerId: input.playerId } }, data: { chips: BigInt(account.chips), debt: BigInt(account.debt), loanTaken: true } })
    await tx.loanRecord.create({ data: { matchId: match.id, playerId: input.playerId } })
    await tx.chipTransaction.create({ data: { matchId: match.id, playerId: input.playerId, amount: 200n, kind: 'EMERGENCY_LOAN', idempotencyKey: `${input.idempotencyKey}:loan` } })
    await tx.gameRound.update({ where: { id: round.id }, data: { engineState: asJson(state) } })
    await tx.gameMatch.update({ where: { id: match.id }, data: { version: { increment: 1 } } })
    await tx.gameAction.create({ data: { matchId: match.id, playerId: input.playerId, sessionId: input.sessionId, idempotencyKey: input.idempotencyKey, type: 'LOAN', payload: { amount: 200 } } })
    const publicState = await buildPublicState(tx, input.roomId, match.id, state)
    return { publicState, privateStates: state.players.map((entry) => ({
      playerId: entry.id, matchId: match.id, roundNumber: state.number, stateVersion: publicState.session.version ?? 0, hint: state.hints[entry.id] ?? null, goldenHint: null,
      guess: state.guesses[entry.id] ? { playerId: entry.id, value: state.guesses[entry.id]!.value, submittedAt: state.guesses[entry.id]!.submittedAt } : null,
      availableChips: entry.chips, roundContribution: entry.roundContribution, debt: entry.debt, loanAvailable: state.phase === 'round-funding' && entry.chips < 50 && !entry.loanTaken,
      ...(loanUnavailableReason(state, entry) ? { loanUnavailableReason: loanUnavailableReason(state, entry)! } : {}),
    })) }
  }, { isolationLevel: 'Serializable' })
}

async function buildPublicState(tx: Prisma.TransactionClient, roomId: string, matchId: string, previousState: EngineRound): Promise<PublicGameState> {
  const room = await tx.room.findUnique({ where: { id: roomId }, include: { members: { where: { leftAt: null }, include: { player: { select: { displayName: true } } } } } })
  const match = await tx.gameMatch.findUnique({ where: { id: matchId }, include: { participants: { include: { player: { select: { displayName: true } } } }, rounds: { orderBy: { number: 'desc' }, take: 1, include: { question: { select: { id: true, promptAr: true, category: true, type: true } } } } } })
  if (!room || !match || !match.rounds[0]) throw new HttpError(500, 'GAME_STATE_MISSING', 'The current game state is unavailable.')
  const current = match.rounds[0]
  const state = current.number === previousState.number ? previousState : parseState(current.engineState)
  const roomDto = {
    id: room.id,
    code: room.code,
    hostPlayerId: room.hostPlayerId,
    playerIds: room.members.map((member) => member.playerId),
    status: room.status === 'WAITING' ? 'waiting' as const : room.status === 'IN_PROGRESS' ? 'in-progress' as const : 'finished' as const,
    capacity: room.capacity,
    readyPlayerIds: room.members.filter((member) => member.isReady).map((member) => member.playerId),
  }
  return {
    room: roomDto,
    session: {
      id: match.id, roomId, roundNumber: current.number, phase: current.phase as GamePhase,
      pot: safeNumber(current.pot), questionId: current.questionId, currentBet: safeNumber(current.currentBet),
      currentActorId: current.actorPlayerId, decisionDeadline: current.deadlineAt?.toISOString() ?? null, version: match.version,
    },
    question: toPublicQuestion({ ...current.question, answer: 0n, hint: { range: '', accuracy: '', advisoryNote: '' } }, current.number),
    players: match.participants.map((participant) => {
      const statePlayer = state.players.find((player) => player.id === participant.playerId)
      return {
        id: participant.playerId, name: participant.player.displayName,
        currentBet: statePlayer?.streetContribution ?? 0,
        status: statePlayer?.folded ? 'folded' as const : state.actorId === participant.playerId ? 'thinking' as const : 'normal' as const,
        isHost: room.hostPlayerId === participant.playerId,
        isConnected: room.members.some((member) => member.playerId === participant.playerId && member.disconnectedAt === null),
      }
    }),
    roundProgress: state.players.map((player) => {
      const hasHint = Boolean(state.hints[player.id])
      const hasGuess = Boolean(state.guesses[player.id])
      const status = player.folded ? 'folded'
        : state.phase === 'round-funding' ? 'funding'
          : state.phase === 'secret-clue' ? hasHint ? 'hint-ready' : 'hint-pending'
            : state.phase === 'guess-input' ? hasGuess ? 'guess-submitted' : 'guessing'
              : state.phase === 'round-reveal' || state.phase === 'podium-finish' ? 'revealed'
                : state.actorId === player.id ? 'betting' : 'waiting'
      return { playerId: player.id, status, hasHint, hasGuess, currentStreetWager: player.streetContribution }
    }),
    leaderboard: [],
  }
}

async function advanceRound(tx: Prisma.TransactionClient, matchId: string, previous: EngineRound, carry: number, questionRepository: QuestionRepository): Promise<EngineRound> {
  const match = await tx.gameMatch.findUniqueOrThrow({ where: { id: matchId }, select: { questionIds: true } })
  const questionId = match.questionIds[previous.number]
  if (!questionId) throw new HttpError(503, 'QUESTION_ASSIGNMENT_MISSING', 'This match has no approved question assigned for the next round.')
  const question = await questionRepository.getApprovedById(tx, questionId)
  const participants = await tx.matchParticipant.findMany({ where: { matchId }, orderBy: { playerId: 'asc' } })
  const players: EnginePlayer[] = participants.map((participant) => ({
    id: participant.playerId, chips: safeNumber(participant.chips), debt: safeNumber(participant.debt), loanTaken: participant.loanTaken,
    folded: false, connected: true, streetContribution: 0, roundContribution: 0,
  }))
  const canEnter = players.some((player) => player.chips >= 50)
  const canBorrow = players.some((player) => player.chips < 50 && !player.loanTaken)
  if (!canEnter && !canBorrow) {
    const finished: EngineRound = { ...previous, phase: 'podium-finish', pot: carry, rolloverPot: 0, actorId: null, deadline: null }
    await tx.gameRound.update({ where: { id: (await tx.gameRound.findFirstOrThrow({ where: { matchId, number: previous.number } })).id }, data: { phase: 'podium-finish', pot: BigInt(carry), rolloverPot: 0n, deadlineAt: null, engineState: asJson(finished) } })
    await finishMatch(tx, matchId, carry)
    return finished
  }
  const needsFundingWindow = canBorrow && players.some((player) => player.chips < 50)
  const publicQuestion = toPublicQuestion(question, previous.number + 1)
  const next = needsFundingWindow
    ? createFundingRound(previous.number + 1, publicQuestion, players, carry, Date.now())
    : createRound(previous.number + 1, publicQuestion, players, carry, Date.now())
  const round = await tx.gameRound.create({ data: {
    matchId, number: next.number, questionId: question.id, phase: next.phase, pot: BigInt(next.pot),
    currentBet: BigInt(next.currentBet), actorPlayerId: next.actorId,
    deadlineAt: next.deadline === null ? null : new Date(next.deadline), rolloverPot: BigInt(carry), engineState: asJson(next),
  } })
  for (const player of next.players) {
    const prior = players.find((entry) => entry.id === player.id)!
    if (prior.chips !== player.chips) {
      await tx.matchParticipant.update({ where: { matchId_playerId: { matchId, playerId: player.id } }, data: { chips: BigInt(player.chips) } })
      await tx.chipTransaction.create({ data: { playerId: player.id, matchId, amount: -50n, kind: 'ANTE', roundNumber: next.number, idempotencyKey: `${matchId}:round:${next.number}:ante:${player.id}` } })
    }
  }
  await tx.gameMatch.update({ where: { id: matchId }, data: { roundNumber: next.number, phase: next.phase, pot: BigInt(next.pot), version: { increment: 1 } } })
  return next
}

async function finishMatch(tx: Prisma.TransactionClient, matchId: string, carriedPot: number): Promise<void> {
  const participants = await tx.matchParticipant.findMany({ where: { matchId }, orderBy: { playerId: 'asc' } })
  const ranked = participants.map((participant) => {
    const account = repayDebtAtMatchEnd({ chips: safeNumber(participant.chips), debt: safeNumber(participant.debt), loanTaken: participant.loanTaken })
    return { playerId: participant.playerId, account, netWorth: calculateNetWorth(account) }
  }).sort((a, b) => b.netWorth - a.netWorth || a.playerId.localeCompare(b.playerId))
  for (const [index, item] of ranked.entries()) {
    const current = participants.find((row) => row.playerId === item.playerId)!
    const repaid = safeNumber(current.chips) - item.account.chips
    await tx.matchParticipant.update({ where: { matchId_playerId: { matchId, playerId: item.playerId } }, data: { chips: BigInt(item.account.chips), debt: BigInt(item.account.debt), finalRank: index + 1, netScore: BigInt(item.netWorth) } })
    if (repaid > 0) await tx.loanRecord.updateMany({ where: { matchId, playerId: item.playerId, status: 'OPEN' }, data: { remaining: BigInt(item.account.debt), status: item.account.debt === 0 ? 'REPAID' : 'OPEN', ...(item.account.debt === 0 ? { repaidAt: new Date() } : {}) } })
    if (repaid > 0) await tx.chipTransaction.create({ data: {
      playerId: item.playerId, matchId, amount: -BigInt(repaid), kind: 'LOAN_REPAYMENT',
      idempotencyKey: `${matchId}:end:loan-repayment:${item.playerId}`,
    } })
  }
  const match = await tx.gameMatch.update({ where: { id: matchId }, data: { status: 'FINISHED', phase: 'podium-finish', pot: BigInt(carriedPot), finishedAt: new Date(), version: { increment: 1 } }, select: { roomId: true } })
  await tx.room.update({ where: { id: match.roomId }, data: { status: 'FINISHED' } })
}

async function loadLeaderboard(tx: Prisma.TransactionClient, matchId: string): Promise<LeaderboardEntry[]> {
  const rows = await tx.matchParticipant.findMany({ where: { matchId }, orderBy: { finalRank: 'asc' }, include: { player: { select: { displayName: true } } } })
  return rows.map((row, index) => ({ playerId: row.playerId, displayName: row.player.displayName, score: Number(row.netScore ?? row.chips - row.debt), rank: row.finalRank ?? index + 1, debt: safeNumber(row.debt), netWorth: Number(row.netScore ?? row.chips - row.debt) }))
}
