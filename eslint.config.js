import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import unusedImports from 'eslint-plugin-unused-imports';
import complexity from 'eslint-plugin-complexity';

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
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
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
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'components',
              allow: ['components', 'types', 'utils', 'hooks', 'contexts', 'store'],
            },
            {
              from: 'pages',
              allow: ['components', 'types', 'utils', 'hooks', 'contexts', 'store', 'pages'],
            },
            {
              from: 'hooks',
              allow: ['types', 'utils', 'hooks', 'store'],
            },
            {
              from: 'contexts',
              allow: ['types', 'utils', 'hooks', 'contexts', 'store'],
            },
            {
              from: 'store',
              allow: ['types', 'utils'],
            },
            {
              from: 'utils',
              allow: ['types', 'utils'],
            },
          ],
        },
      ],
      'boundaries/no-external': 'off',
    },
    settings: {
      react: { version: 'detect' },
      boundaries: {
        path: 'src',
        elements: [
          { name: 'components', pattern: 'src/components/**/*' },
          { name: 'pages', pattern: 'src/pages/**/*' },
          { name: 'hooks', pattern: 'src/hooks/**/*' },
          { name: 'utils', pattern: 'src/utils/**/*' },
          { name: 'contexts', pattern: 'src/contexts/**/*' },
          { name: 'store', pattern: 'src/store/**/*' },
          { name: 'types', pattern: 'src/types/**/*' },
        ],
      },
    },
  },
];
