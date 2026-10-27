interface ProxyContext {
  request: Request
  env: { SAMKARO_BACKEND_ORIGIN?: string }
}

export async function proxyToSamkaroBackend({ request, env }: ProxyContext): Promise<Response> {
  const configuredOrigin = env.SAMKARO_BACKEND_ORIGIN
  if (!configuredOrigin) return new Response('Game service is not configured.', { status: 503 })

  let backend: URL
  try {
    backend = new URL(configuredOrigin)
  } catch {
    return new Response('Game service is not configured.', { status: 503 })
  }
  if (backend.protocol !== 'https:' || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) {
    return new Response('Game service is not configured.', { status: 503 })
  }

  const target = new URL(request.url)
  target.protocol = backend.protocol
  target.host = backend.host
  const upstream = new Request(target, request)
  // The original Cookie and Upgrade headers remain on the request for
  // session and WebSocket proxying.
  return fetch(upstream)
}
