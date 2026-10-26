import { describe, expect, it } from 'vitest';
import { HINT_TIER_DISTRIBUTION, generateHintForTier, generatePlayerHint, selectHintTier, } from '../src/game/hintGenerator.js';
function fixed(value) { return (_max) => value; }
function bounds(range) {
    const values = range.split(' – ').map((value) => Number(value.replaceAll(',', '')));
    if (values.length !== 2)
        throw new Error(`Expected a range, got ${range}`);
    return [values[0], values[1]];
}
describe('private per-player hint generation', () => {
    it('keeps the configured integer weights nonnegative and exactly 100 percent', () => {
        const weights = Object.values(HINT_TIER_DISTRIBUTION);
        expect(weights.every((weight) => weight >= 0)).toBe(true);
        expect(weights.reduce((sum, weight) => sum + weight, 0)).toBe(100);
        expect(HINT_TIER_DISTRIBUTION.exact).toBe(2);
    });
    it.each([
        [0, 'weak'], [14, 'weak'], [15, 'standard'], [69, 'standard'],
        [70, 'strong'], [94, 'strong'], [95, 'exact'], [96, 'exact'],
        [97, 'nearExact'], [99, 'nearExact'],
    ])('maps roll %i to %s', (roll, expected) => {
        expect(selectHintTier(roll)).toBe(expected);
    });
    it('rejects rolls outside the integer sampling domain', () => {
        for (const roll of [-1, 100, 1.5, Number.NaN])
            expect(() => selectHintTier(roll)).toThrow(RangeError);
    });
    it('selects a recipient-only exact hint for exactly the two exact-tier rolls', () => {
        for (const roll of Array.from({ length: 100 }, (_, index) => index)) {
            const hint = generatePlayerHint(53, (max) => max === 100 ? roll : 0);
            expect(Boolean(hint.exact)).toBe(roll === 95 || roll === 96);
            if (hint.exact)
                expect(hint.range).toBe('53');
        }
    });
    it.each([
        ['weak', 20], ['standard', 10], ['nearExact', 2],
    ])('generates an inclusive %s interval with %i integer candidates', (tier, count) => {
        const hint = generateHintForTier(53, tier, fixed(0));
        const [low, high] = bounds(hint.range);
        expect(high - low + 1).toBe(count);
        expect(low).toBeLessThanOrEqual(53);
        expect(high).toBeGreaterThanOrEqual(53);
    });
    it('generates strong ranges with either three or four candidates', () => {
        for (const widthRoll of [0, 1]) {
            const hint = generateHintForTier(53, 'strong', (max) => max === 2 ? widthRoll : 0);
            const [low, high] = bounds(hint.range);
            expect([3, 4]).toContain(high - low + 1);
            expect(low).toBeLessThanOrEqual(53);
            expect(high).toBeGreaterThanOrEqual(53);
        }
    });
    it('supports zero, negative values, years, and safe-integer boundaries', () => {
        for (const answer of [0, -7, 2024, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) {
            for (const tier of ['weak', 'standard', 'strong', 'nearExact']) {
                const [low, high] = bounds(generateHintForTier(answer, tier, fixed(0)).range);
                expect(Number.isSafeInteger(low)).toBe(true);
                expect(Number.isSafeInteger(high)).toBe(true);
                expect(low).toBeLessThanOrEqual(answer);
                expect(high).toBeGreaterThanOrEqual(answer);
            }
        }
    });
    it('uses the closest valid whole-domain fallback when a domain is smaller than the requested width', () => {
        const hint = generateHintForTier(1, 'weak', fixed(0), { min: 0, max: 2 });
        expect(bounds(hint.range)).toEqual([0, 2]);
    });
    it('randomizes answer position without changing the selected tier or width', () => {
        const left = generateHintForTier(53, 'standard', fixed(0));
        const right = generateHintForTier(53, 'standard', (max) => max === 10 ? 9 : max - 1);
        expect(bounds(left.range)[1] - bounds(left.range)[0] + 1).toBe(10);
        expect(bounds(right.range)[1] - bounds(right.range)[0] + 1).toBe(10);
        expect(bounds(left.range)[0]).not.toBe(bounds(right.range)[0]);
    });
    it('samples per invocation without roster-position balancing', () => {
        const playerRolls = [95, 95, 97];
        const received = ['player-a', 'player-b', 'player-c'].map((_playerId, index) => generatePlayerHint(53, (max) => max === 100 ? playerRolls[index] : 0));
        expect(received.map((hint) => hint.exact === true)).toEqual([true, true, false]);
        expect(bounds(received[2].range)[1] - bounds(received[2].range)[0] + 1).toBe(2);
    });
});
