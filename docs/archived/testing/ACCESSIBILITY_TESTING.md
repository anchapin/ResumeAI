# Accessibility Testing Guide (WCAG 2.1)

## Overview

ResumeAI is committed to WCAG 2.1 Level AA accessibility compliance. This guide outlines testing procedures and standards.

## Standards

### WCAG 2.1 Levels

- **Level A:** Basic accessibility (minimum)
- **Level AA:** Enhanced accessibility (our target)
- **Level AAA:** Enhanced+ accessibility (optional, for critical features)

### Key Principles (POUR)

1. **Perceivable** - Users can perceive content
2. **Operable** - Users can navigate and operate
3. **Understandable** - Users understand content and operations
4. **Robust** - Works with assistive technologies

## Automated Testing

### Running Tests

```bash
# Run accessibility tests
npm run test:a11y

# Scan running application
npm run a11y:scan

# Generate detailed report
npm run a11y:scan > a11y-reports/latest.html
```

### Test Coverage

**Components tested:**

- ✓ App.tsx
- ✓ Dashboard.tsx
- ✓ Editor components (ExperienceItem, EducationItem, etc.)
- ✓ Form inputs and validation
- ✓ Navigation and routing
- ✓ Error messages and alerts

## Accessibility Guidelines by Component

### Buttons

```tsx
// ✓ GOOD
<button aria-label="Generate resume PDF">
  Download <span aria-hidden="true">📥</span>
</button>

// ✗ BAD
<button>📥</button>  // No text, no aria-label
```

**Requirements:**

- [ ] Descriptive text or aria-label
- [ ] Visible focus indicator
- [ ] Keyboard accessible (Enter/Space)
- [ ] Sufficient color contrast

### Links

```tsx
// ✓ GOOD
<a href="/editor">Edit resume</a>
<a href="/docs" aria-label="Documentation (opens new window)">Docs ↗</a>

// ✗ BAD
<a href="#" onClick={handleClick}>Click here</a>
```

**Requirements:**

- [ ] Descriptive link text
- [ ] No "click here" or "read more" alone
- [ ] Indicate if opens new window
- [ ] Sufficient color contrast

### Form Inputs

```tsx
// ✓ GOOD
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-describedby="email-help"
/>
<p id="email-help">We'll never share your email.</p>

// ✗ BAD
<input type="email" placeholder="your@email.com" />
```

**Requirements:**

- [ ] Associated label for every input
- [ ] aria-required for required fields
- [ ] aria-describedby for help text
- [ ] aria-invalid for error states
- [ ] Distinct visual states (focus, disabled, error)

### Images

```tsx
// ✓ GOOD - Informative
<img src="avatar.jpg" alt="John Smith's profile photo" />

// ✓ GOOD - Decorative
<img src="divider.png" alt="" aria-hidden="true" />

// ✓ GOOD - Complex
<img
  src="chart.svg"
  alt="Q1 revenue increased 23%"
  aria-describedby="chart-description"
/>
<p id="chart-description">
  Sales grew from $100k to $123k...
</p>

// ✗ BAD
<img src="avatar.jpg" alt="image" />
<img src="logo.png" />
```

**Requirements:**

- [ ] Meaningful alt text for informative images
- [ ] Empty alt="" for decorative images
- [ ] aria-hidden="true" for decorative images
- [ ] aria-describedby for complex images

### Headings

```tsx
// ✓ GOOD
<h1>Resume Editor</h1>
<h2>Personal Information</h2>
<h3>Full Name</h3>

// ✗ BAD
<h1>Resume Editor</h1>
<h3>Personal Information</h3>  // Skipped h2!
<h1>Full Name</h1>  // Multiple h1s
```

**Requirements:**

- [ ] Proper hierarchy (h1 → h2 → h3...)
- [ ] Only one h1 per page
- [ ] No skipped levels
- [ ] Meaningful content (not styling)

### Color Contrast

**Minimum requirements (WCAG AA):**

- Regular text: 4.5:1 ratio
- Large text (18pt+): 3:1 ratio
- UI components: 3:1 ratio

```css
/* ✓ GOOD - 7.5:1 contrast */
color: #333333; /* Dark gray text */
background-color: #ffffff; /* White background */

/* ✗ BAD - 2.5:1 contrast (fails WCAG AA) */
color: #666666; /* Medium gray text */
background-color: #ffffff; /* White background */
```

**Tools:**

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)
- Browser DevTools accessibility inspector

### Focus Management

