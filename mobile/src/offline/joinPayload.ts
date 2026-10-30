export interface LocalJoinPayload {
  version: 1
  host: string
  port: number
  room: string
  credential: string
  expiresAt: number
}

export type JoinPayloadError = 'INVALID_QR' | 'UNSUPPORTED_VERSION' | 'INVALID_ADDRESS' | 'INVALID_PORT'
  | 'INVALID_ROOM' | 'INVALID_CREDENTIAL' | 'EXPIRED_ROOM' | 'ROOM_CREDENTIAL_EXPIRED'

function validIPv4(host: string): boolean {
  const parts = host.split('.')
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
}

export function parseLocalJoinPayload(value: string, now = Date.now()): { ok: true; value: LocalJoinPayload } | { ok: false; code: JoinPayloadError } {
  let raw: Record<string, unknown>
  try {
    const uri = new URL(value)
    if (uri.protocol !== 'samkaro-lan:' || uri.hostname !== 'join') return { ok: false, code: 'INVALID_QR' }
    raw = Object.fromEntries(uri.searchParams.entries())
    raw.version = Number(raw.version)
    raw.port = Number(raw.port)
    raw.expiresAt = Number(raw.expiresAt)
  } catch {
    return { ok: false, code: 'INVALID_QR' }
  }
  if (raw.version !== 1) return { ok: false, code: 'UNSUPPORTED_VERSION' }
  if (typeof raw.host !== 'string' || !validIPv4(raw.host)) return { ok: false, code: 'INVALID_ADDRESS' }
  if (!Number.isInteger(raw.port) || (raw.port as number) < 1 || (raw.port as number) > 65535) return { ok: false, code: 'INVALID_PORT' }
  if (typeof raw.room !== 'string' || !/^[A-Za-z0-9]{4,12}$/.test(raw.room)) return { ok: false, code: 'INVALID_ROOM' }
  if (typeof raw.credential !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(raw.credential)) return { ok: false, code: 'INVALID_CREDENTIAL' }
  if (!Number.isSafeInteger(raw.expiresAt) || (raw.expiresAt as number) <= now) return { ok: false, code: 'EXPIRED_ROOM' }
  if ((raw.expiresAt as number) > now + 30 * 60_000) return { ok: false, code: 'ROOM_CREDENTIAL_EXPIRED' }
  return { ok: true, value: raw as unknown as LocalJoinPayload }
}

export function makeLocalJoinUri(payload: LocalJoinPayload): string {
  const query = new URLSearchParams({
    version: String(payload.version), host: payload.host, port: String(payload.port), room: payload.room,
    credential: payload.credential, expiresAt: String(payload.expiresAt),
  })
  return `samkaro-lan://join?${query.toString()}`
}
