import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { useAuth } from '@/auth/AuthProvider'
import { colors, typeStyles } from '@/theme/colors'

export default function HomeScreen() {
  const router = useRouter()
  const { player, loading } = useAuth()
  return (
    <Screen>
      <View style={styles.brand}>
        <Text style={styles.kicker}>SAMKARO · سامكارو</Text>
        <Text accessibilityRole="header" style={styles.title}>اللعب يجمعنا</Text>
        <Text style={ui.muted}>توقّع، راهن، واكسب مع أصحابك.</Text>
      </View>
      <Panel title="حسابك">
        {loading ? <ActivityIndicator color={colors.orange} /> : (
          <Text style={ui.body}>{player ? `أهلاً ${player.name}` : 'تابع كضيف وابدأ اللعب فوراً.'}</Text>
        )}
        <ActionButton onPress={() => router.push(player ? '/profile' : '/sign-in')} secondary>
          {player ? 'الملف الشخصي' : 'الدخول كضيف'}
        </ActionButton>
      </Panel>
      <Panel title="اختر طريقة اللعب">
        <ActionButton onPress={() => router.push('/online')}>اللعب عبر الإنترنت</ActionButton>
        <ActionButton onPress={() => router.push('/offline')} secondary>حفلة محلية دون إنترنت</ActionButton>
      </Panel>
      <Text style={styles.footer}>نسخة الهاتف · واجهة عربية أصلية</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brand: { paddingTop: 34, paddingBottom: 18, alignItems: 'flex-end', gap: 8 },
  kicker: { color: colors.orange, fontFamily: typeStyles.display, fontSize: 14, fontWeight: '700', letterSpacing: 1, textAlign: 'right' },
  title: { color: colors.text, fontFamily: typeStyles.display, fontSize: 42, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  footer: { color: colors.muted, fontFamily: typeStyles.regular, fontSize: 13, textAlign: 'center', marginTop: 10 },
})
