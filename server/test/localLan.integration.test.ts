import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'
import { LocalMatchAuthority, parseLanClientFrame, type LocalMatchAction } from '../../packages/game-core/index.js'
import type { OfflineQuestion } from '../../packages/game-core/offlineQuestions.js'

interface TestClient {
  socket: WebSocket
  messages: Array<Record<string, unknown>>
  playerId?: string
  resumeToken?: string
}

function questions(): OfflineQuestion[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `lan-approved-${index + 1}`, promptAr: `Approved local question ${index + 1}`, answer: 100 + index,
    category: 'LAN integration fixture', type: 'number', sourceFingerprint: (index + 100).toString(16).padStart(64, '0'), approved: true,
    hint: { range: '100 to 105', accuracy: 'approximate', advisoryNote: 'Synthetic approval fixture.' },
  }))
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('local WebSocket four-player integration harness', () => {
  let server: WebSocketServer | undefined
  afterEach(async () => {
    if (!server) return
    for (const socket of server.clients) socket.terminate()
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
  })

  it('runs host plus three LAN clients through readiness, validation, resume, and match completion', async () => {
    let credentialCounter = 0
    const hostCredentials = { playerId: '0000000000000000', resumeToken: 'host-resume-token-0001' }
    const roomCredential = 'room-credential-short-lived-0001'
    const authority = new LocalMatchAuthority({ roomCode: 'LAN234', roomId: 'local-integration', questions: questions(),
      host: { ...hostCredentials, displayName: 'Host' }, createCredential: () => `client_token_${String(++credentialCounter).padStart(12, '0')}` })
    const connections = new Map<WebSocket, { playerId: string; resumeToken: string }>()
    server = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: 64 * 1024 })

    const send = (socket: WebSocket, value: unknown) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(value))
    const publish = () => {
      for (const [socket, identity] of connections) send(socket, { type: 'snapshot', snapshot: authority.snapshot(identity.playerId) })
    }
    const processMessage = (socket: WebSocket, raw: string) => {
      const parsed = parseLanClientFrame(raw)
      if (!parsed.ok) { send(socket, { type: 'error', code: parsed.code }); return }
      const frame = parsed.value
      if (frame.type === 'join') {
        if (frame.room !== authority.roomCode || frame.credential !== roomCredential) { send(socket, { type: 'error', code: 'INVALID_CREDENTIAL' }); return }
        const joined = authority.join(frame.displayName)
        if (!joined.ok) { send(socket, { type: 'error', code: joined.code }); return }
        connections.set(socket, { playerId: joined.value.playerId, resumeToken: joined.value.resumeToken })
        send(socket, { type: 'joined', playerId: joined.value.playerId, resumeToken: joined.value.resumeToken })
        publish()
        return
      }
      if (frame.type === 'resume') {
        if (frame.room !== authority.roomCode) { send(socket, { type: 'error', code: 'INVALID_CREDENTIAL' }); return }
        const resumed = authority.reconnect(frame.playerId, frame.resumeToken)
        if (!resumed.ok) { send(socket, { type: 'error', code: resumed.code }); return }
        connections.set(socket, { playerId: frame.playerId, resumeToken: frame.resumeToken })
        send(socket, { type: 'joined', playerId: frame.playerId, resumeToken: frame.resumeToken })
        publish()
        return
      }
      const identity = connections.get(socket)
      if (!identity) { send(socket, { type: 'error', code: 'INVALID_CREDENTIAL' }); return }
      if (frame.type === 'heartbeat') return
      if (frame.type === 'ready') {
        const result = authority.setReady(identity.playerId, identity.resumeToken, frame.ready)
        if (!result.ok) { send(socket, { type: 'error', code: result.code }); return }
        publish()
        return
      }
      if (frame.type === 'action') {
        const result = authority.dispatch({ ...identity, actionId: frame.actionId, expectedSequence: frame.expectedSequence, action: frame.action })
        if (!result.ok) { send(socket, { type: 'error', code: result.code }); return }
        publish()
      }
    }

    server.on('connection', (socket) => {
      socket.on('message', (data) => processMessage(socket, data.toString('utf8')))
      socket.on('close', () => {
        const identity = connections.get(socket)
        connections.delete(socket)
        if (identity) { authority.disconnect(identity.playerId, identity.resumeToken); publish() }
      })
    })
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', () => resolve())
      server!.once('error', reject)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('test listener did not bind')
    const url = `ws://127.0.0.1:${address.port}`

    const attach = async (): Promise<TestClient> => {
      const socket = new WebSocket(url, { maxPayload: 64 * 1024 })
      const client: TestClient = { socket, messages: [] }
      socket.on('message', (raw) => {
        try { client.messages.push(JSON.parse(raw.toString('utf8')) as Record<string, unknown>) } catch { /* test protocol rejects invalid JSON */ }
      })
      await new Promise<void>((resolve, reject) => {
        socket.once('open', () => resolve())
        socket.once('error', reject)
      })
      return client
    }

    const waitFor = async (client: TestClient, predicate: (message: Record<string, unknown>) => boolean, startAt = 0) => {
      for (let attempt = 0; attempt < 300; attempt += 1) {
        const found = client.messages.slice(startAt).find(predicate)
        if (found) return found
        await delay(5)
      }
      throw new Error('timed out waiting for local WebSocket message')
    }

    const connectGuest = async (name: string, resume?: { playerId: string; resumeToken: string }): Promise<TestClient> => {
      const client = await attach()
      const startAt = client.messages.length
      client.socket.send(JSON.stringify(resume
        ? { type: 'resume', room: authority.roomCode, ...resume }
        : { type: 'join', version: 1, room: authority.roomCode, credential: roomCredential, displayName: name }))
      const joined = await waitFor(client, (message) => message.type === 'joined', startAt)
      client.playerId = joined.playerId as string
      client.resumeToken = joined.resumeToken as string
      await waitFor(client, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence?: number }).sequence) >= authority.snapshot(client.playerId!).sequence, startAt)
      return client
    }

    const guests = [await connectGuest('Player B'), await connectGuest('Player C'), await connectGuest('Player D')]
    expect(authority.snapshot(hostCredentials.playerId).members).toHaveLength(4)
    expect(JSON.stringify(guests[0]!.messages.at(-1))).not.toContain('resumeToken')

    // Exercise disconnect and room-scoped resume before the match begins.
    const reconnecting = guests[1]!
    const disconnectedAt = authority.snapshot(hostCredentials.playerId).sequence
    reconnecting.socket.close()
    await waitFor(guests[0]!, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) > disconnectedAt)
    const restored = await connectGuest('Player C', { playerId: reconnecting.playerId!, resumeToken: reconnecting.resumeToken! })
    guests[1] = restored

    authority.setReady(hostCredentials.playerId, hostCredentials.resumeToken, true)
    publish()
    for (const client of guests) {
      const beforeReady = authority.snapshot(client.playerId!).sequence
      const startAt = client.messages.length
      client.socket.send(JSON.stringify({ type: 'ready', ready: true }))
      const expectedSequence = beforeReady + 1
      await waitFor(client, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) >= expectedSequence, startAt)
    }
    expect(authority.start(hostCredentials.playerId, hostCredentials.resumeToken).ok).toBe(true)
    publish()
    expect(authority.snapshot(hostCredentials.playerId).status).toBe('in-progress')

    const players = [
      { playerId: hostCredentials.playerId, resumeToken: hostCredentials.resumeToken, client: null as TestClient | null },
      ...guests.map((client) => ({ playerId: client.playerId!, resumeToken: client.resumeToken!, client })),
    ]
    const act = async (playerId: string, action: LocalMatchAction, actionId: string) => {
      const player = players.find((entry) => entry.playerId === playerId)!
      const sequence = authority.snapshot(playerId).sequence
      if (!player.client) {
        const result = authority.dispatch({ playerId, resumeToken: player.resumeToken, actionId, expectedSequence: sequence, action })
        expect(result.ok).toBe(true)
        publish()
        return
      }
      const client = player.client
      const current = await waitFor(client, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) >= sequence)
      const snapshotSequence = Number((current.snapshot as { sequence: number }).sequence)
      const startAt = client.messages.length
      client.socket.send(JSON.stringify({ type: 'action', actionId, expectedSequence: snapshotSequence, action }))
      await waitFor(client, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) > snapshotSequence, startAt)
    }

    // Malformed frames and an out-of-turn wager must not change the host revision.
    const startingSequence = authority.snapshot(hostCredentials.playerId).sequence
    const nonActor = players.find((player) => player.client && player.playerId !== authority.snapshot(hostCredentials.playerId).state.currentActorId)!.client!
    let cursor = nonActor.messages.length
    nonActor.socket.send(JSON.stringify({ type: 'action', actionId: 'tiny', expectedSequence: startingSequence, action: { type: 'bet', action: { type: 'check' } } }))
    expect((await waitFor(nonActor, (message) => message.type === 'error', cursor)).code).toBe('INVALID_ACTION_ID')
    cursor = nonActor.messages.length
    nonActor.socket.send(JSON.stringify({ type: 'action', actionId: 'out_of_turn_001', expectedSequence: startingSequence, action: { type: 'bet', action: { type: 'check' } } }))
    expect((await waitFor(nonActor, (message) => message.type === 'error', cursor)).code).toBe('OUT_OF_TURN')
    expect(authority.snapshot(hostCredentials.playerId).sequence).toBe(startingSequence)

    await act(hostCredentials.playerId, { type: 'bet', action: { type: 'check' } }, 'host_first_check_001')
    const networkActor = authority.snapshot(hostCredentials.playerId).state.currentActorId!
    const actingClient = guests.find((client) => client.playerId === networkActor)!
    const beforeDuplicate = authority.snapshot(networkActor).sequence
    const duplicateFrame = { type: 'action', actionId: 'duplicate_wire_action_001', expectedSequence: beforeDuplicate, action: { type: 'bet', action: { type: 'check' } } }
    let frameCursor = actingClient.messages.length
    actingClient.socket.send(JSON.stringify(duplicateFrame))
    await waitFor(actingClient, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) > beforeDuplicate, frameCursor)
    frameCursor = actingClient.messages.length
    actingClient.socket.send(JSON.stringify(duplicateFrame))
    expect((await waitFor(actingClient, (message) => message.type === 'error', frameCursor)).code).toBe('DUPLICATE_ACTION')
    frameCursor = actingClient.messages.length
    actingClient.socket.send(JSON.stringify({ ...duplicateFrame, actionId: 'stale_wire_action_001' }))
    expect((await waitFor(actingClient, (message) => message.type === 'error', frameCursor)).code).toBe('STALE_SEQUENCE')

    let actionCounter = 0
    const nextId = (prefix: string) => `${prefix}_${String(++actionCounter).padStart(8, '0')}`
    const seen = new Set<string>()
    for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
      for (let guard = 0; guard < 20 && authority.snapshot(hostCredentials.playerId).state.phase === 'question-betting'; guard += 1) {
        const actor = authority.snapshot(hostCredentials.playerId).state.currentActorId!
        const actionId = nextId('check')
        await act(actor, { type: 'bet', action: { type: 'check' } }, actionId)
        if (!seen.has(actionId)) { seen.add(actionId) }
      }
      for (const player of players) await act(player.playerId, { type: 'hint-request' }, nextId('hint'))
      for (const player of players) await act(player.playerId, { type: 'guess', value: 100 + roundIndex }, nextId('guess'))
      for (let guard = 0; guard < 20 && authority.snapshot(hostCredentials.playerId).state.phase === 'final-betting'; guard += 1) {
        const actor = authority.snapshot(hostCredentials.playerId).state.currentActorId!
        await act(actor, { type: 'bet', action: { type: 'check' } }, nextId('final'))
      }
    }
    expect(authority.snapshot(hostCredentials.playerId).status).toBe('finished')
    const latestSequence = authority.snapshot(hostCredentials.playerId).sequence
    for (const client of guests) {
      await waitFor(client, (message) => message.type === 'snapshot' && Number((message.snapshot as { sequence: number }).sequence) >= latestSequence)
    }
    const publicBalances = guests.map((client) => (client.messages.filter((message) => message.type === 'snapshot').at(-1)!.snapshot as { state: { players: unknown[] } }).state.players)
    expect(publicBalances.every((balance) => JSON.stringify(balance) === JSON.stringify(publicBalances[0]))).toBe(true)
    expect(authority.snapshot(hostCredentials.playerId).state.results).toHaveLength(5)
    expect(authority.snapshot(hostCredentials.playerId).state.leaderboard).toHaveLength(4)
  }, 30_000)
})
