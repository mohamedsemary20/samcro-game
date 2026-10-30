import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { colors } from '@/theme/colors'

type MatchHistoryRow = Awaited<ReturnType<typeof api.getMatchHistory>>[number]

export default function ProfileScreen() {
  const router = useRouter()
  const { player, signOut } = useAuth()
  const [matches, setMatches] = useState<MatchHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setMatches(await api.getMatchHistory()); setError(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل المباريات.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  return (
    <Screen title="الملف الشخصي" subtitle="ملف ضيف محفوظ على هذا الجهاز.">
      <Panel title="اللاعب">
        <Text style={ui.body}>{player?.name ?? 'ضيف'}</Text>
        <Text style={ui.muted}>معرّف اللاعب: {player?.id ?? '—'}</Text>
        <ActionButton onPress={() => void signOut().then(() => router.replace('/'))} secondary>تسجيل الخروج</ActionButton>
      </Panel>
      <Panel title="سجل المباريات">
        {loading ? <ActivityIndicator color={colors.orange} /> : null}
        {matches.map((match) => <Text key={match.id} style={ui.body}>غرفة {match.roomCode} · المركز {match.rank ?? '—'} · {match.netScore ?? 0}</Text>)}
        {!loading && matches.length === 0 && !error ? <Text style={ui.muted}>لا توجد مباريات سابقة.</Text> : null}
        {error ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">{error}</Text> : null}
      </Panel>
    </Screen>
  )
}
