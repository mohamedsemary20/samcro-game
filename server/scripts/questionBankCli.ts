import { inspectQuestionBank, renderQuestionBankReport, writeQuestionBankArtifacts } from '../src/questions/questionBank.js'
import { collectApprovedGameplayHints, readHintReviewArtifact, writeQuestionBankReviewArtifacts } from '../src/questions/questionBankReview.js'

async function main(): Promise<void> {
  const command = process.argv[2]
  if (command !== 'validate' && command !== 'import') throw new Error('Usage: questions:validate | questions:import')
  const sourceDirectory = process.env.SAMKARO_QUESTION_SOURCE_DIR
  const audit = await inspectQuestionBank(sourceDirectory)
  await writeQuestionBankArtifacts(audit)
  await writeQuestionBankReviewArtifacts(audit)

  if (command === 'validate') {
    console.info(renderQuestionBankReport(audit))
    console.info('Normalized artifact: data/question-bank.normalized.json')
    console.info('Reports: reports/question-bank-report.json and reports/question-bank-report.md')
    console.info('Editorial review: reports/question-bank-review.md and reports/question-bank-hints.review.md')
    // Safe exclusions (for example decimal answers unsupported by the current BigInt model)
    // are reported but do not make validation itself fail. Malformed files and conflicting IDs do.
    if (!audit.valid) process.exitCode = 2
    return
  }

  const reviewedHints = await readHintReviewArtifact()
  const { approved } = collectApprovedGameplayHints(reviewedHints, audit.normalizedRecords)
  if (!approved.size) console.info('No complete explicitly approved gameplay hints were found. No source questions will be inserted; the importer will only check for source-owned rows that need deactivation.')

  const [{ PrismaClient }, { importQuestionBank }] = await Promise.all([
    import('@prisma/client'),
    import('../src/questions/questionBankImporter.js'),
  ])
  const prisma = new PrismaClient()
  try {
    const counts = await importQuestionBank(prisma, audit, reviewedHints)
    await writeQuestionBankArtifacts(audit, counts)
    console.info(renderQuestionBankReport(audit, counts))
    if (!approved.size) console.info('No explicitly approved gameplay hints were found; no database writes were made.')
    console.info('Import report updated: reports/question-bank-report.json and reports/question-bank-report.md')
    if (counts.rejected > 0) process.exitCode = 2
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import failure.'
    await writeQuestionBankArtifacts(audit, null, message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Question bank command failed.')
  process.exitCode = 1
})
