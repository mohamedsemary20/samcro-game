import { randomUUID } from 'node:crypto'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { HttpError } from './errors.js'
import { apiRouter } from './routes.js'
import { currentOperationContext, runWithOperationContext } from '../observability/operationContext.js'

export const app = express()
app.disable('x-powered-by')
// Trust only explicitly configured proxy CIDRs. Keep forwarded headers disabled
// until Abasthan's actual proxy addresses and path are verified.
app.set('trust proxy', env.trustedProxyCidrs)
const socketOrigin = new URL(env.SOCKET_PUBLIC_ORIGIN).origin
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", socketOrigin],
      'connect-src': ["'self'", ...env.trustedOrigins, socketOrigin],
    },
  },
}))
app.use((request, response, next) => {
  const requestId = randomUUID()
  const startedAt = performance.now()
  let requestLogged = false
  response.setHeader('X-Request-Id', requestId)
  response.locals.requestId = requestId
  runWithOperationContext({ correlationId: requestId, source: 'http', operation: request.method }, () => {
    const logCompletion = (outcome: 'completed' | 'client_disconnected') => {
      if (requestLogged) return
      requestLogged = true
      const context = currentOperationContext()
      logger.info('http_request_completed', {
        correlationId: requestId,
        method: request.method,
        operation: request.route?.path ? `${request.baseUrl}${request.route.path}` : request.path,
        outcome,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        databaseQueryCount: context?.databaseQueryCount ?? 0,
        databaseDurationMs: Math.round((context?.databaseDurationMs ?? 0) * 100) / 100,
        slowestDatabaseOperation: context?.slowestDatabaseOperation ?? null,
        slowestDatabaseDurationMs: context?.slowestDatabaseDurationMs ?? 0,
      })
    }
    response.once('finish', () => logCompletion('completed'))
    response.once('close', () => { if (!response.writableFinished) logCompletion('client_disconnected') })
    next()
  })
})
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.trustedOrigins.has(origin)) callback(null, true)
    else callback(new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
}))
app.use((request, _response, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.headers.cookie) {
    const origin = request.headers.origin
    if (!origin || !env.trustedOrigins.has(origin)) return next(new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.'))
  }
  next()
})
app.use(express.json({ limit: '16kb', strict: true }))
app.use('/api/v1', apiRouter)
app.use((_request, _response, next) => next(new HttpError(404, 'NOT_FOUND', 'Resource not found.')))

const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (response.headersSent) return
  const requestId = response.locals.requestId as string | undefined
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message, requestId } })
    return
  }
  const zodIssues = (error as { issues?: Array<{ path: PropertyKey[] }> }).issues
  if (zodIssues) {
    response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Request data is invalid.', requestId } })
    return
  }
  logger.error('http_request_failed', { requestId, method: request.method, path: request.path, errorType: error instanceof Error ? error.name : 'unknown' })
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.', requestId } })
}
app.use(errorHandler)
