import { render, screen } from '@testing-library/react-native'
import { OfflineConnectionStatus } from './OfflineConnectionStatus'

describe('OfflineConnectionStatus', () => {
  it('exposes connection loss and recovery as accessible status text', async () => {
    const view = await render(<OfflineConnectionStatus state="host-disconnected" />)
    expect(screen.getByRole('alert', { name: 'حالة الاتصال: انقطع اتصال المضيف' })).toBeTruthy()
    await view.rerender(<OfflineConnectionStatus state="connected" />)
    expect(screen.getByRole('summary', { name: 'حالة الاتصال: متصل' })).toBeTruthy()
  })

  it('explains when the host removed a player from the room', async () => {
    await render(<OfflineConnectionStatus state="kicked" />)
    expect(screen.getByRole('alert', { name: 'حالة الاتصال: أزالك المضيف من الغرفة' })).toBeTruthy()
  })
})
