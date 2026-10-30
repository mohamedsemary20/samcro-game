const CACHE_NAME = 'samkaro-static-v3'
const SHELL_URLS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-maskable-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon-32.png',
  '/assets/cairo.ttf',
  '/assets/tajawal.ttf',
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(SHELL_URLS)
    try {
      const response = await fetch('/', { cache: 'no-store' })
      if (response.ok) {
        const html = await response.text()
        const entryAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map((match) => match[1])
        await cache.addAll(entryAssets)
        const staticBundles = new Set(entryAssets)
        for (const asset of entryAssets.filter((path) => path.endsWith('.js'))) {
          const bundle = await cache.match(asset)
          if (!bundle) continue
          const source = await bundle.text()
          for (const match of source.matchAll(/["']((?:\.\/)?assets\/[^"']+\.(?:js|css|woff2?|ttf|png))["']/g)) {
            staticBundles.add(`/${match[1].replace(/^\.\//, '')}`)
          }
        }
        await cache.addAll([...staticBundles].filter((path) => !entryAssets.includes(path)))
      }
    } catch { /* The offline page remains available if build assets cannot be fetched. */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith('samkaro-static-') && name !== CACHE_NAME).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/socket.io/')) return
  if (request.headers.has('authorization')) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) return response
      } catch { /* Fall back to the branded offline page. */ }
      return (await caches.match('/offline.html')) || Response.error()
    })())
    return
  }

  const isCacheableStatic = url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest' || url.pathname === '/offline.html'
  if (!isCacheableStatic) return

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })())
})
