import { useState } from 'react'
import { ActivityIndicator, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { colors } from '@/theme/colors'

export default function GuestSignInScreen() {
  const router = useRouter()
  const { signInAsGuest } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const name = displayName.trim()
    if (!name || name.length > 40) { setError('اكتب اسماً من حرف إلى ٤٠ حرفاً.'); return }
    setBusy(true)
    setError(null)
    try {
      await signInAsGuest(name)
      router.replace('/online')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء الجلسة.')
    } finally { setBusy(false) }
  }

  return (
    <Screen title="الدخول كضيف" subtitle="الخادم الحالي يدعم جلسات الضيوف. يمكنك البدء من دون بريد إلكتروني أو كلمة مرور.">
      <Panel title="اسم اللاعب">
        <TextField label="الاسم الظاهر" maxLength={40} onChangeText={setDisplayName} placeholder="مثال: سامي" value={displayName} />
        {error ? <Text style={[ui.body, { color: colors.red }]} accessibilityRole="alert">{error}</Text> : null}
        {busy ? <ActivityIndicator color={colors.orange} /> : <ActionButton onPress={() => void submit()}>متابعة</ActionButton>}
      </Panel>
    </Screen>
  )
}
