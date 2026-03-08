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
      'coverage/**',
      'build/**',
      '**/*.d.ts',
      'docs.bak/**',
      'public/**',
      'scripts/**',
      'benchmarks/**',
      'tests/**',
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
];
