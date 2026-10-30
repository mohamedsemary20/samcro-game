import type { PropsWithChildren, ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, typeStyles } from '@/theme/colors'

export function Screen({ children, title, subtitle, scroll = true }: PropsWithChildren<{ title?: string; subtitle?: string; scroll?: boolean }>) {
  const content = (
    <View style={styles.content}>
      {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  )
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  )
}

export function Panel({ children, title, trailing }: PropsWithChildren<{ title?: string; trailing?: ReactNode }>) {
  return (
    <View style={styles.panel}>
      {title || trailing ? (
        <View style={styles.panelHeading}>
          {trailing}
          {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

export const ui = StyleSheet.create({
  body: { color: colors.text, fontFamily: typeStyles.regular, fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  muted: { color: colors.muted, fontFamily: typeStyles.regular, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
})

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 16 },
  title: { color: colors.text, fontFamily: typeStyles.display, fontSize: 30, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: colors.muted, fontFamily: typeStyles.regular, fontSize: 16, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl', marginTop: -10 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
  panelHeading: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  panelTitle: { color: colors.text, fontFamily: typeStyles.display, fontSize: 20, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
})
