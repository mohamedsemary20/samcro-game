import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isolatedSchema = 'samkaro_question_test'

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: serverRoot, env: process.env, encoding: 'utf8' })
  const redact = (text) => text.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/giu, '[redacted PostgreSQL URL]')
  if (result.stdout) process.stdout.write(redact(result.stdout))
  if (result.stderr) process.stderr.write(redact(result.stderr))
  if (result.error) throw new Error('Could not run the isolated local integration step.')
  if (result.status !== 0) throw new Error('The isolated local integration step failed.')
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.SAMKARO_ENABLE_TEST_QUESTION_POOL !== undefined) {
    throw new Error('Local integration setup refuses production mode and the test question pool.')
  }
  if (!process.env.DATABASE_URL) throw new Error('Load the local server/.env before running the integration test.')
  let databaseUrl
  try { databaseUrl = new URL(process.env.DATABASE_URL) }
  catch { throw new Error('The local integration DATABASE_URL is invalid.') }
  const hostname = databaseUrl.hostname.toLowerCase()
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)
      || decodeURIComponent(databaseUrl.pathname.slice(1)).split('/')[0] !== 'samkaro_dev') {
    throw new Error('Local integration requires the loopback samkaro_dev database.')
  }
  process.env.NODE_ENV = 'development'
  process.env.SAMKARO_RUN_DB_INTEGRATION = '1'

  databaseUrl.searchParams.set('schema', 'public')
  const identityClient = new PrismaClient({ datasourceUrl: databaseUrl.toString() })
  try {
    const identity = await identityClient.$queryRaw`SELECT current_database() AS database_name`
    if (identity[0]?.database_name !== 'samkaro_dev') throw new Error('Connected database is not samkaro_dev.')
    await identityClient.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${isolatedSchema}"`)
  } finally {
    await identityClient.$disconnect()
  }

  databaseUrl.searchParams.set('schema', isolatedSchema)
  process.env.DATABASE_URL = databaseUrl.toString()
  run([path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'])
  run(['--import', './scripts/osUserInfoCompat.mjs', '--import', 'tsx', 'scripts/questionBankCli.ts', 'import'])
  run([path.join(serverRoot, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'test/integration/roomLifecycle.integration.test.ts', '--maxWorkers=1'])
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Local integration setup failed.')
  process.exitCode = 1
})
