import { describe, expect, it } from 'vitest'
import { resolveSessionToken } from '../src/auth/sessionToken.js'

describe('session credential resolution', () => {
  const cookieName = 'samkaro_session'

  it('accepts the existing browser cookie contract', () => {
    expect(resolveSessionToken({ cookieHeader: 'other=x; samkaro_session=abc_123', cookieName })).toBe('abc_123')
  })

  it('accepts bearer credentials for native REST requests', () => {
    expect(resolveSessionToken({ authorization: 'Bearer native_123', cookieName })).toBe('native_123')
  })

  it('accepts bearer credentials on native Socket.IO handshakes', () => {
    expect(resolveSessionToken({ nativeToken: 'socket_123', cookieName })).toBe('socket_123')
  })

  it('prefers an explicit native credential and rejects malformed values', () => {
    expect(resolveSessionToken({
      authorization: 'Bearer bearer_123',
      cookieHeader: 'samkaro_session=cookie_123',
      cookieName,
      nativeToken: 'socket_123',
    })).toBe('socket_123')
    expect(resolveSessionToken({ authorization: 'Bearer invalid.token', cookieName })).toBeNull()
    expect(resolveSessionToken({ nativeToken: 17, cookieName })).toBeNull()
  })
})
