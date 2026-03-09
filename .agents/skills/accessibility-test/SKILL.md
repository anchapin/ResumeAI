---
name: accessibility-test
description: "Run accessibility tests to ensure the ResumeAI application is accessible to all users."
---

# Accessibility Test Skill

This skill runs accessibility tests to ensure the ResumeAI application meets WCAG guidelines and is accessible to all users.

## Capabilities

- **A11y Tests**: Run automated accessibility tests
- **Component Testing**: Test individual components
- **E2E Testing**: Test full pages with Playwright
- **Violation Reports**: Detailed accessibility violation reports
- **Fix Suggestions**: Guidance on fixing violations

## Usage

### Run All Accessibility Tests

```bash
npm run test:a11y
```

### Run A11y Tests with Vitest

```bash
# Run all a11y tests
npm test -- --run

# Or specifically for a11y
npm run test
```

### Run E2E Accessibility Tests

```bash
# Run all E2E tests with accessibility checks
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test tests/e2e/accessibility.spec.ts
```

### Testing Tools Used

The project uses:
- **jest-axe**: Unit test accessibility violations
- **Playwright**: E2E accessibility testing
- **axe-core**: Accessibility engine

## Test Location

- Unit tests: `tests/` directory
- E2E tests: `tests/e2e/` directory
- Component tests: alongside components

## Common Accessibility Issues

### ARIA

- Missing or incorrect ARIA labels
- Improper ARIA roles
- Incorrect ARIA attributes

### Keyboard Navigation

- Focus not visible
- Missing focus traps
- Tab order issues

### Color & Contrast

- Low color contrast
- Color as only means of conveying information

### Semantics

- Missing heading hierarchy
- Improper table structure
- Missing form labels

## Fixing Violations

### Add ARIA Labels

```tsx
// Before
<button>Icon</button>

// After
<button aria-label="Close dialog">
  <CloseIcon />
</button>
```

### Fix Focus Styles

```css
/* Ensure focus is visible */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Add Form Labels

```tsx
// Before
<input type="email" />

// After
<label>
  Email
  <input type="email" />
</label>
```

## Running Specific Tests

```bash
# Test specific component
vitest tests/components/Button.test.tsx --run

# Test specific E2E
npx playwright test tests/e2e/login.spec.ts
```

## Accessibility Guidelines

The project follows:
- WCAG 2.1 AA level
- ARIA Authoring Practices
- WAI-ARIA specification

## Tips

- Run a11y tests before every PR
- Test with keyboard only navigation
- Check color contrast ratios (4.5:1 minimum)
- Ensure all images have alt text
- Test with screen readers (NVDA, VoiceOver)
