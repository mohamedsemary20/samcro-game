import * as SecureStore from 'expo-secure-store'
import type {
  ApiError,
  LeaderboardEntry,
  NativeGuestSessionResponse,
  PrivatePlayerState,
  PublicGameState,
  Room,
  RoomDetails,
} from '../../../shared/contracts'

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '')
export const SESSION_TOKEN_KEY = 'samkaro.native.session-token'

export class MobileApiError extends Error {
  constructor(readonly status: number, readonly details: ApiError) {
    super(details.message)
    this.name = 'MobileApiError'
  }
}

export class MobileApiClient {
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!apiBaseUrl) throw new Error('Set EXPO_PUBLIC_API_BASE_URL before using online play.')
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY)
    const headers = new Headers(init.headers)
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'omit' })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: Partial<ApiError> } | null
      throw new MobileApiError(response.status, {
        code: body?.error?.code ?? 'HTTP_ERROR',
        message: body?.error?.message ?? `Request failed (${response.status}).`,
        ...(body?.error?.requestId ? { requestId: body.error.requestId } : {}),
      })
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  }

  async createGuestSession(displayName: string): Promise<NativeGuestSessionResponse> {
    return this.request('/sessions/native', { method: 'POST', body: JSON.stringify({ displayName }) })
  }

  async getCurrentPlayer(): Promise<{ id: string; name: string }> {
    return (await this.request<{ player: { id: string; name: string } }>('/sessions/me')).player
  }

  async createRoom(capacity: number, idempotencyKey: string): Promise<Room> {
    return (await this.request<{ room: Room }>('/rooms', {
      method: 'POST', body: JSON.stringify({ capacity, idempotencyKey }),
    })).room
  }

  async joinRoom(code: string): Promise<Room> {
    return (await this.request<{ room: Room }>('/rooms/join', {
      method: 'POST', body: JSON.stringify({ code }),
    })).room
  }

  getRoom(roomId: string): Promise<RoomDetails> {
    return this.request(`/rooms/${encodeURIComponent(roomId)}`)
  }

  async getPublicGameState(roomId: string): Promise<PublicGameState> {
    return (await this.request<{ state: PublicGameState }>(`/rooms/${encodeURIComponent(roomId)}/game`)).state
  }

  async getPrivatePlayerState(): Promise<PrivatePlayerState> {
    return (await this.request<{ state: PrivatePlayerState }>('/sessions/me/private-state')).state
  }

  async getMatchHistory(): Promise<Array<{ id: string; roomCode: string; finishedAt: string | null; rank: number | null; netScore: number | null }>> {
    return (await this.request<{ matches: Array<{ id: string; roomCode: string; finishedAt: string | null; rank: number | null; netScore: number | null }> }>('/matches/history')).matches
  }

  async getLeaderboard(matchId: string): Promise<LeaderboardEntry[]> {
    return (await this.request<{ entries: LeaderboardEntry[] }>(`/matches/${encodeURIComponent(matchId)}/leaderboard`)).entries
  }

  logout(): Promise<void> {
    return this.request('/sessions/me', { method: 'DELETE' })
  }
}

export const api = new MobileApiClient()
export const configuredApiBaseUrl = apiBaseUrl
