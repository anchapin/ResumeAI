# Accessibility Testing Guide (WCAG 2.1)

This guide documents the accessibility testing implementation for ResumeAI to ensure WCAG 2.1 compliance.

## Overview

ResumeAI uses **axe-core** and **@axe-core/react** for automated accessibility testing. All tests are run using Vitest and integrated into the CI/CD pipeline.

## Installation

The required dependencies are already installed:

```bash
npm install --save-dev @axe-core/react axe-core
```

## Test Structure

### Accessibility Test Files

- **`tests/accessibility.test.ts`** - Core accessibility utility function tests

### Accessibility Utilities

**`src/lib/accessibility.ts`** provides:

- `runAccessibilityScan()` - Execute axe-core scan on current DOM
- `getViolationsByImpact()` - Filter violations by severity level
- `generateAccessibilityReport()` - Generate human-readable accessibility report

## Running Tests

### Run all accessibility tests

```bash
npm test -- tests/accessibility.test.ts
```

### Run accessibility tests with coverage

```bash
npm run test:coverage -- tests/accessibility.test.ts
```

### Run tests with detailed output

```bash
npm test -- tests/accessibility.test.ts --reporter=verbose
```

## Test Coverage

The accessibility test suite includes:

1. **Scan Execution** - Verify axe-core scan runs correctly
2. **Results Object** - Ensure proper structure of results
3. **Configuration** - Test scan accepts valid options
4. **Error Handling** - Proper error handling for invalid options
5. **Violation Filtering** - Filter by impact level (critical, serious, moderate, minor)
6. **Report Generation** - Generate human-readable accessibility reports
7. **Type Support** - Proper TypeScript typing for accessibility data

## Violation Severity Levels

- **Critical** - Complete blocker for accessibility (e.g., missing form labels)
- **Serious** - Major accessibility issue (e.g., poor color contrast)
- **Moderate** - Significant accessibility issue (e.g., missing alt text)
- **Minor** - Minor accessibility issue (e.g., redundant title attributes)

## CI/CD Integration

### Workflow File

`.github/workflows/accessibility-tests.yml` runs:

1. Installs dependencies
2. Executes accessibility tests
3. Generates coverage reports
4. Uploads reports to Codecov
5. Comments on PRs with results

### Running in CI

Tests automatically run on:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`
- Multiple Node.js versions (18.x, 20.x)

## Common Accessibility Issues & Fixes

### Issue: Missing Form Labels

**Problem**: Form inputs without associated labels
```tsx
// ❌ Bad
<input type="text" placeholder="Name" />

// ✅ Good
<label htmlFor="name">Name:</label>
<input id="name" type="text" />

// ✅ Also Good
<input type="text" aria-label="Name" />
```

### Issue: Missing Button Labels

**Problem**: Buttons with only icons
```tsx
// ❌ Bad
<button>🔍</button>

// ✅ Good
<button aria-label="Search">🔍</button>

// ✅ Also Good
<button title="Search">🔍</button>
```

### Issue: Improper Heading Hierarchy

**Problem**: Skipping heading levels
```tsx
// ❌ Bad
<h1>Main Title</h1>
<h3>Subsection</h3> {/* Skipped h2 */}

// ✅ Good
<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### Issue: Poor Color Contrast

**Problem**: Text that's hard to read
```tsx
// ❌ Bad (light text on light background)
<p style={{ color: '#ddd', background: '#fff' }}>Text</p>

// ✅ Good (sufficient contrast ratio)
<p style={{ color: '#333', background: '#fff' }}>Text</p>
```

### Issue: Interactive Elements Not Keyboard Accessible

**Problem**: Only mouse-accessible controls
```tsx
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>

// ✅ Also Good
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  Click me
</div>
```

## WCAG 2.1 Standards

This implementation targets:
- **WCAG 2.1 Level AA** - Standard accessibility level
- **WCAG 2.1 Level AAA** - Enhanced accessibility level

### Key Principles

1. **Perceivable** - Information must be perceivable to users
2. **Operable** - Interface elements must be operable via keyboard
3. **Understandable** - Content must be understandable
4. **Robust** - Content must be compatible with assistive technologies

## Resources

- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Accessibility by WAI](https://www.w3.org/WAI/)
- [Deque Accessibility Academy](https://dequeuniversity.com/)

## Reporting Issues

To report accessibility issues:
1. Run the accessibility test suite
2. Check the generated reports
3. File a GitHub issue with:
   - Specific violation ID (from axe-core)
   - Affected page
   - Steps to reproduce
   - Expected behavior

## Contributing

When contributing to ResumeAI:

1. Run accessibility tests before submitting PRs
2. Fix any violations found
3. Add tests for new pages/components
4. Ensure all tests pass locally and in CI

```bash
# Before committing
npm run test:coverage -- tests/accessibility.test.ts
```

## Future Enhancements

- [ ] Add manual accessibility audit checklist
- [ ] Integrate with accessibility testing tools (WAVE, Lighthouse)
- [ ] Add accessibility monitoring dashboard
- [ ] Implement automated screenshot testing for color contrast
- [ ] Create accessibility testing templates for new components
