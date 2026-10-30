export const OFFLINE_QUESTION_SCHEMA_VERSION = 1
export const REQUIRED_QUESTIONS_PER_MATCH = 5

export interface OfflineQuestion {
  id: string
  promptAr: string
  answer: number
  category: string
  type: 'year' | 'number'
  sourceFingerprint: string
  approved: true
  hint: { range: string; accuracy: string; advisoryNote: string }
}

export interface OfflineQuestionBundle {
  schemaVersion: number
  questions: OfflineQuestion[]
}

export interface OfflineQuestionPackBuildResult {
  bundle: OfflineQuestionBundle
  approvedCandidates: number
  rejectedReviewRecords: number
  validation: ReturnType<typeof validateOfflineQuestionBundle>
}

export type QuestionBundleIssueCode =
  | 'BUNDLE_INVALID'
  | 'QUESTION_INVALID'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_FINGERPRINT'
  | 'DUPLICATE_PROMPT'
  | 'INSUFFICIENT_QUESTIONS'

export interface QuestionBundleIssue {
  code: QuestionBundleIssueCode
  questionId?: string
}

function normalizedPrompt(prompt: string): string {
  return prompt.normalize('NFKC').replace(/[\p{P}\p{S}\s]+/gu, ' ').trim().toLowerCase()
}

function validQuestion(value: unknown): value is OfflineQuestion {
  if (!value || typeof value !== 'object') return false
  const question = value as Partial<OfflineQuestion>
  return typeof question.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(question.id)
    && typeof question.promptAr === 'string' && question.promptAr.trim().length > 0 && question.promptAr.length <= 500
    && Number.isSafeInteger(question.answer) && (question.answer ?? -1) >= 0
    && typeof question.category === 'string' && question.category.trim().length > 0 && question.category.length <= 80
    && (question.type === 'year' || question.type === 'number')
    && typeof question.sourceFingerprint === 'string' && /^[a-f0-9]{64}$/i.test(question.sourceFingerprint)
    && question.approved === true
    && !!question.hint
    && typeof question.hint.range === 'string' && question.hint.range.trim().length > 0 && question.hint.range.length <= 120
    && typeof question.hint.accuracy === 'string' && question.hint.accuracy.trim().length > 0 && question.hint.accuracy.length <= 120
    && typeof question.hint.advisoryNote === 'string' && question.hint.advisoryNote.trim().length > 0 && question.hint.advisoryNote.length <= 240
}

/** Validate an explicitly approved bundle before a local host offers to start a match. */
export function validateOfflineQuestionBundle(value: unknown, requiredCount = REQUIRED_QUESTIONS_PER_MATCH): {
  valid: boolean
  questions: OfflineQuestion[]
  issues: QuestionBundleIssue[]
} {
  const bundle = value && typeof value === 'object' ? value as Partial<OfflineQuestionBundle> : null
  if (!bundle || bundle.schemaVersion !== OFFLINE_QUESTION_SCHEMA_VERSION || !Array.isArray(bundle.questions)
    || !Number.isInteger(requiredCount) || requiredCount < 1) {
    return { valid: false, questions: [], issues: [{ code: 'BUNDLE_INVALID' }] }
  }

  const issues: QuestionBundleIssue[] = []
  const questions: OfflineQuestion[] = []
  const ids = new Set<string>()
  const fingerprints = new Set<string>()
  const prompts = new Set<string>()

  for (const raw of bundle.questions) {
    if (!validQuestion(raw)) {
      issues.push({ code: 'QUESTION_INVALID', ...(raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string' ? { questionId: (raw as { id: string }).id } : {}) })
      continue
    }
    const promptKey = normalizedPrompt(raw.promptAr)
    if (ids.has(raw.id)) issues.push({ code: 'DUPLICATE_ID', questionId: raw.id })
    if (fingerprints.has(raw.sourceFingerprint)) issues.push({ code: 'DUPLICATE_FINGERPRINT', questionId: raw.id })
    if (prompts.has(promptKey)) issues.push({ code: 'DUPLICATE_PROMPT', questionId: raw.id })
    ids.add(raw.id)
    fingerprints.add(raw.sourceFingerprint)
    prompts.add(promptKey)
    questions.push(raw)
  }

  if (questions.length < requiredCount) issues.push({ code: 'INSUFFICIENT_QUESTIONS' })
  return { valid: issues.length === 0, questions: issues.length === 0 ? questions : [], issues }
}

/** Build a mobile pack only from the canonical, explicitly approved hint-review artifact. */
export function buildApprovedOfflineQuestionBundle(source: unknown, review: unknown): OfflineQuestionPackBuildResult {
  const sourceRecords = source && typeof source === 'object' && Array.isArray((source as { records?: unknown }).records)
    ? (source as { records: unknown[] }).records : []
  const reviewRecords = review && typeof review === 'object' && Array.isArray((review as { records?: unknown }).records)
    ? (review as { records: unknown[] }).records : []
  const sourceById = new Map<string, Record<string, unknown>>()
  for (const value of sourceRecords) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>
      if (typeof record.id === 'string') sourceById.set(record.id, record)
    }
  }

  const approved: OfflineQuestion[] = []
  let rejectedReviewRecords = 0
  for (const value of reviewRecords) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { rejectedReviewRecords += 1; continue }
    const record = value as Record<string, unknown>
    const sourceRecord = typeof record.id === 'string' ? sourceById.get(record.id) : undefined
    const hints = record.gameplayHint && typeof record.gameplayHint === 'object' ? record.gameplayHint as Record<string, unknown> : null
    const sources = Array.isArray(record.factCheckSources) ? record.factCheckSources : []
    const explicitApproval = record.approved === true && record.status === 'approved' && record.reviewerDecision === 'approved'
      && record.factCheckStatus === 'verified' && record.leakageReview === 'clear'
      && typeof record.approvalNote === 'string' && record.approvalNote.trim().length > 0
      && typeof record.factCheckNote === 'string' && record.factCheckNote.trim().length > 0
      && sources.length > 0 && sources.every((url) => typeof url === 'string' && /^https:\/\//.test(url))
      && Boolean(sourceRecord) && sourceRecord!.playable === true
      && typeof sourceRecord!.sourceFingerprint === 'string' && sourceRecord!.sourceFingerprint === record.sourceFingerprint
      && Boolean(hints) && ['range', 'accuracy', 'note'].every((field) => typeof hints?.[field] === 'string' && String(hints[field]).trim().length > 0)
    if (!explicitApproval || !sourceRecord || !hints) { rejectedReviewRecords += 1; continue }
    approved.push({
      id: String(sourceRecord.id), promptAr: sourceRecord.promptAr as string, answer: sourceRecord.answer as number,
      category: sourceRecord.category as string, type: sourceRecord.type as 'year' | 'number',
      sourceFingerprint: sourceRecord.sourceFingerprint as string, approved: true,
      hint: { range: hints.range as string, accuracy: hints.accuracy as string, advisoryNote: hints.note as string },
    })
  }
  const bundle: OfflineQuestionBundle = { schemaVersion: OFFLINE_QUESTION_SCHEMA_VERSION, questions: approved }
  const validation = validateOfflineQuestionBundle(bundle)
  if (validation.issues.some((issue) => issue.code !== 'INSUFFICIENT_QUESTIONS')) throw new Error(`OFFLINE_QUESTION_PACK_INVALID:${validation.issues.map((issue) => issue.code).join(',')}`)
  return { bundle, approvedCandidates: approved.length, rejectedReviewRecords, validation }
}
