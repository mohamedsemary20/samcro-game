import { describe, expect, it } from 'vitest'
import { productionReleaseTarget } from '../scripts/productionRelease.mjs'

const validTarget = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://private:secret@db.example.net:5432/samkaro_prod?schema=public',
  SAMKARO_PRODUCTION_DATABASE_HOST: 'db.example.net:5432',
  SAMKARO_PRODUCTION_DATABASE_NAME: 'samkaro_prod',
}

describe('guarded production database release', () => {
  it('accepts only the explicitly configured production target', () => {
    expect(productionReleaseTarget(validTarget)).toEqual({ address: 'db.example.net:5432', databaseName: 'samkaro_prod' })
  })

  it('rejects local, development, test, mismatched, and test-pool targets before mutations', () => {
    expect(() => productionReleaseTarget({ ...validTarget, DATABASE_URL: 'postgresql://u:p@localhost:5432/samkaro_prod' })).toThrow(/local, development, or test/)
    expect(() => productionReleaseTarget({ ...validTarget, DATABASE_URL: 'postgresql://u:p@db.example.net:5432/samkaro_dev' })).toThrow(/local, development, or test/)
    expect(() => productionReleaseTarget({ ...validTarget, SAMKARO_PRODUCTION_DATABASE_NAME: 'samkaro_test' })).toThrow(/match/)
    expect(() => productionReleaseTarget({ ...validTarget, SAMKARO_PRODUCTION_DATABASE_HOST: 'other.example.net' })).toThrow(/match/)
    expect(() => productionReleaseTarget({ ...validTarget, SAMKARO_ENABLE_TEST_QUESTION_POOL: '1' })).toThrow(/TEST_QUESTION_POOL/)
    expect(() => productionReleaseTarget({ ...validTarget, NODE_ENV: 'development' })).toThrow(/NODE_ENV=production/)
  })

  it('does not include database credentials in validation errors', () => {
    let message = ''
    try { productionReleaseTarget({ ...validTarget, SAMKARO_PRODUCTION_DATABASE_NAME: 'wrong' }) }
    catch (error) { message = error instanceof Error ? error.message : String(error) }
    expect(message).not.toContain('private')
    expect(message).not.toContain('secret')
  })
})
