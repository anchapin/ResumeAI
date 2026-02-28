# Accessibility (WCAG 2.1) Guidelines

ResumeAI is committed to accessibility. This document outlines our WCAG 2.1 Level AA compliance standards and how to test for accessibility.

## Accessibility Standards

We comply with **WCAG 2.1 Level AA** standards:

- Perceivable: Information is available to all users
- Operable: All functionality is keyboard accessible
- Understandable: Content is clear and predictable
- Robust: Works with assistive technologies

## Automated Accessibility Testing

### Running Tests Locally

```bash
# Run all accessibility tests
npm run test:a11y

# Watch mode for development
npm run test:a11y:watch
```

### Test Coverage

Our test suite covers:

#### 1. **Color Contrast**

- Text must have minimum 4.5:1 contrast ratio
- Large text (18pt+) needs 3:1 ratio
- Use tools like WebAIM Color Contrast Checker

#### 2. **Images and Alt Text**

- All images must have descriptive `alt` text
- Decorative images use `alt=""` or `role="presentation"`
- SVGs should have `<title>` or `aria-label`

```tsx
// ✅ Good
<img src="user.jpg" alt="John Smith, Senior Engineer" />

// ❌ Bad
<img src="user.jpg" alt="person" />
<img src="logo.svg" /> {/* Missing alt */}
```

#### 3. **Semantic HTML**

- Use `<button>` for actions, `<a>` for navigation
- Use `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`
- Don't use `<div>` for buttons or links

```tsx
// ✅ Good
<nav>
  <a href="/home">Home</a>
  <a href="/about">About</a>
</nav>

// ❌ Bad
<div>
  <div onClick={() => navigate('/home')}>Home</div>
  <div onClick={() => navigate('/about')}>About</div>
</div>
```

#### 4. **Form Labels**

- Every `<input>` must have a corresponding `<label>`
- Use `htmlFor` to connect label to input
- Add help text for complex fields

```tsx
// ✅ Good
<label htmlFor="email">Email Address</label>
<input id="email" type="email" required />

// ❌ Bad
<input type="email" placeholder="Email" />
```

#### 5. **ARIA Attributes**

- Use ARIA only when semantic HTML isn't available
- `aria-label` for icon buttons
- `aria-live` for dynamic content updates
- `aria-describedby` for help text

```tsx
// ✅ Good - Icon button with label
<button type="button" aria-label="Close dialog">
  ×
</button>

// ✅ Good - Live region for notifications
<div role="status" aria-live="polite" aria-atomic="true">
  Changes saved
</div>

// ❌ Bad - aria-label on div trying to be a button
<div role="button" aria-label="Save">
  Save
</div>
```

#### 6. **Keyboard Navigation**

- All interactive elements must be keyboard accessible
- Tab order should be logical (top-to-bottom, left-to-right)
- Focus indicator must be visible (min 3:1 contrast)
- No keyboard traps

```tsx
// ✅ Good
<button type="button">Accessible Button</button>
<a href="/page">Keyboard accessible link</a>

// ❌ Bad
<span onClick={handleClick}>Not keyboard accessible</span>
```

#### 7. **Heading Hierarchy**

- Start with `<h1>`, proceed in order
- Don't skip levels (`<h1>` → `<h3>` is bad)
- Each page should have one `<h1>`

```tsx
// ✅ Good
<h1>Page Title</h1>
<section>
  <h2>Section Title</h2>
  <h3>Subsection Title</h3>
</section>

// ❌ Bad
<h1>Page Title</h1>
<h3>Missing h2</h3>
```

#### 8. **Skip Links**

- Provide skip to main content link
- Hidden by default, visible on focus
- Should appear before header navigation

```tsx
// ✅ Good
<a href="#main-content" className="sr-only">
  Skip to main content
</a>
<header>...</header>
<main id="main-content">...</main>
```

#### 9. **Focus Management**

- Manage focus when opening modals/dialogs
- Return focus when closing modals
- Don't move focus unexpectedly

```tsx
const dialogRef = useRef<HTMLDivElement>(null);
const openButtonRef = useRef<HTMLButtonElement>(null);

const closeDialog = () => {
  setOpen(false);
  openButtonRef.current?.focus(); // Return focus
};
```

#### 11. **Touch Targets**

- Minimum touch target size: 44×44 pixels
- Spacing between targets: minimum 8 pixels
- Works on mobile devices

