import { Pressable, StyleSheet, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import type { PropsWithChildren } from 'react'
import { colors, typeStyles } from '@/theme/colors'

export function ActionButton({ children, onPress, disabled = false, secondary = false }: PropsWithChildren<{
  onPress: () => void
  disabled?: boolean
  secondary?: boolean
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined)
        onPress()
      }}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderColor: colors.orange, borderWidth: 1, backgroundColor: colors.orange, paddingHorizontal: 18, paddingVertical: 12, shadowColor: colors.orange, shadowOpacity: 0.22, shadowRadius: 12, elevation: 3 },
  secondary: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, shadowOpacity: 0, elevation: 0 },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.985 }] },
  label: { color: '#17120e', fontFamily: typeStyles.display, fontWeight: '700', fontSize: 17, textAlign: 'center', writingDirection: 'rtl' },
  secondaryLabel: { color: colors.text },
})
