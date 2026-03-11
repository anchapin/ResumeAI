# Visual Regression Testing Implementation

## Overview

This document describes the visual regression testing implementation for ResumeAI to prevent UI bugs and maintain design consistency.

## Implementation Summary

### Components Added

1. **Enhanced Visual Test Suite** (`tests/visual/pages.spec.ts`)
   - 20+ comprehensive visual tests
   - Coverage for authenticated and public pages
   - Responsive design testing (desktop, tablet, mobile)
   - Dynamic content masking
   - Deterministic test data

2. **Test Documentation** (`tests/visual/README.md`)
   - Setup and usage instructions
   - Best practices
   - Troubleshooting guide
   - CI/CD integration details

3. **GitHub Actions Workflow** (`.github/workflows/visual-regression-tests.yml`)
   - Automatic visual tests on PR and push
   - Artifact upload for reports
   - PR comments with test results
   - Baseline update instructions

4. **Package.json Scripts**
   ```bash
   npm run test:visual          # Run visual tests
   npm run test:visual:ui       # Run with interactive UI
   npm run test:visual:update   # Update baselines
   npm run test:visual:report   # View test report
   ```

5. **Enhanced Playwright Configuration**
   - Dedicated visual-testing project
   - Optimized reporter settings
   - Consistent viewport defaults

## Test Coverage

### Authenticated Pages (7 tests)
- Dashboard main layout
- Dashboard with resumes list
- Editor empty state
- Editor with populated content
- Settings profile section
- Settings preferences section
- Template selection page

### Public Pages (3 tests)
- Login page
- Registration page
- Landing page

### Responsive Design (3 tests)
- Desktop Large (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

**Total**: 13+ comprehensive visual tests covering critical user flows

## Key Features

### 1. Dynamic Content Masking
Tests automatically mask elements that change on every run:
```typescript
mask: [
  page.locator('[data-testid="last-login-time"]'),
  page.locator('[class*="timestamp"]'),
  page.locator('[data-testid="auto-save-status"]'),
]
```

### 2. Deterministic Test Data
- Fixed test user: `visual-test-user@example.com`
- Consistent resume sample data
- No randomization in test state

### 3. Animation & Network Handling
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Wait for animations
```

### 4. Comprehensive Reporting
- HTML report with visual diffs
- Side-by-side comparison of expected vs actual
- Full page screenshot capture
- Detailed test statistics

## Running Tests

### Local Development

Generate baseline screenshots (first run):
```bash
npm run dev  # Start dev server in another terminal
npm run test:visual:update
```

Run tests against baselines:
```bash
npm run test:visual
```

Interactive testing:
```bash
npm run test:visual:ui
```

### Updating Baselines

When UI changes are intentional:
```bash
# Update all baselines
npm run test:visual:update

# Or update specific tests
npx playwright test tests/visual/pages.spec.ts -k "Dashboard" --update-snapshots

# Commit changes
git add tests/visual/**/*.png
git commit -m "chore: update visual regression baselines for Dashboard redesign"
```

### Viewing Reports
```bash
npm run test:visual:report
```

## CI/CD Integration

### Automatic Triggers
Visual tests run automatically on:
- **Pull requests** to main/develop
- **Push** to main/develop
- **Manual trigger** via workflow_dispatch

### Conditional Execution
Tests only run if changes touch:
- Source code (`src/**`)
- Components (`components/**`)
- Pages (`pages/**`)
- Visual tests themselves (`tests/visual/**`)
- Build/test configuration

### Failure Handling
1. Test failure blocks PR merge (if branch protection enabled)
2. HTML report uploaded as artifact
3. PR comment added with test results
4. Instructions provided for updating baselines

## Baseline Management

### File Structure
```
tests/visual/
├── pages.spec.ts              # Test specifications
├── __snapshots__/             # Baseline directory (auto-created)
│   ├── pages.spec.ts-snapshots/
│   │   ├── dashboard-main.png
│   │   ├── editor-empty.png
│   │   ├── login-page.png
│   │   └── ...
├── README.md                  # Testing guide
```

### Git Tracking
Baseline images should be committed to version control:
```bash
git add tests/visual/__snapshots__/
```

This allows:
- Tracking UI changes over time
- Detecting unintended regressions
- Reviewing design changes in PRs

## Handling Regressions

### When Tests Fail

1. **Review the Diff**
   ```bash
   npm run test:visual:report
   ```
   Examine side-by-side comparison of expected vs actual

2. **Identify the Issue**
   - Unintended CSS change?
   - Layout breakage?
   - Component rendering issue?

3. **Fix or Update**
   - **Option A**: Fix the code
     ```bash
     # Make CSS/component changes
     npm run test:visual
     ```
   - **Option B**: Intentional design change
     ```bash
     npm run test:visual:update
     ```

4. **Commit Baselines**
   ```bash
   git add tests/visual/__snapshots__/
   git commit -m "chore: update baselines for redesign"
   ```

## Troubleshooting

### Common Issues

**Tests pass locally but fail in CI**
- Cause: Different font rendering on Linux
- Solution: Generate baselines on Linux/Docker

**Flaky tests**
- Increase timeouts
- Add more aggressive masking
- Verify test data consistency

**False positives**
- Adjust CSS selectors for dynamic content
- Use `mask` option for flickering elements

## Best Practices

1. **Run tests locally before pushing**
   ```bash
   npm run test:visual
   ```

2. **Review baseline changes**
   ```bash
   git diff tests/visual/__snapshots__/
   ```

3. **Update baselines for intentional changes**
   ```bash
   npm run test:visual:update
   git add tests/visual/__snapshots__/
   ```

4. **Mask all dynamic content**
   - Timestamps
   - Auto-save status
   - User-generated content

5. **Use consistent viewports**
   - Standard desktop: 1280x720
   - Separate tests for mobile/tablet

## Future Enhancements

### Potential Improvements

1. **Integration with Percy or Chromatic**
   - Cloud-based visual testing
   - Easier baseline management
   - Parallel test execution

2. **Component Visual Tests**
   - Test individual components in isolation
   - Document component visual variations

3. **Theme Testing**
   - Dark mode screenshots
   - Light mode screenshots
   - Theme switching verification

4. **Performance Monitoring**
   - Track render performance
   - Monitor layout shift
   - Video recording of test runs

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Test Snapshots Documentation](https://playwright.dev/docs/test-snapshots)
- [GitHub Actions Integration](https://github.com/microsoft/playwright-github-action)

## Support

For issues or questions about visual regression testing:
1. Check `tests/visual/README.md` for detailed guide
2. Review test reports in Playwright HTML report
3. Run tests locally with `--debug` flag for investigation
4. Check GitHub Actions logs for CI failures
