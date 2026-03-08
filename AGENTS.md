# AGENTS.md

This file provides guidance for agentic coding tools (like Claude Code) working in this repository.

## Build, Lint, and Test Commands

### Frontend (React/TypeScript)

```bash
# Development server
npm run dev

# Production build
npm run build

# Run all tests (Vitest)
npm test
npm test -- --run          # Run once without watch mode

# Single test file
vitest <test-file-path>                # Watch mode
vitest <test-file-path> --run          # Run once

# Coverage
npm run test:coverage

# Linting & Formatting
npm run lint              # ESLint check
npm run lint:fix          # ESLint fix
npm run format            # Prettier format
npm run format:check      # Prettier check

# Type checking
npx tsc --noEmit          # TypeScript type check

# E2E Tests (Playwright)
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run E2E tests with UI
npm run test:e2e:headed   # Run E2E tests in headed mode
npm run test:e2e:report   # View E2E test report
npx playwright test <test-file>  # Run specific test
npx playwright install    # Install Playwright browsers
```

### Backend (Python/FastAPI)

```bash
# Development server
cd resume-api && python main.py

# Production server (with env)
cd resume-api && PORT=8000 python main.py

# Run all tests (Pytest)
pytest
pytest -v                  # Verbose output
pytest -x                   # Stop on first failure

# Single test file or function
pytest <test-file>.py
pytest <test-file>.py::<TestClass>::<test_function>

# Coverage
pytest --cov=resume-api --cov-report=html

# Linting & Formatting
black .                     # Format code
black . --check             # Check formatting
flake8 .                    # Lint code
mypy .                      # Type check (strict mode)
```

### Makefile Targets

```bash
make test                   # Run all tests
make test-frontend          # Frontend tests only
make test-backend           # Backend tests only
make lint                   # Lint all code
make format                 # Format all code
make build                  # Build frontend
make dev                    # Start dev servers
```

## Code Style Guidelines

### TypeScript/React (Frontend)

**Imports:**

- Order: React → Third-party → Relative imports (no unused imports)
- Use explicit named imports: `import { useState } from 'react'`
- Group and sort alphabetically within groups

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './components/Button';
```

**Naming Conventions:**

- Components: PascalCase (`Sidebar`, `Dashboard`, `ErrorBoundary`)
- Functions/hooks: camelCase with `use` prefix for hooks (`useAuth`, `useTheme`, `formatResumeData`)
- Interfaces/Types: PascalCase (`SidebarProps`, `AuthUser`, `SimpleResumeData`)
- Constants: UPPER_SNAKE_CASE (`NAV_ITEMS`, `DEFAULT_SHORTCUTS`, `API_URL`)
- Enum values: lowercase string literals (`'idle' | 'saving' | 'saved'`)
- Files: kebab-case for utils/pages, PascalCase for components (`use-auth.ts`, `Sidebar.tsx`)

**Type Safety:**

- Always specify types for props: `React.FC<Props>`
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` or proper types
- Type guard with `instanceof` for error handling

**React Patterns:**

- Use React.memo for performance optimization on components
- Use useCallback/useMemo for expensive operations
- Lazy load routes: `const Editor = lazy(() => import('./pages/Editor'))`
- Error boundaries for component trees
- Use `key` prop on lists with unique identifiers

**Testing (Vitest):**

- Use @testing-library/react and @testing-library/user-event
- Describe blocks for test organization
- Test user interactions, not implementation details
- Mock external dependencies with vi.fn()
- Run single test: `vitest path/to/test.test.tsx --run`

### Python/FastAPI (Backend)

**Imports:**

- Order: stdlib → third-party → local modules
- Use `# noqa: E402` for re-exports after sys.path modification
- Group and sort alphabetically

**Naming Conventions:**

- Classes: PascalCase (`TestLatexEscaping`, `ResumeGenerator`, `APIRouter`)
- Functions/variables: snake_case (`escape_latex`, `validate_resume_data`)
- Constants: UPPER_SNAKE_CASE (`TEMPLATES_DIR`, `MAX_FILE_SIZE`)
- Files: snake_case (`test_validators.py`, `routes.py`)

**Type Safety:**

- Use type hints on all functions: `def escape_latex(text: str) -> str:`
- Use Pydantic models for request/response validation
- Strict mypy mode enabled in mypy.ini

**FastAPI Patterns:**

- Use async/await for I/O operations
- Return proper HTTP status codes
- Use `raise HTTPException` for errors
- Implement rate limiting on expensive endpoints
- Use dependency injection for auth/DB
- Document endpoints with docstrings

**Testing (Pytest):**

- Test class naming: `Test<Feature>` (e.g., `TestLatexEscaping`)
- Use descriptive test names: `test_escape_dollar_sign`
- Use fixtures for shared test data
- Mark tests: `@pytest.mark.integration`, `@pytest.mark.asyncio`
- Run single test: `pytest test_validators.py::TestLatexEscaping::test_escape_dollar_sign`

### Error Handling

**Frontend:**

