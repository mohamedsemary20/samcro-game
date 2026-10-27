import { AsyncLocalStorage } from 'node:async_hooks'

export interface OperationContext {
  correlationId: string
  source: 'http' | 'socket' | 'background'
  operation: string
  databaseQueryCount: number
  databaseDurationMs: number
  slowestDatabaseOperation: string | null
  slowestDatabaseDurationMs: number
}

const operationContext = new AsyncLocalStorage<OperationContext>()

export function runWithOperationContext<T>(context: Pick<OperationContext, 'correlationId' | 'source' | 'operation'>, callback: () => T): T {
  return operationContext.run({
    databaseQueryCount: 0,
    databaseDurationMs: 0,
    slowestDatabaseOperation: null,
    slowestDatabaseDurationMs: 0,
    ...context,
  }, callback)
}

export function currentOperationContext(): OperationContext | undefined {
  return operationContext.getStore()
}
