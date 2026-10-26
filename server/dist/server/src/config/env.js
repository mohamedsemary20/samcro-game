import { z } from 'zod';
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.string().min(1),
    TRUSTED_ORIGINS: z.string().default('http://localhost:5173'),
    SOCKET_PUBLIC_ORIGIN: z.string().url().default('http://localhost:3001'),
    COOKIE_NAME: z.string().min(1).default('samkaro_session'),
    COOKIE_SECURE: z.stringbool().default(false),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    RECONNECT_GRACE_SECONDS: z.coerce.number().int().min(10).max(300).default(60),
    ROOM_CODE_LENGTH: z.coerce.number().int().min(6).max(10).default(8),
    ROOM_CODE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(10),
    GOLDEN_HINT_PROBABILITY: z.coerce.number().min(0).max(1).default(0),
    SAMKARO_ENABLE_TEST_QUESTION_POOL: z.enum(['1']).optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error(JSON.stringify({ level: 'error', event: 'invalid_environment', issues: parsed.error.issues }));
    throw new Error('Server environment is invalid');
}
export const env = {
    ...parsed.data,
    trustedOrigins: new Set(parsed.data.TRUSTED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)),
    sessionTtlMs: parsed.data.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    reconnectGraceMs: parsed.data.RECONNECT_GRACE_SECONDS * 1000,
};
