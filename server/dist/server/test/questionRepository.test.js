import { describe, expect, it } from 'vitest';
import { isIntegrationQuestionFixtureMode, NoApprovedQuestionsError, PrismaQuestionRepository, toPublicQuestion } from '../src/questions/questionRepository.js';
import { LOCAL_TEST_QUESTION_FLAG, LOCAL_TEST_QUESTION_SOURCE } from '../src/questions/localTestQuestionPool.js';
describe('question repository eligibility', () => {
    it('enables synthetic fixtures only with the explicit flag and samkaro_dev in development', () => {
        const devDatabase = 'postgresql://test:secret@localhost:5432/samkaro_dev?schema=public';
        expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'development', databaseUrl: devDatabase })).toBe(true);
        expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'test', databaseUrl: devDatabase })).toBe(false);
        expect(isIntegrationQuestionFixtureMode({ flag: '0', nodeEnv: 'development', databaseUrl: devDatabase })).toBe(false);
        expect(isIntegrationQuestionFixtureMode({ nodeEnv: 'development', databaseUrl: devDatabase })).toBe(false);
        expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'development', databaseUrl: devDatabase.replace('samkaro_dev', 'samkaro') })).toBe(false);
        expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'production', databaseUrl: devDatabase })).toBe(false);
        expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'development', databaseUrl: 'not-a-database-url' })).toBe(false);
    });
    it('rejects an empty approved question pool before a match can start', async () => {
        const transaction = { question: { count: async () => 0 } };
        await expect(new PrismaQuestionRepository().selectUnused(transaction, [])).rejects.toBeInstanceOf(NoApprovedQuestionsError);
    });
    it('requires an approved stored hint when loading a reserved question', async () => {
        const transaction = {
            question: { findUnique: async () => ({
                    id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1n, category: 'test', type: 'number', hint: { range: '', accuracy: '', note: '', approved: false },
                }) },
        };
        await expect(new PrismaQuestionRepository().getApprovedById(transaction, 'q1')).rejects.toBeInstanceOf(NoApprovedQuestionsError);
    });
    it('keeps tagged synthetic integration fixtures unavailable outside the integration runner', async () => {
        const transaction = {
            question: { findUnique: async () => ({
                    id: 'fixture-q1', promptAr: 'synthetic?', answer: 1n, category: 'test', type: 'number',
                    sourceFile: '__automated_integration_fixture__',
                    hint: { range: '0 to 2', accuracy: 'close', note: 'test', approved: true },
                }) },
        };
        await expect(new PrismaQuestionRepository().getApprovedById(transaction, 'fixture-q1')).rejects.toBeInstanceOf(NoApprovedQuestionsError);
    });
    it('does not allow ordinary test processes to opt into integration fixtures', () => {
        expect(() => new PrismaQuestionRepository({ allowIntegrationFixtures: true })).toThrow(/explicit development integration test environment/);
    });
    it('selects only supported question types with complete approved hints and excludes questions already used in the match', async () => {
        const whereClauses = [];
        const question = {
            id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1n, category: 'test', type: 'number',
            hint: { range: '0\u20132', accuracy: 'close', note: 'hint' },
        };
        const transaction = {
            question: {
                count: async ({ where }) => { whereClauses.push(where); return 1; },
                findFirst: async ({ where }) => { whereClauses.push(where); return question; },
            },
        };
        const repository = new PrismaQuestionRepository();
        await repository.selectUnused(transaction, []);
        await repository.selectUnused(transaction, ['q1']);
        expect(whereClauses[0]).toMatchObject({
            type: { in: ['year', 'number'] },
            hint: { is: { approved: true, range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
            OR: [{ sourceFile: null }, { sourceFile: { notIn: ['__automated_integration_fixture__', LOCAL_TEST_QUESTION_SOURCE] } }],
        });
        expect(whereClauses[2]).toMatchObject({ id: { notIn: ['q1'] } });
    });
    it('rejects unsupported types and incomplete approved hints even when loading a reserved question', async () => {
        const transaction = {
            question: { findUnique: async () => ({
                    id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1n, category: 'test', type: 'range',
                    hint: { range: '0\u20132', accuracy: 'close', note: '', approved: true },
                }) },
        };
        await expect(new PrismaQuestionRepository().getApprovedById(transaction, 'q1')).rejects.toBeInstanceOf(NoApprovedQuestionsError);
    });
    it('uses the same weighted private sampler for approved production questions', async () => {
        const transaction = {
            question: { findUnique: async () => ({
                    id: 'approved-q1', promptAr: 'سؤال؟', answer: 53n, category: 'test', type: 'number', sourceFile: null,
                    hint: { range: '50 – 56', accuracy: 'approved source hint', note: 'approved source note', approved: true },
                }) },
        };
        const repository = new PrismaQuestionRepository({ hintRandomInt: (max) => max === 100 ? 97 : max - 1 });
        const generated = await repository.getHintForPlayer(transaction, 'approved-q1', 'player-a', ['player-a', 'player-b', 'player-c']);
        expect(generated.answer).toBe(53n);
        expect(generated.hint.exact).toBeUndefined();
        const [low, high] = generated.hint.range.split(' – ').map((value) => Number(value.replaceAll(',', '')));
        expect(high - low + 1).toBe(2);
        expect(low).toBeLessThanOrEqual(53);
        expect(high).toBeGreaterThanOrEqual(53);
    });
    it('selects tagged unapproved hints only from the explicit local test pool', async () => {
        const oldEnv = {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL,
            [LOCAL_TEST_QUESTION_FLAG]: process.env[LOCAL_TEST_QUESTION_FLAG],
        };
        process.env.NODE_ENV = 'development';
        process.env.DATABASE_URL = 'postgresql://local:test@localhost:5432/samkaro_dev?schema=public';
        process.env[LOCAL_TEST_QUESTION_FLAG] = '1';
        const whereClauses = [];
        const question = {
            id: 'football_001', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1930n, category: 'test', type: 'year',
            sourceFile: LOCAL_TEST_QUESTION_SOURCE,
            metadata: { testOnly: true, testPool: LOCAL_TEST_QUESTION_SOURCE, testHintVersion: 1 },
            hint: { range: '1925 \u2013 1935', accuracy: '\u0646\u0637\u0627\u0642 \u062a\u0642\u0631\u064a\u0628\u064a', note: '\u062a\u0644\u0645\u064a\u062d', approved: false },
        };
        const transaction = {
            $queryRaw: async () => [{ name: 'samkaro_dev' }],
            question: {
                findMany: async ({ where }) => { whereClauses.push(where); return [question]; },
                findUnique: async () => question,
            },
        };
        try {
            const repository = new PrismaQuestionRepository({
                allowLocalTestPool: true,
                hintRandomInt: (max) => max === 100 ? 95 : 0,
            });
            expect(await repository.selectUnused(transaction, [])).toMatchObject({ id: 'football_001' });
            const players = ['player-a', 'player-b', 'player-c'];
            const personalized = await Promise.all(players.map((playerId) => repository.getHintForPlayer(transaction, 'football_001', playerId, players)));
            expect(personalized.every((question) => question.hint.exact === true && question.hint.range === '1,930')).toBe(true);
            expect(personalized.every((question) => question.answer === 1930n && question.id === 'football_001')).toBe(true);
            expect(await repository.getHintForPlayer(transaction, 'football_001', 'player-b', players)).toEqual(personalized[1]);
            await expect(repository.getHintForPlayer(transaction, 'football_001', 'outsider', players)).rejects.toThrow('HINT_PLAYER_NOT_IN_ROUND');
            expect(whereClauses[0]).toMatchObject({
                sourceFile: LOCAL_TEST_QUESTION_SOURCE,
                hint: { is: { approved: false, source: 'local-test-pool:formula-hint-v1' } },
            });
            await expect(new PrismaQuestionRepository().getApprovedById(transaction, 'football_001')).rejects.toBeInstanceOf(NoApprovedQuestionsError);
        }
        finally {
            if (oldEnv.NODE_ENV === undefined)
                delete process.env.NODE_ENV;
            else
                process.env.NODE_ENV = oldEnv.NODE_ENV;
            if (oldEnv.DATABASE_URL === undefined)
                delete process.env.DATABASE_URL;
            else
                process.env.DATABASE_URL = oldEnv.DATABASE_URL;
            if (oldEnv[LOCAL_TEST_QUESTION_FLAG] === undefined)
                delete process.env[LOCAL_TEST_QUESTION_FLAG];
            else
                process.env[LOCAL_TEST_QUESTION_FLAG] = oldEnv[LOCAL_TEST_QUESTION_FLAG];
        }
    });
    it('exposes year-question metadata without its answer', () => {
        const question = {
            id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 10n, category: 'test', type: 'year',
            hint: { range: '9 to 11', accuracy: 'close', advisoryNote: '' },
        };
        expect(toPublicQuestion(question, 1)).toEqual({ id: 'q1', roundNumber: 1, prompt: question.promptAr, category: 'test', type: 'year' });
    });
});
