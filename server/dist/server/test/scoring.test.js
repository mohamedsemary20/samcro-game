import { describe, expect, it } from 'vitest';
import { findWinners, scoreGuess, splitPot } from '../src/game/scoring.js';
describe('numeric scoring and payouts', () => {
    it('uses absolute error for year questions', () => {
        expect(scoreGuess(2000, 1998, 'year')).toEqual({ numerator: 2n, denominator: 1n });
    });
    it('uses percentage error for number questions and exact-only for a zero answer', () => {
        expect(scoreGuess(200, 220, 'number')).toEqual({ numerator: 20n, denominator: 200n });
        expect(scoreGuess(0, 0, 'number')).toEqual({ numerator: 0n, denominator: 1n });
        expect(scoreGuess(0, 1, 'number')).toBeNull();
    });
    it('excludes folded or otherwise ineligible guesses and returns all tied winners', () => {
        expect(findWinners(100, 'number', [
            { playerId: 'b', value: 90 }, { playerId: 'a', value: 110 }, { playerId: 'folded', value: 100 },
        ], new Set(['a', 'b']))).toEqual(['a', 'b']);
    });
    it('splits ties evenly with remainder chips assigned by stable player ID', () => {
        expect(splitPot(11, ['z', 'a', 'm'])).toEqual([
            { playerId: 'a', amount: 4 }, { playerId: 'm', amount: 4 }, { playerId: 'z', amount: 3 },
        ]);
        expect(splitPot(0, ['a'])).toEqual([{ playerId: 'a', amount: 0 }]);
    });
});
