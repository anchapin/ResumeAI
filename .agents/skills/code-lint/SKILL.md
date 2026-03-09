---
name: code-lint
description: "Run linters, formatters, and type checkers for both frontend and backend code."
---

# Code Lint Skill

This skill runs linters and formatters for both frontend (React/TypeScript) and backend (Python/FastAPI) components of the ResumeAI project.

## Capabilities

- **Frontend Linting**: ESLint with TypeScript support
- **Frontend Formatting**: Prettier
- **Backend Linting**: Flake8
- **Backend Formatting**: Black
- **Type Checking**: TypeScript (frontend) and mypy (backend)
- **Full Lint Suite**: Run all linters at once

## Usage

### Run All Linters

```bash
# Using Makefile
make lint

# Or run separately
npm run lint
black .
flake8 .
mypy .
```

### Frontend Linting (ESLint)

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Run ESLint on specific files
npx eslint src/components/Button.tsx
```

### Frontend Formatting (Prettier)

```bash
# Format code
npm run format

# Check formatting without making changes
npm run format:check

# Format specific files
npx prettier --write src/App.tsx
```

### TypeScript Type Checking

```bash
# Check types without building
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/App.tsx
```

### Backend Linting (Flake8)

```bash
# Run flake8 on all Python files
flake8 .

# Run on specific files or directories
flake8 resume-api/

# Show specific error codes
flake8 --select=E9,F63,F7,F82 resume-api/
```

### Backend Formatting (Black)

```bash
# Format code
black .

# Check formatting without making changes
black . --check

# Format specific files
black resume-api/main.py
```

### Backend Type Checking (mypy)

```bash
# Run mypy on all Python files
mypy .

# Run with strict mode
mypy --strict .

# Run on specific files
mypy resume-api/main.py
```

## Configuration Files

- **ESLint**: `eslint.config.js`
- **Prettier**: `.prettierrc`
- **TypeScript**: `tsconfig.json`
- **Black**: `pyproject.toml` or `black` section
- **Flake8**: `setup.cfg` or `pyproject.toml`
- **mypy**: `mypy.ini`

## CI Integration

Linting checks run automatically in CI/CD pipelines:
- `.github/workflows/frontend-ci.yml` - Frontend linting
- `.github/workflows/backend-ci.yml` - Backend linting

## Tips

- Run `npm run lint:fix` before committing to fix frontend issues
- Run `black .` before committing to format Python code
- Use `mypy --strict` for stricter type checking
- Install ESLint/Prettier extensions in your editor for real-time feedback
- The project uses `eslint-plugin-boundaries` to enforce module boundaries
