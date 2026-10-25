import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { inspectQuestionBank, parseNumericAnswer } from '../src/questions/questionBank.js'

describe('Samkaro question bank inspection', () => {
  it('parses every discovered source record and keeps only safe integer candidates normalized', async () => {
    const audit = await inspectQuestionBank()
    expect(audit.sourceFiles).toContain('web/questions/trivia_clean.json')
    expect(audit.totalSourceRecords).toBe(200)
    expect(audit.candidateRecords).toBe(171)
    expect(audit.sourceExcludedRecords).toBe(29)
    expect(audit.normalizedRecords).toHaveLength(169)
    expect(audit.rejectedRecords).toHaveLength(2)
    expect(audit.missingHintCount).toBe(171)
    expect(audit.playableCount).toBe(0)
    expect(audit.duplicateIds).toHaveLength(0)
    expect(audit.exactDuplicateQuestions).toHaveLength(0)
    expect(audit.nearDuplicateQuestions.length).toBeGreaterThan(0)
    expect(audit.categories).toEqual({ '\u0643\u0631\u0629 \u0627\u0644\u0642\u062f\u0645': 82, '\u0645\u0633\u0644\u0633\u0644\u0627\u062a': 89 })
    expect(audit.normalizedRecords.find((record) => record.id === 'football_001')).toMatchObject({ type: 'year', answer: 1930, approvedHint: null, playable: false })
    expect(audit.normalizedRecords.find((record) => record.id === 'football_002')).toMatchObject({ type: 'number', metadata: { originalType: 'count' } })
    expect(audit.rejectedRecords.map((record) => record.id)).toEqual(expect.arrayContaining(['football_027', 'football_066']))
  })

  it('handles Arabic and Western digits only when separator meaning is unambiguous', () => {
    expect(parseNumericAnswer(42)).toEqual({ ok: true, value: 42, kind: 'integer' })
    expect(parseNumericAnswer('\u0661\u0662\u0663\u0664')).toEqual({ ok: true, value: 1234, kind: 'integer' })
    expect(parseNumericAnswer('\u0661\u066c\u0662\u0663\u0664')).toEqual({ ok: true, value: 1234, kind: 'integer' })
    expect(parseNumericAnswer('1 234')).toEqual({ ok: true, value: 1234, kind: 'integer' })
    expect(parseNumericAnswer('1,234,567')).toEqual({ ok: true, value: 1234567, kind: 'integer' })
    expect(parseNumericAnswer('\u0661\u066b\u0665')).toEqual({ ok: true, value: 1.5, kind: 'decimal' })
    expect(parseNumericAnswer('1,234.5')).toEqual({ ok: true, value: 1234.5, kind: 'decimal' })
    expect(parseNumericAnswer('1,234')).toEqual({ ok: false, reason: 'ambiguous-number' })
    expect(parseNumericAnswer('1.234')).toEqual({ ok: false, reason: 'ambiguous-number' })
    expect(parseNumericAnswer('12.34')).toEqual({ ok: false, reason: 'ambiguous-number' })
    expect(parseNumericAnswer('12-14')).toEqual({ ok: false, reason: 'invalid-number' })
    expect(parseNumericAnswer(null)).toEqual({ ok: false, reason: 'missing-answer' })
  })

  it('reports duplicate IDs, exact prompts, near prompts, and unsupported types without merging records', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'samkaro-bank-'))
    try {
      await mkdir(path.join(directory, 'nested'))
      const q1 = '\u0643\u0645 \u0639\u062f\u062f \u0627\u0644\u0646\u062c\u0648\u0645 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u062b\u0627\u0644\u061f'
      const q2 = '\u0643\u0645 \u0639\u062f\u062f \u0627\u0644\u0646\u062c\u0648\u0645 \u0628\u0647\u0630\u0627 \u0627\u0644\u0645\u062b\u0627\u0644\u061f'
      const records = [
        { id: 'duplicate', q: q1, answer: 12, type: 'count', category: 'demo' },
        { id: 'duplicate', q: q1, answer: 12, type: 'count', category: 'demo' },
        { id: 'near', q: q2, answer: 12, type: 'count', category: 'demo' },
        { id: 'unsupported', q: '\u0645\u0627 \u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u062b\u0627\u0644\u061f', answer: 12, type: 'range', category: 'demo' },
      ]
      await writeFile(path.join(directory, 'nested', 'fixture.json'), JSON.stringify(records))
      const audit = await inspectQuestionBank(directory)
      expect(audit.sourceFiles).toHaveLength(1)
      expect(audit.duplicateIds.map(({ id }) => id)).toContain('duplicate')
      expect(audit.exactDuplicateQuestions).toHaveLength(1)
      expect(audit.nearDuplicateQuestions.length).toBeGreaterThan(0)
      expect(audit.rejectedRecords.some((record) => record.reason.startsWith('unsupported-question-type'))).toBe(true)
      expect(audit.normalizedRecords.map((record) => record.id)).not.toContain('duplicate')
      expect(audit.valid).toBe(false)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })

  it('reports malformed JSON and does not normalize its records', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'samkaro-invalid-bank-'))
    try {
      await writeFile(path.join(directory, 'broken.json'), '{ invalid')
      const audit = await inspectQuestionBank(directory)
      expect(audit.invalidJsonFiles).toHaveLength(1)
      expect(audit.valid).toBe(false)
      expect(audit.normalizedRecords).toHaveLength(0)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
