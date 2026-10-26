import { z } from 'zod';
export const guestSessionSchema = z.object({
    displayName: z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} _.-]+$/u),
}).strict();
export const createRoomSchema = z.object({
    capacity: z.number().int().min(3).max(7).default(7),
    idempotencyKey: z.string().uuid(),
}).strict();
export const joinRoomSchema = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,10}$/),
}).strict();
export const readySchema = z.object({ ready: z.boolean() }).strict();
export const roomIdSchema = z.object({ roomId: z.string().min(1).max(32) }).strict();
export const idempotencySchema = z.object({ idempotencyKey: z.string().uuid() }).strict();
export const guessSchema = z.object({
    value: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    idempotencyKey: z.string().uuid(),
}).strict();
export const betSchema = z.object({
    action: z.discriminatedUnion('type', [
        z.object({ type: z.literal('check') }).strict(),
        z.object({ type: z.literal('fold') }).strict(),
        z.object({ type: z.literal('call') }).strict(),
        z.object({ type: z.literal('raise'), amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(),
        z.object({ type: z.literal('all-in') }).strict(),
    ]),
    idempotencyKey: z.string().uuid(),
}).strict();
