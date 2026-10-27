import test from 'node:test'
import assert from 'node:assert/strict'
import { isStandaloneMode, shouldOfferIosInstallHelp } from './installPlatform.js'

test('detects standalone display mode across browser and iOS installed apps', () => {
  assert.equal(isStandaloneMode(true), true)
  assert.equal(isStandaloneMode(false, true), true)
  assert.equal(isStandaloneMode(false, false), false)
})

test('offers iOS installation steps only for Safari outside standalone mode', () => {
  assert.equal(shouldOfferIosInstallHelp({ userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17 Safari/604.1' }), true)
  assert.equal(shouldOfferIosInstallHelp({ userAgent: 'Mozilla/5.0 (iPhone) CriOS/122.0 Safari/604.1' }), false)
  assert.equal(shouldOfferIosInstallHelp({ userAgent: 'Mozilla/5.0 (iPhone) Version/17 Safari/604.1', standalone: true }), false)
})

test('recognizes iPadOS desktop mode when the device reports touch points', () => {
  assert.equal(shouldOfferIosInstallHelp({ userAgent: 'Mozilla/5.0 (Macintosh) Version/17 Safari/604.1', platform: 'MacIntel', maxTouchPoints: 5 }), true)
  assert.equal(shouldOfferIosInstallHelp({ userAgent: 'Mozilla/5.0 (Macintosh) Version/17 Safari/604.1', platform: 'MacIntel', maxTouchPoints: 0 }), false)
})
