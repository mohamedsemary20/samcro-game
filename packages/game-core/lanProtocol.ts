import type { BetAction } from '../../shared/contracts.js'
import type { LocalMatchAction } from './localMatch.js'

export type LanClientFrame =
  | { type: 'join'; version: 1; room: string; credential: string; displayName: string }
  | { type: 'resume'; room: string; playerId: string; resumeToken: string }
  | { type: 'heartbeat' | 'sync' | 'start' }
  | { type: 'ready'; ready: boolean }
  | { type: 'action'; actionId: string; expectedSequence: number; action: LocalMatchAction }

export type LanFrameIssue = 'MESSAGE_TOO_LARGE' | 'MALFORMED_JSON' | 'INVALID_FRAME' | 'UNSUPPORTED_VERSION'
  | 'INVALID_ROOM' | 'INVALID_CREDENTIAL' | 'INVALID_NAME' | 'INVALID_ACTION_ID' | 'INVALID_SEQUENCE' | 'INVALID_ACTION'

const actionIdPattern = /^[A-Za-z0-9_-]{8,128}$/
const credentialPattern = /^[A-Za-z0-9_-]{16,128}$/
const roomPattern = /^[A-Za-z0-9]{4,12}$/

function validBetAction(value: unknown): value is BetAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const action = value as Record<string, unknown>
  if (action.type === 'check' || action.type === 'fold' || action.type === 'call' || action.type === 'all-in') return true
  return action.type === 'raise' && Number.isSafeInteger(action.amount) && (action.amount as number) > 0
}

function validAction(value: unknown): value is LocalMatchAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const action = value as Record<string, unknown>
  if (action.type === 'loan' || action.type === 'hint-request') return true
  if (action.type === 'guess') return Number.isSafeInteger(action.value) && (action.value as number) >= 0
  return action.type === 'bet' && validBetAction(action.action)
}

/** Parse the complete LAN wire envelope before it reaches the authority. */
export function parseLanClientFrame(raw: string): { ok: true; value: LanClientFrame } | { ok: false; code: LanFrameIssue } {
  if (raw.length > 64 * 1024) return { ok: false, code: 'MESSAGE_TOO_LARGE' }
  let value: unknown
  try { value = JSON.parse(raw) } catch { return { ok: false, code: 'MALFORMED_JSON' } }
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as { type?: unknown }).type !== 'string') return { ok: false, code: 'INVALID_FRAME' }
  const message = value as Record<string, unknown>
  if (message.type === 'join') {
    if (message.version !== 1) return { ok: false, code: 'UNSUPPORTED_VERSION' }
    if (typeof message.room !== 'string' || !roomPattern.test(message.room)) return { ok: false, code: 'INVALID_ROOM' }
    if (typeof message.credential !== 'string' || !credentialPattern.test(message.credential)) return { ok: false, code: 'INVALID_CREDENTIAL' }
    if (typeof message.displayName !== 'string' || !message.displayName.trim() || message.displayName.length > 40) return { ok: false, code: 'INVALID_NAME' }
    return { ok: true, value: { type: 'join', version: 1, room: message.room, credential: message.credential, displayName: message.displayName } }
  }
  if (message.type === 'resume') {
    if (typeof message.room !== 'string' || !roomPattern.test(message.room)) return { ok: false, code: 'INVALID_ROOM' }
    if (typeof message.playerId !== 'string' || !credentialPattern.test(message.playerId) || typeof message.resumeToken !== 'string' || !credentialPattern.test(message.resumeToken)) return { ok: false, code: 'INVALID_CREDENTIAL' }
    return { ok: true, value: { type: 'resume', room: message.room, playerId: message.playerId, resumeToken: message.resumeToken } }
  }
  if (message.type === 'heartbeat' || message.type === 'sync' || message.type === 'start') return { ok: true, value: { type: message.type } }
  if (message.type === 'ready') {
    if (typeof message.ready !== 'boolean') return { ok: false, code: 'INVALID_ACTION' }
    return { ok: true, value: { type: 'ready', ready: message.ready } }
  }
  if (message.type === 'action') {
    if (typeof message.actionId !== 'string' || !actionIdPattern.test(message.actionId)) return { ok: false, code: 'INVALID_ACTION_ID' }
    if (!Number.isSafeInteger(message.expectedSequence) || (message.expectedSequence as number) < 0) return { ok: false, code: 'INVALID_SEQUENCE' }
    if (!validAction(message.action)) return { ok: false, code: 'INVALID_ACTION' }
    return { ok: true, value: { type: 'action', actionId: message.actionId, expectedSequence: message.expectedSequence as number, action: message.action } }
  }
  return { ok: false, code: 'INVALID_FRAME' }
}
