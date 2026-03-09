---
name: run-tests
description: "Run frontend and backend tests with coverage reporting for the ResumeAI project."
---

# Run Tests Skill

This skill runs tests for both frontend (React/TypeScript) and backend (Python/FastAPI) components of the ResumeAI project.

## Capabilities

- **Frontend Tests**: Run Vitest tests with coverage
- **Backend Tests**: Run Pytest with coverage
- **Full Test Suite**: Run all tests at once
- **Coverage Reports**: Generate and display coverage metrics
- **Selective Testing**: Run specific test files or suites

## Usage

### Run All Tests

```bash
# Using Makefile
make test

# Or run separately
npm test -- --run
pytest
```

### Frontend Tests (Vitest)

```bash
# Run frontend tests in watch mode
npm test

# Run once without watch mode
npm test -- --run

# Run with coverage
npm run test:coverage

# Run specific test file
vitest path/to/test.test.tsx --run
```

### Backend Tests (Pytest)

```bash
# Run backend tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=resume-api --cov-report=html

# Run specific test file
pytest resume-api/tests/test_file.py

# Run specific test function
pytest resume-api/tests/test_file.py::TestClass::test_function
```

### Test Coverage

Coverage thresholds are set at 60% for lines, functions, branches, and statements.

```bash
# Frontend coverage report
npm run test:coverage

# Backend coverage report
pytest --cov=resume-api --cov-report=html --cov-report=term

# View HTML coverage report
open coverage/index.html
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# View E2E test report
npm run test:e2e:report
```

## Test Organization

### Frontend Tests

- Location: `tests/`, alongside components
- Framework: Vitest with @testing-library/react
- Patterns: Describe blocks, user-event for interactions

### Backend Tests

- Location: `resume-api/tests/`
- Framework: Pytest with pytest-asyncio
- Patterns: Test classes, fixtures for shared data

### Integration Tests

- Location: Root directory (`test_api_integration.py`)
- Tests API endpoints with test database

## Tips

- Use `npm run test:coverage` before committing to ensure coverage thresholds are met
- Run specific test files during development to save time
- Use `--run` flag with vitest for CI environments (non-interactive)
- Check coverage reports in `coverage/` directory for backend and similar for frontend
