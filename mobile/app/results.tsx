import { useMemo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import type { LeaderboardEntry } from '../../shared/contracts'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { colors } from '@/theme/colors'

function readEntries(raw: string | undefined): LeaderboardEntry[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter((entry): entry is LeaderboardEntry => Boolean(entry && typeof entry === 'object'
      && typeof entry.playerId === 'string' && typeof entry.displayName === 'string'
      && Number.isFinite(entry.score) && Number.isInteger(entry.rank)))
  } catch { return [] }
}

export default function ResultsScreen() {
  const params = useLocalSearchParams<{ entries?: string }>()
  const router = useRouter()
  const entries = useMemo(() => readEntries(Array.isArray(params.entries) ? params.entries[0] : params.entries), [params.entries])
  return (
    <Screen title="نتائج المباراة" subtitle="ترتيب المباراة كما أرسله الخادم.">
      <Panel title="لوحة المتصدرين">
        {entries.length ? entries.map((entry) => (
          <Text key={entry.playerId} style={[ui.body, styles.entry]}>{entry.rank}. {entry.displayName} · {entry.score}</Text>
        )) : <Text style={ui.muted}>لا توجد نتيجة محفوظة في هذه الشاشة. يمكنك مراجعة سجل مبارياتك من الملف الشخصي.</Text>}
      </Panel>
      <ActionButton onPress={() => router.replace('/')}>العودة للرئيسية</ActionButton>
      <ActionButton onPress={() => router.push('/profile')} secondary>سجل المباريات</ActionButton>
    </Screen>
  )
}

const styles = StyleSheet.create({ entry: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } })
