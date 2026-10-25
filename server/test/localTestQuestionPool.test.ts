import { describe, expect, it } from 'vitest'
import { inspectQuestionBank, DEFAULT_SOURCE_DIRECTORY } from '../src/questions/questionBank.js'
import {
  assertLiveLocalTestPoolDatabase,
  assertLocalTestPoolEnvironment,
  buildValidatedLocalTestPool,
  generateLocalTestHint,
  generateLocalTestHintVariant,
  LOCAL_TEST_QUESTION_FLAG,
} from '../src/questions/localTestQuestionPool.js'

const validEnvironment = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://local:test@localhost:5432/samkaro_dev?schema=public',
  [LOCAL_TEST_QUESTION_FLAG]: '1',
}

describe('local development question-pool safeguards', () => {
  it('creates bounded small, large, year, and zero-answer hints without revealing the exact answer', () => {
    for (const [answer, type] of [[7, 'number'], [8_500_000, 'number'], [2024, 'year'], [0, 'number']] as const) {
      const hint = generateLocalTestHint(answer, type)
      expect(Object.values(hint).every((value) => value.trim().length > 0)).toBe(true)
      expect(hint.range.length).toBeLessThanOrEqual(120)
      expect(hint.accuracy.length).toBeLessThanOrEqual(120)
      expect(hint.note.length).toBeLessThanOrEqual(240)
      expect(new RegExp(`(^|\\D)${answer}(?=$|\\D)`, 'u').test(hint.range + hint.accuracy + hint.note)).toBe(false)
      if (answer > 0) {
        const bounds = hint.range.split(' – ').map((value) => Number(value.replaceAll(',', '')))
        expect(bounds).toHaveLength(2)
        expect(bounds[0]).toBeLessThan(answer)
        expect(bounds[1]).toBeGreaterThan(answer)
      }
    }
  })

  it('assigns three stable, distinct, mathematically valid variants for one question', () => {
    for (const [answer, type] of [[7, 'number'], [1_000_000, 'number'], [2024, 'year'], [0, 'number']] as const) {
      const hints = [0, 1, 2].map((variant) => generateLocalTestHintVariant(answer, type, variant))
      if (answer === 0) expect(new Set(hints.map((hint) => hint.range)).size).toBe(1)
      else expect(new Set(hints.map((hint) => hint.range)).size).toBe(3)
      expect(hints).toEqual([0, 1, 2].map((variant) => generateLocalTestHintVariant(answer, type, variant)))
      if (answer === 0) continue // The privacy-safe small-values range is intentionally non-numeric.
      for (const hint of hints) {
        const [low, high] = hint.range.split(' – ').map((value) => Number(value.replaceAll(',', '')))
        expect(Number.isSafeInteger(low)).toBe(true)
        expect(Number.isSafeInteger(high)).toBe(true)
        expect(low).toBeLessThanOrEqual(answer)
        expect(high).toBeGreaterThanOrEqual(answer)
        expect(hint.range.length).toBeLessThanOrEqual(120)
        expect(hint.accuracy.trim()).not.toBe('')
      }
    }
  })

  it('reuses a valid variant when a round has more players than available variants', () => {
    expect(generateLocalTestHintVariant(120, 'number', 0)).toEqual(generateLocalTestHintVariant(120, 'number', 5))
  })

  it('validates and generates hints for the existing normalized bank without changing its source data', async () => {
    const audit = await inspectQuestionBank(DEFAULT_SOURCE_DIRECTORY)
    const records = buildValidatedLocalTestPool(audit.normalizedRecords)
    expect(audit.valid).toBe(true)
    expect(records).toHaveLength(169)
    expect(records.every((record) => record.testHint.range && record.testHint.accuracy && record.testHint.note)).toBe(true)
  })

  it('requires development, the explicit test flag, and the exact configured database', () => {
    expect(() => assertLocalTestPoolEnvironment(validEnvironment)).not.toThrow()
    expect(() => assertLocalTestPoolEnvironment({ ...validEnvironment, NODE_ENV: 'production' })).toThrow(/NODE_ENV=development/)
    expect(() => assertLocalTestPoolEnvironment({ ...validEnvironment, DATABASE_URL: validEnvironment.DATABASE_URL.replace('samkaro_dev', 'samkaro') })).toThrow(/samkaro_dev/)
    expect(() => assertLocalTestPoolEnvironment({ ...validEnvironment, [LOCAL_TEST_QUESTION_FLAG]: undefined })).toThrow(/SAMKARO_ENABLE_TEST_QUESTION_POOL=1/)
  })

  it('refuses a live database identity that differs from samkaro_dev', async () => {
    await expect(assertLiveLocalTestPoolDatabase(async () => 'samkaro')).rejects.toThrow(/live database is not samkaro_dev/)
    await expect(assertLiveLocalTestPoolDatabase(async () => 'samkaro_dev')).resolves.toBeUndefined()
  })
})
