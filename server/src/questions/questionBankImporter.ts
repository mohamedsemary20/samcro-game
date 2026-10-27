import type { PrismaClient, Prisma } from '@prisma/client'
import type { QuestionBankAudit, QuestionBankRecord, DatabaseImportCounts } from './questionBank.js'
import { planQuestionImport } from './questionBankImportPolicy.js'

export class QuestionImportConflictError extends Error {
  constructor(readonly conflicts: Array<{ id: string; reason: string }>) {
    super(`Question import conflicts: ${conflicts.map(({ id, reason }) => `${id} (${reason})`).join(', ')}`)
    this.name = 'QuestionImportConflictError'
  }
}

function questionData(record: QuestionBankRecord) {
  return {
    promptAr: record.promptAr,
    answer: BigInt(record.answer),
    category: record.category,
    type: record.type,
    difficulty: record.difficulty,
    locale: 'ar',
    source: record.source,
    sourceFile: record.sourceFile,
    sourceRecordIndex: record.sourceRecordIndex,
    metadata: record.metadata as Prisma.InputJsonValue,
  }
}

/** Imports only structurally valid source records and activates them for server-generated hints. */
export async function importQuestionBank(prisma: PrismaClient, audit: QuestionBankAudit): Promise<DatabaseImportCounts> {
  if (!audit.valid) throw new Error('The question bank has invalid JSON structure or duplicate stable IDs; no database changes were made.')
  if (!audit.normalizedRecords.length) throw new Error('The source bank contains no safely importable records; no database changes were made.')

  const eligibleRecords = audit.normalizedRecords.filter((record) => record.playable)
  const counts: DatabaseImportCounts = { inserted: 0, updated: 0, skipped: 0, rejected: audit.rejectedRecords.length }
  return prisma.$transaction(async (transaction) => {
    const sourceRows = [
      ...audit.normalizedRecords.map((record) => ({ id: record.id, sourceFile: record.sourceFile })),
      ...audit.rejectedRecords.filter((record) => record.collection !== 'removed' && record.id).map((record) => ({ id: record.id!, sourceFile: record.sourceFile })),
    ]
    const existing = await transaction.question.findMany({
      where: { id: { in: [...new Set(sourceRows.map((record) => record.id))] } },
    })
    const existingById = new Map(existing.map((question) => [question.id, question]))

    // Preserve legacy hint rows and deactivate only source-owned rows that are now malformed.
    const eligibleIds = new Set(eligibleRecords.map((record) => record.id))
    for (const sourceRow of sourceRows) {
      if (eligibleIds.has(sourceRow.id)) continue
      const prior = existingById.get(sourceRow.id)
      if (!prior || prior.sourceFile !== sourceRow.sourceFile || !prior.enabled) continue
      await transaction.question.update({ where: { id: prior.id }, data: { enabled: false } })
      counts.updated += 1
    }

    const plan = planQuestionImport(eligibleRecords, existing)
    const conflicts = plan.filter((item) => item.kind === 'conflict').map((item) => ({ id: item.record.id, reason: item.reason }))
    if (conflicts.length) throw new QuestionImportConflictError(conflicts)

    for (const operation of plan) {
      const data = questionData(operation.record)
      if (operation.kind === 'insert') {
        await transaction.question.create({ data: { id: operation.record.id, ...data, enabled: true } })
        counts.inserted += 1
      } else {
        const prior = existingById.get(operation.record.id)!
        if (operation.kind === 'update' || !prior.enabled) {
          await transaction.question.update({ where: { id: operation.record.id }, data: { ...data, enabled: true } })
          counts.updated += 1
        } else {
          counts.skipped += 1
        }
      }
    }
    return counts
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 120_000 })
}
