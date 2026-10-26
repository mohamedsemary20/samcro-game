import { describe, expect, it } from 'vitest';
import { hasActiveMembership, roomAllowsMemberLeave, roomHasCapacity } from '../src/rooms/roomPolicy.js';
describe('room membership and capacity policies', () => {
    it('accepts active members and denies missing or departed members', () => {
        expect(hasActiveMembership({ leftAt: null })).toBe(true);
        expect(hasActiveMembership({ leftAt: new Date() })).toBe(false);
        expect(hasActiveMembership(null)).toBe(false);
    });
    it('enforces the 3–7 player room size and denies full rooms', () => {
        expect(roomHasCapacity(7, 6)).toBe(true);
        expect(roomHasCapacity(7, 7)).toBe(false);
        expect(roomHasCapacity(2, 1)).toBe(false);
        expect(roomHasCapacity(8, 2)).toBe(false);
        expect(roomHasCapacity(7, -1)).toBe(false);
    });
    it('prevents participants from leaving a room during an active match', () => {
        expect(roomAllowsMemberLeave('WAITING')).toBe(true);
        expect(roomAllowsMemberLeave('IN_PROGRESS')).toBe(false);
        expect(roomAllowsMemberLeave('FINISHED')).toBe(true);
    });
});
