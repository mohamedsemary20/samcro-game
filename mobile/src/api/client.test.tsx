import { Button, Text } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import * as SecureStore from 'expo-secure-store'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { api, MobileApiClient, SESSION_TOKEN_KEY } from './client'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}))

const store = SecureStore as jest.Mocked<typeof SecureStore>
const fetchMock = jest.fn()

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function AuthProbe() {
  const auth = useAuth()
  return <>
    <Text>{auth.player?.name ?? 'signed-out'}</Text>
    <Button title="sign-in" onPress={() => void auth.signInAsGuest('Nour')} />
  </>
}

describe('mobile online API contracts', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    store.getItemAsync.mockReset().mockResolvedValue(null)
    store.setItemAsync.mockReset().mockResolvedValue(undefined)
    store.deleteItemAsync.mockReset().mockResolvedValue(undefined)
  })

  it('creates a native guest session, stores its bearer token, and restores player identity', async () => {
    fetchMock.mockResolvedValueOnce(response({ player: { id: 'p-1', name: 'Nour' }, expiresAt: '2030-01-01T00:00:00.000Z', sessionToken: 'native-secret' }))
    const tree = await render(<AuthProvider><AuthProbe /></AuthProvider>)
    await fireEvent.press(screen.getByRole('button', { name: 'sign-in' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('Nour')).toBeTruthy(), { timeout: 10_000 })
    expect(store.setItemAsync).toHaveBeenCalledWith(SESSION_TOKEN_KEY, 'native-secret')
    expect(fetchMock).toHaveBeenCalledWith('https://samkaro.test/api/v1/sessions/native', expect.objectContaining({
      method: 'POST', credentials: 'omit', body: JSON.stringify({ displayName: 'Nour' }),
    }))
    await tree.unmount()
  })

  it('sends the saved native bearer token to the existing authenticated session endpoint', async () => {
    store.getItemAsync.mockResolvedValue('native-secret')
    fetchMock.mockResolvedValueOnce(response({ player: { id: 'p-1', name: 'Nour' } }))
    await api.getCurrentPlayer()
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(fetchMock.mock.calls[0]![0]).toBe('https://samkaro.test/api/v1/sessions/me')
    expect(init.credentials).toBe('omit')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer native-secret')
  })

  it('creates and joins online rooms using the existing REST payloads', async () => {
    const room = { id: 'room-1', code: 'AB12CD34', hostPlayerId: 'p-1', playerIds: ['p-1'], status: 'waiting' }
    store.getItemAsync.mockResolvedValue('native-secret')
    fetchMock.mockResolvedValueOnce(response({ room })).mockResolvedValueOnce(response({ room }))
    await expect(api.createRoom(7, 'idempotency-key-1')).resolves.toEqual(room)
    await expect(api.joinRoom('AB12CD34')).resolves.toEqual(room)
    expect(fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(String((init as RequestInit).body))])).toEqual([
      ['https://samkaro.test/api/v1/rooms', { capacity: 7, idempotencyKey: 'idempotency-key-1' }],
      ['https://samkaro.test/api/v1/rooms/join', { code: 'AB12CD34' }],
    ])
  })

  it('returns the existing leaderboard response for the match results view', async () => {
    store.getItemAsync.mockResolvedValue('native-secret')
    const entries = [{ playerId: 'p-1', displayName: 'Nour', score: 400, rank: 1 }]
    fetchMock.mockResolvedValueOnce(response({ entries }))
    await expect(api.getLeaderboard('match-1')).resolves.toEqual(entries)
    expect(fetchMock).toHaveBeenCalledWith('https://samkaro.test/api/v1/matches/match-1/leaderboard', expect.any(Object))
  })
})
