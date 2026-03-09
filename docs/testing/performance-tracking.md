# Test Performance Tracking

This document describes how test performance tracking works in ResumeAI.

## Overview

Test performance tracking is implemented to detect slow tests that can waste developer time. The system tracks test execution times and outputs the slowest tests.

## Backend Tests (Python/pytest)

### Configuration

The following has been added to `pytest.ini`:

```ini
addopts =
    -v
    --tb=short
    --strict-markers
    --durations=20
    --ignore=resume-api/test_validators_standalone.py
```

The `--durations=20` flag outputs the 20 slowest tests after each test run.

### CI Integration

The backend CI workflow (`.github/workflows/backend-ci.yml`) runs pytest with the durations flag:

```bash
python -m pytest --cov=. --cov-report=html --cov-report=term --cov-report=lcov --cov-fail-under=80 --durations=20
```

## Frontend Tests (JavaScript/Vitest)

### Configuration

Vitest does not have a built-in duration tracking flag equivalent to pytest's `--durations`. However, test timing is available in the verbose output.

### Usage

Run tests with verbose output to see timing information:

```bash
npm run test -- --run --reporter=verbose
```

## Interpreting Results

When tests run, you'll see output like:

```
========================== slowest durations ==========================
 0.12s  test_api_authentication
 0.08s  test_database_connection
 0.05s  test_user_creation
...
```

### Performance Regression Detection

If a test that previously ran in 0.1s now takes 5s, this indicates a performance regression that should be investigated.

## Optimizing Slow Tests

1. **Identify the bottleneck**: Check if the test is making network calls, database queries, or complex computations
2. **Use mocks**: Mock external dependencies to speed up tests
3. **Reduce data volume**: Use minimal test data where possible
4. **Parallelize**: Consider running independent tests in parallel

## Baseline Tracking

For more advanced tracking, consider:
- Storing test durations in a JSON file
- Comparing against a baseline in CI
- Failing the build if a test exceeds a threshold
