import { createHash, randomUUID } from 'node:crypto'
import { createServer, type Server as HttpServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { Server as SocketServer } from 'socket.io'
import type { PlayerHint, PrivatePlayerState, PublicGameState, RoundResult } from '../../../shared/contracts.js'
import type { QuestionRepository } from '../../src/questions/questionRepository.js'

interface RoomDto {
  id: string
  code: string
  hostPlayerId: string
  status: 'waiting' | 'in-progress' | 'finished'
  playerIds: string[]
  readyPlayerIds: string[]
}

interface ApiFailure { error: { code: string; message: string } }
interface SocketEventWaiter {
  event: string
  accepts: (payload: unknown) => boolean
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

/** A minimal Engine.IO v4 / Socket.IO default-namespace client over real WebSocket. */
class SocketIoTestClient {
  private readonly socket: WebSocket
  private readonly events = new Map<string, unknown[]>()
  private readonly waiters: SocketEventWaiter[] = []
  private readonly acknowledgements = new Map<number, (payload: unknown) => void>()
  private nextAcknowledgementId = 1
  private connectionResolve: (() => void) | undefined
  private connectionReject: ((error: Error) => void) | undefined
  private connected = false

  constructor(url: string, cookie: string, origin: string) {
    this.socket = new WebSocket(url, { headers: { Cookie: cookie, Origin: origin } })
    this.socket.on('message', (data) => this.handleFrame(data.toString()))
    this.socket.on('error', (error) => this.connectionReject?.(error))
    this.socket.on('close', () => {
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timer)
        waiter.reject(new Error(`Socket closed while waiting for ${waiter.event}`))
      }
    })
  }

  connect(timeoutMs = 5_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO namespace connection timed out.')), timeoutMs)
      this.connectionResolve = () => { clearTimeout(timer); resolve() }
      this.connectionReject = (error) => { clearTimeout(timer); reject(error) }
    })
  }

  emit(event: string, payload: unknown): void {
    if (!this.connected || this.socket.readyState !== WebSocket.OPEN) throw new Error('Socket.IO client is not connected.')
    this.socket.send(`42${JSON.stringify([event, payload])}`)
  }

  emitWithAck(event: string, payload: unknown, timeoutMs = 8_000): Promise<unknown> {
    if (!this.connected || this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Socket.IO client is not connected.'))
    const id = this.nextAcknowledgementId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.acknowledgements.delete(id)
        reject(new Error(`Timed out waiting for acknowledgement ${event}.`))
      }, timeoutMs)
      this.acknowledgements.set(id, (result) => { clearTimeout(timeout); resolve(result) })
      this.socket.send(`42${id}${JSON.stringify([event, payload])}`)
    })
  }

  isConnected(): boolean { return this.connected && this.socket.readyState === WebSocket.OPEN }

  drain(event: string): unknown[] { return this.events.get(event)?.splice(0) ?? [] }

  waitFor<T>(event: string, accepts: (payload: T) => boolean = () => true, timeoutMs = 10_000): Promise<T> {
    const queued = this.events.get(event) ?? []
    const queuedIndex = queued.findIndex((payload) => accepts(payload as T))
    if (queuedIndex >= 0) return Promise.resolve(queued.splice(queuedIndex, 1)[0] as T)
    return this.waitForNext(event, accepts, timeoutMs)
  }

  waitForNext<T>(event: string, accepts: (payload: T) => boolean = () => true, timeoutMs = 10_000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: SocketEventWaiter = {
        event,
        accepts: (payload) => accepts(payload as T),
        resolve: (payload) => resolve(payload as T),
        reject,
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter)
          if (index >= 0) this.waiters.splice(index, 1)
          reject(new Error(`Timed out waiting for Socket.IO event ${event}.`))
        }, timeoutMs),
      }
      this.waiters.push(waiter)
    })
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { this.socket.terminate(); resolve() }, 1_000)
      this.socket.once('close', () => { clearTimeout(timer); resolve() })
      this.socket.close()
    })
  }

  private handleFrame(frame: string): void {
    if (frame === '2') { this.socket.send('3'); return }
    if (frame.startsWith('0')) { this.socket.send('40'); return }
    if (frame.startsWith('40')) {
      this.connected = true
      this.connectionResolve?.()
      this.connectionResolve = undefined
      this.connectionReject = undefined
      return
    }
    if (frame.startsWith('44')) {
      const detail = frame.slice(2)
      this.connectionReject?.(new Error(detail))
      return
    }
    if (frame.startsWith('43')) {
      const match = frame.slice(2).match(/^(\d+)(\[.*)$/)
      if (!match) return
      const ack = this.acknowledgements.get(Number(match[1]))
      if (!ack) return
      this.acknowledgements.delete(Number(match[1]))
      const values = JSON.parse(match[2]!) as unknown[]
      ack(values[0])
      return
    }
    if (!frame.startsWith('42')) return
    const packet = JSON.parse(frame.slice(2)) as [string, unknown]
    const [event, payload] = packet
    if (typeof event !== 'string') return
    const remaining: SocketEventWaiter[] = []
    let delivered = false
    for (const waiter of this.waiters) {
      if (!delivered && waiter.event === event && waiter.accepts(payload)) {
        clearTimeout(waiter.timer)
        waiter.resolve(payload)
        delivered = true
      } else remaining.push(waiter)
    }
    this.waiters.splice(0, this.waiters.length, ...remaining)
    if (!delivered) this.events.set(event, [...(this.events.get(event) ?? []), payload])
  }
}

