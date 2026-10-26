import { describe, expect, it } from 'vitest';
import { createDecisionDeadline, decisionHasTimedOut } from '../src/game/clock.js';
describe('decision deadline', () => {
    it('uses the injected clock and folds only at or after the 30-second deadline', () => {
        let currentTime = 1_000;
        const clock = { now: () => currentTime };
        const deadline = createDecisionDeadline(clock);
        expect(deadline.getTime()).toBe(31_000);
        expect(decisionHasTimedOut(deadline, clock)).toBe(false);
        currentTime = 31_000;
        expect(decisionHasTimedOut(deadline, clock)).toBe(true);
    });
});
