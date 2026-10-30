import { render, screen } from '@testing-library/react-native'
import { MatchResultsPanel } from './MatchResultsPanel'

describe('MatchResultsPanel', () => {
  it('renders host-computed final ranks and the revealed answer', async () => {
    await render(<MatchResultsPanel answer={1930} entries={[
      { playerId: 'p1', displayName: 'Nour', score: 720, rank: 1 },
      { playerId: 'p2', displayName: 'Omar', score: 480, rank: 2 },
    ]} />)
    expect(screen.getByText('إجابة الجولة الأخيرة: 1930')).toBeTruthy()
    expect(screen.getByText('1. Nour · 720')).toBeTruthy()
    expect(screen.getByText('2. Omar · 480')).toBeTruthy()
  })
})
