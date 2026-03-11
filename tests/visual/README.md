# Visual Regression Testing

This directory contains visual regression tests for the ResumeAI application. These tests capture screenshots of key pages and compare them against baseline images to detect unintended UI changes.

## Overview

Visual regression testing helps prevent:
- Accidental styling changes
- Layout breaking
- Component rendering issues
- Typography inconsistencies
- Color and spacing problems

## Test Coverage

### Authenticated Pages
- **Dashboard**: Main layout and resume list views
- **Editor**: Empty state and populated forms
- **Settings**: Profile and preferences sections
- **Templates**: Template selection page

### Public Pages
- **Login page**: Authentication form
- **Registration page**: User signup form
- **Landing page**: Public homepage

### Responsive Design
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

## Running Visual Tests

### Run All Visual Tests
```bash
npm run test:e2e -- --project=visual-testing
# or
npx playwright test --project=visual-testing
```

### Run Specific Test
```bash
npx playwright test tests/visual/pages.spec.ts --project=visual-testing
```

### Run with UI Mode
```bash
npx playwright test --project=visual-testing --ui
```

## Updating Baselines

When you intentionally change the UI, you need to update baseline screenshots:

### Update All Baselines
```bash
npx playwright test --project=visual-testing --update-snapshots
```

### Update Specific Test Baseline
```bash
npx playwright test tests/visual/pages.spec.ts -k "Dashboard - main layout" --update-snapshots
```

## Understanding Test Results

### First Run
On the first run, Playwright generates baseline screenshots. These images should be reviewed carefully and committed to version control.

### Subsequent Runs
When tests run again:
- Screenshots are captured
- Compared pixel-by-pixel against baselines
- Tests **fail** if differences exceed threshold (default: 0.2%)
- HTML report shows side-by-side comparison of changes

### Viewing Reports
```bash
npx playwright show-report
```

Opens an interactive HTML report showing:
- Test results and status
- Screenshot diffs for failed tests
- Expected vs actual comparisons

## Best Practices

### 1. Stable Test User
Visual tests use a consistent test user (`visual-test-user@example.com`) to ensure reproducible state.

### 2. Mask Dynamic Content
Tests mask dynamic elements that change on each run:
- Timestamps
- Auto-save status
- Last login times
- User-generated content

Example:
```typescript
await expect(page).toHaveScreenshot('editor.png', {
  fullPage: true,
  mask: [page.locator('[data-testid="auto-save-status"]')],
});
```

### 3. Wait for Animations
Tests include waits for network idle and animations:
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Wait for animations
```

### 4. Consistent Viewport
- Default: 1280x720 (desktop)
- Separate tests for different viewports
- Use `test.use({ viewport: {...} })` to override

### 5. Deterministic Content
Use consistent test data:
- Fixed user with known resume data
- Predefined templates
- Sample content without randomization

## Handling Visual Regressions

When a test fails due to visual changes:

1. **Review the Diff**: Open the HTML report and examine the difference
2. **Assess the Change**:
   - Is this an intentional design change? → Update baseline
   - Is this an unintended regression? → Fix the code
   - Is this a false positive? → Adjust mask or tolerance

3. **Update Baselines** (if intentional):
   ```bash
   npx playwright test tests/visual/pages.spec.ts -k "test-name" --update-snapshots
   ```

4. **Commit Baselines**:
   ```bash
   git add tests/visual/**/*.png
   git commit -m "chore: update visual regression baselines"
   ```

## CI/CD Integration

Visual tests run automatically on:
- Pull requests
- Push to main/develop branches

If visual tests fail in CI:
1. Download the HTML report from CI artifacts
2. Review the diffs
3. If intentional, update baselines locally and push
4. If regression, fix the code and re-run

## Troubleshooting

### Tests Pass Locally but Fail in CI
- **Cause**: Different OS rendering (macOS vs Linux)
- **Solution**: 
  - Run tests on Linux using `--force-chromium`
  - Use Docker for consistency
  - Screenshot baselines should be generated in CI environment

### Flaky Tests
- **Cause**: Animations, network timing, font rendering
- **Solution**:
  - Increase timeouts
  - Add more aggressive masking
  - Ensure consistent test data
  - Use fixed viewports

### Large Diff on Small Change
- **Cause**: Anti-aliasing or rendering differences
- **Solution**:
  - Check test data hasn't changed
  - Verify no unintended CSS changes
  - Try running on different OS

## Adding New Visual Tests

1. Identify the page/component to test
2. Create test in `tests/visual/pages.spec.ts`
3. Use appropriate mask selectors
4. Run test to generate baseline
5. Review baseline screenshot
6. Commit baseline to git
7. Update CI workflow if needed

Example:
```typescript
test('New page looks correct', async ({ page }) => {
  await page.goto('/new-page');
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('new-page.png', {
    fullPage: true,
    mask: [page.locator('[data-testid="dynamic"]')],
  });
});
```

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Mask & Unmask](https://playwright.dev/docs/test-snapshots#mask-and-unmask)
- [Screenshot Comparison Options](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot)
