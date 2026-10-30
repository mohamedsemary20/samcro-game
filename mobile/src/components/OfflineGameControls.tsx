import type { BetAction } from '../../../shared/contracts'
import { ActionButton } from '@/components/ActionButton'
import { ui } from '@/components/Screen'
import { Text } from 'react-native'

export function OfflineGameControls({
  phase, actorId, playerId, currentBet, personalBet, disabled = false, onAction,
}: {
  phase: string
  actorId: string | null
  playerId: string | null
  currentBet: number
  personalBet: number
  disabled?: boolean
  onAction: (action: BetAction) => void
}) {
  if (phase !== 'question-betting' && phase !== 'final-betting') return null
  if (actorId !== playerId || !playerId) return <Text style={ui.muted}>بانتظار دور اللاعب المحدد…</Text>
  const mustCall = currentBet > personalBet
  return <>
    <Text style={ui.muted}>دورك الآن</Text>
    <ActionButton disabled={disabled} onPress={() => onAction({ type: mustCall ? 'call' : 'check' })}>{mustCall ? 'مطابقة الرهان' : 'تمرير'}</ActionButton>
    <ActionButton secondary disabled={disabled} onPress={() => onAction({ type: 'fold' })}>انسحاب</ActionButton>
    <ActionButton secondary disabled={disabled} onPress={() => onAction({ type: 'all-in' })}>رهان بكل الرصيد</ActionButton>
  </>
}
