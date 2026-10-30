import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, typeStyles } from '@/theme/colors'

export function TextField({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength }: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'number-pad'
  maxLength?: number
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="done"
        style={[styles.input, keyboardType === 'number-pad' && styles.numeric]}
        value={value}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: colors.muted, fontFamily: typeStyles.regular, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  input: { minHeight: 52, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, color: colors.text, fontFamily: typeStyles.regular, fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  numeric: { textAlign: 'center', writingDirection: 'ltr', fontFamily: typeStyles.display },
})
