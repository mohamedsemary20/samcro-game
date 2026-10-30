import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildApprovedOfflineQuestionBundle } from '../../packages/game-core/offlineQuestions.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = resolve(root, 'server/data/question-bank.normalized.json')
const reviewPath = resolve(root, 'server/data/question-bank-hints.review.json')
const outputPath = resolve(root, 'mobile/assets/offline-questions.json')
const [source, review] = await Promise.all([
  readFile(sourcePath, 'utf8').then((value) => JSON.parse(value) as unknown),
  readFile(reviewPath, 'utf8').then((value) => JSON.parse(value) as unknown),
])
const result = buildApprovedOfflineQuestionBundle(source, review)
const serialized = `${JSON.stringify(result.bundle, null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== serialized) {
    console.error('Offline question pack is stale. Run `npm run questions:export-mobile` to rebuild it from approved records.')
    process.exitCode = 1
  }
} else {
  await writeFile(outputPath, serialized, 'utf8')
}

console.log(`Mobile offline questions: ${result.approvedCandidates} explicitly approved; ${result.rejectedReviewRecords} review records remain excluded; ${result.validation.valid ? 'pack playable' : 'fewer than five approved questions'}.`)
