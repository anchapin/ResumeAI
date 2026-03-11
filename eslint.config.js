import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import unusedImports from 'eslint-plugin-unused-imports';
import complexity from 'eslint-plugin-complexity';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.venv/**',
      'venv/**',
      'coverage/**',
      'build/**',
      '**/*.d.ts',
      'docs.bak/**',
      'public/**',
      'scripts/**',
      'benchmarks/**',
      'tests/**',
      'resume-api/venv/**',
      'resume-api/.venv/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        browser: true,
        es2021: true,
        node: true,
        TextEncoder: true,
        TextDecoder: true,
        self: true,
        console: true,
        fetch: true,
        navigator: true,
        performance: true,
        window: true,
        document: true,
        HTMLElement: true,
        RequestInit: true,
        Response: true,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint.plugin,
      boundaries,
      'unused-imports': unusedImports,
      complexity,
      import: importPlugin,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'prefer-const': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-assignment': 'warn',
      // Complexity rules (threshold 20 for cyclomatic complexity)
      'complexity': ['warn', 20],
      // Max parameters rule (max 5 parameters per function)
      '@typescript-eslint/no-misused-promises': 'off',
      'max-params': ['warn', 5],
      // Module boundary rules
      'boundaries/element-types': ['warn', {
        default: 'disallow',
        message: 'Module boundary violation: {{plugin}} {{element}} cannot import {{dependency}} {{dependencyType}}',
      }],
      'boundaries/no-external': 'off',
      // Circular dependency detection
      'import/no-cycle': ['warn', { maxDepth: 3 }],
    },
    settings: {
      react: { version: 'detect' },
      'boundaries/elements': [
        { name: 'components', type: 'app', pattern: 'components/**/*' },
        { name: 'pages', type: 'app', pattern: 'pages/**/*' },
        { name: 'hooks', type: 'app', pattern: 'hooks/**/*' },
        { name: 'utils', type: 'app', pattern: 'utils/**/*' },
        { name: 'contexts', type: 'app', pattern: 'contexts/**/*' },
        { name: 'store', type: 'app', pattern: 'store/**/*' },
        { name: 'src', type: 'app', pattern: 'src/**/*' },
      ],
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      },
    },
  },
  // Test files configuration with vitest globals
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*'],
    languageOptions: {
      globals: {
        vi: true,
        vitest: true,
        describe: true,
        it: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
        Mock: true,
        Mocked: true,
        MockInstance: true,
        // Browser globals for browser environment tests
        TextEncoder: true,
        TextDecoder: true,
        self: true,
        console: true,
        fetch: true,
        navigator: true,
        performance: true,
        window: true,
        document: true,
        HTMLElement: true,
        RequestInit: true,
        Response: true,
        Request: true,
        Headers: true,
        FormData: true,
        Blob: true,
        URL: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
