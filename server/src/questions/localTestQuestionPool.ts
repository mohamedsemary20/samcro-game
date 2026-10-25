import type { Prisma, PrismaClient } from '@prisma/client'
import { DEFAULT_SOURCE_DIRECTORY, inspectQuestionBank, type QuestionBankRecord } from './questionBank.js'

export const LOCAL_TEST_QUESTION_SOURCE = '__samkaro_local_test_pool_v1__'
export const LOCAL_TEST_QUESTION_HINT_SOURCE = 'local-test-pool:formula-hint-v1'
export const LOCAL_TEST_QUESTION_FLAG = 'SAMKARO_ENABLE_TEST_QUESTION_POOL'
const DATABASE_NAME = 'samkaro_dev'

export interface TestPoolEnvironment {
  NODE_ENV?: string | undefined
  DATABASE_URL?: string | undefined
  SAMKARO_ENABLE_TEST_QUESTION_POOL?: string | undefined
}

export interface GeneratedTestHint {
  range: string
  accuracy: string
  note: string
}

export function assertLocalTestPoolEnvironment(environment: TestPoolEnvironment): void {
  if (environment.SAMKARO_ENABLE_TEST_QUESTION_POOL !== '1') throw new Error('Local test question pool requires SAMKARO_ENABLE_TEST_QUESTION_POOL=1.')
  if (environment.NODE_ENV !== 'development') throw new Error('Local test question pool requires NODE_ENV=development.')
  const url = environment.DATABASE_URL
  if (!url) throw new Error('Local test question pool requires a configured development database URL.')
  let databaseName: string
  try { databaseName = decodeURIComponent(new URL(url).pathname.slice(1)).split('/')[0] ?? '' }
  catch { throw new Error('Local test question pool database URL is invalid.') }
  if (databaseName !== DATABASE_NAME) throw new Error('Local test question pool only supports the samkaro_dev database.')
}

export async function assertLiveLocalTestPoolDatabase(currentDatabase: () => Promise<string>): Promise<void> {
  const databaseName = await currentDatabase()
  if (databaseName !== DATABASE_NAME) throw new Error('Local test question pool refused: live database is not samkaro_dev.')
}

function ceilPercent(value: bigint, percent: bigint): bigint {
  return (value * percent + 99n) / 100n
}

function formatInteger(value: bigint): string {
  return value.toLocaleString('en-US')
}

export function generateLocalTestHint(answer: number, type: 'year' | 'number'): GeneratedTestHint {
  if (!Number.isSafeInteger(answer) || answer < 0) throw new Error('Local test hints require a non-negative safe-integer answer.')
  if (answer === 0) {
    return {
      range: 'ضمن القيم الصغيرة القريبة من الصفر',
      accuracy: 'نطاق تقريبي مخصص للقيم الصغيرة',
      note: 'استخدم وحدة القياس وصياغة السؤال لتقدير القيمة.',
    }
  }

  const value = BigInt(answer)
  const margin = type === 'year'
    ? [2n, ceilPercent(value, 2n)].reduce((left, right) => left > right ? left : right)
    : [2n, ceilPercent(value, 20n)].reduce((left, right) => left > right ? left : right)
  const maximum = BigInt(Number.MAX_SAFE_INTEGER)
  let low = value > margin ? value - margin : 0n
  let high = value + margin < maximum ? value + margin : maximum
  if (high - low < 2n) {
    if (high < maximum) high += 1n
    else if (low > 0n) low -= 1n
  }
  const marginDescription = type === 'year' ? 'بضع سنوات' : 'نحو خُمس القيمة'
  return {
    range: `${formatInteger(low)} – ${formatInteger(high)}`,
    accuracy: `نطاق تقديري بهامش ${marginDescription}`,
    note: 'النطاق للتوجيه فقط؛ انتبه إلى الوحدة المطلوبة واعتمد على نص السؤال.',
  }
}

