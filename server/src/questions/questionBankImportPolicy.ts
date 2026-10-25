import type { QuestionBankRecord } from './questionBank.js'

export interface ExistingQuestionForImport {
  id: string
  promptAr: string
  answer: bigint
  category: string
  type: string
  difficulty: string | null
  source: string | null
  sourceFile: string | null
  sourceRecordIndex: number | null
  metadata: unknown
  enabled: boolean
  hint: { approved: boolean; approvedAt: Date | null } | null
}

export type QuestionImportPlan =
  | { kind: 'insert'; record: QuestionBankRecord }
  | { kind: 'update'; record: QuestionBankRecord; revokeHintApproval: boolean }
  | { kind: 'skip'; record: QuestionBankRecord }
  | { kind: 'conflict'; record: QuestionBankRecord; reason: string }

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (!value || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
}

function differs(existing: ExistingQuestionForImport, record: QuestionBankRecord): boolean {
  return existing.promptAr !== record.promptAr
    || existing.answer !== BigInt(record.answer)
    || existing.category !== record.category
    || existing.type !== record.type
    || existing.difficulty !== record.difficulty
    || existing.source !== record.source
    || existing.sourceFile !== record.sourceFile
    || existing.sourceRecordIndex !== record.sourceRecordIndex
    || stableJson(existing.metadata) !== stableJson(record.metadata)
}

export function planQuestionImport(
  records: QuestionBankRecord[],
  existingQuestions: ExistingQuestionForImport[],
): QuestionImportPlan[] {
  const existingById = new Map(existingQuestions.map((question) => [question.id, question]))
  return records.map((record): QuestionImportPlan => {
    const existing = existingById.get(record.id)
    if (!existing) return { kind: 'insert', record }
    if (existing.sourceFile !== record.sourceFile) return { kind: 'conflict', record, reason: 'stable-id-owned-by-another-source' }
    if (!differs(existing, record)) return { kind: 'skip', record }
    const revokeHintApproval = existing.promptAr !== record.promptAr
      || existing.answer !== BigInt(record.answer)
      || existing.type !== record.type
    return { kind: 'update', record, revokeHintApproval }
  })
}
