import * as Crypto from 'expo-crypto'
import { useState } from 'react'
import { ActivityIndicator, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { api, configuredApiBaseUrl } from '@/api/client'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { colors } from '@/theme/colors'

export default function OnlineScreen() {
  const router = useRouter()
  const { player } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<{ id: string }>) => {
    setBusy(true)
    setError(null)
    try {
      const room = await action()
      router.push(`/room/${encodeURIComponent(room.id)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الطلب.')
    } finally { setBusy(false) }
  }

  if (!player) {
    return <Screen title="اللعب عبر الإنترنت" subtitle="أنشئ جلسة ضيف للمتابعة."><ActionButton onPress={() => router.push('/sign-in')}>الدخول كضيف</ActionButton></Screen>
  }

  return (
    <Screen title="اللعب عبر الإنترنت" subtitle="أنشئ غرفة أو انضم إلى أصحابك باستخدام رمز الغرفة.">
      {!configuredApiBaseUrl ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">اضبط EXPO_PUBLIC_API_BASE_URL في ملف mobile/.env قبل الاتصال بالخادم.</Text> : null}
      <Panel title="إنشاء غرفة">
        <Text style={ui.muted}>ستظهر الغرفة في قائمة الانتظار بعد إنشائها.</Text>
        <ActionButton disabled={busy || !configuredApiBaseUrl} onPress={() => void run(() => api.createRoom(7, Crypto.randomUUID()))}>إنشاء غرفة جديدة</ActionButton>
      </Panel>
      <Panel title="الانضمام إلى غرفة">
        <TextField label="رمز الغرفة" maxLength={10} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="مثال: AB12CD34" value={code} />
        <ActionButton disabled={busy || code.length < 6 || !configuredApiBaseUrl} onPress={() => void run(() => api.joinRoom(code))} secondary>انضمام</ActionButton>
      </Panel>
      {busy ? <ActivityIndicator color={colors.orange} /> : null}
      {error ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">{error}</Text> : null}
    </Screen>
  )
}