/**
 * Selects a stable per-player hint variant for the isolated development pool.
 * Wider ranges remain valid estimates and are labelled with correspondingly
 * broader accuracy wording. The production approved-hint path never calls this.
 */
export function generateLocalTestHintVariant(answer: number, type: 'year' | 'number', variantIndex: number): GeneratedTestHint {
  if (!Number.isSafeInteger(variantIndex) || variantIndex < 0) throw new Error('Local test hint variants require a non-negative safe-integer index.')
  if (!Number.isSafeInteger(answer) || answer < 0) throw new Error('Local test hints require a non-negative safe-integer answer.')
  // Five validated variants are available. Larger tables can reuse these
  // without claiming a precision tier the hint generator does not define.
  variantIndex %= 5
  if (variantIndex === 0 || answer === 0) return generateLocalTestHint(answer, type)

  const base = generateLocalTestHint(answer, type)
  const value = BigInt(answer)
  const maximum = BigInt(Number.MAX_SAFE_INTEGER)
  const baseMargin = type === 'year'
    ? [2n, ceilPercent(value, 2n)].reduce((left, right) => left > right ? left : right)
    : [2n, ceilPercent(value, 20n)].reduce((left, right) => left > right ? left : right)
  const margin = baseMargin + BigInt(variantIndex)
  const low = value > margin ? value - margin : 0n
  const high = value + margin < maximum ? value + margin : maximum
  const accuracy = variantIndex === 1 ? 'Approximate range with a slightly wider margin'
    : variantIndex === 2 ? 'Moderately broad approximate range'
      : variantIndex === 3 ? 'Broad approximate range'
        : 'Very broad approximate range'
  return {
    ...base,
    range: `${formatInteger(low)} – ${formatInteger(high)}`,
    accuracy,
  }
}

function hasExactAnswer(text: string, answer: number): boolean {
  const digits = text.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.codePointAt(0)!
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660))
  })
  return new RegExp(`(^|[^0-9])${answer}(?=$|[^0-9])`).test(digits)
}

export function buildValidatedLocalTestPool(records: QuestionBankRecord[]): Array<QuestionBankRecord & { testHint: GeneratedTestHint }> {
  if (records.length < 5) throw new Error('At least five valid source-bank questions are required for the local test pool.')
  return records.map((record) => {
    const hint = generateLocalTestHint(record.answer, record.type)
    if (!record.id || !record.promptAr.trim() || !record.category.trim() || !['year', 'number'].includes(record.type)) {
      throw new Error(`Invalid local test question: ${record.id || '(missing id)'}.`)
    }
    if (hint.range.length > 120 || hint.accuracy.length > 120 || hint.note.length > 240
      || Object.values(hint).some((value) => !value.trim() || hasExactAnswer(value, record.answer))) {
      throw new Error(`Invalid or revealing local test hint for question ${record.id}.`)
    }
    return { ...record, testHint: hint }
  })
}

function isTestMetadata(value: Prisma.JsonValue | null): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const metadata = value as Prisma.JsonObject
  return metadata.testOnly === true && metadata.testPool === LOCAL_TEST_QUESTION_SOURCE && metadata.testHintVersion === 1
}

export interface LocalTestPoolImportCounts {
  inserted: number
  skipped: number
  eligible: number
}

