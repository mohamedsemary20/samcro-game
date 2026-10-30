import * as Crypto from 'expo-crypto'
import { LocalMatchAuthority, type LocalMatchSnapshot } from '@game-core/localMatch'
import type { LocalMatchAction } from '@game-core/localMatch'
import { parseLanClientFrame } from '@game-core/lanProtocol'
import { LanHost, type LanNativeEvent } from '../../modules/samkaro-lan/src'
import { makeLocalJoinUri, type LocalJoinPayload } from './joinPayload'
import { offlineQuestionPack } from './questionPack'

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CREDENTIAL_TTL_MS = 20 * 60_000

async function randomCredential(bytes = 24): Promise<string> {
  const values = await Crypto.getRandomBytesAsync(bytes)
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

function randomCredentialSync(bytes = 24): string {
  const values = Crypto.getRandomBytes(bytes)
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

function sameSecret(left: unknown, right: string): boolean {
  if (typeof left !== 'string' || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < right.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function randomRoomCode(): Promise<string> {
  const values = await Crypto.getRandomBytesAsync(6)
  return Array.from(values, (value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('')
}

type Connection = { playerId: string; resumeToken: string }
type HostListener = (snapshot: LocalMatchSnapshot) => void

export class LocalLanHost {
  private readonly connections = new Map<string, Connection>()
  private readonly listener: { remove(): void }
  private timer: ReturnType<typeof setInterval> | null = null
  private subscribers = new Set<HostListener>()
  private stopped = false
  private constructor(
    readonly authority: LocalMatchAuthority,
    readonly hostCredentials: Connection,
    readonly addresses: string[],
    readonly port: number,
    readonly joinCredential: string,
    readonly expiresAt: number,
    eventListener: { remove(): void },
  ) { this.listener = eventListener }

  static async create(displayName: string): Promise<LocalLanHost> {
    const native = await LanHost.start(0)
    let complete = false
    let eventListener: { remove(): void } | null = null
    try {
      const addresses = native.addresses.filter(Boolean)
      if (!addresses.length) throw new Error('LOCAL_ADDRESS_UNAVAILABLE')
      const hostCredentials = { playerId: await randomCredential(), resumeToken: await randomCredential() }
      const roomCode = await randomRoomCode()
      const authority = new LocalMatchAuthority({
        roomCode,
        roomId: await randomCredential(),
        host: { ...hostCredentials, displayName },
        questions: offlineQuestionPack.questions,
        createCredential: () => randomCredentialSync(),
      })
      const credential = await randomCredential()
      const expiresAt = Date.now() + ROOM_CREDENTIAL_TTL_MS
      let host!: LocalLanHost
      eventListener = LanHost.addListener((event) => { void host.handleEvent(event) })
      host = new LocalLanHost(authority, hostCredentials, addresses, native.port, credential, expiresAt, eventListener)
      host.timer = setInterval(() => {
        if (authority.tick()) host.publish()
      }, 500)
      complete = true
      return host
    } finally {
      if (!complete) {
        eventListener?.remove()
        await LanHost.stop().catch(() => undefined)
      }
    }
  }

  get joinUris(): Array<{ address: string; uri: string }> {
    return this.addresses.map((address) => ({ address, uri: makeLocalJoinUri({
      version: 1, host: address, port: this.port, room: this.authority.roomCode,
      credential: this.joinCredential, expiresAt: this.expiresAt,
    }) }))
  }

  get snapshot(): LocalMatchSnapshot { return this.authority.snapshot(this.hostCredentials.playerId) }
  get canStart(): boolean { return offlineQuestionPack.valid && this.snapshot.members.length >= this.authority.minimumPlayers && this.snapshot.members.every((member) => member.isReady && member.isConnected) }

  subscribe(listener: HostListener): () => void {
    this.subscribers.add(listener)
    listener(this.snapshot)
    return () => this.subscribers.delete(listener)
  }

  setHostReady(ready: boolean): void {
    const result = this.authority.setReady(this.hostCredentials.playerId, this.hostCredentials.resumeToken, ready)
    if (result.ok) this.publish()
  }

  async removePlayer(playerId: string): Promise<{ ok: boolean; code?: string }> {
    const result = this.authority.removePlayer(this.hostCredentials.playerId, this.hostCredentials.resumeToken, playerId)
    if (!result.ok) return { ok: false, code: result.code }
    for (const [clientId, connection] of this.connections) {
      if (connection.playerId !== playerId) continue
      this.connections.delete(clientId)
      await LanHost.send(clientId, JSON.stringify({ type: 'kicked' })).catch(() => undefined)
      await LanHost.closeClient(clientId).catch(() => undefined)
    }
    this.publish()
    return { ok: true }
  }

  startMatch(): { ok: boolean; code?: string } {
    if (!offlineQuestionPack.valid) return { ok: false, code: 'QUESTION_BANK_INCOMPLETE' }
    const result = this.authority.start(this.hostCredentials.playerId, this.hostCredentials.resumeToken)
    if (!result.ok) return { ok: false, code: result.code }
    this.publish()
    return { ok: true }
  }

  dispatchHost(action: LocalMatchAction): { ok: boolean; code?: string } {
    const result = this.authority.dispatch({ playerId: this.hostCredentials.playerId, resumeToken: this.hostCredentials.resumeToken,
      actionId: `host_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      expectedSequence: this.authority.snapshot(this.hostCredentials.playerId).sequence, action })
    if (result.ok) this.publish()
    return result.ok ? { ok: true } : { ok: false, code: result.code }
  }

  async stop(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    this.authority.close(this.hostCredentials.playerId, this.hostCredentials.resumeToken)
    for (const [clientId] of this.connections) await LanHost.send(clientId, JSON.stringify({ type: 'closed' })).catch(() => undefined)
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.listener.remove()
    this.subscribers.clear()
    this.connections.clear()
    await LanHost.stop()
  }

  private async handleEvent(event: LanNativeEvent): Promise<void> {
    if (this.stopped) return
    if (event.type === 'disconnected') {
      const connection = this.connections.get(event.clientId)
      this.connections.delete(event.clientId)
      if (connection) {
        this.authority.disconnect(connection.playerId, connection.resumeToken)
        this.publish()
      }
      return
    }
    if (event.type !== 'message') return
    const parsed = parseLanClientFrame(event.data)
    if (!parsed.ok) { await this.sendError(event.clientId, parsed.code); return }
    const message = parsed.value
    if (message.type === 'join') {
      if (message.version !== 1 || message.room !== this.authority.roomCode || !sameSecret(message.credential, this.joinCredential) || Date.now() >= this.expiresAt || typeof message.displayName !== 'string') {
        await this.sendError(event.clientId, 'INVALID_CREDENTIAL')
        return
      }
      const result = this.authority.join(message.displayName)
      if (!result.ok) { await this.sendError(event.clientId, result.code); return }
      this.connections.set(event.clientId, { playerId: result.value.playerId, resumeToken: result.value.resumeToken })
      await LanHost.send(event.clientId, JSON.stringify({ type: 'joined', playerId: result.value.playerId, resumeToken: result.value.resumeToken }))
      await this.sendSnapshot(event.clientId, result.value.playerId)
      this.publish()
      return
    }
    if (message.type === 'resume') {
      if (message.room !== this.authority.roomCode || typeof message.playerId !== 'string' || typeof message.resumeToken !== 'string') {
        await this.sendError(event.clientId, 'INVALID_CREDENTIAL')
        return
      }
      const result = this.authority.reconnect(message.playerId, message.resumeToken)
      if (!result.ok) { await this.sendError(event.clientId, result.code); return }
      for (const [existingClientId, existing] of this.connections) {
        if (existing.playerId !== message.playerId) continue
        this.connections.delete(existingClientId)
        await LanHost.closeClient(existingClientId).catch(() => undefined)
      }
      const connection = { playerId: message.playerId, resumeToken: message.resumeToken }
      this.connections.set(event.clientId, connection)
      await LanHost.send(event.clientId, JSON.stringify({ type: 'joined', ...connection }))
      await this.sendSnapshot(event.clientId, message.playerId)
      this.publish()
      return
    }
    const connection = this.connections.get(event.clientId)
    if (!connection) { await this.sendError(event.clientId, 'INVALID_CREDENTIAL'); return }
    if (message.type === 'heartbeat') {
      if (!this.authority.heartbeat(connection.playerId, connection.resumeToken)) await this.sendError(event.clientId, 'INVALID_CREDENTIAL')
      return
    }
    if (message.type === 'ready') {
      const result = this.authority.setReady(connection.playerId, connection.resumeToken, message.ready)
      if (!result.ok) { await this.sendError(event.clientId, result.code); return }
      this.publish(); return
    }
    if (message.type === 'start') {
      if (connection.playerId !== this.hostCredentials.playerId) { await this.sendError(event.clientId, 'HOST_ONLY'); return }
      const result = this.startMatch()
      if (!result.ok) await this.sendError(event.clientId, result.code ?? 'ROOM_NOT_READY')
      return
    }
    if (message.type === 'sync') { await this.sendSnapshot(event.clientId, connection.playerId); return }
    if (message.type === 'action') {
      const result = this.authority.dispatch({ playerId: connection.playerId, resumeToken: connection.resumeToken, actionId: message.actionId,
        expectedSequence: message.expectedSequence, action: message.action })
      if (!result.ok) { await this.sendError(event.clientId, result.code); return }
      this.publish()
    }
  }

  private async sendError(clientId: string, code: string): Promise<void> {
    await LanHost.send(clientId, JSON.stringify({ type: 'error', code })).catch(() => undefined)
  }

  private async sendSnapshot(clientId: string, playerId: string): Promise<void> {
    try { await LanHost.send(clientId, JSON.stringify({ type: 'snapshot', snapshot: this.authority.snapshot(playerId) })) } catch { /* disconnected */ }
  }

  private publish(): void {
    for (const subscriber of this.subscribers) subscriber(this.snapshot)
    for (const [clientId, connection] of this.connections) void this.sendSnapshot(clientId, connection.playerId)
  }
}