const shouldRun = process.env.SAMKARO_RUN_DB_INTEGRATION === '1'
const suite = describe.skipIf(!shouldRun)

suite('PostgreSQL-backed REST and Socket.IO room lifecycle', () => {
  it('plays a complete three-player match from active PostgreSQL question-bank records', async () => {
    expect(process.env.SAMKARO_RUN_DB_INTEGRATION).toBe('1')
    const configuredUrl = process.env.DATABASE_URL
    expect(configuredUrl, 'test:integration must load server/.env').toBeTruthy()
    const parsedDatabaseUrl = new URL(configuredUrl!)
    expect(['localhost', '127.0.0.1', '::1']).toContain(parsedDatabaseUrl.hostname.toLowerCase())
    const configuredDatabase = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1)).split('/')[0]
    expect(configuredDatabase).toBe(process.env.SAMKARO_INTEGRATION_DATABASE ?? 'samkaro_dev')
    expect(process.env.NODE_ENV).toBe('development')
    expect(process.env.SAMKARO_RUN_DB_INTEGRATION).toBe('1')
    expect(process.env.SAMKARO_ENABLE_TEST_QUESTION_POOL).toBeUndefined()

    const [{ app }, { prisma }, { attachSocketServer, processExpiredTurns }, questionRepositoryModule] = await Promise.all([
      import('../../src/http/app.js'),
      import('../../src/db/prisma.js'),
      import('../../src/realtime/socketServer.js'),
      import('../../src/questions/questionRepository.js'),
    ])
    const { PrismaQuestionRepository, NoEligibleQuestionsError } = questionRepositoryModule

    const db = prisma as PrismaClient
    const connectedDatabase = await db.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`
    expect(connectedDatabase[0]?.database_name).toBe(configuredDatabase)
    expect(Number(process.env.GOLDEN_HINT_PROBABILITY ?? 0)).toBe(0)
    const staleFixtures = await db.question.findMany({
      where: { sourceFile: '__automated_integration_fixture__' },
      select: { id: true },
    })
    expect(staleFixtures, 'refusing to modify pre-existing integration fixture rows').toHaveLength(0)
    const playableQuestionCount = await db.question.count({
      where: {
        sourceFile: 'web/questions/trivia_clean.json',
        enabled: true,
        type: { in: ['year', 'number'] },
        answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
      },
    })
    expect(playableQuestionCount).toBeGreaterThanOrEqual(5)
    const normalRepository = new PrismaQuestionRepository()
    const questionRepository = normalRepository
    const fiveSelected = await db.$transaction(async (tx) => {
      const selected: string[] = []
      for (let index = 0; index < 5; index += 1) selected.push((await questionRepository.selectUnused(tx, selected)).id)
      return selected
    })
    expect(new Set(fiveSelected).size).toBe(5)
    const bankIds = await db.question.findMany({ where: { id: { in: fiveSelected }, sourceFile: 'web/questions/trivia_clean.json' }, select: { id: true } })
    expect(bankIds).toHaveLength(5)

    const httpServer: HttpServer = createServer(app)
    let rejectFirstStartForQuestionBank = true
    const retryQuestionRepository: QuestionRepository = {
      selectUnused: async (transaction, usedQuestionIds) => {
        if (rejectFirstStartForQuestionBank) {
          rejectFirstStartForQuestionBank = false
          throw new NoEligibleQuestionsError()
        }
        // Five deliberately slow selections prove match-start preparation is
        // outside Prisma's default five-second interactive transaction.
        await delay(1_050)
        return questionRepository.selectUnused(transaction, usedQuestionIds)
      },
      getActiveById: (transaction, questionId) => questionRepository.getActiveById(transaction, questionId),
      getHintForPlayer: async (transaction, questionId, playerId, roundPlayerIds) => {
        // The secret-clue timeout repairs three missing hints. Keep this work
        // intentionally slower than the default transaction timeout.
        await delay(1_750)
        return questionRepository.getHintForPlayer(transaction, questionId, playerId, roundPlayerIds)
      },
    }
    const io: SocketServer = attachSocketServer(httpServer, { questionRepository: retryQuestionRepository })
    const clients: SocketIoTestClient[] = []
    const identities: Array<{ playerId: string; cookie: string; tokenHash: string }> = []
    let roomId: string | undefined
    let hostCreateKey: string | undefined
    let databaseOwnershipVerified = false
    let apiBase = ''
    const trustedOrigin = process.env.TRUSTED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5173'

    try {
      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(0, '127.0.0.1', resolve)
      })
      const address = httpServer.address()
      if (!address || typeof address === 'string') throw new Error('Integration server did not bind a TCP port.')
      const origin = `http://127.0.0.1:${address.port}`
      apiBase = `${origin}/api/v1`
      const socketUrl = `ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`

      const request = async (path: string, options: { method?: string; cookie?: string; body?: unknown } = {}) => {
        const headers: Record<string, string> = { Origin: trustedOrigin }
        if (options.cookie) headers.Cookie = options.cookie
        if (options.body !== undefined) headers['Content-Type'] = 'application/json'
        return fetch(`${apiBase}${path}`, {
          method: options.method ?? 'GET',
          headers,
          ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        })
      }

      const runTag = randomUUID().slice(0, 8)
      for (let index = 1; index <= 3; index += 1) {
        const response = await request('/sessions/guest', { method: 'POST', body: { displayName: `it-${runTag}-${index}` } })
        expect(response.status).toBe(201)
        const body = await response.json() as { player: { id: string } }
        const setCookie = response.headers.get('set-cookie')
        expect(setCookie).toBeTruthy()
        expect(setCookie).toContain('HttpOnly')
        expect(setCookie).toContain('SameSite=Lax')
        const cookie = setCookie!.split(';', 1)[0]!
        const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1))
        const tokenHash = createHash('sha256').update(token).digest('hex')
        identities.push({ playerId: body.player.id, cookie, tokenHash })
        const dbSession = await db.playerSession.findUnique({ where: { tokenHash }, select: { id: true, playerId: true } })
        expect(dbSession?.playerId).toBe(body.player.id)
        databaseOwnershipVerified = true
      }

      const host = identities[0]!
      const hostKey = randomUUID()
      hostCreateKey = hostKey
      const createResponse = await request('/rooms', { method: 'POST', cookie: host.cookie, body: { capacity: 3, idempotencyKey: hostKey } })
      expect(createResponse.status).toBe(201)
      const created = await createResponse.json() as { room: RoomDto }
      roomId = created.room.id
      const repeatedCreate = await request('/rooms', { method: 'POST', cookie: host.cookie, body: { capacity: 3, idempotencyKey: hostKey } })
      expect(repeatedCreate.status).toBe(201)
      expect((await repeatedCreate.json() as { room: RoomDto }).room.id).toBe(roomId)
      expect(created.room.status).toBe('waiting')
      expect(created.room.readyPlayerIds).toEqual([host.playerId])

      for (const identity of identities.slice(1)) {
        const joined = await request('/rooms/join', { method: 'POST', cookie: identity.cookie, body: { code: created.room.code } })
        expect(joined.status).toBe(200)
        const repeatedJoin = await request('/rooms/join', { method: 'POST', cookie: identity.cookie, body: { code: created.room.code } })
        expect(repeatedJoin.status).toBe(200)
      }

      const unauthenticatedRoomRead = await request(`/rooms/${roomId}`)
      expect(unauthenticatedRoomRead.status).toBe(401)

      for (const identity of identities) {
        const client = new SocketIoTestClient(socketUrl, identity.cookie, trustedOrigin)
        clients.push(client)
        await client.connect()
        const roomUpdate = client.waitFor<RoomDto>('room:state', (state) => state.id === roomId && state.playerIds.includes(identity.playerId))
        client.emit('room:join', { roomId })
        await roomUpdate
      }

      const temporarilyInactivePlayer = identities[2]!
      await db.roomMember.update({
        where: { roomId_playerId: { roomId, playerId: temporarilyInactivePlayer.playerId } },
        data: { leftAt: new Date() },
      })
      expect(await db.roomMember.count({ where: { roomId, leftAt: null } })).toBe(2)
      const tooFewPlayersAck = clients[0]!.emitWithAck('match:start', { idempotencyKey: randomUUID() })
      expect(await tooFewPlayersAck).toMatchObject({ ok: false, error: { code: 'PLAYERS_NOT_READY' } })
      await db.roomMember.update({
        where: { roomId_playerId: { roomId, playerId: temporarilyInactivePlayer.playerId } },
        data: { leftAt: null },
      })

      const notReadyAck = clients[0]!.emitWithAck('match:start', { idempotencyKey: randomUUID() })
      expect(await notReadyAck).toMatchObject({ ok: false, error: { code: 'PLAYERS_NOT_READY' } })
      expect(clients[0]!.drain('server:error')).toHaveLength(0)
      expect(await db.gameMatch.count({ where: { roomId } })).toBe(0)

      for (const identity of identities.slice(1)) {
        const client = clients[identities.indexOf(identity)]!
        const readyUpdate = client.waitFor<RoomDto>('room:state', (state) => state.id === roomId && state.readyPlayerIds.includes(identity.playerId))
        client.emit('room:ready', { ready: true })
        await readyUpdate
      }

      const roomResponse = await request(`/rooms/${roomId}`, { cookie: host.cookie })
      expect(roomResponse.status).toBe(200)
      const roomState = await roomResponse.json() as { room: RoomDto; players: Array<{ playerId: string; isReady: boolean }> }
      expect(roomState.room.playerIds).toHaveLength(3)
      expect(new Set(roomState.room.playerIds)).toEqual(new Set(identities.map((identity) => identity.playerId)))
      expect(roomState.room.readyPlayerIds).toHaveLength(3)
      expect(roomState.players.every((player) => player.isReady)).toBe(true)
      expect(roomState.room.status).toBe('waiting')

      const nonHost = clients[1]!
      const nonHostAck = nonHost.emitWithAck('match:start', { idempotencyKey: randomUUID() })
      expect(await nonHostAck).toMatchObject({ ok: false, error: { code: 'HOST_REQUIRED' } })
      expect(await db.gameMatch.count({ where: { roomId } })).toBe(0)

      const startingPublicStates = clients.map((client) => client.waitForNext<PublicGameState>(
        'game:state', (state) => state.room.id === roomId && state.session.roundNumber === 1,
      ))
      const startedRoom = clients.map((client) => client.waitForNext<RoomDto>('room:state', (state) => state.id === roomId && state.status === 'in-progress'))
      const startingPrivateStates = clients.map((client, index) => client.waitForNext<PrivatePlayerState>(
        'player:private', (state) => state.playerId === identities[index]!.playerId,
      ))
      // Subscribe before the first action so completion cannot race the test observer.
      const completionEvent = clients[1]!.waitFor<Array<{ playerId: string; rank: number }>>('game:complete', () => true, 60_000)
      const revealEvents = Array.from({ length: 5 }, (_, index) =>
        clients[1]!.waitFor<RoundResult>('game:reveal', (result) => result.roundNumber === index + 1, 60_000),
      )
      const unavailableAck = clients[0]!.emitWithAck('match:start', { idempotencyKey: randomUUID() })
      expect(await unavailableAck).toMatchObject({ ok: false, error: { code: 'QUESTION_BANK_INCOMPLETE' } })
      expect((await request(`/rooms/${roomId}`, { cookie: host.cookie }).then((response) => response.json()) as { room: RoomDto }).room.status).toBe('waiting')
      expect(await db.gameMatch.count({ where: { roomId } })).toBe(0)

      const startKey = randomUUID()
      const startAck = clients[0]!.emitWithAck('match:start', { idempotencyKey: startKey })
      expect(await startAck).toMatchObject({ ok: true, requestId: expect.any(String) })
      const initialStates = await Promise.all(startingPublicStates)
      let game = initialStates[0]!
      expect(initialStates.every((state) => state.session.questionId === game.session.questionId)).toBe(true)
      expect(initialStates.every((state) => state.session.phase === 'question-betting')).toBe(true)
      const startedRooms = await Promise.all(startedRoom)
      expect(startedRooms.every((state) => state.status === 'in-progress')).toBe(true)
      expect(await db.gameMatch.count({ where: { roomId, status: 'ACTIVE' } })).toBe(1)
      expect(await db.gameRound.count({ where: { match: { roomId }, number: 1 } })).toBe(1)
      expect(await clients[0]!.emitWithAck('match:start', { idempotencyKey: startKey })).toMatchObject({ ok: true, requestId: expect.any(String) })
      expect(await db.gameMatch.count({ where: { roomId, status: 'ACTIVE' } })).toBe(1)
      const personalFunding = await Promise.all(startingPrivateStates)
      expect(game.players).toHaveLength(3)
      expect(game.players.every((player) => !('chips' in player))).toBe(true)
      expect(game.roundProgress).toHaveLength(3)
      expect(personalFunding.every((state) => state.roundNumber === 1 && state.availableChips === 450 && state.roundContribution === 50)).toBe(true)
      expect(game.session.phase).toBe('question-betting')
      expect(JSON.stringify(game)).not.toContain('correctAnswer')
      expect(JSON.stringify(game)).not.toContain('answer')

      let latestVersion = game.session.version ?? 0
      const observedRounds = new Set([game.session.roundNumber])
      let actionCount = 0
      let completion: Array<{ playerId: string; rank: number }> | undefined
      let firstRoundHints: Array<{ playerId: string; hint: PlayerHint }> = []
      const firstRoundPrivateByPlayer = new Map<string, PrivatePlayerState>()
      const firstActorIndex = identities.findIndex((identity) => identity.playerId === game.session.currentActorId)
      expect(firstActorIndex).toBeGreaterThanOrEqual(0)
      const outOfTurnClient = clients[(firstActorIndex + 1) % clients.length]!
      const outOfTurnDecision = await outOfTurnClient.emitWithAck('game:bet.submit', {
        idempotencyKey: randomUUID(), action: { type: 'check' },
      })
      expect(outOfTurnDecision).toMatchObject({ ok: false, error: { code: 'OUT_OF_TURN' } })

      for (let guard = 0; guard < 100 && !completion; guard += 1) {
        const phase = game.session.phase
        if (phase === 'round-reveal' && game.session.roundNumber === 5) break
        if (phase === 'round-funding' || phase === 'round-reveal') throw new Error(`Unexpected match phase: ${phase}`)
        if (phase === 'secret-clue' || phase === 'guess-input') {
          for (const [index, identity] of identities.entries()) {
            const client = clients[index]!
            if (phase === 'secret-clue') {
              if (game.session.roundNumber === 1 && firstRoundHints.length === 0) {
                const currentRound = await db.gameRound.findFirst({ where: { matchId: game.session.id, number: 1 } })
                expect(currentRound).not.toBeNull()
                const expiredAt = Date.now() - 100
                const expiredEngine = structuredClone(currentRound!.engineState) as unknown as { deadline: number }
                expiredEngine.deadline = expiredAt
                const publicUpdates = clients.map((viewer) => viewer.waitForNext<PublicGameState>(
                  'game:state', (state) => (state.session.version ?? 0) > latestVersion,
                ))
                const privateUpdates = clients.map((viewer, viewerIndex) => viewer.waitForNext<PrivatePlayerState>(
                  'player:private', (state) => state.playerId === identities[viewerIndex]!.playerId,
                ))
                await db.gameRound.update({ where: { id: currentRound!.id }, data: { deadlineAt: new Date(expiredAt), engineState: expiredEngine as Prisma.InputJsonValue } })
                await Promise.all([processExpiredTurns(io), processExpiredTurns(io)])
                const [timedStates, privateStates] = await Promise.all([Promise.all(publicUpdates), Promise.all(privateUpdates)])
                const nextState = timedStates[0]!
                expect(nextState.session.phase).toBe('guess-input')
                expect(await db.gameAction.count({ where: { idempotencyKey: `timeout:${currentRound!.id}:${expiredAt}` } })).toBe(1)
                expect(nextState.roundProgress.every((entry) => entry.hasHint)).toBe(true)
                for (const [viewerIndex, state] of privateStates.entries()) {
                  expect(state.playerId).toBe(identities[viewerIndex]!.playerId)
                  expect(state.roundNumber).toBe(1)
                  expect(state.hint?.questionId).toBe(nextState.session.questionId)
                  expect(JSON.stringify(nextState)).not.toContain(state.hint!.advisoryNote)
                  firstRoundHints.push({ playerId: state.playerId, hint: { ...state.hint! } })
                  firstRoundPrivateByPlayer.set(state.playerId, state)
                }
                const question = await db.question.findUnique({ where: { id: nextState.session.questionId }, select: { answer: true } })
                expect(question).not.toBeNull()
                const answer = Number(question!.answer)
                expect(firstRoundHints).toHaveLength(3)
                expect(JSON.stringify(nextState)).not.toContain('exact')
                await clients[0]!.close()
                await delay(100)
                const reconnected = new SocketIoTestClient(socketUrl, identities[0]!.cookie, trustedOrigin)
                clients[0] = reconnected
                await reconnected.connect()
                const roomAgain = reconnected.waitFor<RoomDto>('room:state', (room) => room.id === roomId)
                const privateAgain = reconnected.waitFor<PrivatePlayerState>('player:private', (state) => state.playerId === identities[0]!.playerId)
                const publicAgain = reconnected.waitFor<PublicGameState>('game:state', (state) => state.session.roundNumber === 1)
                reconnected.emit('room:join', { roomId })
                const [, reconnectedPrivate] = await Promise.all([roomAgain, privateAgain, publicAgain])
                const syncOthers = clients.slice(1).map((viewer, viewerIndex) => viewer.waitForNext<PrivatePlayerState>(
                  'player:private', (state) => state.playerId === identities[viewerIndex + 1]!.playerId,
                ))
                for (const viewer of clients.slice(1)) viewer.emit('game:sync', { roomId })
                const syncedPrivate = [reconnectedPrivate, ...await Promise.all(syncOthers)]
                for (const [viewerIndex, state] of syncedPrivate.entries()) {
                  expect(state.hint).toEqual(firstRoundHints.find((entry) => entry.playerId === identities[viewerIndex]!.playerId)?.hint)
                }
                game = nextState
                observedRounds.add(game.session.roundNumber)
                latestVersion = game.session.version ?? latestVersion
                actionCount += 1
                break
              }
              const updated = client.waitFor<PublicGameState>('game:state', (state) => (state.session.version ?? 0) > latestVersion)
              const privateUpdates = clients.map((viewer, viewerIndex) => viewer.waitForNext<PrivatePlayerState>(
                'player:private', (state) => state.playerId === identities[viewerIndex]!.playerId,
              ))
              const hintAcknowledgement = client.emitWithAck('game:hint.request', { idempotencyKey: randomUUID() })
              const [nextState, ...privateStates] = await Promise.all([updated, ...privateUpdates])
              expect(await hintAcknowledgement).toMatchObject({ ok: true, requestId: expect.any(String) })
              if (nextState.session.roundNumber === 1) {
                for (const [viewerIndex, state] of privateStates.entries()) {
                  expect(state.playerId).toBe(identities[viewerIndex]!.playerId)
                  const prior = firstRoundPrivateByPlayer.get(state.playerId)
                  if (prior?.hint) expect(state.hint).toEqual(prior.hint)
                  firstRoundPrivateByPlayer.set(state.playerId, state)
                }
                const ownState = privateStates[index] as PrivatePlayerState
                expect(ownState.hint?.questionId).toBe(nextState.session.questionId)
                firstRoundHints.push({ playerId: ownState.playerId, hint: { ...ownState.hint! } })
                if (firstRoundHints.length === 3) {
                  const question = await db.question.findUnique({ where: { id: nextState.session.questionId }, select: { answer: true } })
                  expect(question).not.toBeNull()
                  const answer = Number(question!.answer)
                  expect(firstRoundHints).toHaveLength(3)
                  for (const { hint } of firstRoundHints) {
                    if (hint.exact) {
                      expect(Number(hint.range.replaceAll(',', ''))).toBe(answer)
                    } else {
                      const bounds = hint.range.split(' – ').map((value) => Number(value.replaceAll(',', '')))
                      expect(bounds).toHaveLength(2)
                      expect(bounds[0]).toBeLessThanOrEqual(answer)
                      expect(bounds[1]).toBeGreaterThanOrEqual(answer)
                      expect(bounds[1]! - bounds[0]! + 1).toBeGreaterThan(1)
                    }
                    expect(hint.accuracy.trim()).not.toBe('')
                    expect(hint.advisoryNote.trim()).not.toBe('')
                  }
                  const syncHint = clients.map((viewer, viewerIndex) => viewer.waitForNext<PrivatePlayerState>(
                    'player:private', (state) => state.playerId === identities[viewerIndex]!.playerId,
                  ))
                  for (const viewer of clients) viewer.emit('game:sync', { roomId })
                  const syncedStates = await Promise.all(syncHint)
                  for (const [viewerIndex, state] of syncedStates.entries()) {
                    expect(state.hint).toEqual(firstRoundHints.find((entry) => entry.playerId === identities[viewerIndex]!.playerId)?.hint)
                  }
                }
              }
              game = nextState
            }
            else {
              const updated = client.waitFor<PublicGameState>('game:state', (state) => (state.session.version ?? 0) > latestVersion)
              const acknowledgement = client.emitWithAck('game:guess.submit', { idempotencyKey: randomUUID(), value: 42 })
              game = await updated
              expect(await acknowledgement).toMatchObject({ ok: true, requestId: expect.any(String) })
              const progress = game.roundProgress.find((entry) => entry.playerId === identity.playerId)
              expect(progress?.hasGuess).toBe(true)
              expect(progress).not.toHaveProperty('guess')
              expect(JSON.stringify(game)).not.toContain('"value":42')
              if (index === 0 && game.session.roundNumber === 1) {
                const rejected = await client.emitWithAck('game:guess.submit', { idempotencyKey: randomUUID(), value: 42 }) as { ok: boolean; error?: { code: string } }
                expect(rejected).toMatchObject({ ok: false, error: { code: 'GUESS_ALREADY_LOCKED' } })
                const roundRow = await db.gameRound.findFirst({ where: { matchId: game.session.id, number: 1 }, select: { id: true } })
                expect(roundRow).not.toBeNull()
                expect(await db.playerGuessRecord.count({ where: { roundId: roundRow!.id, playerId: identity.playerId } })).toBe(1)
              }
            }
            observedRounds.add(game.session.roundNumber)
            latestVersion = game.session.version ?? latestVersion
            actionCount += 1
            expect(identity.playerId).toBeTruthy()
          }
        } else {
          const actorIndex = identities.findIndex((identity) => identity.playerId === game.session.currentActorId)
          expect(actorIndex).toBeGreaterThanOrEqual(0)
          const actor = clients[actorIndex]!
          const updated = actor.waitFor<PublicGameState>('game:state', (state) => (state.session.version ?? 0) > latestVersion)
          const betAcknowledgement = actor.emitWithAck('game:bet.submit', { idempotencyKey: randomUUID(), action: { type: 'check' } })
          game = await updated
          expect(await betAcknowledgement).toMatchObject({ ok: true, requestId: expect.any(String) })
          observedRounds.add(game.session.roundNumber)
          latestVersion = game.session.version ?? latestVersion
          actionCount += 1
        }
      }
      try {
        completion = await completionEvent
      } catch (cause) {
        const persistedState = await db.gameMatch.findFirst({ where: { roomId }, select: { status: true, roundNumber: true, phase: true, version: true } })
        throw new Error(`game:complete was not delivered; persisted match state: ${JSON.stringify(persistedState)}`, { cause })
      }
      const reveals = await Promise.all(revealEvents)
      expect([...observedRounds].sort()).toEqual([1, 2, 3, 4, 5])
      expect(game.session.roundNumber).toBe(5)
      expect(game.session.phase).toBe('round-reveal')
      expect(actionCount).toBeGreaterThanOrEqual(30)
      expect(reveals.map((result) => result.roundNumber)).toEqual([1, 2, 3, 4, 5])
      expect(reveals.every((result) => Number.isSafeInteger(result.correctAnswer))).toBe(true)
      expect(reveals.every((result) => result.roundWagers?.length === 3 && result.guesses.length === 3)).toBe(true)
      expect(completion).toHaveLength(3)
      expect(new Set(completion!.map((entry) => entry.playerId))).toEqual(new Set(identities.map((identity) => identity.playerId)))
      expect(new Set(completion!.map((entry) => entry.rank))).toEqual(new Set([1, 2, 3]))
      const persistedMatch = await db.gameMatch.findFirst({ where: { roomId }, include: { rounds: true, participants: true } })
      expect(persistedMatch?.status).toBe('FINISHED')
      expect(persistedMatch?.rounds).toHaveLength(5)
      expect(persistedMatch?.questionIds).toHaveLength(5)
      expect(persistedMatch?.participants.every((participant) => participant.finalRank !== null)).toBe(true)
      const persistedBankQuestions = await db.question.findMany({
        where: { id: { in: persistedMatch?.questionIds ?? [] }, sourceFile: 'web/questions/trivia_clean.json', enabled: true },
        select: { id: true },
      })
      expect(persistedBankQuestions).toHaveLength(5)
      expect(persistedMatch?.rounds.every((round) => persistedBankQuestions.some((row) => row.id === round.questionId))).toBe(true)
      const persistedRanks = persistedMatch!.participants.map((participant) => ({ playerId: participant.playerId, rank: participant.finalRank! }))
      expect(completion!.map(({ playerId, rank }) => ({ playerId, rank })).sort((left, right) => left.rank - right.rank))
        .toEqual(persistedRanks.sort((left, right) => left.rank - right.rank))
    } finally {
      await Promise.all(clients.map((client) => client.close()))
      await delay(100)
      if (apiBase) {
        for (const identity of identities) {
          await fetch(`${apiBase}/sessions/me`, {
            method: 'DELETE', headers: { Cookie: identity.cookie, Origin: trustedOrigin },
          }).catch(() => undefined)
        }
      }
      await new Promise<void>((resolve) => io.close(() => resolve()))

      if (databaseOwnershipVerified) {
        await db.$transaction(async (tx) => {
          let mayDeletePlayers = true
          if (roomId && hostCreateKey) {
            const room = await tx.room.findUnique({ where: { id: roomId }, select: { createRequestKey: true, status: true } })
            if (room) {
              const [matchCount, members] = await Promise.all([
                tx.gameMatch.count({ where: { roomId } }),
                tx.roomMember.findMany({ where: { roomId }, select: { playerId: true } }),
              ])
              const testPlayerIds = new Set(identities.map((identity) => identity.playerId))
              if (room.createRequestKey !== hostCreateKey || !['WAITING', 'IN_PROGRESS', 'FINISHED'].includes(room.status) || matchCount > 1 || members.some((member) => !testPlayerIds.has(member.playerId))) {
                mayDeletePlayers = false
                throw new Error('Scoped cleanup refused: test room has an unexpected owner, match, or member; records were preserved.')
              }
              await tx.gameMatch.deleteMany({ where: { roomId } })
              await tx.room.delete({ where: { id: roomId } })
            }
          }
          if (!mayDeletePlayers || identities.length === 0) return
          const playerIds = identities.map((identity) => identity.playerId)
          const references = await tx.player.findMany({
            where: { id: { in: playerIds } },
            select: {
              id: true,
              hostedRooms: { select: { id: true } },
              memberships: { select: { roomId: true } },
              matches: { select: { matchId: true } },
              transactions: { select: { id: true } },
              loans: { select: { id: true } },
              hints: { select: { id: true } },
              guesses: { select: { id: true } },
            },
          })
          const safeIds = references.filter((player) =>
            player.hostedRooms.length === 0 && player.memberships.length === 0 && player.matches.length === 0
            && player.transactions.length === 0 && player.loans.length === 0 && player.hints.length === 0 && player.guesses.length === 0,
          ).map((player) => player.id)
          if (safeIds.length !== playerIds.length) throw new Error('Scoped cleanup refused: one or more test players acquired unrelated references; player rows were preserved.')
          if (safeIds.length) await tx.player.deleteMany({ where: { id: { in: safeIds } } })
        })
        const remainingPlayers = await db.player.count({ where: { id: { in: identities.map((identity) => identity.playerId) } } })
        const remainingRoom = roomId ? await db.room.count({ where: { id: roomId } }) : 0
        expect({ remainingPlayers, remainingRoom }).toEqual({ remainingPlayers: 0, remainingRoom: 0 })
      }
      expect(await db.question.count({ where: { sourceFile: '__automated_integration_fixture__' } })).toBe(0)
    }
  }, 60_000)
})
