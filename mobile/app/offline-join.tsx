import { useRef, useState } from 'react'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as SecureStore from 'expo-secure-store'
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { TextField } from '@/components/TextField'
import { LocalRoomClient } from '@/offline/client'
import { parseLocalJoinPayload, type LocalJoinPayload } from '@/offline/joinPayload'
import { getOfflineRuntime, setOfflineRuntime } from '@/offline/runtime'
import { useAuth } from '@/auth/AuthProvider'
import { colors, typeStyles } from '@/theme/colors'

function friendlyJoinError(code: string): string {
  const messages: Record<string, string> = {
    INVALID_QR: 'رمز QR غير صالح. اطلب من المضيف إنشاء رمز جديد.',
    UNSUPPORTED_VERSION: 'هذا الرمز من إصدار غير مدعوم.',
    INVALID_ADDRESS: 'عنوان الشبكة غير صالح.',
    INVALID_PORT: 'منفذ الاتصال غير صالح.',
    INVALID_ROOM: 'رمز الغرفة غير صالح.',
    INVALID_CREDENTIAL: 'بيانات الانضمام غير صحيحة أو انتهت صلاحيتها.',
    EXPIRED_ROOM: 'انتهت صلاحية رمز الغرفة. اطلب رمزًا جديدًا من المضيف.',
    ROOM_CREDENTIAL_EXPIRED: 'صلاحية رمز الانضمام أطول من المسموح.',
    ROOM_FULL: 'وصلت الغرفة إلى الحد الأقصى للاعبين.',
    ROOM_CLOSED: 'أغلق المضيف الغرفة المحلية.',
    ROOM_NOT_WAITING: 'لا تقبل الغرفة لاعبين جددًا الآن.',
    OUT_OF_TURN: 'انتظر حتى يحين دورك.',
    DUPLICATE_ACTION: 'تم إرسال هذا الإجراء من قبل.',
    STALE_SEQUENCE: 'تغيرت حالة المباراة. انتظر التحديث ثم حاول مجددًا.',
  }
  return messages[code] ?? 'تعذر الاتصال بالغرفة المحلية.'
}

export default function OfflineJoinScreen() {
  const { player } = useAuth()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [name, setName] = useState(player?.name ?? '')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [room, setRoom] = useState('')
  const [credential, setCredential] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const startGuard = useRef(false)

  const connect = async (payload: LocalJoinPayload) => {
    if (startGuard.current) return
    startGuard.current = true
    setConnecting(true)
    setError(null)
    const resumeKey = `samkaro.offline.resume.${payload.room}`
    let saved: { playerId: string; resumeToken: string } | undefined
    try {
      const value = await SecureStore.getItemAsync(resumeKey)
      if (value) saved = JSON.parse(value) as { playerId: string; resumeToken: string }
    } catch { await SecureStore.deleteItemAsync(resumeKey).catch(() => undefined) }

    const client = new LocalRoomClient(
      (connection) => setOfflineRuntime({ connection }),
      (snapshot) => {
        setOfflineRuntime({ snapshot, connection: 'connected' })
        router.replace('/offline-room')
      },
      (credentials) => {
        setOfflineRuntime({ playerId: credentials.playerId })
        void SecureStore.setItemAsync(resumeKey, JSON.stringify(credentials))
      },
      (code) => {
        const message = friendlyJoinError(code)
        setError(message)
        setOfflineRuntime({ error: message })
      },
    )
    setOfflineRuntime({ host: null, client, snapshot: null, playerId: saved?.playerId ?? null, connection: 'connecting', error: null })
    client.connect(payload, name.trim() || 'لاعب', saved)
    setTimeout(() => {
      if (!getRuntimeConnected()) {
        setConnecting(false)
        startGuard.current = false
      }
    }, 10_000)
  }

  const scan = (data: string) => {
    if (scanned) return
    setScanned(true)
    setScanning(false)
    const result = parseLocalJoinPayload(data)
    if (!result.ok) { setError(friendlyJoinError(result.code)); return }
    void connect(result.value)
  }

  const joinManual = () => {
    const payload = parseLocalJoinPayload(`samkaro-lan://join?version=1&host=${encodeURIComponent(host.trim())}&port=${encodeURIComponent(port)}&room=${encodeURIComponent(room.trim().toUpperCase())}&credential=${encodeURIComponent(credential.trim())}&expiresAt=${Date.now() + 20 * 60_000}`)
    if (!payload.ok) { setError(friendlyJoinError(payload.code)); return }
    void connect(payload.value)
  }

  function getRuntimeConnected(): boolean {
    return getOfflineRuntime().connection === 'connected' && Boolean(getOfflineRuntime().snapshot)
  }

  if (Platform.OS !== 'android') {
    return <Screen title="الانضمام إلى غرفة"><Panel title="الاتصال المحلي على Android"><Text style={ui.muted}>الاتصال بغرف الشبكة المحلية متاح حاليًا على Android فقط. لم يتم اختبار دعم iOS.</Text></Panel></Screen>
  }

  return (
    <Screen title="الانضمام إلى غرفة" subtitle="امسح رمز المضيف أو أدخل بيانات الاتصال المحلية يدويًا.">
      <Panel title="الاسم في الغرفة">
        <TextField label="اسم اللاعب" value={name} onChangeText={setName} maxLength={40} />
      </Panel>
      <Panel title="مسح رمز QR">
        {scanning ? (
          permission?.granted ? (
            <View style={{ height: 300, overflow: 'hidden', borderRadius: 18 }}>
              <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => scan(data)} />
            </View>
          ) : <Text style={ui.body}>يلزم السماح باستخدام الكاميرا لمسح رمز الانضمام.</Text>
        ) : null}
        {!scanning ? <ActionButton onPress={() => {
          setScanned(false)
          if (!permission?.granted) void requestPermission().then((result) => { if (result.granted) setScanning(true) })
          else setScanning(true)
        }}>فتح ماسح QR</ActionButton> : <ActionButton secondary onPress={() => setScanning(false)}>إغلاق الكاميرا</ActionButton>}
      </Panel>
      <Panel title="إدخال يدوي">
        <Text style={ui.muted}>يعرض المضيف هذه البيانات بجانب QR. يجب أن يكون الهاتفان على الشبكة المحلية نفسها.</Text>
        <TextField label="عنوان IPv4 للمضيف" value={host} onChangeText={setHost} placeholder="مثال: 192.168.1.24" />
        <TextField label="المنفذ" value={port} onChangeText={setPort} keyboardType="number-pad" maxLength={5} />
        <TextField label="رمز الغرفة" value={room} onChangeText={setRoom} maxLength={12} />
        <TextField label="رمز الانضمام المؤقت" value={credential} onChangeText={setCredential} maxLength={64} />
        {error ? <Text accessibilityRole="alert" style={[ui.body, { color: colors.red }]}>{error}</Text> : null}
        <ActionButton disabled={connecting} onPress={joinManual}>{connecting ? 'جارٍ الاتصال…' : 'اتصال بالغرفة'}</ActionButton>
        {connecting ? <ActivityIndicator color={colors.orange} /> : null}
      </Panel>
      {error ? <Pressable accessibilityRole="button" onPress={() => setError(null)}><Text style={{ color: colors.orange, fontFamily: typeStyles.regular, textAlign: 'right' }}>إخفاء الرسالة</Text></Pressable> : null}
    </Screen>
  )
}
