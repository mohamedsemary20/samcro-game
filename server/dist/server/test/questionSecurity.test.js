import { describe, expect, it } from 'vitest';
import { deliverPrivateStates } from '../src/realtime/privateDelivery.js';
import { toPublicQuestion } from '../src/questions/questionRepository.js';
describe('question and player-secret isolation', () => {
    it('projects no correct answer or stored hint into public question metadata', () => {
        const question = {
            id: 'private-answer-test', promptAr: '\u0643\u0645 \u0639\u062f\u062f \u0627\u0644\u0639\u0646\u0627\u0635\u0631\u061f', answer: 732n, category: 'test', type: 'number',
            hint: { range: '700 to 750', accuracy: 'close', advisoryNote: 'private note' },
        };
        const publicQuestion = toPublicQuestion(question, 1);
        expect(publicQuestion).toEqual({ id: question.id, roundNumber: 1, prompt: question.promptAr, category: question.category, type: 'number' });
        expect(publicQuestion).not.toHaveProperty('answer');
        expect(publicQuestion).not.toHaveProperty('hint');
    });
    it('delivers each private hint only to that player room', () => {
        const privateStates = [
            { playerId: 'player-a', matchId: 'match-test', roundNumber: 1, stateVersion: 1, hint: { questionId: 'q', range: '100', accuracy: 'exact', advisoryNote: 'private a', exact: true }, goldenHint: null, guess: null, availableChips: 450, roundContribution: 50 },
            { playerId: 'player-b', matchId: 'match-test', roundNumber: 1, stateVersion: 1, hint: { questionId: 'q', range: '200', accuracy: 'wide', advisoryNote: 'private b' }, goldenHint: null, guess: null, availableChips: 450, roundContribution: 50 },
            { playerId: 'player-c', matchId: 'match-test', roundNumber: 1, stateVersion: 1, hint: { questionId: 'q', range: '300', accuracy: 'broader', advisoryNote: 'private c' }, goldenHint: null, guess: null, availableChips: 450, roundContribution: 50 },
        ];
        const deliveries = [];
        deliverPrivateStates(privateStates, (room, state) => deliveries.push({ room, state }));
        expect(deliveries.map(({ room }) => room)).toEqual(['player:player-a', 'player:player-b', 'player:player-c']);
        expect(deliveries.map(({ state }) => state.hint?.range)).toEqual(['100', '200', '300']);
        expect(deliveries.every(({ room, state }) => room === `player:${state.playerId}`)).toBe(true);
        expect(deliveries.map(({ state }) => state)).toEqual(privateStates);
        expect(JSON.stringify(deliveries[1].state)).not.toContain('private a');
        expect(JSON.stringify(deliveries[2].state)).not.toContain('exact');
    });
});
