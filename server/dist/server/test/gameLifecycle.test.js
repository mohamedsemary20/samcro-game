import { describe, expect, it } from 'vitest';
import { applyEngineAction, createRound, settleRound } from '../src/game/engine.js';
import { makeSyntheticGameFixture, makeSyntheticRevealRound } from './fixtures/syntheticGame.js';
describe('synthetic multiplayer game lifecycle', () => {
    it('starts round mechanics with both minimum and maximum room populations', () => {
        for (const count of [3, 7]) {
            const fixture = makeSyntheticGameFixture({ playerIds: Array.from({ length: count }, (_, index) => `p${index + 1}`) });
            const round = createRound(1, fixture.question, fixture.players, 0, 1_000);
            expect(round.players).toHaveLength(count);
            expect(round.pot).toBe(count * 50);
            expect(round.actorId).toBe('p1');
        }
    });
    it('folds the actor at the exact deadline and rejects an early timeout', () => {
        const fixture = makeSyntheticGameFixture();
        const round = createRound(1, fixture.question, fixture.players, 0, 1_000);
        expect(() => applyEngineAction(round, { type: 'timeout', now: round.deadline - 1 })).toThrow('TIMEOUT_NOT_REACHED');
        const timedOut = applyEngineAction(round, { type: 'timeout', now: round.deadline });
        const previousActor = timedOut.players.find((player) => player.id === round.actorId);
        expect(previousActor?.folded).toBe(true);
        expect(timedOut.actorId).not.toBe(round.actorId);
    });
    it('rejects unauthorized hints and malformed or duplicate guesses', () => {
        const fixture = makeSyntheticGameFixture();
        let round = createRound(1, fixture.question, fixture.players, 0, 1_000);
        let now = 1_000;
        while (round.phase === 'question-betting') {
            now = round.deadline - 1;
            round = applyEngineAction(round, { type: 'bet', playerId: round.actorId, action: { type: 'check' }, now });
        }
        now = round.deadline - 10;
        expect(() => applyEngineAction(round, {
            type: 'hint', playerId: 'outsider', hint: { questionId: fixture.question.id, range: 'x', accuracy: 'y', advisoryNote: '' }, now,
        })).toThrow('PLAYER_NOT_ELIGIBLE');
        expect(() => applyEngineAction(round, {
            type: 'hint', playerId: 'player-a', hint: { questionId: 'different-question', range: 'x', accuracy: 'y', advisoryNote: '' }, now,
        })).toThrow('HINT_QUESTION_MISMATCH');
        for (const player of round.players) {
            now += 1;
            round = applyEngineAction(round, {
                type: 'hint', playerId: player.id,
                hint: { questionId: fixture.question.id, range: 'test', accuracy: 'test', advisoryNote: '' }, now,
            });
        }
        expect(round.phase).toBe('guess-input');
        now = round.deadline - 2;
        expect(() => applyEngineAction(round, { type: 'guess', playerId: 'outsider', value: 42, now })).toThrow('PLAYER_NOT_ELIGIBLE');
        expect(() => applyEngineAction(round, { type: 'guess', playerId: 'player-a', value: -1, now })).toThrow('INVALID_GUESS');
        expect(() => applyEngineAction(round, { type: 'guess', playerId: 'player-a', value: 1.5, now })).toThrow('INVALID_GUESS');
        round = applyEngineAction(round, { type: 'guess', playerId: 'player-a', value: 42, now });
        expect(() => applyEngineAction(round, { type: 'guess', playerId: 'player-a', value: 42, now: now + 1 })).toThrow('GUESS_ALREADY_LOCKED');
    });
    it('splits a tied final-round pot and marks match settlement complete', () => {
        const { round, answer } = makeSyntheticRevealRound({
            roundNumber: 5,
            playerIds: ['p3', 'p1', 'p2'],
            answer: 42,
            guesses: { p1: 41, p2: 43, p3: 45 },
            carriedPot: 100,
        });
        const settlement = settleRound(round, answer);
        expect(round.phase).toBe('round-reveal');
        expect(settlement).toEqual({
            winners: ['p1', 'p2'],
            payouts: [{ playerId: 'p1', amount: 125 }, { playerId: 'p2', amount: 125 }],
            carriedPot: 0,
            completed: true,
        });
    });
    it('carries an unanswered nonfinal pot and completes the match after an unanswered final round', () => {
        const nonfinal = makeSyntheticRevealRound({ roundNumber: 4, guesses: {}, carriedPot: 200 });
        expect(settleRound(nonfinal.round, nonfinal.answer)).toEqual({ winners: [], payouts: [], carriedPot: 350, completed: false });
        const final = makeSyntheticRevealRound({ roundNumber: 5, guesses: {}, carriedPot: 200 });
        expect(settleRound(final.round, final.answer)).toEqual({
            winners: ['player-c'], payouts: [{ playerId: 'player-c', amount: 350 }], carriedPot: 0, completed: true,
        });
    });
});
