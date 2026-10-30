import { fireEvent, render, screen } from '@testing-library/react-native'
import { OfflineGameControls } from './OfflineGameControls'

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }))

describe('OfflineGameControls', () => {
  it('shows no action controls out of turn', async () => {
    const onAction = jest.fn()
    await render(<OfflineGameControls phase="question-betting" actorId="other" playerId="me" currentBet={0} personalBet={0} onAction={onAction} />)
    expect(screen.getByText('بانتظار دور اللاعب المحدد…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'تمرير' })).toBeNull()
    expect(onAction).not.toHaveBeenCalled()
  })

  it('offers call when facing a bet and fold remains available', async () => {
    const onAction = jest.fn()
    await render(<OfflineGameControls phase="final-betting" actorId="me" playerId="me" currentBet={90} personalBet={50} onAction={onAction} />)
    await fireEvent.press(screen.getByRole('button', { name: 'مطابقة الرهان' }))
    await fireEvent.press(screen.getByRole('button', { name: 'انسحاب' }))
    await fireEvent.press(screen.getByRole('button', { name: 'رهان بكل الرصيد' }))
    expect(onAction.mock.calls).toEqual([[{ type: 'call' }], [{ type: 'fold' }], [{ type: 'all-in' }]])
  })

  it('offers check when no bet is outstanding and hides betting controls in other phases', async () => {
    const onAction = jest.fn()
    const view = await render(<OfflineGameControls phase="question-betting" actorId="me" playerId="me" currentBet={10} personalBet={10} onAction={onAction} />)
    await fireEvent.press(screen.getByRole('button', { name: 'تمرير' }))
    expect(onAction).toHaveBeenCalledWith({ type: 'check' })
    await view.rerender(<OfflineGameControls phase="guess-input" actorId={null} playerId="me" currentBet={0} personalBet={0} onAction={onAction} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
