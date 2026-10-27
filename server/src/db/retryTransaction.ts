const RETRYABLE_DATABASE_CODES = new Set(['P2034', '40001', '40P01'])

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { code?: unknown; meta?: { code?: unknown; message?: unknown } }
  if (typeof candidate.code === 'string' && RETRYABLE_DATABASE_CODES.has(candidate.code)) return candidate.code
  if (candidate.code === 'P2010' && typeof candidate.meta?.code === 'string' && RETRYABLE_DATABASE_CODES.has(candidate.meta.code)) return candidate.meta.code
  if (typeof candidate.meta?.message === 'string') {
    const match = candidate.meta.message.match(/\b(40001|40P01)\b/u)
    if (match) return match[1]
  }
  return undefined
}

/** Retry only transactions whose complete operation is safe to replay. */
export async function retryDatabaseTransaction<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!databaseErrorCode(error) || attempt + 1 >= maxAttempts) throw error
      const backoffMs = 20 * (attempt + 1) + Math.floor(Math.random() * 30)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }
}
