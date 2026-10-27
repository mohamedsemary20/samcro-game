import { describe, expect, it, vi } from 'vitest'
import { retryDatabaseTransaction } from '../src/db/retryTransaction.js'

describe('retryDatabaseTransaction', () => {
  it('replays a rolled back transaction after serialization failure', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValue('committed')

    await expect(retryDatabaseTransaction(operation)).resolves.toBe('committed')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('retries a PostgreSQL deadlock and stops at the attempt limit', async () => {
    const operation = vi.fn().mockRejectedValue({ code: 'P2010', meta: { code: '40P01' } })

    await expect(retryDatabaseTransaction(operation, 2)).rejects.toMatchObject({ code: 'P2010' })
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('does not replay errors whose commit outcome may be ambiguous', async () => {
    const operation = vi.fn().mockRejectedValue({ code: 'P2028' })

    await expect(retryDatabaseTransaction(operation)).rejects.toMatchObject({ code: 'P2028' })
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
