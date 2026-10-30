import { router } from 'expo-router'
import { Platform, Text, View } from 'react-native'
import { ActionButton } from '@/components/ActionButton'
import { Panel, Screen, ui } from '@/components/Screen'
import { colors } from '@/theme/colors'
import { offlineQuestionReadiness } from '@/offline/questionPack'

export default function OfflineScreen() {
  return (
    <Screen title="حفلة محلية" subtitle="العبوا من هواتفكم على شبكة Wi‑Fi أو نقطة اتصال واحدة، دون الحاجة إلى الإنترنت.">
      <Panel title="جاهزية بنك الأسئلة">
        <Text style={ui.body}>الأسئلة المعتمدة المتاحة: {offlineQuestionReadiness.approvedCount} من {offlineQuestionReadiness.requiredCount} مطلوبة للمباراة.</Text>
        <Text style={[ui.body, { color: offlineQuestionReadiness.ready ? colors.green : colors.orange }]}>
          {offlineQuestionReadiness.ready ? 'البنك جاهز لبدء مباراة محلية.' : 'بدء المباراة متوقف حتى تكتمل مراجعة الأسئلة والتلميحات واعتمادها.'}
        </Text>
      </Panel>
      {Platform.OS === 'android' ? <><Panel title="استضافة مباراة">
        <Text style={ui.muted}>سيعرض هذا الهاتف رمز QR وعنوان الاتصال المحلي. اترك الشاشة مفتوحة أثناء الاستضافة.</Text>
        <ActionButton onPress={() => router.push('/offline-create')}>إنشاء غرفة محلية</ActionButton>
      </Panel>
      <Panel title="الانضمام إلى غرفة">
        <Text style={ui.muted}>امسح رمز المضيف أو أدخل عنوان الشبكة ورمز الغرفة يدويًا.</Text>
        <ActionButton secondary onPress={() => router.push('/offline-join')}>انضمام إلى غرفة</ActionButton>
      </Panel></> : <Panel title="اللعب المحلي على Android">
        <Text style={ui.muted}>استضافة الغرف والاتصال المحلي متاحان حاليًا على Android فقط. لم يتم اختبار دعم الشبكة المحلية على iOS.</Text>
      </Panel>}
      <View accessibilityRole="summary">
        <Text style={ui.muted}>المضيف يعمل داخل التطبيق أثناء بقاءه في المقدمة. إغلاق التطبيق أو فقدان عملية المضيف ينهي الغرفة المحلية.</Text>
      </View>
    </Screen>
  )
}
