# E2E Tests with Playwright

This directory contains end-to-end tests for ResumeAI using Playwright.

## Prerequisites

- Node.js 18+ installed
- Playwright browsers installed: `npx playwright install`

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run E2E tests in headed mode (visible browser)

```bash
npm run test:e2e:headed
```

### Run E2E tests with UI

```bash
npm run test:e2e:ui
```

### View test report

```bash
npm run test:e2e:report
```

### Run specific test file

```bash
npx playwright test tests/e2e/registration.spec.ts
```

### Run tests on specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

```
tests/e2e/
├── helpers.ts              # Reusable test utilities and helpers
├── registration.spec.ts    # User registration flow tests
├── login.spec.ts          # User login flow tests
├── resume-creation.spec.ts # Resume creation and editing tests
├── pdf-generation.spec.ts # PDF generation and download tests
└── user-journey.spec.ts   # Complete user journey tests
```

## Test Coverage

### Critical User Flows

1. **Registration Flow** (`registration.spec.ts`)
   - Display registration form
   - Register new user successfully
   - Validate required fields
   - Validate email format
   - Redirect to login page

2. **Login Flow** (`login.spec.ts`)
   - Display login form
   - Login with valid credentials
   - Fail with invalid credentials
   - Validate required fields
   - Show password toggle
   - Persist authentication across reloads

3. **Resume Creation Flow** (`resume-creation.spec.ts`)
   - Display editor page
   - Fill personal information
   - Add experience entries
   - Add education entries
   - Save resume data
   - Navigate between pages
   - Display save status
   - Handle form validation
   - Delete experience entries

4. **PDF Generation Flow** (`pdf-generation.spec.ts`)
   - Display PDF download button
   - Download PDF successfully
   - Show download progress indicator
   - Handle empty resume PDF generation
   - Validate PDF download filename
   - Support multiple PDF downloads
   - Display error on failed generation

5. **Complete User Journey** (`user-journey.spec.ts`)
   - Full user flow: register → create resume → download PDF
   - Re-login after logout
   - Navigate between pages
   - Handle multiple resume updates
   - Validate form inputs
   - Handle empty state gracefully
   - Maintain authentication state

## Helper Functions

The `helpers.ts` file provides reusable test utilities:

- `testUser`: Default test user object with unique identifiers
- `registerUser(page, user)`: Complete user registration flow
- `loginUser(page, email, password)`: Complete user login flow
- `createResume(page, resumeData)`: Fill resume with provided data
- `generatePDF(page)`: Trigger PDF download
- `logout(page)`: Logout current user
- `waitForAuth(page)`: Wait for authentication to complete

## Configuration

Playwright configuration is in `playwright.config.ts`:

- **Test directory**: `./tests/e2e`
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit (Desktop + Mobile)
- **Reporters**: HTML, JUnit, List
- **Traces**: On first retry
- **Screenshots**: On failure
- **Video**: Retain on failure

## CI/CD

E2E tests run automatically in CI on:

- Push to `main` or `develop` branches
- Pull requests to `main` branch

### CI Jobs

1. **E2E Tests (Chromium)**: Runs on all PRs and pushes
2. **E2E Tests (Cross-Browser)**: Runs on main/develop pushes only

Artifacts uploaded on failure:

- Playwright HTML report
- Test results
- Screenshots
- Videos
- Traces

## Writing New Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import test utilities: `import { test, expect } from '@playwright/test';`
3. Import helpers: `import { testUser, registerUser } from './helpers';`
4. Write test cases using Playwright API
5. Use descriptive test names and `test.describe` blocks

Example:

```typescript
import { test, expect } from '@playwright/test';
import { testUser, registerUser } from './helpers';

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/new-feature');
    await expect(page.locator('h1')).toHaveText('New Feature');
  });
});
```

## Best Practices

1. **Use helper functions**: Reuse existing helpers to avoid code duplication
2. **Wait for network idle**: Use `await page.waitForLoadState('networkidle')` after navigation
3. **Use selective locators**: Prefer specific selectors over generic ones
4. **Clean up test data**: Use unique identifiers with `Date.now()` to avoid conflicts
5. **Test user flows**: Focus on complete user journeys rather than individual components
6. **Handle async operations**: Use `waitForTimeout` sparingly, prefer `waitForSelector` or `waitForFunction`
7. **Make tests independent**: Each test should be able to run in isolation
8. **Add meaningful assertions**: Verify both positive and negative cases

## Debugging

### Debug a specific test

```bash
npx playwright test --debug
```

### Run tests with trace viewer

```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Open Playwright Inspector

```bash
npx playwright codegen http://localhost:3000
```

## Troubleshooting

### Tests fail with "Target closed"

- Increase timeout in `playwright.config.ts`
- Ensure dev server is running
- Check for memory leaks in tests

### Flaky tests

- Use `test.step()` to break down complex tests
- Add proper waiting strategies
- Check for race conditions

### Browser not found

- Run `npx playwright install`
- Run `npx playwright install-deps` (Linux)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
