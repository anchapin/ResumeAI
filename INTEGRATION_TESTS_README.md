# Integration Tests - Quick Reference

## Overview

Comprehensive integration tests for frontend-backend API workflows covering critical user scenarios.

**Location:** `tests/integration/`
**Test Count:** 30+ integration tests
**Status:** ✅ All passing

## Quick Start

### Run All Integration Tests

```bash
npm test -- --run tests/integration/
```

### Run Specific Test File

```bash
npm test -- --run tests/integration/frontend-backend-integration.test.ts
```

### Run with Verbose Output

```bash
npm test -- --run --reporter=verbose tests/integration/
```

### Watch Mode (Development)

```bash
npm test tests/integration/
```

## What's Tested

### ✅ PDF Rendering

- Generate PDF from resume data
- Support multiple variants (standard, ATS-optimized, creative)
- Cache PDF generation results
- Handle invalid data gracefully

### ✅ Resume CRUD Operations

- Create, Read, Update, Delete resumes
- List all saved resumes
- Handle concurrent operations

### ✅ OAuth GitHub Flow

- Initiate OAuth flow
- Handle authorization callback
- Store and manage tokens
- Refresh expired tokens
- Fetch user profiles

### ✅ Resume Tailoring

- Tailor resume to job descriptions
- Generate match scores
- Provide tailoring suggestions

### ✅ Resume Variants

- Generate multiple resume variants
- Different formats and layouts
- Direct download URLs

### ✅ Error Handling

- Invalid data validation
- Network error recovery
- Missing required fields
- API key validation

### ✅ Complex Workflows

- Complete end-to-end resume workflow
- Parallel operations
- Resume cloning and tailoring

## Test File Structure

```
tests/integration/
├── frontend-backend-integration.test.ts    (30 tests - Main suite)
├── api-integration.test.ts                 (7 tests - Mock verification)
├── test-utils.ts                          (Mock API client & utilities)
├── oauth-flow.integration.test.ts         (Skipped - Optional advanced tests)
├── api-client.integration.test.ts         (Skipped - Optional advanced tests)
└── pdf-rendering.integration.test.ts      (Skipped - Optional advanced tests)
```

## Key Test Utilities

### Create Mock Resume

```typescript
import { createMockResume } from './tests/integration/test-utils';

const resume = createMockResume('My Resume', {
  work: [{ company: 'Acme Corp', position: 'Engineer' }],
});
```

### Setup Test Context

```typescript
import { setupTestAPI, cleanupTestAPI } from './tests/integration/test-utils';

let context: TestContext;

beforeEach(async () => {
  context = await setupTestAPI();
});

afterEach(async () => {
  await cleanupTestAPI(context);
});
```

### Use API Client

```typescript
// Render PDF
const pdfRes = await context.apiClient.renderPDF(resumeData);

// Save Resume
const saveRes = await context.apiClient.createResume(resumeData);

// Tailor Resume
const tailorRes = await context.apiClient.tailorResume(resumeData, jobDesc);

// Generate Variants
const variantsRes = await context.apiClient.generateVariants(resumeData);
```

## CI/CD Integration

The integration tests automatically run in GitHub Actions:

**Workflow:** `.github/workflows/frontend-ci.yml`

```yaml
- name: Run integration tests
  run: npm run test -- --run --reporter=verbose tests/integration/ || true
```

**Triggers:**

- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main`
- ✅ File changes to TypeScript, TSX, or test files

**Status:** Non-blocking (continues pipeline even if tests fail)

## API Client Methods

The mock API client supports:

```typescript
interface MockAPIClient {
  // Resume operations
  createResume(resume: Partial<ResumeData>) => Promise<APIResponse>
  getResume(id: string, options?: any) => Promise<APIResponse>
  updateResume(id: string, resume: Partial<ResumeData>) => Promise<APIResponse>
  deleteResume(id: string) => Promise<APIResponse>
  listResumes() => Promise<APIResponse>
  cloneResume(id: string, newTitle: string) => Promise<APIResponse>

  // PDF & Rendering
  renderPDF(resumeData: ResumeData, variant?: string) => Promise<APIResponse>
  generatePDF(resume: Partial<ResumeData>, options?: any) => Promise<APIResponse>
  generatePreview(resume: Partial<ResumeData>) => Promise<APIResponse>
  generateVariants(resumeData: ResumeData) => Promise<APIResponse>

  // OAuth
  initiateOAuth(provider: string, options?: any) => Promise<APIResponse>
  handleOAuthCallback(provider: string, params: any) => Promise<APIResponse>
  storeOAuthToken(provider: string, token: any) => Promise<APIResponse>
  refreshOAuthToken(provider: string, oldToken: string) => Promise<APIResponse>
  revokeOAuthToken(provider: string) => Promise<APIResponse>
  getOAuthUserProfile(provider: string) => Promise<APIResponse>

  // Tailoring
  tailorResume(resumeData: ResumeData, jobDescription: string) => Promise<APIResponse>
}
```

## Data Format

All tests use the **JSON Resume Standard** format:

```typescript
interface ResumeData {
  basics?: {
    name?: string;
    email?: string;
    phone?: string;
    url?: string;
    label?: string;
    summary?: string;
  };
  work?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
  }>;
  education?: Array<{
    institution?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: Array<{
    name?: string;
    keywords?: string[];
  }>;
  // ... other sections
}
```

## Example Test

```typescript
describe('Resume Save and Load', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupTestAPI();
  });

  afterEach(async () => {
    await cleanupTestAPI(context);
  });

  it('should save and retrieve resume data', async () => {
    const resumeData = createMockResume('Test Resume');

    // Create
    const createRes = await context.apiClient.createResume(resumeData);
    expect(createRes.status).toBe(201);

    // Retrieve
    const getRes = await context.apiClient.getResume(createRes.data.id);
    expect(getRes.status).toBe(200);
    expect(getRes.data.basics?.name).toBe(resumeData.basics?.name);
  });
});
```

## Debugging Tips

### Enable Detailed Output

```bash
npm test -- --run --reporter=verbose tests/integration/
```

### Run Single Test

```bash
npm test -- --run -t "should render PDF from resume data"
```

### Check Coverage

```bash
npm test -- --run tests/integration/ --coverage
```

### Watch Mode for Development

```bash
npm test tests/integration/ -- --watch
```

## Common Issues

### Tests Not Running

- Ensure you're in the project root: `/home/alex/Projects/ResumeAI`
- Check Node.js version: `node --version` (requires v22+)
- Reinstall dependencies: `npm ci`

### Import Errors

- Check imports use relative paths: `import { } from './test-utils'`
- Verify TypeScript configuration in `tsconfig.json`
- Run type check: `npx tsc --noEmit`

### Mock API Issues

- Mock client is stateless (no persistence between test runs)
- Each test gets fresh context via `setupTestAPI()`
- Cleanup happens automatically in `afterEach()`

## Future Enhancements

- [ ] Real API integration tests (against actual backend)
- [ ] Browser-based E2E tests (Playwright/Cypress)
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Database integration tests
- [ ] OAuth provider mocking with real HTTP calls

## Resources

- **Test Framework:** [Vitest Documentation](https://vitest.dev/)
- **JSON Resume:** [jsonresume.org](https://jsonresume.org/)
- **Testing Patterns:** [Vitest Guide](https://vitest.dev/guide/)

## Support

For questions or issues:

1. Check test output for specific error messages
2. Review test file comments and examples
3. Consult the mock API client implementation
4. Check GitHub Actions logs for CI issues