- Try/catch blocks with explicit error types
- Use `instanceof` checks for custom errors
- Display user-friendly error messages
- Log errors in dev mode only
- Use ErrorBoundary for component errors

**Backend:**

- Create custom exception classes in config/errors.py
- Use HTTPException for API errors
- Log errors with structured logging (structlog)
- Return consistent error response format
- Use middleware for global error handling

### Formatting

**Prettier (Frontend):**

- Line width: 100
- Indent: 2 spaces
- Quotes: single
- Semicolons: yes
- Trailing commas: all

**Black (Backend):**

- Line width: 100
- Auto-formatted on save
- Use flake8 for linting

## Key Patterns

### Authentication

- Frontend: `useAuth` hook, token stored in localStorage via TokenManager
- Backend: JWT tokens via python-jose, encrypted refresh tokens
- Middleware: `AuthorizedAPIKey` dependency for API key auth

### API Client

- Use fetch API with proper error handling
- Include Authorization header when authenticated
- Handle rate limiting gracefully
- Use async/await for network calls

### File Organization

- Frontend: `components/`, `pages/`, `hooks/`, `utils/`, `tests/`
- Backend: `api/`, `routes/`, `lib/`, `config/`, `tests/`
- Shared types in root `types.ts`

### Git Workflow

- Always create feature branches from main
- Use `feature/issue-XX description` naming
- Create PRs for all changes to main
- Never push directly to main without PR

### CI/CD

- Use local `act` CLI tool when GitHub Actions has billing issues
- Run `act -j <job-name>` to test specific workflows locally
- Requires Docker to be installed for `act` to work properly

## Testing Coverage

- Frontend: Vitest with @testing-library/react
- Backend: Pytest with pytest-asyncio
- Coverage thresholds: 60% (lines, functions, branches, statements)
- Run `npm run test:coverage` or `pytest --cov` before committing
- Accessibility testing: `npm run test:a11y` with jest-axe

## Dependency Management

### Detecting Unused Dependencies

The project includes tooling to detect unused dependencies:

```bash
# Detect all unused dependencies
npm run deps:unused

# Check only production dependencies
npm run deps:unused -- --prod

# Check only dev dependencies
npm run deps:unused -- --dev

# Output JSON format
npm run deps:unused -- --json
```

The detection script scans:
- Source files (`src/`, `components/`, `pages/`, `hooks/`, `utils/`, `contexts/`, `store/`, `i18n/`)
- Config files (`eslint.config.js`, `vitest.config.ts`, `vite.config.ts`, etc.)
- Package.json scripts and configuration

It handles special cases like:
- Type packages (`@types/*`) - automatically considered used
- ESLint plugins and configs
- Vitest coverage providers
- Scoped packages (`@org/package`)

A GitHub Actions workflow (`.github/workflows/unused-deps.yml`) runs this check on:
- Push to main/develop branches
- Pull requests
- Weekly schedule


## Known Limitations

### ecryptfs Filename Length Limit

The home directory (`/home/alex`) uses `ecryptfs` (encrypted filesystem) which has a **140-character filename path limit**. This can cause errors like `[Errno 36] File name too long` when working with nested directories or long file paths.

**Workaround 1 - Use symlink**: Use the symlink in `/tmp` for agent work:

```bash
# Agents should use this path instead
cd /tmp/ResumeAI

# Or use absolute path
/tmp/ResumeAI
```

This symlink points to the same project but bypasses the ecryptfs limitations.

**Workaround 2 - Use utility module**: The codebase includes `resume-api/lib/utils/ecryptfs_utils.py` which provides helper functions for creating temporary files/directories in `/tmp` instead of the home directory:

```python
from lib.utils.ecryptfs_utils import get_temp_dir, is_ecryptfs_path

# Use /tmp to avoid ecryptfs path limits
temp_base = get_temp_dir()
with tempfile.TemporaryDirectory(dir=temp_base) as temp_dir:
    # Your code here
```


## Code Modularization Enforcement

This project uses ESLint with `eslint-plugin-boundaries` and `eslint-plugin-import` to enforce module boundaries and prevent circular dependencies.

### Module Boundaries

The following element types are defined in `eslint.config.js`:
- `components/` - React UI components
- `pages/` - Route-based page components
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
- `contexts/` - React context providers
- `store/` - State management
- `src/` - Source files

### Enforcement Rules

1. **Module Boundary Types** (`boundaries/element-types`): Warns when elements import from restricted paths
2. **Circular Dependency Detection** (`import/no-cycle`): Warns about circular imports with max depth of 3
3. **Import Rules**: Uses `eslint-plugin-import` for advanced import analysis

### Running Modularization Checks

```bash
# Run ESLint with modularization rules
npm run lint

# Check specifically for circular dependencies
npx eslint --rule "import/no-cycle: warn" .

# Check module boundaries
npx eslint --rule "boundaries/element-types: warn" .
```

### CI Integration

A GitHub Actions workflow (`.github/workflows/modularization.yml`) runs these checks on:
- Push to main/develop branches
- Pull requests

