import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';

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
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'prefer-const': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-assignment': 'warn',
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
      },
    },
  },
];
