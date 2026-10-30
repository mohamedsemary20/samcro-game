import type { LocalMatchSnapshot } from '@game-core/localMatch'
import type { LocalLanHost } from './host'
import type { LanConnectionState, LocalRoomClient } from './client'

export interface OfflineRuntimeState {
  host: LocalLanHost | null
  client: LocalRoomClient | null
  playerId: string | null
  snapshot: LocalMatchSnapshot | null
  connection: LanConnectionState
  error: string | null
}

let state: OfflineRuntimeState = { host: null, client: null, playerId: null, snapshot: null, connection: 'disconnected', error: null }
const subscribers = new Set<(value: OfflineRuntimeState) => void>()

export function getOfflineRuntime(): OfflineRuntimeState { return state }

export function subscribeOfflineRuntime(subscriber: (value: OfflineRuntimeState) => void): () => void {
  subscribers.add(subscriber)
  subscriber(state)
  return () => subscribers.delete(subscriber)
}

export function setOfflineRuntime(next: Partial<OfflineRuntimeState>): void {
  state = { ...state, ...next }
  for (const subscriber of subscribers) subscriber(state)
}

export function clearOfflineRuntime(): void {
  state = { host: null, client: null, playerId: null, snapshot: null, connection: 'disconnected', error: null }
  for (const subscriber of subscribers) subscriber(state)
}
