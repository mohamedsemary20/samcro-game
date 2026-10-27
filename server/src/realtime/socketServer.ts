import type { Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Server, type Socket } from 'socket.io'
import type { ActionAcknowledgement, ClientToServerEvents, ServerToClientEvents } from '../../../shared/contracts.js'
import { findSession, parseCookies } from '../auth/session.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { prisma } from '../db/prisma.js'
import { betSchema, guessSchema, idempotencySchema, readySchema, roomIdSchema } from '../domain/schemas.js'
import { getRoomSnapshot, leaveRoom, restoreRoomMembership, setReady } from '../rooms/roomService.js'
import { HttpError } from '../http/errors.js'
import { applyAuthoritativeAction, getGameSnapshot, requestEmergencyLoan, startAuthoritativeMatch } from '../game/gameService.js'
import { deliverPrivateStates } from './privateDelivery.js'
import type { QuestionRepository } from '../questions/questionRepository.js'
import { currentOperationContext, runWithOperationContext } from '../observability/operationContext.js'

interface SocketData { playerId: string; sessionId: string; displayName: string; roomId?: string }
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
const sessionSockets = new Map<string, Set<GameSocket>>()

export function disconnectSession(sessionId: string): void {
  for (const socket of sessionSockets.get(sessionId) ?? []) socket.disconnect(true)
}

function emitError(socket: GameSocket, code: string, message: string, requestId?: string): void {
  socket.emit('server:error', { code, message, ...(requestId ? { requestId } : {}) })
}

function broadcastGame(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string, result: Awaited<ReturnType<typeof applyAuthoritativeAction>>): void {
  io.to(`room:${roomId}`).emit('game:state', result.publicState)
  deliverPrivateStates(result.privateStates, (room, privateState) => io.to(room).emit('player:private', privateState))
  if (result.reveal) io.to(`room:${roomId}`).emit('game:reveal', result.reveal)
  if (result.completion) io.to(`room:${roomId}`).emit('game:complete', result.completion)
}

