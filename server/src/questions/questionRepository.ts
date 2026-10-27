import { randomInt } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { PlayerHint, Question as PublicQuestion } from '../../../shared/contracts.js'
import { generatePlayerHint, type RandomInt } from '../game/hintGenerator.js'
import { assertLiveLocalTestPoolDatabase, assertLocalTestPoolEnvironment, isLocalTestQuestionMetadata, LOCAL_TEST_QUESTION_FLAG, LOCAL_TEST_QUESTION_SOURCE } from './localTestQuestionPool.js'

const integrationFixtureSource = '__automated_integration_fixture__'
export function isIntegrationQuestionFixtureMode(input: { flag?: string | undefined; nodeEnv?: string | undefined; databaseUrl?: string | undefined }): boolean {
  if (input.flag !== '1' || input.nodeEnv !== 'development' || !input.databaseUrl) return false
  try { return decodeURIComponent(new URL(input.databaseUrl).pathname.slice(1)).split('/')[0] === 'samkaro_dev' }
  catch { return false }
}

function integrationFixtureEnvironmentAllowed(): boolean {
  return isIntegrationQuestionFixtureMode({
    flag: process.env.SAMKARO_RUN_DB_INTEGRATION,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
  })
}

export interface QuestionRepository {
  getActiveById(client: QuestionClient, questionId: string): Promise<GameQuestion>
  getHintForPlayer?(client: QuestionClient, questionId: string, playerId: string, roundPlayerIds: string[]): Promise<GameQuestion>
  selectUnused(client: QuestionClient, usedQuestionIds: string[]): Promise<GameQuestion>
}

export type QuestionClient = Prisma.TransactionClient | PrismaClient

export interface GameQuestion {
  id: string
  promptAr: string
  answer: bigint
  category: string
  type: string
  hint: Omit<PlayerHint, 'questionId'>
}

function hasTextHint(hint: { range: string; accuracy: string; note: string }): boolean {
  return Boolean(hint.range.trim() && hint.accuracy.trim() && hint.note.trim())
}

function isValidHint(hint: { range: string; accuracy: string; note: string; approved?: boolean }): boolean {
  return hint.approved !== false && hasTextHint(hint)
}

function isSupportedType(type: string): type is 'year' | 'number' {
  return type === 'year' || type === 'number'
}

function isStructurallyEligibleQuestion(question: { id: string; promptAr: string; answer: bigint; category: string; type: string; enabled: boolean }): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/u.test(question.id)
    && /[\u0600-\u06ff]/u.test(question.promptAr)
    && question.promptAr.trim().length > 0
    && question.category.trim().length > 0
    && question.category.length <= 80
    && question.enabled
    && isSupportedType(question.type)
    && question.answer >= 0n
    && question.answer <= BigInt(Number.MAX_SAFE_INTEGER)
}

function isUsableRuntimeHint(hint: { range: string; accuracy: string; advisoryNote: string }): boolean {
  return Boolean(hint.range.trim() && hint.accuracy.trim() && hint.advisoryNote.trim())
    && hint.range.length <= 120 && hint.accuracy.length <= 120 && hint.advisoryNote.length <= 240
}

export class NoEligibleQuestionsError extends Error {
  constructor() { super('No eligible question is available for this round.'); this.name = 'NoEligibleQuestionsError' }
}

export const QUESTIONS_PER_MATCH = 5

export async function selectQuestionsForMatch(client: QuestionClient, repository: QuestionRepository): Promise<GameQuestion[]> {
  const selected: GameQuestion[] = []
  for (let round = 0; round < QUESTIONS_PER_MATCH; round += 1) {
    selected.push(await repository.selectUnused(client, selected.map((question) => question.id)))
  }
  return selected
}

export class PrismaQuestionRepository implements QuestionRepository {
  private readonly integrationFixturesEnabled: boolean
  private readonly localTestPoolEnabled: boolean
  private readonly hintRandomInt: RandomInt

  constructor(options: { allowIntegrationFixtures?: boolean; allowLocalTestPool?: boolean; hintRandomInt?: RandomInt } = {}) {
    this.integrationFixturesEnabled = options.allowIntegrationFixtures === true
    this.localTestPoolEnabled = options.allowLocalTestPool === true
    this.hintRandomInt = options.hintRandomInt ?? randomInt
    if (this.integrationFixturesEnabled && this.localTestPoolEnabled) throw new Error('Only one isolated question pool can be enabled at a time.')
    if (this.integrationFixturesEnabled && !integrationFixtureEnvironmentAllowed()) {
      throw new Error('Synthetic question fixtures require the explicit development integration test environment.')
    }
    if (this.localTestPoolEnabled) assertLocalTestPoolEnvironment({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      [LOCAL_TEST_QUESTION_FLAG]: process.env[LOCAL_TEST_QUESTION_FLAG],
    })
  }