```tsx
// ✓ GOOD - Always visible focus
input:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

// ✗ BAD - Hidden focus
input:focus {
  outline: none;
  /* No visible focus indicator! */
}

// ✓ GOOD - Alternative focus indicator
input:focus {
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
  outline: none;
}
```

**Requirements:**

- [ ] Visible focus indicator on all interactive elements
- [ ] Outline width >= 2px
- [ ] Sufficient contrast
- [ ] Does not obscure content

### Keyboard Navigation

```tsx
// ✓ GOOD
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>

// ✗ BAD
<div onClick={handleClick}>
  Click me
</div>
```

**Requirements:**

- [ ] All interactive elements keyboard accessible
- [ ] Natural tab order (left-to-right, top-to-bottom)
- [ ] No keyboard traps (can't Tab out)
- [ ] Enter/Space triggers buttons
- [ ] Escape closes modals/dropdowns

### ARIA Attributes

```tsx
// ✓ GOOD
<button
  aria-label="Close menu"
  aria-pressed={isPressed}
  aria-expanded={isOpen}
>
  ☰
</button>

// ✗ BAD
<div onClick={handleClick}>
  <span className="icon-menu"></span>
</div>
```

**Common uses:**

- `aria-label` - Provide accessible name
- `aria-hidden="true"` - Hide from assistive tech
- `aria-expanded` - Indicate collapse/expand state
- `aria-pressed` - Indicate toggle state
- `aria-live="polite"` - Announce dynamic content
- `aria-describedby` - Link to description

### Skip Links

```tsx
// ✓ GOOD
<a href="#main" className="skip-link">
  Skip to main content
</a>

// In CSS:
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 0;  /* Visible on focus */
}
```

**Requirements:**

- [ ] Skip to main content link
- [ ] Hidden visually but keyboard accessible
- [ ] Appears on focus
- [ ] First focusable element on page

## Manual Testing Checklist

### Visual Testing

- [ ] All text readable (font size, spacing, contrast)
- [ ] Focus indicators visible (not just border)
- [ ] Color not only way to convey information
- [ ] Zoom to 200% still usable
- [ ] No flickering/flashing content

### Keyboard Testing

- [ ] Tab through all elements in logical order
- [ ] Can reach all interactive elements
- [ ] No keyboard traps
- [ ] Enter/Space activates buttons
- [ ] Escape closes popups/modals

### Screen Reader Testing

**macOS (built-in):**

```bash
# Start VoiceOver
Cmd + F5

# Test with your app
# Focus elements and listen to descriptions
```

**Windows (NVDA - free):**

- [Download NVDA](https://www.nvaccess.org/)
- Enable "Browse Mode" (with NVDA started)
- Navigate with arrow keys
- Activate with Enter

**Testing tips:**

- [ ] All images have alt text
- [ ] Form labels announced
- [ ] Links have descriptive text
- [ ] Headings properly structured
- [ ] Error messages announced

## CI/CD Integration

### GitHub Actions

```yaml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: npm install

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: a11y-report
          path: a11y-reports/
```

### Merge Requirements

- ✓ No critical violations
- ✓ Serious violations documented
- ✓ Manual testing on screen reader
- ✓ Keyboard navigation verified

## Common Issues and Fixes

### Issue: Missing form labels

```tsx
// Before
<input type="email" placeholder="Email" />

// After
<label htmlFor="email">Email address</label>
<input id="email" type="email" />
```

### Issue: No focus indicator

```tsx
// Before
button:focus {
  outline: none;
}

// After
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Issue: Low contrast text

```tsx
// Before - 3:1 contrast (fails)
color: #999999;

// After - 7:1 contrast (passes)
color: #333333;
```

### Issue: Unclear button text

```tsx
// Before
<button>OK</button>

// After
<button>Save resume</button>
// Or
<button aria-label="Save resume">OK</button>
```

### Issue: Icon-only button

```tsx
// Before
<button>📥</button>

// After
<button aria-label="Download PDF">
  📥
</button>
```

## Resources

### Guidelines & Standards

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Testing

- [NVDA Screen Reader](https://www.nvaccess.org/)
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS/iOS)](https://www.apple.com/accessibility/voiceover/)

## Team Training

All developers should:

- [ ] Complete [WebAIM training](https://webaim.org/articles/)
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Know WCAG 2.1 Level AA requirements
- [ ] Review PRs for accessibility issues
- [ ] Follow component guidelines above

## Questions?

- Accessibility lead: (contact info)
- Issues: GitHub issue with `accessibility` label
- Slack channel: #accessibility
