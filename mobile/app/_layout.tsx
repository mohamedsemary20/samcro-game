import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthProvider'
import { colors } from '@/theme/colors'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tajawal: require('../assets/fonts/Tajawal.ttf'),
    Cairo: require('../assets/fonts/Cairo.ttf'),
  })

  if (!fontsLoaded) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.orange} /></View>
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'Cairo', fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'رجوع',
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: 'الدخول كضيف' }} />
          <Stack.Screen name="online" options={{ title: 'اللعب عبر الإنترنت' }} />
          <Stack.Screen name="room/[roomId]" options={{ title: 'غرفة الانتظار' }} />
          <Stack.Screen name="game/[roomId]" options={{ title: 'ساحة اللعب', gestureEnabled: false }} />
          <Stack.Screen name="results" options={{ title: 'النتائج' }} />
          <Stack.Screen name="profile" options={{ title: 'الملف الشخصي' }} />
          <Stack.Screen name="offline" options={{ title: 'لعب محلي دون إنترنت' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
