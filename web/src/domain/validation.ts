import type { BetAction } from './types'

export const MAX_GUESS_LENGTH = 12

export function validateGuess(raw: string): { value?: number; error?: string } {
  const normalized = raw.trim()
  if (!/^\d+$/.test(normalized) || normalized.length > MAX_GUESS_LENGTH) {
    return { error: 'أدخل رقمًا صحيحًا حتى ١٢ خانة.' }
  }
  const value = Number(normalized)
  if (!Number.isSafeInteger(value)) return { error: 'الرقم أكبر من المسموح به.' }
  return { value }
}

/** Frontend feedback only; the server repeats all validation authoritatively. */
export function validateBet(action: BetAction, availableChips: number): string | null {
  if (action.type === 'raise' && (!Number.isSafeInteger(action.amount) || action.amount <= 0)) {
    return 'يجب أن تكون قيمة الزيادة أكبر من صفر.'
  }
  if (availableChips < 0) return 'الرصيد غير صالح.'
  return null
}
