import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

export function productionReleaseTarget(environment) {
  if (environment.NODE_ENV !== 'production') throw new Error('Production release requires NODE_ENV=production.')
  if (environment.SAMKARO_ENABLE_TEST_QUESTION_POOL !== undefined) {
    throw new Error('Production release refuses SAMKARO_ENABLE_TEST_QUESTION_POOL.')
  }
  const expectedHost = environment.SAMKARO_PRODUCTION_DATABASE_HOST?.trim().toLowerCase()
  const expectedDatabase = environment.SAMKARO_PRODUCTION_DATABASE_NAME?.trim()
  if (!expectedHost || !expectedDatabase || !environment.DATABASE_URL) {
    throw new Error('Set DATABASE_URL, SAMKARO_PRODUCTION_DATABASE_HOST, and SAMKARO_PRODUCTION_DATABASE_NAME for the intended production database.')
  }

  let databaseUrl
  try { databaseUrl = new URL(environment.DATABASE_URL) }
  catch { throw new Error('DATABASE_URL must be a PostgreSQL connection URL.') }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.')
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1)).split('/')[0]
  const address = databaseUrl.host.toLowerCase()
  if (['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname.toLowerCase())
      || databaseUrl.hostname.toLowerCase().endsWith('.localhost')
      || databaseUrl.hostname.toLowerCase().endsWith('.local')
      || /(^|[-_])(dev|test)([-_]|$)/iu.test(databaseName)) {
    throw new Error('Production release refuses a local, development, or test database target.')
  }
  if (!databaseName || address !== expectedHost || databaseName !== expectedDatabase) {
    throw new Error('DATABASE_URL does not match the explicitly configured production database host and name.')
  }

  return { address, databaseName }
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', env: process.env })
  const redact = (text) => text.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/giu, '[redacted PostgreSQL URL]')
  if (result.stdout) process.stdout.write(redact(result.stdout))
  if (result.stderr) process.stderr.write(redact(result.stderr))
  if (result.error) throw new Error(`Could not run production release step: ${path.basename(command)}.`)
  if (result.status !== 0) throw new Error(`Production release step failed: ${path.basename(command)}.`)
}

async function verifyDatabaseIdentity(expectedDatabase) {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  try {
    const result = await prisma.$queryRaw`SELECT current_database() AS database_name`
    if (result[0]?.database_name !== expectedDatabase) {
      throw new Error('Connected PostgreSQL database does not match SAMKARO_PRODUCTION_DATABASE_NAME.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function verifyQuestionReadiness() {
  const { PrismaQuestionRepository, selectQuestionsForMatch } = await import('../src/questions/questionRepository.js')
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
  try {
    const count = await prisma.$transaction(async (transaction) =>
      (await selectQuestionsForMatch(transaction, new PrismaQuestionRepository())).length)
    console.info(`Production question readiness verified: database=${productionReleaseTarget(process.env).databaseName}, selectableQuestions=${count}.`)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const target = productionReleaseTarget(process.env)
  const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const node = process.execPath
  const cli = path.join(serverRoot, 'dist', 'server', 'scripts', 'questionBankCli.js')

  // Validate local source records before making any production database changes.
  run(node, ['--import', path.join(serverRoot, 'scripts', 'osUserInfoCompat.mjs'), cli, 'validate'])
  await verifyDatabaseIdentity(target.databaseName)
  run(node, [path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'])
  run(node, ['--import', path.join(serverRoot, 'scripts', 'osUserInfoCompat.mjs'), cli, 'import'])
  await verifyQuestionReadiness()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Production release failed.'
    console.error(message.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/giu, '[redacted PostgreSQL URL]'))
    process.exitCode = 1
  })
}
