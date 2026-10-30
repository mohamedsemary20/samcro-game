import { Text } from 'react-native'
import { ActionButton } from '@/components/ActionButton'
import { ui } from '@/components/Screen'
import { colors } from '@/theme/colors'

export function OfflineLobbyControls({
  isReady, isHost, canStart, approvedCount, requiredCount, onReady, onStart,
}: {
  isReady: boolean
  isHost: boolean
  canStart: boolean
  approvedCount: number
  requiredCount: number
  onReady: () => void
  onStart: () => void
}) {
  return <>
    <ActionButton secondary onPress={onReady}>{isReady ? 'إلغاء الجاهزية' : 'أنا جاهز'}</ActionButton>
    {isHost ? <ActionButton disabled={!canStart} onPress={onStart}>بدء المباراة</ActionButton> : null}
    {isHost && approvedCount < requiredCount ? <Text style={[ui.muted, { color: colors.orange }]}>لا يمكن بدء المباراة: لا توجد أسئلة معتمدة كافية ({approvedCount}/{requiredCount}).</Text> : null}
  </>
}
