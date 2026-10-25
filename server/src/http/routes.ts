import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { createRoomSchema, guestSessionSchema, joinRoomSchema, roomIdSchema } from '../domain/schemas.js'
import { asyncRoute } from './asyncRoute.js'
import { HttpError } from './errors.js'
import { clearSessionCookie, createGuestSession, requireSession, revokeSession, setSessionCookie } from '../auth/session.js'
import { createRoom, getRoomForPlayer, joinRoom } from '../rooms/roomService.js'
import { getPrivatePlayerState, getPublicGameState } from '../game/gameService.js'
import { disconnectSession } from '../realtime/socketServer.js'

export const apiRouter = Router()
const guestLimiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false })
const roomCodeLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.ROOM_CODE_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

apiRouter.get('/health', (_request, response) => response.json({ status: 'ok', service: 'samkaro-api', version: 'v1' }))

apiRouter.post('/sessions/guest', guestLimiter, asyncRoute(async (request, response) => {
  const input = guestSessionSchema.parse(request.body)
  const created = await createGuestSession(input.displayName)
  setSessionCookie(response, created.token, created.expiresAt)
  response.status(201).json({ player: { id: created.session.playerId, name: created.session.displayName }, expiresAt: created.expiresAt.toISOString() })
}))

apiRouter.get('/sessions/me', requireSession, asyncRoute(async (request, response) => {
  response.json({ player: { id: request.auth!.playerId, name: request.auth!.displayName } })
}))

apiRouter.delete('/sessions/me', requireSession, asyncRoute(async (request, response) => {
  await revokeSession(request.auth!.sessionId)
  disconnectSession(request.auth!.sessionId)
  clearSessionCookie(response)
  response.status(204).end()
}))

apiRouter.post('/rooms', requireSession, asyncRoute(async (request, response) => {
  const input = createRoomSchema.parse(request.body)
  const room = await createRoom(request.auth!.playerId, input.capacity, input.idempotencyKey)
  response.status(201).json({ room })
}))

apiRouter.post('/rooms/join', requireSession, roomCodeLimiter, asyncRoute(async (request, response) => {
  const input = joinRoomSchema.parse(request.body)
  const room = await joinRoom(request.auth!.playerId, input.code)
  response.json({ room })
}))

apiRouter.get('/rooms/:roomId', requireSession, asyncRoute(async (request, response) => {
  const roomId = roomIdSchema.parse({ roomId: request.params.roomId }).roomId
  const room = await getRoomForPlayer(roomId, request.auth!.playerId)
  const members = await prisma.roomMember.findMany({
    where: { roomId: room.id, leftAt: null }, orderBy: { joinedAt: 'asc' },
    include: { player: { select: { id: true, displayName: true } } },
  })
  response.json({
    room,
    players: members.map((member) => ({
      playerId: member.playerId,
      displayName: member.player.displayName,
      isHost: room.hostPlayerId === member.playerId,
      isReady: member.isReady,
      isConnected: member.disconnectedAt === null,
    })),
  })
}))

apiRouter.get('/rooms/:roomId/game', requireSession, asyncRoute(async (request, response) => {
  const roomId = roomIdSchema.parse({ roomId: request.params.roomId }).roomId
  response.json({ state: await getPublicGameState(roomId, request.auth!.playerId) })
}))

apiRouter.get('/sessions/me/private-state', requireSession, asyncRoute(async (request, response) => {
  response.json({ state: await getPrivatePlayerState(request.auth!.playerId) })
}))

apiRouter.get('/matches/history', requireSession, asyncRoute(async (request, response) => {
  const participations = await prisma.matchParticipant.findMany({
    where: { playerId: request.auth!.playerId, match: { status: 'FINISHED' } },
    orderBy: { match: { finishedAt: 'desc' } }, take: 50,
    select: { matchId: true, finalRank: true, netScore: true, match: { select: { finishedAt: true, room: { select: { code: true } } } } },
  })
  response.json({ matches: participations.map((item) => ({
    id: item.matchId,
    roomCode: item.match.room.code,
    finishedAt: item.match.finishedAt?.toISOString() ?? null,
    rank: item.finalRank,
    netScore: item.netScore === null ? null : Number(item.netScore),
  })) })
}))

apiRouter.get('/matches/:matchId/leaderboard', requireSession, asyncRoute(async (request, response) => {
  const matchId = roomIdSchema.parse({ roomId: request.params.matchId }).roomId
  const membership = await prisma.matchParticipant.findUnique({ where: { matchId_playerId: { matchId, playerId: request.auth!.playerId } } })
  if (!membership) throw new HttpError(403, 'MATCH_MEMBERSHIP_REQUIRED', 'You are not part of this match.')
  const rows = await prisma.matchParticipant.findMany({
    where: { matchId }, orderBy: [{ finalRank: 'asc' }, { playerId: 'asc' }],
    include: { player: { select: { displayName: true } } },
  })
  response.json({ entries: rows.map((row, index) => ({
    playerId: row.playerId,
    displayName: row.player.displayName,
    score: Number(row.netScore ?? row.chips),
    rank: row.finalRank ?? index + 1,
    debt: Number(row.debt),
    netWorth: Number(row.chips - row.debt),
  })) })
}))