async function onSocket(socket: GameSocket, event: string, operation: () => Promise<void>, acknowledge?: (result: ActionAcknowledgement) => void): Promise<void> {
  const requestId = randomUUID()
  const startedAt = performance.now()
  await runWithOperationContext({ correlationId: requestId, source: 'socket', operation: event }, async () => {
  try {
    const session = await prisma.playerSession.findFirst({
      where: { id: socket.data.sessionId, playerId: socket.data.playerId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (!session) {
      const error = { code: 'SESSION_EXPIRED', message: 'Player session expired. Reconnect with a new session.' }
      acknowledge?.({ ok: false, error: { ...error, requestId } })
      if (!acknowledge) emitError(socket, error.code, error.message, requestId)
      const context = currentOperationContext()
      logger.warn('socket_event_completed', { requestId, event, outcome: 'rejected', code: error.code, durationMs: Math.round((performance.now() - startedAt) * 100) / 100, databaseQueryCount: context?.databaseQueryCount ?? 0, databaseDurationMs: context?.databaseDurationMs ?? 0, slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null, slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0 })
      socket.disconnect(true)
      return
    }
    await operation()
    acknowledge?.({ ok: true, requestId })
    const context = currentOperationContext()
    logger.info('socket_event_completed', { requestId, event, outcome: 'ok', durationMs: Math.round((performance.now() - startedAt) * 100) / 100, databaseQueryCount: context?.databaseQueryCount ?? 0, databaseDurationMs: context?.databaseDurationMs ?? 0, slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null, slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0 })
  } catch (error) {
    if (error instanceof HttpError) {
      acknowledge?.({ ok: false, error: { code: error.code, message: error.message, requestId } })
      if (!acknowledge) emitError(socket, error.code, error.message, requestId)
      const context = currentOperationContext()
      logger.warn('socket_event_completed', { requestId, event, outcome: 'rejected', code: error.code, durationMs: Math.round((performance.now() - startedAt) * 100) / 100, databaseQueryCount: context?.databaseQueryCount ?? 0, databaseDurationMs: context?.databaseDurationMs ?? 0, slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null, slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0 })
    }
    else {
      const context = currentOperationContext()
      logger.warn('socket_event_completed', { requestId, event, outcome: 'failed', errorType: error instanceof Error ? error.name : 'unknown', durationMs: Math.round((performance.now() - startedAt) * 100) / 100, databaseQueryCount: context?.databaseQueryCount ?? 0, databaseDurationMs: context?.databaseDurationMs ?? 0, slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null, slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0 })
      acknowledge?.({ ok: false, error: { code: 'ACTION_FAILED', message: 'Action could not be completed. Please refresh the room state.', requestId } })
      if (!acknowledge) emitError(socket, 'ACTION_FAILED', 'Action could not be completed. Please refresh the room state.', requestId)
    }
  }
  })
}

export function attachSocketServer(httpServer: HttpServer, options: { questionRepository?: QuestionRepository } = {}): Server<ClientToServerEvents, ServerToClientEvents> {
  const questionRepository = options.questionRepository
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: [...env.trustedOrigins], credentials: true, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 16 * 1024,
    pingTimeout: 20_000,
    pingInterval: 25_000,
  })

  const connectionAttempts = new Map<string, { windowStart: number; count: number }>()

  io.use((socket, next) => {
    const requestId = randomUUID()
    const startedAt = performance.now()
    void runWithOperationContext({ correlationId: requestId, source: 'socket', operation: 'socket:handshake' }, async () => {
      let outcome = 'ok'
      try {
        const ip = socket.handshake.address
        const now = Date.now()
        const attempts = connectionAttempts.get(ip)
        if (connectionAttempts.size > 10_000) {
          for (const [address, record] of connectionAttempts) if (now - record.windowStart >= 60_000) connectionAttempts.delete(address)
        }
        if (attempts && now - attempts.windowStart < 60_000 && attempts.count >= 30) {
          outcome = 'RATE_LIMITED'
          return next(new Error('RATE_LIMITED'))
        }
        if (!attempts || now - attempts.windowStart >= 60_000) connectionAttempts.set(ip, { windowStart: now, count: 1 })
        else attempts.count += 1
        const origin = socket.handshake.headers.origin
        if (origin && !env.trustedOrigins.has(origin)) {
          outcome = 'UNTRUSTED_ORIGIN'
          return next(new Error('UNTRUSTED_ORIGIN'))
        }
        const token = parseCookies(socket.handshake.headers.cookie).get(env.COOKIE_NAME)
        const session = token ? await findSession(token) : null
        if (!session) {
          outcome = 'SESSION_REQUIRED'
          return next(new Error('SESSION_REQUIRED'))
        }
        socket.data.playerId = session.playerId
        socket.data.sessionId = session.sessionId
        socket.data.displayName = session.displayName
        next()
      } catch {
        outcome = 'SESSION_REQUIRED'
        next(new Error('SESSION_REQUIRED'))
      } finally {
        const context = currentOperationContext()
        logger.info('socket_handshake_completed', {
          requestId,
          outcome,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          databaseQueryCount: context?.databaseQueryCount ?? 0,
          databaseDurationMs: Math.round((context?.databaseDurationMs ?? 0) * 100) / 100,
          slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null,
          slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0,
        })
      }
    })
  })

  io.on('connection', (socket) => {
    const gameSocket = socket as GameSocket
    const activeSessionSockets = sessionSockets.get(gameSocket.data.sessionId) ?? new Set<GameSocket>()
    activeSessionSockets.add(gameSocket)
    sessionSockets.set(gameSocket.data.sessionId, activeSessionSockets)
    const playerRoom = `player:${gameSocket.data.playerId}`
    void gameSocket.join(playerRoom)

    gameSocket.on('room:join', (payload) => void onSocket(gameSocket, 'room:join', async () => {
      const input = roomIdSchema.parse(payload)
      // Keep the reconnect mutation and its acknowledgement snapshot in one
      // transaction so a failed follow-up read cannot report failure after
      // disconnectedAt has already been cleared.
      const room = await restoreRoomMembership(input.roomId, gameSocket.data.playerId)
      gameSocket.data.roomId = input.roomId
      await gameSocket.join(`room:${input.roomId}`)
      gameSocket.emit('session:reconnected', { playerId: gameSocket.data.playerId, roomId: input.roomId })
      io.to(`room:${input.roomId}`).emit('room:state', room)
      const game = await getGameSnapshot(input.roomId, gameSocket.data.playerId).catch(() => null)
      if (game) {
        gameSocket.emit('game:state', game.publicState)
        const privateState = game.privateStates.find((entry) => entry.playerId === gameSocket.data.playerId)
        if (privateState) gameSocket.emit('player:private', privateState)
      }
    }))

    gameSocket.on('room:leave', (payload) => void onSocket(gameSocket, 'room:leave', async () => {
      const input = roomIdSchema.parse(payload)
      if (input.roomId !== gameSocket.data.roomId) return
      const room = await leaveRoom(input.roomId, gameSocket.data.playerId)
      await gameSocket.leave(`room:${input.roomId}`)
      delete gameSocket.data.roomId
      if (room) io.to(`room:${input.roomId}`).emit('room:state', room)
    }))

    gameSocket.on('room:ready', (payload) => void onSocket(gameSocket, 'room:ready', async () => {
      const input = readySchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before changing readiness.')
      const room = await setReady(roomId, gameSocket.data.playerId, input.ready)
      io.to(`room:${roomId}`).emit('room:state', room)
    }))

    gameSocket.on('match:start', (payload, acknowledge) => void onSocket(gameSocket, 'match:start', async () => {
      idempotencySchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before starting a match.')
      await startAuthoritativeMatch(roomId, gameSocket.data.playerId, gameSocket.data.sessionId, payload.idempotencyKey, questionRepository)
      // The database mutation is authoritative. Snapshot delivery is recoverable
      // through room:join/game:sync and must not turn a committed start into a
      // failed acknowledgement if a read fails immediately afterward.
      const [roomSnapshot, gameSnapshot] = await Promise.all([
        getRoomSnapshot(roomId).catch(() => null),
        getGameSnapshot(roomId, gameSocket.data.playerId).catch(() => null),
      ])
      if (roomSnapshot) io.to(`room:${roomId}`).emit('room:state', roomSnapshot)
      if (gameSnapshot) broadcastGame(io, roomId, gameSnapshot)
    }, acknowledge))

    gameSocket.on('game:sync', (payload) => void onSocket(gameSocket, 'game:sync', async () => {
      const input = roomIdSchema.parse(payload)
      if (input.roomId !== gameSocket.data.roomId) throw new HttpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'Join this room before syncing game state.')
      const result = await getGameSnapshot(input.roomId, gameSocket.data.playerId)
      gameSocket.emit('game:state', result.publicState)
      const ownState = result.privateStates.find((item) => item.playerId === gameSocket.data.playerId)
      if (ownState) gameSocket.emit('player:private', ownState)
    }))

    gameSocket.on('game:hint.request', (payload, acknowledge) => void onSocket(gameSocket, 'game:hint.request', async () => {
      idempotencySchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before requesting a hint.')
      const result = await applyAuthoritativeAction({
        roomId, playerId: gameSocket.data.playerId, sessionId: gameSocket.data.sessionId,
        idempotencyKey: payload.idempotencyKey,
        ...(questionRepository ? { questionRepository } : {}),
        action: { type: 'hint-request', playerId: gameSocket.data.playerId, now: Date.now() },
      })
      broadcastGame(io, roomId, result)
    }, acknowledge))

    gameSocket.on('game:loan.request', (payload, acknowledge) => void onSocket(gameSocket, 'game:loan.request', async () => {
      const input = idempotencySchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before requesting a loan.')
      broadcastGame(io, roomId, await requestEmergencyLoan({ roomId, playerId: gameSocket.data.playerId, sessionId: gameSocket.data.sessionId, idempotencyKey: input.idempotencyKey }))
    }, acknowledge))
    gameSocket.on('game:guess.submit', (payload, acknowledge) => void onSocket(gameSocket, 'game:guess.submit', async () => {
      const input = guessSchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before submitting a guess.')
      const result = await applyAuthoritativeAction({
        roomId, playerId: gameSocket.data.playerId, sessionId: gameSocket.data.sessionId,
        idempotencyKey: input.idempotencyKey,
        ...(questionRepository ? { questionRepository } : {}),
        action: { type: 'guess', playerId: gameSocket.data.playerId, value: input.value, now: Date.now() },
      })
      broadcastGame(io, roomId, result)
    }, acknowledge))
    gameSocket.on('game:bet.submit', (payload, acknowledge) => void onSocket(gameSocket, 'game:bet.submit', async () => {
      const input = betSchema.parse(payload)
      const roomId = gameSocket.data.roomId
      if (!roomId) throw new HttpError(409, 'ROOM_NOT_JOINED', 'Join a room before betting.')
      const result = await applyAuthoritativeAction({
        roomId, playerId: gameSocket.data.playerId, sessionId: gameSocket.data.sessionId,
        idempotencyKey: input.idempotencyKey,
        ...(questionRepository ? { questionRepository } : {}),
        action: { type: 'bet', playerId: gameSocket.data.playerId, action: input.action, now: Date.now() },
      })
      broadcastGame(io, roomId, result)
    }, acknowledge))

    gameSocket.on('disconnect', () => {
      const sockets = sessionSockets.get(gameSocket.data.sessionId)
      sockets?.delete(gameSocket)
      if (!sockets?.size) sessionSockets.delete(gameSocket.data.sessionId)
      const roomId = gameSocket.data.roomId
      if (!roomId) return
      const timeout = setTimeout(() => {
        void io.in(playerRoom).fetchSockets().then((remaining) => {
          if (remaining.some((candidate) => candidate.rooms.has(`room:${roomId}`))) return
          return prisma.roomMember.updateMany({
            where: { roomId, playerId: gameSocket.data.playerId, leftAt: null, disconnectedAt: null },
            data: { disconnectedAt: new Date() },
          }).then(async (changed) => {
            if (!changed.count) return
            const room = await getRoomSnapshot(roomId)
            if (room) io.to(`room:${roomId}`).emit('room:state', room)
            const game = await getGameSnapshot(roomId, gameSocket.data.playerId).catch(() => null)
            if (game) io.to(`room:${roomId}`).emit('game:state', game.publicState)
          })
        }).catch((error: unknown) => logger.error('disconnect_persist_failed', { roomId, errorType: error instanceof Error ? error.name : 'unknown' }))
      }, 50)
      timeout.unref()
    })
  })

  let processingExpiredTurns = false
  const turnTimer = setInterval(() => {
    if (processingExpiredTurns) return
    processingExpiredTurns = true
    void processExpiredTurns(io)
      .catch((error: unknown) => logger.error('turn_timeout_processing_failed', { errorType: error instanceof Error ? error.name : 'unknown' }))
      .finally(() => { processingExpiredTurns = false })
  }, 1_000)
  turnTimer.unref()
  let checkingExpiredSessions = false
  const sessionTimer = setInterval(() => {
    if (checkingExpiredSessions) return
    checkingExpiredSessions = true
    void disconnectExpiredSessions().finally(() => { checkingExpiredSessions = false })
  }, 60_000)
  sessionTimer.unref()
  io.once('close', () => {
    clearInterval(turnTimer)
    clearInterval(sessionTimer)
    sessionSockets.clear()
  })

  return io
}

