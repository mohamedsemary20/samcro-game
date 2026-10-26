import { describe, expect, it } from 'vitest';
import { betSchema, createRoomSchema, guessSchema } from '../src/domain/schemas.js';
describe('request schemas at multiplayer boundaries', () => {
    it('accepts the minimum and maximum supported room capacities and rejects outside values', () => {
        const key = 'a77ebc23-31be-4a99-a277-f7a8c90f9a11';
        expect(createRoomSchema.parse({ capacity: 3, idempotencyKey: key }).capacity).toBe(3);
        expect(createRoomSchema.parse({ capacity: 7, idempotencyKey: key }).capacity).toBe(7);
        expect(createRoomSchema.parse({ idempotencyKey: key }).capacity).toBe(7);
        expect(createRoomSchema.safeParse({ capacity: 2, idempotencyKey: key }).success).toBe(false);
        expect(createRoomSchema.safeParse({ capacity: 8, idempotencyKey: key }).success).toBe(false);
    });
    it('rejects guesses that are negative, fractional, or above safe-integer range', () => {
        const key = 'a77ebc23-31be-4a99-a277-f7a8c90f9a11';
        expect(guessSchema.safeParse({ value: 0, idempotencyKey: key }).success).toBe(true);
        expect(guessSchema.safeParse({ value: -1, idempotencyKey: key }).success).toBe(false);
        expect(guessSchema.safeParse({ value: 1.5, idempotencyKey: key }).success).toBe(false);
        expect(guessSchema.safeParse({ value: Number.MAX_SAFE_INTEGER + 1, idempotencyKey: key }).success).toBe(false);
    });
    it('accepts only the declared betting actions and rejects malformed raises', () => {
        const key = 'a77ebc23-31be-4a99-a277-f7a8c90f9a11';
        expect(betSchema.safeParse({ action: { type: 'check' }, idempotencyKey: key }).success).toBe(true);
        expect(betSchema.safeParse({ action: { type: 'all-in' }, idempotencyKey: key }).success).toBe(true);
        expect(betSchema.safeParse({ action: { type: 'raise', amount: 10 }, idempotencyKey: key }).success).toBe(true);
        expect(betSchema.safeParse({ action: { type: 'raise', amount: 1.5 }, idempotencyKey: key }).success).toBe(false);
        expect(betSchema.safeParse({ action: { type: 'unknown' }, idempotencyKey: key }).success).toBe(false);
    });
});
