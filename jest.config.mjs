export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'mjs', 'cjs', 'jsx', 'tsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  // Updated testMatch to reflect new directory structure
  testMatch: [
    '**\\src\\swappers\\__tests__\\**\\*.test.ts',
    '**/src/swappers/__tests__/**/*.test.ts',
    '**/src/solana/__tests__/**/*.test.ts',
    '**/src/libs/__tests__/**/*.test.ts',
    '**/libs/**/*.test.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/swappers/**/*.{ts,tsx}',
    '!src/swappers/**/*.d.ts',
    '!src/swappers/__tests__/**/*.ts',
    '!src/solana/**/*.ts',
    '!src/solana/__tests__/**/*.ts',
    '!src/libs/**/*.ts',
    '!src/libs/__tests__/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Updated setupFiles path to match new structure
  setupFiles: ['<rootDir>/src/swappers/__tests__/jupiter/direct/setupSwapper.ts', '<rootDir>/src/swappers/__tests__/jupiter/uniblock/setupSwapper.ts', '<rootDir>/src/swappers/__tests__/okx/setupSwapper.ts'],
  verbose: true,
  testTimeout: 10000
};
