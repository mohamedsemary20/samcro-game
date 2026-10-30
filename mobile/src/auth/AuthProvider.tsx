import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { api, MobileApiError, SESSION_TOKEN_KEY } from '@/api/client'

interface AuthContextValue {
  player: { id: string; name: string } | null
  loading: boolean
  error: string | null
  signInAsGuest(displayName: string): Promise<void>
  refresh(): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [player, setPlayer] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY)
    if (!token) {
      setPlayer(null)
      setLoading(false)
      return
    }
    try {
      setPlayer(await api.getCurrentPlayer())
      setError(null)
    } catch (cause) {
      if (cause instanceof MobileApiError && (cause.status === 401 || cause.status === 403)) {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY)
        setPlayer(null)
      } else {
        setError(cause instanceof Error ? cause.message : 'تعذر الاتصال بالخادم.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const signInAsGuest = useCallback(async (displayName: string) => {
    setError(null)
    const session = await api.createGuestSession(displayName.trim())
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.sessionToken)
    setPlayer(session.player)
  }, [])

  const signOut = useCallback(async () => {
    try { await api.logout() } finally {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY)
      setPlayer(null)
    }
  }, [])

  const value = useMemo(() => ({ player, loading, error, signInAsGuest, refresh, signOut }), [player, loading, error, signInAsGuest, refresh, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
