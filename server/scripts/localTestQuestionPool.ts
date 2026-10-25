import { PrismaClient } from '@prisma/client'
import { importLocalTestQuestionPool } from '../src/questions/localTestQuestionPool.js'

async function main(): Promise<void> {
  const prisma = new PrismaClient()
  try {
    const result = await importLocalTestQuestionPool(prisma)
    console.info(JSON.stringify({ pool: 'local-development-only', ...result, productionApprovalsChanged: 0 }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Local test question pool import failed.')
  process.exitCode = 1
})
