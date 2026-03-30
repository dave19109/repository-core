import * as dotenv from 'dotenv'
import * as dotenvExpand from 'dotenv-expand'
import { getTsconfig } from 'get-tsconfig'
import type { Config } from 'jest'
import { pathsToModuleNameMapper } from 'ts-jest'

// Load environment variables from .env file
dotenvExpand.expand(dotenv.config({ path: './.env.test' }))

// Read the tsconfig file to get compiler options
const compilerOptions = getTsconfig('./tsconfig.json')?.config?.compilerOptions

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/src/types', '<rootDir>/src/index.ts'],
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths ?? {}, {
    prefix: '<rootDir>'
  }),
  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  // A list of file extensions your modules use
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'json', 'node'],
  // A list of directories that Jest should use to search for files in
  moduleDirectories: ['node_modules'],
  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',
  // Use this configuration option to add custom reporters to Jest
  reporters: ['default', 'summary', 'jest-junit'],
  // The root directory that Jest should scan for tests and modules within
  rootDir: './',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>'],
  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts', 'jest-extended/all'],
  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-node',
  // Options that will be passed to the testEnvironment
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  // Regex to detect test files (avoids Windows glob escaping issues with testMatch)
  testMatch: undefined,
  testRegex: 'test/.*\\.(unit|int|e2e|spec|test|pkg)\\.(ts|js)$',
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: ['\\\\node_modules\\\\'],
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        transpilation: true
      }
    ]
  },
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  // uuid@13+ is ESM-only; we must transform it for Jest
  transformIgnorePatterns: [
    // Match node_modules except uuid (handles both npm and pnpm layout)
    String.raw`node_modules[/\\](?!uuid[/\\]|\.pnpm[/\\]uuid@)`,
    '\\.pnp\\.[^\\\\]+$'
  ],
  // Indicates whether each individual test should be reported during the run
  verbose: true
}

export default config
