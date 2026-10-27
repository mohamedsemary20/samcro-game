import { afterAll, describe, expect, it, vi } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://samkaro:test@localhost:5432/samkaro_test')
delete process.env.TRUSTED_PROXY_CIDRS

const { app } = await import('../src/http/app.js')

describe('HTTP proxy trust', () => {
  afterAll(() => vi.unstubAllEnvs())

  it('does not trust forwarded headers unless proxy CIDRs are explicitly configured', () => {
    const trustsProxy = app.get('trust proxy fn') as (address: string, hopIndex: number) => boolean
    expect(trustsProxy('127.0.0.1', 0)).toBe(false)
  })

  it('keeps production at zero trusted hops when no exact CIDRs are configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TRUSTED_PROXY_CIDRS', '')
    vi.resetModules()
    const { app: productionApp } = await import('../src/http/app.js')
    const trustsProxy = productionApp.get('trust proxy fn') as (address: string, hopIndex: number) => boolean
    expect(trustsProxy('127.0.0.1', 0)).toBe(false)
  })
})