  private async verifyLocalDatabase(transaction: QuestionClient): Promise<void> {
    if (!this.localTestPoolEnabled) return
    await assertLiveLocalTestPoolDatabase(async () => {
      const result = await transaction.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
      return result[0]?.name ?? ''
    })
  }

  async getActiveById(transaction: QuestionClient, questionId: string): Promise<GameQuestion> {
    await this.verifyLocalDatabase(transaction)
    const question = await transaction.question.findUnique({
      where: { id: questionId },
      select: {
        id: true, promptAr: true, answer: true, category: true, type: true, sourceFile: true, metadata: true, enabled: true,
        hint: { select: { range: true, accuracy: true, note: true, approved: true } },
      },
    })
    const localTestQuestion = this.localTestPoolEnabled
      && question?.sourceFile === LOCAL_TEST_QUESTION_SOURCE
      && isLocalTestQuestionMetadata(question.metadata)
      && question.hint?.approved === false
    const ordinaryQuestion = !this.localTestPoolEnabled
      && question?.enabled === true
      && question.sourceFile !== LOCAL_TEST_QUESTION_SOURCE
      && (question.sourceFile !== integrationFixtureSource || this.integrationFixturesEnabled)
    if ((!localTestQuestion && !ordinaryQuestion) || !question || !isStructurallyEligibleQuestion(question)) {
      throw new NoEligibleQuestionsError()
    }
    const generated = generatePlayerHint(Number(question.answer), this.hintRandomInt)
    if (!isUsableRuntimeHint(generated)) throw new NoEligibleQuestionsError()
    return { ...question, hint: generated }
  }

  async getHintForPlayer(transaction: QuestionClient, questionId: string, playerId: string, roundPlayerIds: string[]): Promise<GameQuestion> {
    if (!roundPlayerIds.includes(playerId)) throw new Error('HINT_PLAYER_NOT_IN_ROUND')
    return this.getActiveById(transaction, questionId)
  }

  async selectUnused(transaction: QuestionClient, usedQuestionIds: string[]): Promise<GameQuestion> {
    await this.verifyLocalDatabase(transaction)
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
      })
      const eligible = questions.filter((question) => isLocalTestQuestionMetadata(question.metadata)
        && question.hint && hasTextHint(question.hint) && isSupportedType(question.type)
        && question.answer >= 0n && question.answer <= BigInt(Number.MAX_SAFE_INTEGER))
      const question = eligible[randomInt(eligible.length)]
      if (!question?.hint) throw new NoEligibleQuestionsError()
      return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } }
    }

    const where: Prisma.QuestionWhereInput = {
      enabled: true,
      answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
      type: { in: ['year', 'number'] },
      ...(!this.integrationFixturesEnabled ? { OR: [{ sourceFile: null }, { sourceFile: { notIn: [integrationFixtureSource, LOCAL_TEST_QUESTION_SOURCE] } }] } : {}),
      ...(usedQuestionIds.length ? { id: { notIn: usedQuestionIds } } : {}),
    }
    const questions = await transaction.question.findMany({
      where,
      orderBy: { id: 'asc' },
      select: {
        id: true, promptAr: true, answer: true, category: true, type: true, sourceFile: true, enabled: true,
      },
    })
    const eligible = questions.filter((question) => isStructurallyEligibleQuestion(question)
      && (question.sourceFile !== integrationFixtureSource || this.integrationFixturesEnabled)
      && question.sourceFile !== LOCAL_TEST_QUESTION_SOURCE)
    if (eligible.length === 0) throw new NoEligibleQuestionsError()
    const question = eligible[randomInt(eligible.length)]
    if (!question) throw new NoEligibleQuestionsError()
    const hint = generatePlayerHint(Number(question.answer), this.hintRandomInt)
    if (!isUsableRuntimeHint(hint)) throw new NoEligibleQuestionsError()
    return { ...question, hint }
  }
}

export function toPublicQuestion(question: GameQuestion, roundNumber: number): PublicQuestion {
  if (question.type !== 'year' && question.type !== 'number') throw new Error('UNSUPPORTED_QUESTION_TYPE')
  return {
    id: question.id,
    roundNumber,
    prompt: question.promptAr,
    category: question.category,
    type: question.type,
  }
}