```tsx
// ✅ Good
<button
  style={{
    minWidth: '44px',
    minHeight: '44px',
    padding: '12px 16px',
  }}
>
  Touch-Friendly Button
</button>
```

#### 12. **Focus Management with Custom Hooks**

ResumeAI provides reusable hooks for managing focus in accessible components:

##### `useFocus` Hook

Basic focus management for individual elements:

```tsx
import { useFocus } from '../hooks/useFocus';

function MyComponent() {
  const { ref, setFocus, saveFocus, restoreFocus, blur } = useFocus({
    autoFocus: true,
    restoreFocusOnUnmount: true,
  });

  return (
    <div>
      <button ref={ref}>Auto-focused button</button>
      <button onClick={setFocus}>Set focus programmatically</button>
    </div>
  );
}
```

##### `useFocusTrap` Hook

Traps focus within modals/dialogs:

```tsx
import { useFocusTrap } from '../hooks/useFocusTrap';

function Modal({ isOpen, onClose }) {
  const { ref } = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    returnFocusOnDeactivate: true,
  });

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" ref={ref}>
      <button onClick={onClose}>Close</button>
      <input type="text" />
    </div>
  );
}
```

**Features:**

- Automatically traps Tab/Shift+Tab navigation within the container
- Saves and restores previous focus when activating/deactivating
- Filters disabled and hidden elements from focusable elements
- Automatically focuses first focusable element on activation

## Component Accessibility Checklist

When building new components, ensure:

- [ ] Semantic HTML (prefer native elements)
- [ ] Proper heading hierarchy
- [ ] Image alt text
- [ ] Form labels connected to inputs
- [ ] Color contrast 4.5:1 minimum
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA only where needed
- [ ] Live regions for dynamic content
- [ ] Error messages associated with form fields
- [ ] 44×44px touch targets
- [ ] No focus traps

## Tools and Resources

### Testing Tools

- **[axe-core](https://github.com/dequelabs/axe-core)**: Automated testing
- **[WAVE](https://wave.webaim.org/)**: Browser extension
- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)**: Google's auditor
- **[NVDA](https://www.nvaccess.org/)**: Screen reader (Windows)
- **[JAWS](https://www.freedomscientific.com/products/software/jaws/)**: Screen reader (commercial)

### Resources

- **[WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)**: Official guidelines
- **[WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)**: ARIA patterns
- **[WebAIM](https://webaim.org/)**: Accessibility articles
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)**

## CI/CD Integration

Accessibility tests run in CI/CD pipeline:

1. Pull request triggers accessibility tests
2. Violations block PR merge
3. Coverage reports generated
4. Failed tests linked to axe-core violations

## Manual Testing

### Using a Screen Reader

1. Download NVDA (free) or JAWS (commercial)
2. Enable in accessibility settings
3. Navigate with screen reader
4. Verify all content is announced properly
5. Check heading structure
6. Test form navigation

### Keyboard-Only Navigation

1. Disable mouse/trackpad
2. Use Tab to navigate
3. Use Enter/Space to activate buttons
4. Use Arrow keys in dropdowns, tabs
5. Use Escape to close modals
6. Verify focus always visible

### Color Contrast

1. Use WebAIM Color Contrast Checker
2. Check text against backgrounds
3. Check button states (normal, hover, focus, disabled)
4. Verify at different zoom levels

## Common Issues and Fixes

| Issue                      | Fix                                               |
| -------------------------- | ------------------------------------------------- |
| Missing alt text           | Add `alt="description"` to all images             |
| Low color contrast         | Increase contrast ratio to 4.5:1 minimum          |
| Form fields without labels | Use `<label htmlFor="id">`                        |
| Non-semantic buttons       | Use `<button>` instead of `<div onClick>`         |
| Keyboard traps             | Test Tab navigation, use Escape to close          |
| Poor focus indicators      | Use `outline: 2px solid` with sufficient contrast |
| Missing headings           | Add `<h1>` and structure with `<h2>`, `<h3>`      |
| Image-only links           | Add text or aria-label                            |

## Contributing

When contributing code:

1. Write accessibility tests
2. Test with keyboard
3. Test with screen reader
4. Run `npm run test:a11y`
5. Check color contrast
6. Ensure heading hierarchy
7. Use `useFocusTrap` for modals/dialogs
8. Ensure focus management is implemented

## Questions?

See CONTRIBUTING.md for more guidelines on maintaining accessibility standards.
