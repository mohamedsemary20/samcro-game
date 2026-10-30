import { Text } from 'react-native'
import { Panel, ui } from '@/components/Screen'
import { colors } from '@/theme/colors'

export interface MatchResultEntry { playerId: string; displayName: string; score: number; rank: number }

export function MatchResultsPanel({ entries, answer }: { entries: MatchResultEntry[]; answer?: number | null }) {
  return <Panel title="النتائج النهائية">
    {answer !== undefined && answer !== null ? <Text style={ui.body}>إجابة الجولة الأخيرة: {answer}</Text> : null}
    {entries.length ? entries.map((entry) => <Text key={entry.playerId} style={[ui.body, { paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>{entry.rank}. {entry.displayName} · {entry.score}</Text>)
      : <Text style={ui.muted}>لا توجد نتيجة محفوظة لهذه المباراة.</Text>}
  </Panel>
}
