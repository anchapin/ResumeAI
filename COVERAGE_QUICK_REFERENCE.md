# Coverage Quick Reference

## TL;DR

**ResumeAI requires 60% code coverage** on all code changes.

### Run Coverage Tests

**Frontend:**
```bash
npm run test:coverage
```

**Backend:**
```bash
cd resume-api && python -m pytest --cov=resume-api --cov-report=html
```

### View Reports

**Frontend:** `coverage/index.html`
**Backend:** `coverage_html/index.html`

---

## Common Commands

| Task | Command |
|------|---------|
| Frontend tests only | `npm test` |
| Frontend with coverage | `npm run test:coverage` |
| Backend tests only | `cd resume-api && python -m pytest` |
| Backend with coverage | `cd resume-api && python -m pytest --cov=resume-api --cov-report=html` |
| Check if coverage passes | `npm run test:coverage -- --run` |
| Open coverage report | `open coverage/index.html` (macOS) or `start coverage/index.html` (Windows) |

---

## Metrics (60% Minimum)

- **Lines:** % of code lines executed
- **Functions:** % of functions called
- **Branches:** % of if/else paths taken
- **Statements:** % of statements executed

All must be ≥ 60%

---

## CI/CD Behavior

✅ **Tests PASS if:** Coverage ≥ 60%
❌ **Tests FAIL if:** Coverage < 60%

Coverage is checked automatically on:
- Pull requests
- Pushes to main/develop

---

## Where to Learn More

- **Detailed Guide:** [COVERAGE_GUIDE.md](COVERAGE_GUIDE.md)
- **Implementation:** [ISSUE_390_IMPLEMENTATION.md](ISSUE_390_IMPLEMENTATION.md)
- **Checklist:** [COVERAGE_IMPLEMENTATION_CHECKLIST.md](COVERAGE_IMPLEMENTATION_CHECKLIST.md)

---

## Troubleshooting

### "Coverage < 60%" Error

1. Run coverage locally: `npm run test:coverage`
2. Open `coverage/index.html`
3. Find uncovered lines (marked in red)
4. Write tests for those lines
5. Re-run coverage to verify

### "Module not found" in Backend

```bash
cd resume-api
pip install coverage pytest-cov
```

---

## Pro Tips

- 💡 Write tests WHILE developing, not after
- 💡 Focus on critical paths first
- 💡 Test error cases, not just success paths
- 💡 Use `--cov-report=term-missing` to see which lines need tests

---

## Questions?

See [COVERAGE_GUIDE.md](COVERAGE_GUIDE.md) section: **Troubleshooting**
