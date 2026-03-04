# Visual Regression Tests

This directory contains visual regression tests using Playwright's built-in screenshot comparison.

## Setup

1. Install Playwright browsers:

```bash
npx playwright install
```

2. Start the development server:

```bash
npm run dev
```

## Running Tests

### Generate Baseline Screenshots (First Run)

```bash
npx playwright test tests/visual-regression/ --update-snapshots
```

### Run Visual Regression Tests

```bash
npx playwright test tests/visual-regression/
```

### Run with UI

```bash
npx playwright test tests/visual-regression/ --ui
```

## Workflow

1. **Initial Setup**: Run with `--update-snapshots` to generate baseline screenshots
2. **On Code Changes**: Run tests to compare against baseline
3. **Review Changes**: If visual differences are found, review and either:
   - Accept new baseline (if intentional change): `npx playwright test --update-snapshots`
   - Fix the bug (if unintended)

## CI Integration

Add to `.github/workflows/visual-regression.yml`:

```yaml
name: Visual Regression Tests
on: [pull_request]
jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install
      - run: npm run dev &
      - sleep 10
      - run: npx playwright test tests/visual-regression/
```

## Configuration

Edit `maxDiffPixelRatio` in visual.spec.ts to adjust sensitivity:

- 0.01 = 1% pixel difference allowed
- 0.1 = 10% pixel difference allowed

## Alternatives

For more advanced visual regression testing, consider:

- **Chromatic** (chromatic.com) - Cloud-based visual testing
- **Percy** (percy.io) - Visual review platform
- **Loki** (loki.js.org) - Visual regression testing for React
