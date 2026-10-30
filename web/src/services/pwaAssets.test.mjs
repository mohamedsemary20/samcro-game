import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const publicDir = new URL('../../public/', import.meta.url)
const manifestUrl = new URL('manifest.webmanifest', publicDir)

function readPngSize(buffer) {
  const signature = '89504e470d0a1a0a'
  assert.equal(buffer.subarray(0, 8).toString('hex'), signature, 'expected a valid PNG signature')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('manifest exposes installable Samkaro identity and icon sizes', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))

  assert.equal(manifest.name, 'Samkaro — سمكرو')
  assert.equal(manifest.short_name, 'Samkaro')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.theme_color, '#17191C')
  assert.equal(manifest.background_color, '#17191C')
  assert.equal(manifest.dir, 'rtl')

  const anyIcons = manifest.icons.filter((icon) => icon.purpose === 'any')
  assert.deepEqual(anyIcons.map((icon) => icon.sizes).sort(), ['192x192', '512x512'])
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable' && icon.sizes === '512x512'))

  for (const icon of manifest.icons) {
    assert.match(icon.src, /^\/assets\/[\w.-]+\.png$/)
    assert.equal(icon.type, 'image/png')
    const [expectedWidth, expectedHeight] = icon.sizes.split('x').map(Number)
    const size = readPngSize(await readFile(new URL(`.${icon.src}`, publicDir)))
    assert.deepEqual(size, { width: expectedWidth, height: expectedHeight }, `${icon.src} dimensions must match manifest`)
  }
})

test('service worker never caches API or Socket.IO traffic and versions its cache', async () => {
  const source = await readFile(new URL('sw.js', publicDir), 'utf8')

  assert.match(source, /samkaro-static-v\d+/)
  assert.match(source, /url\.pathname\.startsWith\('\/api\/v1\/'\)/)
  assert.match(source, /url\.pathname\.startsWith\('\/socket\.io\/'\)/)
  assert.match(source, /request\.headers\.has\('authorization'\)/)
  assert.match(source, /caches\.match\('\/offline\.html'\)/)
})

test('offline fallback keeps the charcoal and orange brand shell', async () => {
  const offline = await readFile(new URL('offline.html', publicDir), 'utf8')

  assert.match(offline, /#17191C/i)
  assert.match(offline, /#ff8a32/i)
  assert.match(offline, /location\.reload\(\)/)
  assert.match(offline, /assets\/tajawal\.ttf/)
})

test('index html links the manifest, icons, and local fonts', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8')

  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/assets\/apple-touch-icon\.png"/)
  assert.match(html, /href="\/assets\/icon-192\.png"/)
  assert.match(html, /href="\/assets\/cairo\.ttf"/)
  assert.match(html, /name="theme-color" content="#17191C"/)
})

test('the public PWA directory resolves next to the test suite', () => {
  assert.match(fileURLToPath(publicDir), /web[\\/]public[\\/]$/)
})
