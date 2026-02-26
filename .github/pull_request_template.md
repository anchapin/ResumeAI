## Issue

Closes #XXX

## Description

Brief description of changes and why they're needed

## Changes

- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

## Testing

How to test these changes locally

## Pre-Submission Checklist ✅

Before submitting, run these commands and verify all pass:

**Frontend:**

```bash
npm run lint
npm run type-check
npm run test -- --run
npm run test:coverage
```

**Backend:**

```bash
cd resume-api
pylint **/*.py
mypy --strict .
pytest --cov=. --cov-report=term
```

## Code Quality Checklist

- [ ] Tests pass locally (`npm run test` or `pytest`)
- [ ] Test coverage >= 60% for new code
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] No console.log(), debugger, or TODO statements
- [ ] Comments explain "why", not "what"
- [ ] Code follows style guide (ESLint/Prettier)
- [ ] Type definitions added (TypeScript/Pydantic models)
- [ ] DRY principle applied (no copy-paste code)

## Error Handling & Security

- [ ] All error cases handled (happy path + edge cases)
- [ ] User-friendly error messages
- [ ] Errors logged appropriately (no sensitive data)
- [ ] Input validation present
- [ ] Output properly escaped (XSS protection)
- [ ] API endpoints properly authenticated
- [ ] No SQL injection vulnerabilities
- [ ] Dependencies scanned for vulnerabilities (`npm audit`, `pip-audit`)

## Documentation & Testing

- [ ] README/docs updated if behavior changed
- [ ] API documentation updated (if new endpoints)
- [ ] New environment variables added to `.env.example`
- [ ] Commit messages follow conventional commits (feat:, fix:, chore:)
- [ ] Integration tests added for API changes
- [ ] Edge cases and error scenarios tested

## Performance

- [ ] No unnecessary API calls or nested loops
- [ ] Algorithms optimized (avoid O(n²) in hot paths)
- [ ] Large objects properly cleaned up
- [ ] Bundle size impact acceptable (frontend)

## Additional Notes

Any additional context or notes for reviewers

---

## Automated Checks (CI/CD)

✅ ESLint / Pylint  
✅ TypeScript / MyPy type checking  
✅ Unit & integration tests  
✅ Code coverage >= 60%

**All checks must pass before merge.**

---

**Detailed requirements:** See [CODE_REVIEW_CHECKLIST.md](../CODE_REVIEW_CHECKLIST.md)