export async function importLocalTestQuestionPool(
  client: PrismaClient,
  environment: TestPoolEnvironment = process.env,
): Promise<LocalTestPoolImportCounts> {
  assertLocalTestPoolEnvironment(environment)
  await assertLiveLocalTestPoolDatabase(async () => {
    const result = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    return result[0]?.name ?? ''
  })

  const audit = await inspectQuestionBank(DEFAULT_SOURCE_DIRECTORY)
  if (!audit.valid || audit.sourceDirectory !== 'web/questions' || audit.sourceFiles.length === 0) {
    throw new Error('Local test pool refused: the existing production source bank did not pass validation.')
  }
  const records = buildValidatedLocalTestPool(audit.normalizedRecords)
  const inserted = await client.$transaction(async (tx) => {
    await assertLiveLocalTestPoolDatabase(async () => {
      const result = await tx.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
      return result[0]?.name ?? ''
    })
    const ids = records.map((record) => record.id)
    const existing = await tx.question.findMany({
      where: { id: { in: ids } },
      include: { hint: true },
    })
    const existingById = new Map(existing.map((question) => [question.id, question]))
    for (const question of existing) {
      const record = records.find((candidate) => candidate.id === question.id)!
      const metadata = question.metadata && typeof question.metadata === 'object' && !Array.isArray(question.metadata)
        ? question.metadata as Prisma.JsonObject
        : null
      if (question.sourceFile !== LOCAL_TEST_QUESTION_SOURCE || !isTestMetadata(question.metadata)) {
        throw new Error(`Local test pool refused to replace a question not owned by this test pool (${question.id}).`)
      }
      if (question.promptAr !== record.promptAr || question.answer !== BigInt(record.answer) || question.category !== record.category
        || question.type !== record.type || metadata?.sourceQuestionFingerprint !== record.sourceFingerprint) {
        throw new Error(`Local test pool refused to overwrite a test question whose source content changed (${question.id}).`)
      }
      if (question.hint && (question.hint.source !== LOCAL_TEST_QUESTION_HINT_SOURCE || question.hint.approved
        || question.hint.range !== record.testHint.range || question.hint.accuracy !== record.testHint.accuracy || question.hint.note !== record.testHint.note)) {
        throw new Error(`Local test pool refused to replace a non-test or approved hint (${question.id}).`)
      }
    }

    let created = 0
    for (const record of records) {
      const metadata = {
        ...record.metadata,
        sourceQuestionFile: record.sourceFile,
        sourceQuestionFingerprint: record.sourceFingerprint,
        testOnly: true,
        testPool: LOCAL_TEST_QUESTION_SOURCE,
        testHintVersion: 1,
      } satisfies Prisma.InputJsonObject
      if (existingById.has(record.id)) {
        if (!existingById.get(record.id)?.hint) await tx.approvedQuestionHint.create({
          data: {
            questionId: record.id,
            range: record.testHint.range,
            accuracy: record.testHint.accuracy,
            note: record.testHint.note,
            approved: false,
            approvedAt: null,
            source: LOCAL_TEST_QUESTION_HINT_SOURCE,
          },
        })
        continue
      }
      await tx.question.create({
        data: {
          id: record.id,
          promptAr: record.promptAr,
          answer: BigInt(record.answer),
          category: record.category,
          type: record.type,
          difficulty: record.difficulty,
          locale: 'ar',
          source: 'Existing Samkaro bank; isolated local formula-hint test pool.',
          sourceFile: LOCAL_TEST_QUESTION_SOURCE,
          sourceRecordIndex: record.sourceRecordIndex,
          metadata,
          enabled: true,
          hint: { create: {
            range: record.testHint.range,
            accuracy: record.testHint.accuracy,
            note: record.testHint.note,
            approved: false,
            approvedAt: null,
            source: LOCAL_TEST_QUESTION_HINT_SOURCE,
          } },
        },
      })
      created += 1
    }
    const eligible = await tx.question.count({
      where: {
        id: { in: ids }, sourceFile: LOCAL_TEST_QUESTION_SOURCE, enabled: true,
        hint: { is: { approved: false, source: LOCAL_TEST_QUESTION_HINT_SOURCE, range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
      },
    })
    if (eligible !== records.length) throw new Error(`Local test pool contains ${eligible} eligible questions; expected ${records.length}.`)
    return { inserted: created, eligible }
  }, { isolationLevel: 'Serializable' })
  return { inserted: inserted.inserted, skipped: records.length - inserted.inserted, eligible: inserted.eligible }
}

export function isLocalTestQuestionMetadata(value: Prisma.JsonValue | null): boolean {
  return isTestMetadata(value)
}
