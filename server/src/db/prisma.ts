import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger.js'
import { currentOperationContext } from '../observability/operationContext.js'

const instrumentedPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
}).$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const startedAt = performance.now()
        try {
          return await query(args)
        } finally {
          const context = currentOperationContext()
          const durationMs = Math.round((performance.now() - startedAt) * 100) / 100
          if (context) {
            context.databaseQueryCount += 1
            context.databaseDurationMs += durationMs
            if (durationMs > context.slowestDatabaseDurationMs) {
              context.slowestDatabaseDurationMs = durationMs
              context.slowestDatabaseOperation = `${model}.${operation}`
            }
            if (durationMs >= 250) logger.warn('slow_database_operation', {
              correlationId: context.correlationId,
              source: context.source,
              operation: context.operation,
              databaseOperation: `${model}.${operation}`,
              durationMs,
            })
          } else {
            logger.info('database_operation_completed', { model, action: operation, durationMs })
          }
        }
      },
    },
  },
})

// Keep the generated TransactionClient types stable while retaining the
// instrumentation at runtime on the extended client.
export const prisma = instrumentedPrisma as unknown as PrismaClient

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  logger.info('database_disconnected')
}
