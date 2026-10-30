import { Text } from 'react-native'
import { colors } from '@/theme/colors'

const labels: Record<string, string> = {
  connected: 'متصل', connecting: 'جارٍ الاتصال', reconnecting: 'إعادة الاتصال', disconnected: 'غير متصل',
  'host-disconnected': 'انقطع اتصال المضيف', 'room-closed': 'أغلق المضيف الغرفة',
  'room-full': 'الغرفة ممتلئة', 'room-unavailable': 'الغرفة لا تستقبل لاعبين الآن',
  kicked: 'أزالك المضيف من الغرفة',
  'network-unavailable': 'الشبكة المحلية غير متاحة', timeout: 'انتهت مهلة الاتصال',
  'invalid-credential': 'بيانات الغرفة غير صالحة',
}

export function OfflineConnectionStatus({ state }: { state: string }) {
  const failure = state !== 'connected'
  return <Text accessibilityRole={failure ? 'alert' : 'summary'} accessibilityLabel={`حالة الاتصال: ${labels[state] ?? state}`}
    style={{ color: failure ? colors.orange : colors.green, textAlign: 'right' }}>{labels[state] ?? state}</Text>
}
