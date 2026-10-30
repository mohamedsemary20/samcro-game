module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@game-core/(.*)$': '<rootDir>/../packages/game-core/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
}
