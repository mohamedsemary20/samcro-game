import type { PrismaClient, Prisma } from '@prisma/client'
import type { QuestionBankAudit, QuestionBankRecord, DatabaseImportCounts } from './questionBank.js'
import { collectApprovedGameplayHints, type HintReviewArtifact } from './questionBankReview.js'
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

export async function importQuestionBank(prisma: PrismaClient, audit: QuestionBankAudit, hintReview: HintReviewArtifact): Promise<DatabaseImportCounts> {
  if (!audit.valid) throw new Error('The question bank has invalid JSON structure or duplicate stable IDs; no database changes were made.')
  if (!audit.normalizedRecords.length) throw new Error('The source bank contains no safely importable records; no database changes were made.')

  const { approved: approvedHints, rejected: badApprovals } = collectApprovedGameplayHints(hintReview, audit.normalizedRecords)
  const approvedRecords = audit.normalizedRecords.filter((record) => approvedHints.has(record.id))
  const counts: DatabaseImportCounts = {
    inserted: 0,
    updated: 0,
    skipped: audit.normalizedRecords.length - approvedRecords.length,
    rejected: audit.rejectedRecords.length + badApprovals.length,
  }
  return prisma.$transaction(async (transaction) => {
    const sourceRows = [
      ...audit.normalizedRecords.map((record) => ({ id: record.id, sourceFile: record.sourceFile, countedAsSkipped: true })),
      ...audit.rejectedRecords.filter((record) => record.collection !== 'removed' && record.id).map((record) => ({ id: record.id!, sourceFile: record.sourceFile, countedAsSkipped: false })),
    ]
    const existing = await transaction.question.findMany({
      where: { id: { in: [...new Set(sourceRows.map((record) => record.id))] } },
      include: { hint: { select: { range: true, accuracy: true, note: true, approved: true, approvedAt: true } } },
    })
    const existingById = new Map(existing.map((question) => [question.id, question]))

    // Revoke any previously playable source-owned row that is no longer approved or safely normalizable.
    const approvedIds = new Set(approvedRecords.map((record) => record.id))
    for (const sourceRow of sourceRows) {
      if (approvedIds.has(sourceRow.id)) continue
      const prior = existingById.get(sourceRow.id)
      if (!prior || prior.sourceFile !== sourceRow.sourceFile) continue
      if (prior.enabled || prior.hint?.approved) {
        await transaction.question.update({ where: { id: prior.id }, data: { enabled: false } })
        await transaction.approvedQuestionHint.updateMany({
          where: { questionId: prior.id, approved: true },
          data: { approved: false, approvedAt: null },
        })
        if (sourceRow.countedAsSkipped) counts.skipped -= 1
        counts.updated += 1
      }
    }

    const plan = planQuestionImport(approvedRecords, existing)
    const conflicts = plan.filter((item) => item.kind === 'conflict').map((item) => ({ id: item.record.id, reason: item.reason }))
    if (conflicts.length) throw new QuestionImportConflictError(conflicts)

    for (const operation of plan) {
      const data = questionData(operation.record)
      const approvedHint = approvedHints.get(operation.record.id)!
      if (operation.kind === 'insert') {
        await transaction.question.create({ data: { id: operation.record.id, ...data, enabled: true } })
      } else if (operation.kind === 'update') {
        await transaction.question.update({
          where: { id: operation.record.id },
          data: { ...data, enabled: true },
        })
        if (operation.revokeHintApproval) await transaction.approvedQuestionHint.updateMany({
          where: { questionId: operation.record.id, approved: true },
          data: { approved: false, approvedAt: null },
        })
      } else if (existingById.get(operation.record.id)?.enabled !== true) {
        // An explicit source-matched editorial approval is the only path that enables a question.
        await transaction.question.update({ where: { id: operation.record.id }, data: { enabled: true } })
      }
      const existingHint = existingById.get(operation.record.id)?.hint
      const hintChanged = operation.kind === 'insert' || (operation.kind === 'update' && operation.revokeHintApproval) || !existingHint
        || !existingHint.approved
        || existingHint.range !== approvedHint.range
        || existingHint.accuracy !== approvedHint.accuracy
        || existingHint.note !== approvedHint.note
      if (hintChanged) {
        await transaction.approvedQuestionHint.upsert({
          where: { questionId: operation.record.id },
          create: {
            questionId: operation.record.id,
            range: approvedHint.range,
            accuracy: approvedHint.accuracy,
            note: approvedHint.note,
            source: `review-artifact:${operation.record.sourceFile}`,
            approved: true,
            approvedAt: new Date(),
          },
          update: {
            range: approvedHint.range,
            accuracy: approvedHint.accuracy,
            note: approvedHint.note,
            source: `review-artifact:${operation.record.sourceFile}`,
            approved: true,
            approvedAt: new Date(),
          },
        })
      }
      if (operation.kind === 'insert') counts.inserted += 1
      else if (operation.kind === 'update' || hintChanged || existingById.get(operation.record.id)?.enabled !== true) counts.updated += 1
      else counts.skipped += 1
    }
    return counts
  }, { isolationLevel: 'Serializable' })
}

