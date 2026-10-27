import { describe, expect, it } from 'vitest'
import type { Prisma } from '@prisma/client'
import { isIntegrationQuestionFixtureMode, NoEligibleQuestionsError, PrismaQuestionRepository, toPublicQuestion, type GameQuestion } from '../src/questions/questionRepository.js'
import { LOCAL_TEST_QUESTION_FLAG, LOCAL_TEST_QUESTION_SOURCE } from '../src/questions/localTestQuestionPool.js'

describe('question repository eligibility', () => {
  it('enables synthetic fixtures only with the explicit development integration flag and test database', () => {
    const devDatabase = 'postgresql://test:secret@localhost:5432/samkaro_dev?schema=public'
    expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'development', databaseUrl: devDatabase })).toBe(true)
    expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'test', databaseUrl: devDatabase })).toBe(false)
    expect(isIntegrationQuestionFixtureMode({ flag: '0', nodeEnv: 'development', databaseUrl: devDatabase })).toBe(false)
    expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'production', databaseUrl: devDatabase })).toBe(false)
    expect(isIntegrationQuestionFixtureMode({ flag: '1', nodeEnv: 'development', databaseUrl: 'not-a-database-url' })).toBe(false)
  })

  it('loads active database questions and generates a private hint without a legacy review row', async () => {
    const transaction = {
      question: { findUnique: async () => ({
        id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1930n, category: 'test', type: 'year',
        sourceFile: 'web/questions/trivia_clean.json', enabled: true, hint: null,
      }) },
    } as unknown as Prisma.TransactionClient
    const repository = new PrismaQuestionRepository({ hintRandomInt: (max) => max === 100 ? 95 : max - 1 })
    const result = await repository.getActiveById(transaction, 'q1')
    expect(result.id).toBe('q1')
    expect(result.hint.range).toBe('1,930')
    expect(result.hint.exact).toBe(true)
  })

  it('rejects inactive questions, unsupported types, and unsafe answers', async () => {
    const row = { id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1n, category: 'test', type: 'number', enabled: false, sourceFile: null, hint: null }
    const transaction = { question: { findUnique: async () => row } } as unknown as Prisma.TransactionClient
    await expect(new PrismaQuestionRepository().getActiveById(transaction, 'q1')).rejects.toBeInstanceOf(NoEligibleQuestionsError)
    row.enabled = true
    row.type = 'unsupported'
    await expect(new PrismaQuestionRepository().getActiveById(transaction, 'q1')).rejects.toBeInstanceOf(NoEligibleQuestionsError)
    row.type = 'number'
    row.promptAr = 'no arabic text'
    await expect(new PrismaQuestionRepository().getActiveById(transaction, 'q1')).rejects.toBeInstanceOf(NoEligibleQuestionsError)
    row.promptAr = '\u0633\u0624\u0627\u0644\u061f'
    row.answer = BigInt(Number.MAX_SAFE_INTEGER) + 1n
    await expect(new PrismaQuestionRepository().getActiveById(transaction, 'q1')).rejects.toBeInstanceOf(NoEligibleQuestionsError)
  })

  it('selects only enabled supported database questions and excludes reserved test sources', async () => {
    const whereClauses: Array<Record<string, unknown>> = []
    const question = { id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1n, category: 'test', type: 'number', enabled: true, sourceFile: 'web/questions/trivia_clean.json', hint: null }
    const transaction = {
      question: {
        findMany: async ({ where }: { where: Record<string, unknown> }) => { whereClauses.push(where); return [question] },
      },
    } as unknown as Prisma.TransactionClient
    const repository = new PrismaQuestionRepository({ hintRandomInt: (max) => max === 100 ? 95 : max - 1 })
    const selected = await repository.selectUnused(transaction, [])
    await repository.selectUnused(transaction, ['q1'])
    expect(selected.id).toBe('q1')
    expect(selected.hint.exact).toBe(true)
    expect(whereClauses[0]).toMatchObject({ enabled: true, type: { in: ['year', 'number'] } })
    expect(whereClauses[0]).not.toHaveProperty('hint')
    expect(whereClauses[0]).toHaveProperty('OR')
    expect(whereClauses[1]).toMatchObject({ id: { notIn: ['q1'] } })
  })

  it('reports an unavailable pool when no active structurally valid rows exist', async () => {
    const transaction = { question: { findMany: async () => [] } } as unknown as Prisma.TransactionClient
    await expect(new PrismaQuestionRepository().selectUnused(transaction, [])).rejects.toBeInstanceOf(NoEligibleQuestionsError)
  })

  it('keeps tagged test-pool rows behind the explicit local test switch', async () => {
    const oldEnv = { NODE_ENV: process.env.NODE_ENV, DATABASE_URL: process.env.DATABASE_URL, [LOCAL_TEST_QUESTION_FLAG]: process.env[LOCAL_TEST_QUESTION_FLAG] }
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://local:test@localhost:5432/samkaro_dev?schema=public'
    process.env[LOCAL_TEST_QUESTION_FLAG] = '1'
    const whereClauses: Array<Record<string, unknown>> = []
    const question = {
      id: 'test-q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 1930n, category: 'test', type: 'year',
      sourceFile: LOCAL_TEST_QUESTION_SOURCE, enabled: true,
      metadata: { testOnly: true, testPool: LOCAL_TEST_QUESTION_SOURCE, testHintVersion: 1 },
      hint: { range: '1925 – 1935', accuracy: 'approximate', note: 'test-only', approved: false },
    }
    const transaction = {
      $queryRaw: async () => [{ name: 'samkaro_dev' }],
      question: {
        findMany: async ({ where }: { where: Record<string, unknown> }) => { whereClauses.push(where); return [question] },
        findUnique: async () => question,
      },
    } as unknown as Prisma.TransactionClient
    try {
      const repo = new PrismaQuestionRepository({ allowLocalTestPool: true, hintRandomInt: (max) => max === 100 ? 95 : max - 1 })
      expect(await repo.selectUnused(transaction, [])).toMatchObject({ id: 'test-q1' })
      const players = ['player-a', 'player-b', 'player-c']
      const hint = await repo.getHintForPlayer(transaction, 'test-q1', 'player-a', players)
      expect(hint.hint.exact).toBe(true)
      expect(whereClauses[0]).toMatchObject({ sourceFile: LOCAL_TEST_QUESTION_SOURCE })
      await expect(new PrismaQuestionRepository().getActiveById(transaction, 'test-q1')).rejects.toBeInstanceOf(NoEligibleQuestionsError)
    } finally {
      if (oldEnv.NODE_ENV === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = oldEnv.NODE_ENV
      if (oldEnv.DATABASE_URL === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = oldEnv.DATABASE_URL
      if (oldEnv[LOCAL_TEST_QUESTION_FLAG] === undefined) delete process.env[LOCAL_TEST_QUESTION_FLAG]
      else process.env[LOCAL_TEST_QUESTION_FLAG] = oldEnv[LOCAL_TEST_QUESTION_FLAG]
    }
  })

  it('exposes year-question metadata without its answer', () => {
    const question: GameQuestion = { id: 'q1', promptAr: '\u0633\u0624\u0627\u0644\u061f', answer: 10n, category: 'test', type: 'year', hint: { range: '9 to 11', accuracy: 'close', advisoryNote: '' } }
    expect(toPublicQuestion(question, 1)).toEqual({ id: 'q1', roundNumber: 1, prompt: question.promptAr, category: 'test', type: 'year' })
  })
})
