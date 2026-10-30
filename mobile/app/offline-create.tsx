import { useState } from 'react'
import { router } from 'expo-router'
import { ActivityIndicator, Platform, Text } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { LocalLanHost } from '@/offline/host'
import { setOfflineRuntime } from '@/offline/runtime'
import { colors } from '@/theme/colors'

export default function OfflineCreateScreen() {
  const { player } = useAuth()
  const [name, setName] = useState(player?.name ?? '')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRoom = async () => {
    setStarting(true)
    setError(null)
    try {
      if (Platform.OS !== 'android') throw new Error('LOCAL_HOST_ANDROID_ONLY')
      const host = await LocalLanHost.create(name.trim() || 'المضيف')
      setOfflineRuntime({ host, client: null, snapshot: host.snapshot, playerId: host.hostCredentials.playerId, connection: 'connected', error: null })
      router.replace('/offline-room')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر بدء خدمة الشبكة المحلية.')
    } finally { setStarting(false) }
  }

  return (
    <Screen title="إنشاء غرفة محلية" subtitle="يتصل اللاعبون عبر عنوان Wi‑Fi الفعلي لهذا الهاتف. لا يوجد عنوان بوابة ثابت.">
      {Platform.OS !== 'android' ? <Panel title="استضافة Android فقط"><Text style={ui.muted}>استضافة الغرف المحلية متاحة حاليًا على Android فقط.</Text></Panel> : <>
      <Panel title="اسم اللاعب">
        <TextField label="اسم المضيف" value={name} onChangeText={setName} maxLength={40} />
        {error ? <Text accessibilityRole="alert" style={[ui.body, { color: colors.red }]}>{error}</Text> : null}
        <ActionButton disabled={starting} onPress={() => void createRoom()}>{starting ? 'جارٍ تشغيل الغرفة…' : 'تشغيل المضيف المحلي'}</ActionButton>
        {starting ? <ActivityIndicator color={colors.orange} /> : null}
      </Panel>
      <Panel title="قبل الاستضافة">
        <Text style={ui.muted}>يجب أن يكون كل هاتف على شبكة Wi‑Fi أو نقطة الاتصال نفسها. لا يحتاج اللعب المحلي إلى بيانات الهاتف أو الإنترنت.</Text>
      </Panel>
      </>}
    </Screen>
  )
}
