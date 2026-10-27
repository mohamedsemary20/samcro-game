import type { PrismaClient } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { inspectQuestionBank } from '../src/questions/questionBank.js'
import { importQuestionBank } from '../src/questions/questionBankImporter.js'

describe('structural question-bank import', () => {
  it('updates an owned record to the validated source, preserves legacy hints, and skips repeat imports', async () => {
    const audit = await inspectQuestionBank()
    const record = audit.normalizedRecords[0]!
    audit.normalizedRecords = [record]
    audit.rejectedRecords = []
    audit.playableCount = 1

    const legacyHint = { approved: false, range: 'legacy range', accuracy: 'legacy accuracy', note: 'legacy note' }
    const rows: Array<Record<string, unknown>> = [{
      id: record.id, promptAr: record.promptAr, answer: BigInt(record.answer - 1), category: record.category,
      type: record.type, difficulty: record.difficulty, locale: 'ar', source: record.source,
      sourceFile: record.sourceFile, sourceRecordIndex: record.sourceRecordIndex, metadata: record.metadata,
      enabled: false, hint: legacyHint,
    }]
    const tx = {
      question: {
        findMany: async () => rows,
        create: async ({ data }: { data: Record<string, unknown> }) => { rows.push({ ...data, hint: legacyHint }) },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const target = rows.find((row) => row.id === where.id)!
          Object.assign(target, data)
        },
      },
    }
    const prisma = { $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>) => operation(tx) } as unknown as PrismaClient

    expect(await importQuestionBank(prisma, audit)).toEqual({ inserted: 0, updated: 1, skipped: 0, rejected: 0 })
    expect(rows[0]).toMatchObject({ id: record.id, enabled: true, promptAr: record.promptAr, answer: BigInt(record.answer), sourceFile: record.sourceFile, hint: legacyHint })
    expect(await importQuestionBank(prisma, audit)).toEqual({ inserted: 0, updated: 0, skipped: 1, rejected: 0 })
  })

  it('rejects malformed or duplicate source banks before opening a transaction', async () => {
    const audit = await inspectQuestionBank()
    audit.valid = false
    let transactions = 0
    const prisma = { $transaction: async () => { transactions += 1 } } as unknown as PrismaClient
    await expect(importQuestionBank(prisma, audit)).rejects.toThrow(/invalid JSON structure or duplicate stable IDs/)
    expect(transactions).toBe(0)
  })

  it('keeps the import atomic when a database write fails mid-transaction', async () => {
    const audit = await inspectQuestionBank()
    const records = audit.normalizedRecords.filter((record) => record.playable).slice(0, 2)
    expect(records).toHaveLength(2)
    audit.normalizedRecords = records
    audit.rejectedRecords = []

    const original = {
      id: records[0]!.id,
      promptAr: 'old prompt',
      answer: BigInt(records[0]!.answer - 1),
      category: records[0]!.category,
      type: records[0]!.type,
      difficulty: records[0]!.difficulty,
      locale: 'ar',
      source: records[0]!.source,
      sourceFile: records[0]!.sourceFile,
      sourceRecordIndex: records[0]!.sourceRecordIndex,
      metadata: records[0]!.metadata,
      enabled: false,
    }
    let rows: Array<Record<string, unknown>> = [{ ...original }]
    const tx = {
      question: {
        findMany: async () => rows,
        create: async () => { throw new Error('simulated database write failure') },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          Object.assign(rows.find((row) => row.id === where.id)!, data)
        },
      },
    }
    let transactionOptions: unknown
    const prisma = {
      $transaction: async (operation: (transaction: typeof tx) => Promise<unknown>, options: unknown) => {
        transactionOptions = options
        const snapshot = rows.map((row) => ({ ...row }))
        try {
          return await operation(tx)
        } catch (error) {
          rows = snapshot
          throw error
        }
      },
    } as unknown as PrismaClient

    await expect(importQuestionBank(prisma, audit)).rejects.toThrow('simulated database write failure')
    expect(rows).toEqual([original])
    expect(transactionOptions).toEqual({ isolationLevel: 'Serializable', maxWait: 10_000, timeout: 120_000 })
  })
})
