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
      'boundaries/element-types': 'off',
      'boundaries/no-external': 'off',
    },
    settings: {
      react: { version: 'detect' },
      boundaries: {
        path: '.',
        elements: [
          { name: 'components', pattern: 'components/**/*' },
          { name: 'pages', pattern: 'pages/**/*' },
          { name: 'hooks', pattern: 'hooks/**/*' },
          { name: 'utils', pattern: 'utils/**/*' },
          { name: 'contexts', pattern: 'contexts/**/*' },
          { name: 'store', pattern: 'store/**/*' },
          { name: 'src', pattern: 'src/**/*' },
        ],
      },
    },
  },
];
