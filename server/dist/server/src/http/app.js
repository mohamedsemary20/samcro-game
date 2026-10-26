import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { HttpError } from './errors.js';
import { apiRouter } from './routes.js';
export const app = express();
app.disable('x-powered-by');
const socketOrigin = new URL(env.SOCKET_PUBLIC_ORIGIN).origin;
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", socketOrigin],
            'connect-src': ["'self'", ...env.trustedOrigins, socketOrigin],
        },
    },
}));
app.use((request, response, next) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.locals.requestId = requestId;
    next();
});
app.use(cors({
    origin(origin, callback) {
        if (!origin || env.trustedOrigins.has(origin))
            callback(null, true);
        else
            callback(new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
}));
app.use((request, _response, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.headers.cookie) {
        const origin = request.headers.origin;
        if (!origin || !env.trustedOrigins.has(origin))
            return next(new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.'));
    }
    next();
});
app.use(express.json({ limit: '16kb', strict: true }));
app.use('/api/v1', apiRouter);
app.use((_request, _response, next) => next(new HttpError(404, 'NOT_FOUND', 'Resource not found.')));
const errorHandler = (error, request, response, _next) => {
    if (response.headersSent)
        return;
    const requestId = response.locals.requestId;
    if (error instanceof HttpError) {
        response.status(error.status).json({ error: { code: error.code, message: error.message, requestId } });
        return;
    }
    const zodIssues = error.issues;
    if (zodIssues) {
        response.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Request data is invalid.', requestId } });
        return;
    }
    logger.error('http_request_failed', { requestId, method: request.method, path: request.path, error: error instanceof Error ? error.message : 'unknown' });
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.', requestId } });
};
app.use(errorHandler);
