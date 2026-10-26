import { randomInt } from 'node:crypto';
import { generatePlayerHint } from '../game/hintGenerator.js';
import { assertLiveLocalTestPoolDatabase, assertLocalTestPoolEnvironment, isLocalTestQuestionMetadata, LOCAL_TEST_QUESTION_FLAG, LOCAL_TEST_QUESTION_SOURCE } from './localTestQuestionPool.js';
const integrationFixtureSource = '__automated_integration_fixture__';
export function isIntegrationQuestionFixtureMode(input) {
    if (input.flag !== '1' || input.nodeEnv !== 'development' || !input.databaseUrl)
        return false;
    try {
        return decodeURIComponent(new URL(input.databaseUrl).pathname.slice(1)).split('/')[0] === 'samkaro_dev';
    }
    catch {
        return false;
    }
}
function integrationFixtureEnvironmentAllowed() {
    return isIntegrationQuestionFixtureMode({
        flag: process.env.SAMKARO_RUN_DB_INTEGRATION,
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL,
    });
}
function hasTextHint(hint) {
    return Boolean(hint.range.trim() && hint.accuracy.trim() && hint.note.trim());
}
function isValidHint(hint) {
    return hint.approved !== false && hasTextHint(hint);
}
function isSupportedType(type) {
    return type === 'year' || type === 'number';
}
export class NoApprovedQuestionsError extends Error {
    constructor() { super('No approved question is available for this round.'); this.name = 'NoApprovedQuestionsError'; }
}
export class PrismaQuestionRepository {
    integrationFixturesEnabled;
    localTestPoolEnabled;
    hintRandomInt;
    constructor(options = {}) {
        this.integrationFixturesEnabled = options.allowIntegrationFixtures === true;
        this.localTestPoolEnabled = options.allowLocalTestPool === true;
        this.hintRandomInt = options.hintRandomInt ?? randomInt;
        if (this.integrationFixturesEnabled && this.localTestPoolEnabled)
            throw new Error('Only one isolated question pool can be enabled at a time.');
        if (this.integrationFixturesEnabled && !integrationFixtureEnvironmentAllowed()) {
            throw new Error('Synthetic question fixtures require the explicit development integration test environment.');
        }
        if (this.localTestPoolEnabled)
            assertLocalTestPoolEnvironment({
                NODE_ENV: process.env.NODE_ENV,
                DATABASE_URL: process.env.DATABASE_URL,
                [LOCAL_TEST_QUESTION_FLAG]: process.env[LOCAL_TEST_QUESTION_FLAG],
            });
    }
    async verifyLocalDatabase(transaction) {
        if (!this.localTestPoolEnabled)
            return;
        await assertLiveLocalTestPoolDatabase(async () => {
            const result = await transaction.$queryRaw `SELECT current_database() AS name`;
            return result[0]?.name ?? '';
        });
    }
    async getApprovedById(transaction, questionId) {
        await this.verifyLocalDatabase(transaction);
        const question = await transaction.question.findUnique({
            where: { id: questionId },
            select: {
                id: true, promptAr: true, answer: true, category: true, type: true, sourceFile: true, metadata: true,
                hint: { select: { range: true, accuracy: true, note: true, approved: true } },
            },
        });
        const localTestQuestion = this.localTestPoolEnabled
            && question?.sourceFile === LOCAL_TEST_QUESTION_SOURCE
            && isLocalTestQuestionMetadata(question.metadata)
            && question.hint?.approved === false;
        const ordinaryQuestion = !this.localTestPoolEnabled
            && question?.hint?.approved === true
            && question.sourceFile !== LOCAL_TEST_QUESTION_SOURCE
            && (question.sourceFile !== integrationFixtureSource || this.integrationFixturesEnabled);
        if ((!localTestQuestion && !ordinaryQuestion) || !question?.hint
            || (localTestQuestion ? !hasTextHint(question.hint) : !isValidHint(question.hint)) || !isSupportedType(question.type)) {
            throw new NoApprovedQuestionsError();
        }
        if (Number(question.answer) > Number.MAX_SAFE_INTEGER || question.answer < 0n)
            throw new Error('UNSAFE_QUESTION_ANSWER');
        return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } };
    }
    async getHintForPlayer(transaction, questionId, playerId, roundPlayerIds) {
        const question = await this.getApprovedById(transaction, questionId);
        if (!roundPlayerIds.includes(playerId))
            throw new Error('HINT_PLAYER_NOT_IN_ROUND');
        const generated = generatePlayerHint(Number(question.answer), this.hintRandomInt);
        return {
            ...question,
            hint: generated,
        };
    }
    async selectUnused(transaction, usedQuestionIds) {
        await this.verifyLocalDatabase(transaction);
        if (this.localTestPoolEnabled) {
            const questions = await transaction.question.findMany({
                where: {
                    enabled: true,
                    sourceFile: LOCAL_TEST_QUESTION_SOURCE,
                    answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
                    type: { in: ['year', 'number'] },
                    hint: { is: { approved: false, source: 'local-test-pool:formula-hint-v1', range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
                    ...(usedQuestionIds.length ? { id: { notIn: usedQuestionIds } } : {}),
                },
                select: {
                    id: true, promptAr: true, answer: true, category: true, type: true, metadata: true,
                    hint: { select: { range: true, accuracy: true, note: true, approved: true } },
                },
            });
            const eligible = questions.filter((question) => isLocalTestQuestionMetadata(question.metadata)
                && question.hint && hasTextHint(question.hint) && isSupportedType(question.type)
                && question.answer >= 0n && question.answer <= BigInt(Number.MAX_SAFE_INTEGER));
            const question = eligible[randomInt(eligible.length)];
            if (!question?.hint)
                throw new NoApprovedQuestionsError();
            return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } };
        }
        const where = {
            enabled: true,
            answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
            type: { in: ['year', 'number'] },
            hint: { is: { approved: true, range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
            ...(!this.integrationFixturesEnabled ? { OR: [{ sourceFile: null }, { sourceFile: { notIn: [integrationFixtureSource, LOCAL_TEST_QUESTION_SOURCE] } }] } : {}),
            ...(usedQuestionIds.length ? { id: { notIn: usedQuestionIds } } : {}),
        };
        const count = await transaction.question.count({ where });
        if (count === 0)
            throw new NoApprovedQuestionsError();
        const question = await transaction.question.findFirst({
            where,
            orderBy: { id: 'asc' },
            skip: randomInt(count),
            select: {
                id: true, promptAr: true, answer: true, category: true, type: true,
                hint: { select: { range: true, accuracy: true, note: true } },
            },
        });
        if (!question?.hint || !isValidHint(question.hint) || !isSupportedType(question.type))
            throw new NoApprovedQuestionsError();
        if (Number(question.answer) > Number.MAX_SAFE_INTEGER || question.answer < 0n)
            throw new Error('UNSAFE_QUESTION_ANSWER');
        return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } };
    }
}
export function toPublicQuestion(question, roundNumber) {
    if (question.type !== 'year' && question.type !== 'number')
        throw new Error('UNSUPPORTED_QUESTION_TYPE');
    return {
        id: question.id,
        roundNumber,
        prompt: question.promptAr,
        category: question.category,
        type: question.type,
    };
}
