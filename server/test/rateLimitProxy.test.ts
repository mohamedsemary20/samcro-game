import { createServer } from 'node:http'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { afterEach, afterAll, describe, expect, it, vi } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://samkaro:test@127.0.0.1:5432/samkaro_test')
vi.stubEnv('TRUSTED_PROXY_CIDRS', 'loopback')
const { env } = await import('../src/config/env.js')

describe('rate limiting behind the configured trusted proxy', () => {
  let server: ReturnType<typeof createServer> | undefined

  afterEach(async () => {
    if (!server?.listening) return
    await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
  })

  afterAll(() => vi.unstubAllEnvs())

  it('uses the client address from the trusted forwarded chain without disabling limits', async () => {
    const app = express()
    app.set('trust proxy', env.trustedProxyCidrs)
    app.get('/limited', rateLimit({ windowMs: 60_000, limit: 1, standardHeaders: false, legacyHeaders: false }), (request, response) => {
      response.json({ ip: request.ip })
    })
    server = createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port.')
    const origin = `http://127.0.0.1:${address.port}`

    const first = await fetch(`${origin}/limited`, { headers: { 'x-forwarded-for': '203.0.113.9, 198.51.100.10' } })
    const duplicate = await fetch(`${origin}/limited`, { headers: { 'x-forwarded-for': '192.0.2.7, 198.51.100.10' } })
    const otherClient = await fetch(`${origin}/limited`, { headers: { 'x-forwarded-for': '198.51.100.11' } })

    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toMatchObject({ ip: '198.51.100.10' })
    expect(duplicate.status).toBe(429)
    expect(otherClient.status).toBe(200)
    expect(app.get('trust proxy fn')('198.51.100.10', 0)).toBe(false)
    expect(app.get('trust proxy fn')('10.0.0.2', 0)).toBe(false)
  })
})
