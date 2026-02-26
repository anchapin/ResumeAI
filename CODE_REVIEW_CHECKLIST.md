# Code Review Checklist

This document outlines the mandatory requirements for all pull requests before they can be merged into `main`.

## Before Submitting PR

### Code Quality
- [ ] Code follows project style guide (ESLint, Prettier)
- [ ] No console.log() or debugger statements
- [ ] No hardcoded credentials or secrets
- [ ] Comments explain "why", not "what"
- [ ] DRY principle applied (no copy-paste code)

### Testing
- [ ] Test coverage > 60% for new code
- [ ] All tests pass locally (`npm run test` or `pytest`)
- [ ] Edge cases and error scenarios tested
- [ ] Integration tests added for API changes

### Documentation
- [ ] README/docs updated if behavior changed
- [ ] New environment variables documented in `.env.example`
- [ ] Commit messages follow conventional commits (feat:, fix:, chore:)
- [ ] Type definitions added (TypeScript/Pydantic models)

### Security
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (proper escaping)
- [ ] API keys/tokens never logged
- [ ] Sensitive data handled securely
- [ ] Dependencies checked for vulnerabilities (`npm audit`, `pip-audit`)

### Performance
- [ ] No unnecessary API calls or loops
- [ ] Algorithms optimized (avoid O(n²) in hot paths)
- [ ] Large objects properly cleaned up
- [ ] Bundle size impact evaluated (frontend)

---

## Reviewer Checklist

### Functionality
- [ ] Code solves the stated problem
- [ ] No regressions in existing features
- [ ] Edge cases handled properly
- [ ] Error messages are helpful and clear

### Code Review
- [ ] Code is readable and maintainable
- [ ] Naming conventions followed
- [ ] No overly complex logic (functions <50 lines preferred)
- [ ] Performance impact acceptable

### Testing
- [ ] Test coverage >= 60%
- [ ] Tests are meaningful (not just lines of code)
- [ ] Error handling tested
- [ ] Integration tests pass

### Security Review
- [ ] ✅ No hardcoded secrets/credentials
- [ ] ✅ Input validation present
- [ ] ✅ No unauthorized data access
- [ ] ✅ Authentication/authorization checks correct
- [ ] ✅ HTTPS enforced where needed
- [ ] ✅ API endpoints properly secured

### Documentation
- [ ] Code is self-documenting
- [ ] Complex sections explained
- [ ] API documentation updated
- [ ] Type definitions correct

### Dependencies
- [ ] No unnecessary dependencies added
- [ ] Dependency versions pinned (no loose ^)
- [ ] No security vulnerabilities in deps
- [ ] Breaking changes documented

---

## Required Sign-Offs

Before merging, **all** of the following must be satisfied:

### 1. **Test Coverage** ✅
```
- [ ] Frontend: >= 60% coverage
- [ ] Backend: >= 60% coverage
- [ ] CI/CD pipeline passing
```

### 2. **Security Review** ✅
```
- [ ] No hardcoded credentials
- [ ] No secrets in logs
- [ ] Input validation present
- [ ] Output properly escaped
- [ ] Dependencies scanned for vulnerabilities
```

### 3. **Code Quality** ✅
```
- [ ] ESLint/Prettier passing
- [ ] Type checking passing
- [ ] No linting errors
- [ ] Naming conventions followed
```

### 4. **Error Handling** ✅
```
- [ ] All error cases handled
- [ ] User-friendly error messages
- [ ] Errors logged appropriately
- [ ] No silent failures
```

### 5. **Documentation** ✅
```
- [ ] README updated (if needed)
- [ ] Code comments sufficient
- [ ] API docs updated (if needed)
- [ ] Examples provided (if new feature)
```

---

## PR Description Template

```markdown
## Issue
Closes #XXX

## Description
Brief description of changes

## Changes
- [ ] Change 1
- [ ] Change 2

## Testing
How to test these changes

## Checklist
- [ ] Tests pass
- [ ] Coverage > 60%
- [ ] No hardcoded secrets
- [ ] Documentation updated
- [ ] Type definitions added
- [ ] Error handling complete
```

---

## Quick Reference

### Commands to Run Before Submitting

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
pytest
pytest --cov=. --cov-report=term
```

### Common Issues

**Failing ESLint?**
```bash
npm run lint -- --fix
```

**Type errors?**
```bash
npm run type-check
# or
cd resume-api && mypy --strict .
```

**Tests not passing?**
```bash
npm run test -- --run
# or
cd resume-api && pytest -v
```

**Coverage too low?**
```bash
npm run test:coverage
# Fix: Add test cases for uncovered lines
```

---

## Approval Process

1. **Submitter** creates PR with all checklist items completed
2. **Reviewer** verifies code quality and security
3. **Automated Tests** must pass (CI/CD)
4. **Coverage** must meet 60% threshold
5. **Approval** required before merge
6. **Merge** only when all checks pass

---

## Examples

### Good PR
✅ Test coverage 72%, all tests pass  
✅ No console.log statements  
✅ Error handling complete  
✅ Documentation updated  
✅ Security review passed  

### Bad PR
❌ Test coverage 45% (below 60%)  
❌ Console.log statements left in code  
❌ Missing error handling  
❌ No documentation updates  
❌ Hardcoded API key in constants  

---

## Questions?

Refer to project documentation:
- `CLAUDE.md` - Architecture and conventions
- `README.md` - Setup and development
- `API_DOCUMENTATION.md` - API endpoints