async function disconnectExpiredSessions(): Promise<void> {
  const sessionIds = [...sessionSockets.keys()]
  if (!sessionIds.length) return
  const valid = await prisma.playerSession.findMany({
    where: { id: { in: sessionIds }, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true },
  }).catch((error: unknown) => {
    logger.error('socket_session_recheck_failed', { errorType: error instanceof Error ? error.name : 'unknown' })
    return []
  })
  const validIds = new Set(valid.map((session) => session.id))
  for (const id of sessionIds) if (!validIds.has(id)) disconnectSession(id)
}

export async function processExpiredTurns(io: Server<ClientToServerEvents, ServerToClientEvents>): Promise<void> {
  const now = new Date()
  const expired = await prisma.gameRound.findMany({
    where: { deadlineAt: { lte: now }, match: { status: 'ACTIVE' } },
    include: { match: { select: { id: true, roomId: true } } },
    take: 50,
  }).catch((error: unknown) => {
    logger.error('turn_timeout_query_failed', { errorType: error instanceof Error ? error.name : 'unknown' })
    return []
  })
  for (const round of expired) {
    const actorId = round.actorPlayerId ?? (await prisma.matchParticipant.findFirst({ where: { matchId: round.match.id }, orderBy: { playerId: 'asc' }, select: { playerId: true } }))?.playerId
    if (!actorId) continue
    // Timeout actions are server initiated. Keep an existing session FK for the audit row,
    // even when the player has logged out or all of their sessions have expired.
    const session = await prisma.playerSession.findFirst({
      where: { playerId: actorId }, orderBy: { createdAt: 'desc' }, select: { id: true },
    })
    if (!session) continue
    try {
      const result = await applyAuthoritativeAction({
        roomId: round.match.roomId, playerId: actorId, sessionId: session.id,
        idempotencyKey: `timeout:${round.id}:${round.deadlineAt?.getTime() ?? 0}`,
        action: { type: 'timeout', now: now.getTime() },
        expectedRoundId: round.id,
        ...(round.deadlineAt ? { expectedDeadlineAtMs: round.deadlineAt.getTime() } : {}),
      })
      broadcastGame(io, round.match.roomId, result)
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'ACTION_ALREADY_APPLIED') {
        logger.warn('turn_timeout_action_skipped', {
          roundId: round.id,
          ...(error instanceof HttpError ? { errorCode: error.code } : { errorType: error instanceof Error ? error.name : 'unknown' }),
        })
      }
    }
  }
}
