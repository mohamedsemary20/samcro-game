jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => ({
    startHost: jest.fn().mockResolvedValue({ port: 3210, addresses: ['192.168.1.20'] }),
    sendToClient: jest.fn().mockResolvedValue(true),
    closeClient: jest.fn().mockResolvedValue(true),
    broadcast: jest.fn().mockResolvedValue(true),
    stopHost: jest.fn().mockResolvedValue(true),
    getAddresses: jest.fn().mockResolvedValue(['192.168.1.20']),
  })),
  EventEmitter: jest.fn().mockImplementation(() => ({ addListener: jest.fn(() => ({ remove: jest.fn() })) })),
}))

import { requireOptionalNativeModule } from 'expo-modules-core'
import { LanHost } from './index'

describe('Expo LAN bridge contract', () => {
  it('forwards host lifecycle, direct sends, broadcasts, and address discovery', async () => {
    const native = (requireOptionalNativeModule as jest.Mock).mock.results[0]!.value
    await expect(LanHost.start()).resolves.toEqual({ port: 3210, addresses: ['192.168.1.20'] })
    await LanHost.send('client-1', '{"type":"snapshot"}')
    await LanHost.closeClient('client-1')
    await LanHost.broadcast('{"type":"room"}')
    await LanHost.addresses()
    await LanHost.stop()
    expect(native.startHost).toHaveBeenCalledWith(0)
    expect(native.sendToClient).toHaveBeenCalledWith('client-1', '{"type":"snapshot"}')
    expect(native.closeClient).toHaveBeenCalledWith('client-1')
    expect(native.broadcast).toHaveBeenCalledWith('{"type":"room"}')
    expect(native.stopHost).toHaveBeenCalledTimes(1)
  })

  it('registers the typed native lifecycle event stream', () => {
    const callback = jest.fn()
    const subscription = LanHost.addListener(callback)
    expect(subscription.remove).toEqual(expect.any(Function))
  })
})
