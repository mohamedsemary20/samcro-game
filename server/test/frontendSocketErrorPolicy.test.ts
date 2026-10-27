import { describe, expect, it } from 'vitest'
import { isDefinitiveRoomRestoreFailure, isSocketTransportFailure, isUncertainActionOutcome, RetryableActionKey, socketErrorMessage } from '../../web/src/services/socketErrorPolicy.js'

describe('frontend socket error policy', () => {
  it('keeps expected action rejections on the connected room screen', () => {
    expect(isSocketTransportFailure('QUESTION_BANK_INCOMPLETE')).toBe(false)
    expect(socketErrorMessage({ code: 'QUESTION_BANK_INCOMPLETE', message: 'Five active questions required.' }))
      .toContain(String.fromCodePoint(0x0623, 0x0633, 0x0626, 0x0644, 0x0629))
  })

  it('marks actual transport and session failures as connection failures', () => {
    expect(isSocketTransportFailure('SOCKET_CONNECTION')).toBe(true)
    expect(isSocketTransportFailure('SOCKET_DISCONNECTED')).toBe(true)
    expect(isSocketTransportFailure('SESSION_EXPIRED')).toBe(true)
  })

  it('classifies lost acknowledgements as uncertain and reuses one key for a retry', () => {
    let keyNumber = 0
    const keys = new RetryableActionKey(() => `key-${++keyNumber}`)
    expect(isUncertainActionOutcome('ACK_TIMEOUT')).toBe(true)
    expect(isUncertainActionOutcome('SOCKET_DISCONNECTED')).toBe(true)
    expect(isUncertainActionOutcome('OUT_OF_TURN')).toBe(false)
    expect(keys.forFingerprint('match:round:guess:12')).toBe('key-1')
    expect(keys.forFingerprint('match:round:guess:12')).toBe('key-1')
    expect(keys.forFingerprint('match:round:guess:13')).toBe('key-2')
    keys.clear()
    expect(keys.forFingerprint('match:round:guess:13')).toBe('key-3')
  })

  it('keeps saved room membership through transient restore failures', () => {
    expect(isDefinitiveRoomRestoreFailure({ code: 'HTTP_ERROR', status: 503 })).toBe(false)
    expect(isDefinitiveRoomRestoreFailure({ code: 'ROOM_NOT_FOUND', status: 404 })).toBe(true)
    expect(isDefinitiveRoomRestoreFailure({ code: 'ROOM_MEMBERSHIP_REQUIRED', status: 403 })).toBe(true)
  })
})
