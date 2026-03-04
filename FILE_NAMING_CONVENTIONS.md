# File Naming Conventions

This document outlines the standardized file naming conventions for the ResumeAI project.

## Overview

Consistent file naming improves code readability, makes it easier to locate files, and maintains a professional codebase structure.

## Naming Conventions by File Type

### TypeScript/React Files

| File Type            | Convention                  | Example                               |
| -------------------- | --------------------------- | ------------------------------------- |
| Components           | PascalCase                  | `Sidebar.tsx`, `Editor.tsx`           |
| Component Tests      | PascalCase + `.test`        | `Sidebar.test.tsx`, `Editor.test.tsx` |
| Component Benchmarks | PascalCase + `.bench`       | `Editor.bench.test.tsx`               |
| Hooks                | camelCase with `use` prefix | `useAuth.ts`, `useFocus.ts`           |
| Hook Tests           | Hook name + `.test`         | `useAuth.test.ts`                     |
| Utils/Functions      | kebab-case                  | `api-client.ts`, `fetch-timeout.ts`   |
| Utils Tests          | kebab-case + `.test`        | `api-client.test.ts`                  |
| Pages                | PascalCase                  | `Dashboard.tsx`, `Editor.tsx`         |
| Page Tests           | Page name + `.test`         | `Dashboard.test.tsx`                  |
| Types/Interfaces     | PascalCase                  | `types.ts`                            |
| Config files         | kebab-case or lowercase     | `vite.config.ts`, `eslint.config.js`  |

### Python Files

| File Type | Convention                  | Example                              |
| --------- | --------------------------- | ------------------------------------ |
| Modules   | snake_case                  | `database.py`, `error_helpers.py`    |
| Tests     | `test_` prefix + snake_case | `test_validators.py`, `test_auth.py` |
| Classes   | PascalCase                  | `class ResumeGenerator:`             |

### Documentation Files

| File Type        | Convention                               | Example                             |
| ---------------- | ---------------------------------------- | ----------------------------------- |
| Issue-related    | UPPER*SNAKE_CASE with `ISSUE*` prefix    | `ISSUE_544_COMPLETION_SUMMARY.md`   |
| Guides           | UPPER_SNAKE_CASE                         | `DEPLOYMENT_GUIDE.md`               |
| Quick References | UPPER_SNAKE_CASE with `_QUICK_REFERENCE` | `ERROR_HANDLING_QUICK_REFERENCE.md` |
| Implementation   | `IMPLEMENTATION_` or `ISSUE_` prefix     | `IMPLEMENTATION_SUMMARY.md`         |

### Configuration Files

| File Type            | Convention     | Example                         |
| -------------------- | -------------- | ------------------------------- |
| JSON configs         | kebab-case     | `variant-mapping.json`          |
| Package configs      | lowercase      | `package.json`, `tsconfig.json` |
| Environment examples | `.env.example` | `.env.example`                  |

### Data Files

| File Type  | Convention       | Example                            |
| ---------- | ---------------- | ---------------------------------- |
| Issue data | UPPER_SNAKE_CASE | `ISSUE_544_COVERAGE_ANALYSIS.json` |
| Metadata   | lowercase        | `metadata.json`                    |

## Directory Structure

```
src/
├── components/          # React components (PascalCase)
│   ├── ui/             # UI primitives
│   ├── editor/        # Editor-related components
│   └── skeletons/     # Skeleton loaders
├── hooks/             # React hooks (use* prefix)
├── utils/             # Utility functions (kebab-case)
├── pages/             # Page components (PascalCase)
├── contexts/          # React contexts (PascalCase)
└── store/             # State management

resume-api/
├── api/               # API routes
├── lib/               # Library modules (snake_case)
├── routes/            # Route handlers
├── config/            # Configuration
└── tests/             # Python tests

tests/
├── a11y/              # Accessibility tests
├── e2e/               # End-to-end tests
├── integration/       # Integration tests
└── *.test.ts(x)       # Unit tests
```

## Migration Notes

When renaming files:

1. **Update all imports** that reference the renamed file
2. **Update any configurations** that reference the file (e.g., tsconfig paths, test configurations)
3. **Update git references** if the files are tracked elsewhere
4. **Run tests** to ensure nothing is broken after renaming

## Enforcement

These conventions are enforced through:

- ESLint rules for TypeScript/React
- Prettier for code formatting
- Black for Python formatting
- EditorConfig for basic settings
