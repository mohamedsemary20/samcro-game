import { randomInt } from 'node:crypto'
import type { Prisma } from '@prisma/client'
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
  getApprovedById(transaction: Prisma.TransactionClient, questionId: string): Promise<GameQuestion>
  getHintForPlayer?(transaction: Prisma.TransactionClient, questionId: string, playerId: string, roundPlayerIds: string[]): Promise<GameQuestion>
  selectUnused(transaction: Prisma.TransactionClient, usedQuestionIds: string[]): Promise<GameQuestion>
}

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

export class NoApprovedQuestionsError extends Error {
  constructor() { super('No approved question is available for this round.'); this.name = 'NoApprovedQuestionsError' }
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

  private async verifyLocalDatabase(transaction: Prisma.TransactionClient): Promise<void> {
    if (!this.localTestPoolEnabled) return
    await assertLiveLocalTestPoolDatabase(async () => {
      const result = await transaction.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
      return result[0]?.name ?? ''
    })
  }

  async getApprovedById(transaction: Prisma.TransactionClient, questionId: string): Promise<GameQuestion> {
    await this.verifyLocalDatabase(transaction)
    const question = await transaction.question.findUnique({
      where: { id: questionId },
      select: {
        id: true, promptAr: true, answer: true, category: true, type: true, sourceFile: true, metadata: true,
        hint: { select: { range: true, accuracy: true, note: true, approved: true } },
      },
    })
    const localTestQuestion = this.localTestPoolEnabled
      && question?.sourceFile === LOCAL_TEST_QUESTION_SOURCE
      && isLocalTestQuestionMetadata(question.metadata)
      && question.hint?.approved === false
    const ordinaryQuestion = !this.localTestPoolEnabled
      && question?.hint?.approved === true
      && question.sourceFile !== LOCAL_TEST_QUESTION_SOURCE
      && (question.sourceFile !== integrationFixtureSource || this.integrationFixturesEnabled)
    if ((!localTestQuestion && !ordinaryQuestion) || !question?.hint
      || (localTestQuestion ? !hasTextHint(question.hint) : !isValidHint(question.hint)) || !isSupportedType(question.type)) {
      throw new NoApprovedQuestionsError()
    }
    if (Number(question.answer) > Number.MAX_SAFE_INTEGER || question.answer < 0n) throw new Error('UNSAFE_QUESTION_ANSWER')
    return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } }
  }

  async getHintForPlayer(transaction: Prisma.TransactionClient, questionId: string, playerId: string, roundPlayerIds: string[]): Promise<GameQuestion> {
    const question = await this.getApprovedById(transaction, questionId)
    if (!roundPlayerIds.includes(playerId)) throw new Error('HINT_PLAYER_NOT_IN_ROUND')
    const generated = generatePlayerHint(Number(question.answer), this.hintRandomInt)
    return {
      ...question,
      hint: generated,
    }
  }

  async selectUnused(transaction: Prisma.TransactionClient, usedQuestionIds: string[]): Promise<GameQuestion> {
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
      if (!question?.hint) throw new NoApprovedQuestionsError()
      return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } }
    }

    const where: Prisma.QuestionWhereInput = {
      enabled: true,
      answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
      type: { in: ['year', 'number'] },
      hint: { is: { approved: true, range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
      ...(!this.integrationFixturesEnabled ? { OR: [{ sourceFile: null }, { sourceFile: { notIn: [integrationFixtureSource, LOCAL_TEST_QUESTION_SOURCE] } }] } : {}),
      ...(usedQuestionIds.length ? { id: { notIn: usedQuestionIds } } : {}),
    }
    const count = await transaction.question.count({ where })
    if (count === 0) throw new NoApprovedQuestionsError()
    const question = await transaction.question.findFirst({
      where,
      orderBy: { id: 'asc' },
      skip: randomInt(count),
      select: {
        id: true, promptAr: true, answer: true, category: true, type: true,
        hint: { select: { range: true, accuracy: true, note: true } },
      },
    })
    if (!question?.hint || !isValidHint(question.hint) || !isSupportedType(question.type)) throw new NoApprovedQuestionsError()
    if (Number(question.answer) > Number.MAX_SAFE_INTEGER || question.answer < 0n) throw new Error('UNSAFE_QUESTION_ANSWER')
    return { ...question, hint: { range: question.hint.range, accuracy: question.hint.accuracy, advisoryNote: question.hint.note } }
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
