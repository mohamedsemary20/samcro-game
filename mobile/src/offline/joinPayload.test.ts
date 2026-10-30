import { makeLocalJoinUri, parseLocalJoinPayload } from './joinPayload'

describe('local room QR contract', () => {
  const payload = { version: 1 as const, host: '192.168.1.25', port: 8081, room: 'AB23CD', credential: 'a'.repeat(48), expiresAt: 1_700_000_001_000 }

  it('round trips a versioned short-lived room credential without cloud tokens', () => {
    const uri = makeLocalJoinUri(payload)
    expect(uri).toMatch(/^samkaro-lan:\/\/join\?/)
    expect(parseLocalJoinPayload(uri, 1_700_000_000_000)).toEqual({ ok: true, value: payload })
    expect(uri).not.toContain('sessionToken')
  })

  it('rejects invalid, expired, unsupported, and non-IPv4 payloads', () => {
    const uri = makeLocalJoinUri(payload)
    expect(parseLocalJoinPayload(uri, payload.expiresAt)).toEqual({ ok: false, code: 'EXPIRED_ROOM' })
    expect(parseLocalJoinPayload(uri.replace('version=1', 'version=2'), 1_700_000_000_000)).toEqual({ ok: false, code: 'UNSUPPORTED_VERSION' })
    expect(parseLocalJoinPayload(uri.replace('192.168.1.25', 'localhost'), 1_700_000_000_000)).toEqual({ ok: false, code: 'INVALID_ADDRESS' })
    expect(parseLocalJoinPayload('https://example.com', 1_700_000_000_000)).toEqual({ ok: false, code: 'INVALID_QR' })
  })
})
