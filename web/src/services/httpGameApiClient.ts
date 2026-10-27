import type { GuestSessionResponse, PrivatePlayerState, PublicGameState, Room, RoomDetails } from '../domain/types'
import { GameApiError, type GameApiClient } from './contracts'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '')

export class HttpGameApiClient implements GameApiClient {
  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal,
      credentials: 'include',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string; requestId?: string } } | null
      throw new GameApiError(response.status, {
        code: payload?.error?.code ?? 'HTTP_ERROR',
        message: payload?.error?.message ?? `Request failed (${response.status}).`,
        ...(payload?.error?.requestId ? { requestId: payload.error.requestId } : {}),
      })
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  }

  async getCurrentPlayer(signal?: AbortSignal): Promise<{ id: string; name: string }> {
    const result = await this.request<{ player: { id: string; name: string } }>('/sessions/me', {}, signal)
    return result.player
  }

  async createGuestSession(displayName: string): Promise<GuestSessionResponse['player']> {
    const result = await this.request<GuestSessionResponse>('/sessions/guest', { method: 'POST', body: JSON.stringify({ displayName }) })
    return result.player
  }

  async createRoom(capacity = 7, idempotencyKey: string = crypto.randomUUID()): Promise<Room> {
    const result = await this.request<{ room: Room }>('/rooms', {
      method: 'POST', body: JSON.stringify({ capacity, idempotencyKey }),
    })
    return result.room
  }

  async joinRoom(code: string): Promise<Room> {
    const result = await this.request<{ room: Room }>('/rooms/join', { method: 'POST', body: JSON.stringify({ code }) })
    return result.room
  }

  getRoom(roomId: string, signal?: AbortSignal): Promise<RoomDetails> {
    return this.request(`/rooms/${encodeURIComponent(roomId)}`, {}, signal)
  }

  getPublicGameState(roomId: string, signal?: AbortSignal): Promise<PublicGameState> {
    return this.request<{ state: PublicGameState }>(`/rooms/${encodeURIComponent(roomId)}/game`, {}, signal).then((result) => result.state)
  }

  getPrivatePlayerState(signal?: AbortSignal): Promise<PrivatePlayerState> {
    return this.request<{ state: PrivatePlayerState }>('/sessions/me/private-state', {}, signal).then((result) => result.state)
  }

  getMatchHistory(signal?: AbortSignal): Promise<Array<{ id: string; roomCode: string; finishedAt: string | null }>> {
    return this.request<{ matches: Array<{ id: string; roomCode: string; finishedAt: string | null }> }>('/matches/history', {}, signal)
      .then((result) => result.matches)
  }

  getMatchLeaderboard(matchId: string, signal?: AbortSignal): Promise<import('../domain/types').LeaderboardEntry[]> {
    return this.request<{ entries: import('../domain/types').LeaderboardEntry[] }>(`/matches/${encodeURIComponent(matchId)}/leaderboard`, {}, signal)
      .then((result) => result.entries)
  }

  async logout(): Promise<void> { await this.request('/sessions/me', { method: 'DELETE' }) }
}

export const gameApi = new HttpGameApiClient()
