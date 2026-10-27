import { afterEach, describe, expect, it, vi } from 'vitest'
import { proxyToSamkaroBackend } from '../../web/functions/_proxy.js'

describe('Cloudflare Pages backend proxy', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('preserves path, query, cookies, and WebSocket upgrade while targeting the configured HTTPS backend', async () => {
    const fetchMock = vi.fn(async (request: Request) => new Response(JSON.stringify({ url: request.url, cookie: request.headers.get('cookie'), upgrade: request.headers.get('upgrade') }), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const request = new Request('https://samcro-game.pages.dev/socket.io/?EIO=4&transport=websocket', {
      headers: { Cookie: 'samkaro_session=session', Upgrade: 'websocket', Origin: 'https://samcro-game.pages.dev' },
    })
    const response = await proxyToSamkaroBackend({ request, env: { SAMKARO_BACKEND_ORIGIN: 'https://curl-growing-giraffe.abasthan.app' } })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      url: 'https://curl-growing-giraffe.abasthan.app/socket.io/?EIO=4&transport=websocket',
      cookie: 'samkaro_session=session',
      upgrade: 'websocket',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('preserves API request bodies and refuses malformed or non-HTTPS backend origins', async () => {
    const fetchMock = vi.fn(async (request: Request) => new Response(await request.text(), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const request = new Request('https://samcro-game.pages.dev/api/v1/sessions/guest?x=1', { method: 'POST', body: '{"displayName":"test"}' })
    const response = await proxyToSamkaroBackend({ request, env: { SAMKARO_BACKEND_ORIGIN: 'https://curl-growing-giraffe.abasthan.app' } })
    expect(response.status).toBe(201)
    expect(await response.text()).toBe('{"displayName":"test"}')
    expect((await proxyToSamkaroBackend({ request, env: { SAMKARO_BACKEND_ORIGIN: 'http://untrusted.invalid' } })).status).toBe(503)
    expect((await proxyToSamkaroBackend({ request, env: {} })).status).toBe(503)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
