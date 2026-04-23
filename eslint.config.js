import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Window-bound app surface (per CLAUDE.md "Remaining Window Bindings")
        G: 'readonly',
        startTimedQ: 'readonly',
        UPDATE_DISMISS_KEY: 'readonly',
        // FSRS bridge re-exports of shared/fsrs.js globals
        fsrsR: 'readonly',
        fsrsInterval: 'readonly',
        fsrsInitNew: 'readonly',
        fsrsUpdate: 'readonly',
        fsrsMigrateFromSM2: 'readonly',
        isChronicFail: 'readonly',
        fsrsIntervalWithDeadline: 'readonly',
        fsrsScheduleWithDeadline: 'readonly',
        fsrsDaysToExam: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'no-constant-condition': 'warn',
      'prefer-const': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
  {
    files: ['shared/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.commonjs,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'harrison_chapters.json', 'data/', 'scripts/'],
  },
];
