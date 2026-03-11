# Visual Regression Testing Guide

This guide explains how to use visual regression testing in ResumeAI to prevent UI bugs.

## Overview

We use [Playwright's built-in visual comparison](https://playwright.dev/docs/test-snapshots) to ensure that the user interface remains consistent across changes.

## Running Visual Tests

To run the visual tests:

```bash
npx playwright test --project=visual-testing
```

## Updating Baselines

If you intentionally changed the UI, you need to update the baseline screenshots:

```bash
npx playwright test --project=visual-testing --update-snapshots
```

## Adding New Visual Tests

Add new tests to `tests/visual/pages.spec.ts`. Use `expect(page).toHaveScreenshot('filename.png')`.

### Best Practices

1.  **Mask Dynamic Content**: Use the `mask` option to hide dynamic elements like timestamps or auto-save statuses.
2.  **Full Page Screenshots**: Use `{ fullPage: true }` to capture the entire page.
3.  **Consistent Data**: Ensure the application state is consistent (e.g., using a test user with pre-seeded data).
4.  **Viewports**: We currently test with a standard desktop viewport (1280x720).

## CI Integration

Visual tests are integrated into the PR check workflow. If a visual change is detected, the test will fail. You can view the diffs in the Playwright HTML report generated in CI artifacts.
