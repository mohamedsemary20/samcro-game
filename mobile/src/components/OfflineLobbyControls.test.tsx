import { fireEvent, render, screen } from '@testing-library/react-native'
import { OfflineLobbyControls } from './OfflineLobbyControls'

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }))

describe('OfflineLobbyControls', () => {
  it('shows the local question approval blocker and keeps host start disabled', async () => {
    const onStart = jest.fn()
    await render(<OfflineLobbyControls isReady canStart={false} isHost approvedCount={0} requiredCount={5} onReady={jest.fn()} onStart={onStart} />)
    expect(screen.getByText('لا يمكن بدء المباراة: لا توجد أسئلة معتمدة كافية (0/5).')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'بدء المباراة' }).props.accessibilityState.disabled).toBe(true)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('lets joiners ready themselves without displaying host controls', async () => {
    const onReady = jest.fn()
    await render(<OfflineLobbyControls isReady={false} canStart={false} isHost={false} approvedCount={0} requiredCount={5} onReady={onReady} onStart={jest.fn()} />)
    await fireEvent.press(screen.getByRole('button', { name: 'أنا جاهز' }))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'بدء المباراة' })).toBeNull()
  })
})
