# Test Coverage Guide

This document describes how to run tests with coverage tracking, enforce minimum thresholds, and view coverage reports.

## Overview

ResumeAI enforces **60% minimum code coverage** across both frontend and backend:

- **Frontend:** vitest + Istanbul coverage provider
- **Backend:** pytest + coverage.py
- **CI/CD:** Automated coverage checks on all PRs

## Frontend Coverage

### Running Tests with Coverage

```bash
# Run tests with coverage report
npm run test:coverage

# Run tests with coverage and watch mode
npm run test:coverage -- --watch

# Run specific test file with coverage
npm run test:coverage -- components/Resume.test.tsx
```

### Coverage Configuration

Located in `vite.config.ts`:

```typescript
coverage: {
  provider: 'istanbul',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
}
```

### Viewing Frontend Coverage Reports

After running `npm run test:coverage`, coverage reports are generated:

```bash
# Open HTML report in browser
open coverage/index.html

# View coverage in terminal
cat coverage/coverage-final.json | jq '.total'

# View detailed per-file coverage
ls coverage/coverage-final.json
```

The HTML report provides:
- Line-by-line coverage visualization
- Branch coverage details
- Functions and statements coverage
- Linked source code with coverage markers

## Backend Coverage

### Running Tests with Coverage

```bash
# Run all tests with coverage (from project root)
cd resume-api && python -m pytest --cov=resume-api --cov-report=html --cov-report=term

# Run specific test file with coverage
cd resume-api && python -m pytest --cov=resume-api --cov-report=html tests/test_auth.py

# Run with coverage fail-under threshold
cd resume-api && python -m pytest --cov=resume-api --cov-fail-under=60
```

### Coverage Configuration

Located in `pytest.ini`:

```ini
[coverage:run]
source = resume-api
omit = 
    */site-packages/*
    */tests/*
    */__pycache__/*
    */venv/*

[coverage:report]
precision = 2
show_missing = True
skip_covered = False
fail_under = 60

[coverage:html]
directory = coverage_html
```

### Viewing Backend Coverage Reports

After running coverage commands:

```bash
# Open HTML report in browser
open coverage_html/index.html

# View coverage summary in terminal
cd resume-api && python -m coverage report

# View missing line coverage details
cd resume-api && python -m coverage report --include=resume-api --format=term-missing
```

The HTML report shows:
- Overall coverage percentage
- Per-module coverage statistics
- Missing lines and branches
- Execution count for each line

## CI/CD Coverage Checks

### Frontend CI

The `frontend-ci.yml` workflow:

1. Runs all tests
2. Generates coverage report
3. Uploads coverage artifacts
4. **FAILS** if coverage < 60%

Coverage artifacts are available in GitHub Actions for 30 days.

### Backend CI

The `backend-ci.yml` workflow:

1. Runs all tests
2. Generates coverage report (using pytest-cov)
3. Uploads coverage artifacts
4. **FAILS** if coverage < 60%

## Interpreting Coverage Reports

### Coverage Metrics

- **Line Coverage:** % of executable lines executed
- **Branch Coverage:** % of conditional branches taken
- **Function Coverage:** % of functions called
- **Statement Coverage:** % of statements executed

### Example Report

```
Name                          Stmts   Miss  Cover   Missing
─────────────────────────────────────────────────────────────
components/__init__.py            1      0   100%
components/Editor.tsx            42      8    81%   10-15, 42
pages/Dashboard.tsx              25      5    80%   18-22
utils/api.ts                     30      2    93%   45, 67
─────────────────────────────────────────────────────────────
TOTAL                            98     15    85%
```

### Areas Below Threshold

Files or directories below 60% coverage:

**Frontend:**
- Need to add tests for conditional branches
- Focus on error handling paths
- Add tests for edge cases

**Backend:**
- Increase test coverage for API endpoints
- Test error responses and validations
- Add integration tests for CLI integration

## Improving Coverage

### Common Gaps

1. **Error handling** - Test both success and failure paths
2. **Edge cases** - Test boundary conditions and null values
3. **Branches** - Test all if/else and switch cases
4. **Async code** - Properly await promises and async functions

### Best Practices

**Frontend:**

```typescript
// ❌ Low coverage
function getData() {
  return fetch('/api/data');
}

// ✅ Better coverage
function getData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed');
    return response.json();
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// ✅ Test both paths
test('getData returns data on success', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => ({ data: 'value' })
  }));
  expect(await getData()).toEqual({ data: 'value' });
});

test('getData handles errors', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network')));
  expect(await getData()).toBeNull();
});
```

**Backend:**

```python
# ❌ Low coverage
@app.get("/api/resume")
def get_resume(id: str):
    resume = db.get(id)
    return resume

# ✅ Better coverage
@app.get("/api/resume/{id}")
def get_resume(id: str):
    if not id:
        raise HTTPException(status_code=400, detail="ID required")
    
    resume = db.get(id)
    if not resume:
        raise HTTPException(status_code=404, detail="Not found")
    
    return resume

# ✅ Test all cases
def test_get_resume_success(client):
    response = client.get("/api/resume/123")
    assert response.status_code == 200

def test_get_resume_not_found(client):
    response = client.get("/api/resume/invalid")
    assert response.status_code == 404

def test_get_resume_missing_id(client):
    response = client.get("/api/resume/")
    assert response.status_code == 400
```

## Skipping Coverage

### Marking Code as Not Covered

Sometimes code intentionally doesn't need coverage (vendor code, fallbacks):

**Frontend (vitest):**

```typescript
// @vitest-ignore
if (someRareCondition) {
  doSomething();
}
```

**Backend (pytest):**

```python
# pragma: no cover
if rare_condition:
    do_something()
```

## Troubleshooting

### Coverage Not Generated

**Frontend:**

```bash
# Ensure coverage provider is installed
npm list @vitest/coverage-istanbul

# Check vitest is in watch mode is not enabled
npm run test:coverage -- --run
```

**Backend:**

```bash
# Ensure coverage is installed
pip install coverage pytest-cov

# Run with verbose output
python -m pytest --cov=resume-api --cov-report=term-missing -v
```

### Coverage Report Missing Lines

- Ensure test environment matches production code
- Check that excluded patterns in config are correct
- Verify all code paths are tested

### Build Failing on Coverage Threshold

1. Check current coverage: `npm run test:coverage` or `pytest --cov`
2. Identify files below 60%
3. Add tests to increase coverage
4. Re-run to verify

## Continuous Improvement

### Monthly Coverage Review

1. Check coverage trends in GitHub Actions artifacts
2. Identify decreasing coverage areas
3. Plan tests for gaps
4. Update test files accordingly

### Coverage Goals

- **MVP Phase:** 60% minimum (current)
- **Beta Phase:** 75% recommended
- **Production:** 85%+ ideal

## References

- [vitest Coverage](https://vitest.dev/config/#coverage)
- [Istanbul Reporter](https://istanbul.js.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Coverage.py Configuration](https://coverage.readthedocs.io/)
