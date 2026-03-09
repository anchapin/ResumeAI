---
name: analyze-coverage
description: "Analyze test coverage reports to identify areas needing more tests."
---

# Analyze Coverage Skill

This skill analyzes test coverage reports for both frontend and backend components of the ResumeAI project.

## Capabilities

- **Frontend Coverage**: Analyze Vitest coverage reports
- **Backend Coverage**: Analyze Pytest coverage reports
- **Coverage Gaps**: Identify uncovered files and functions
- **Threshold Checking**: Verify coverage meets minimum requirements
- **HTML Reports**: View detailed coverage in browser

## Usage

### Generate Coverage Reports

```bash
# Frontend coverage
npm run test:coverage

# Backend coverage
pytest --cov=resume-api --cov-report=html --cov-report=term
```

### View Coverage Reports

```bash
# Backend HTML report
open coverage/index.html

# Or serve it
cd coverage && python -m http.server 8080
```

### Coverage Thresholds

The project requires minimum 60% coverage for:
- Lines
- Functions
- Branches
- Statements

### Check Coverage Requirements

```bash
# Backend - fail if below threshold
pytest --cov=resume-api --cov-fail-under=60

# Frontend - check vitest.config.ts for threshold configuration
```

## Coverage Structure

### Frontend Coverage

- Output: `coverage/` directory
- Report formats: HTML, JSON, text
- Entry point: Vitest configuration

### Backend Coverage

- Output: `coverage/` directory
- Report formats: HTML, JSON, XML, text
- Entry point: pytest-cov configuration in pytest.ini

## Finding Coverage Gaps

### Backend - Find Uncovered Files

```bash
# List uncovered files
pytest --cov=resume-api --cov-report=term-missing

# JSON report for programmatic analysis
pytest --cov=resume-api --cov-report=json -o cov_jsonfile=coverage/coverage.json
```

### Frontend - Find Uncovered Files

The coverage report in `coverage/` shows file-by-file coverage.

## Coverage Best Practices

1. **Focus on Critical Paths**: Prioritize testing business logic and API endpoints
2. **Edge Cases**: Ensure error handling is covered
3. **User Interactions**: Test key user flows in the frontend
4. **Maintain Thresholds**: Don't let coverage drop below 60%

## Tips

- Run coverage locally before pushing to catch issues early
- Use `--cov-report=term-missing` to see exact lines not covered
- Focus new tests on uncovered critical functionality
- The coverage report shows which files need attention
