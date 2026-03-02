# AccessibleDialog Component Guide

## Overview

The `AccessibleDialog` component is a fully accessible, WCAG-compliant modal dialog component that standardizes dialog accessibility across the ResumeAI application. It implements best practices for keyboard navigation, focus management, and ARIA semantics.

## Features

### ✅ Accessibility Features Implemented

- **Focus Trap**: Uses the `useFocusTrap` hook to ensure focus stays within the dialog
- **Tab Navigation**: Tab key cycles through focusable elements, Shift+Tab goes backwards
- **Escape Key**: Pressing Escape closes the dialog
- **ARIA Attributes**:
  - `role="dialog"` - Semantic role for screen readers
  - `aria-modal="true"` - Indicates this is a modal dialog
  - `aria-labelledby` - Links to the dialog title
  - `aria-describedby` - Optional, links to description content
- **Backdrop Click**: Clicking outside the dialog closes it
- **Body Scroll Prevention**: Disables page scrolling when dialog is open
- **Focus Return**: Returns focus to the trigger element when dialog closes
- **Semantic HTML**: Uses proper `<header>` and `<footer>` sections
- **Close Button**: Accessible close button with clear `aria-label`

## Installation & Import

```typescript
import AccessibleDialog from '@/components/AccessibleDialog';
import type { DialogProps } from '@/components/AccessibleDialog';
```

## Props

```typescript
interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Callback when dialog should close */
  onClose: () => void;

  /** Dialog title (used for aria-labelledby) */
  title: React.ReactNode;

  /** Main content of the dialog */
  children: React.ReactNode;

  /** Optional footer content (buttons, etc) */
  footer?: React.ReactNode;

  /** Optional CSS class name for the backdrop */
  className?: string;

  /** Optional custom ID for header element (defaults to 'dialog-title') */
  headerId?: string;

  /** Optional custom ID for description element */
  descriptionId?: string;
}
```

## Basic Usage

```typescript
import { useState } from 'react';
import AccessibleDialog from '@/components/AccessibleDialog';

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Dialog
      </button>

      <AccessibleDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
      >
        <p>Are you sure you want to proceed?</p>
      </AccessibleDialog>
    </>
  );
}
```

## With Footer

```typescript
<AccessibleDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Resume"
  footer={
    <>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
      <button onClick={handleDelete} className="bg-red-600 text-white">
        Delete
      </button>
    </>
  }
>
  <p>This action cannot be undone.</p>
</AccessibleDialog>
```

## With Description

```typescript
<AccessibleDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Export Resume"
  descriptionId="export-description"
>
  <p id="export-description">
    Choose a format to export your resume. The file will be downloaded to your device.
  </p>
  <select>
    <option>PDF</option>
    <option>JSON</option>
    <option>CSV</option>
  </select>
</AccessibleDialog>
```

## With Custom IDs

```typescript
<AccessibleDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
  headerId="settings-heading"
  descriptionId="settings-description"
>
  <p id="settings-description">Configure your application settings</p>
  {/* form content */}
</AccessibleDialog>
```

## Keyboard Interactions

| Key | Action |
|-----|--------|
| <kbd>Tab</kbd> | Move focus to next focusable element |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Move focus to previous focusable element |
| <kbd>Escape</kbd> | Close dialog |
| <kbd>Click outside</kbd> | Close dialog (backdrop click) |

## CSS Classes

The component uses Tailwind CSS for styling. Key classes:

- `fixed inset-0` - Full viewport overlay
- `bg-black/50` - Semi-transparent backdrop
- `bg-white rounded-2xl shadow-2xl` - Dialog container
- `max-w-md w-full mx-4` - Width constraints
- `px-6 py-4 border-b` - Header styling
- `px-6 py-4` - Content area
- `px-6 py-4 bg-slate-50 border-t` - Footer styling

## Styling Customization

### Custom Backdrop Color

```typescript
<AccessibleDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Custom Dialog"
  className="bg-blue-500/30"
>
  {/* content */}
</AccessibleDialog>
```

### Custom Dialog Width

To customize the dialog width, use a wrapper component:

```typescript
function CustomDialog(props: DialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <AccessibleDialog {...props} />
      </div>
    </div>
  );
}
```

## Testing

The component includes comprehensive tests for all accessibility features:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibleDialog from '@/components/AccessibleDialog';

test('should close on Escape key', async () => {
  const onClose = vi.fn();
  render(
    <AccessibleDialog isOpen={true} onClose={onClose} title="Test">
      Content
    </AccessibleDialog>
  );

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('should have correct ARIA attributes', () => {
  render(
    <AccessibleDialog isOpen={true} onClose={() => {}} title="Test">
      Content
    </AccessibleDialog>
  );

  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
});
```

## Run Tests

```bash
npm test -- components/AccessibleDialog.test.tsx --run
```

## Accessibility Checklist

- ✅ Keyboard navigation (Tab, Shift+Tab, Escape)
- ✅ Screen reader support (ARIA attributes)
- ✅ Focus trap (prevents focus leaving dialog)
- ✅ Focus restoration (returns to trigger element)
- ✅ Semantic HTML (header, footer, role)
- ✅ High contrast (works with high contrast mode)
- ✅ Reduced motion support (uses existing animations)
- ✅ Clear labeling (title + description)

## WCAG Compliance

This component implements WCAG 2.1 Level AA standards:

- **1.4.11 Non-text Contrast (AA)**: High contrast between dialog and backdrop
- **2.1.1 Keyboard (A)**: Full keyboard accessibility
- **2.1.2 No Keyboard Trap (A)**: Focus trap with proper escape
- **2.4.3 Focus Order (A)**: Logical focus order within dialog
- **2.4.7 Focus Visible (AA)**: Native focus indicators visible
- **4.1.2 Name, Role, Value (A)**: Proper ARIA attributes

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Migration from Other Dialogs

If migrating from `ShareDialog` or other custom dialogs:

```typescript
// Before
import ShareDialog from '@/components/ShareDialog';

// After
import AccessibleDialog, { DialogProps } from '@/components/AccessibleDialog';

// ShareDialog usage:
<ShareDialog isOpen={isOpen} onClose={onClose} />

// AccessibleDialog usage:
<AccessibleDialog
  isOpen={isOpen}
  onClose={onClose}
  title="Share Resume"
>
  {/* content that was inside ShareDialog */}
</AccessibleDialog>
```

## Performance Considerations

- Component returns `null` when not open (no DOM rendering)
- Focus trap only activates when `isOpen={true}`
- Event listeners are properly cleaned up on unmount
- No unnecessary re-renders with proper hook dependencies

## Common Patterns

### Confirmation Dialog

```typescript
<AccessibleDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Deletion"
  footer={
    <>
      <button onClick={() => setShowConfirm(false)}>Cancel</button>
      <button onClick={handleConfirm} className="bg-red-600 text-white">
        Delete
      </button>
    </>
  }
>
  <p>This action cannot be undone. Are you sure?</p>
</AccessibleDialog>
```

### Form Dialog

```typescript
<AccessibleDialog
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Create New Resume"
  footer={
    <>
      <button onClick={() => setShowForm(false)}>Cancel</button>
      <button onClick={handleSubmit}>Create</button>
    </>
  }
>
  <form onSubmit={handleSubmit}>
    <input type="text" placeholder="Resume name" />
    {/* more form fields */}
  </form>
</AccessibleDialog>
```

### Alert Dialog

```typescript
<AccessibleDialog
  isOpen={showAlert}
  onClose={() => setShowAlert(false)}
  title="Error"
  descriptionId="error-message"
  footer={<button onClick={() => setShowAlert(false)}>Dismiss</button>}
>
  <p id="error-message">{errorMessage}</p>
</AccessibleDialog>
```

## Troubleshooting

### Focus not moving into dialog on open

- Ensure the dialog content has at least one focusable element
- Check that no elements have `disabled` or `aria-hidden="true"` that shouldn't

### Dialog won't close on Escape

- Verify `onClose` callback is provided and working
- Check if another component is preventing event propagation

### Backdrop click not working

- Ensure you're clicking on the backdrop element, not the dialog content
- The click handler only closes if clicking directly on the backdrop

## See Also

- [useFocusTrap Hook Documentation](/home/alex/Projects/ResumeAI/hooks/useFocusTrap.ts)
- [ACCESSIBILITY.md](/home/alex/Projects/ResumeAI/ACCESSIBILITY.md)
- [ShareDialog Example](/home/alex/Projects/ResumeAI/components/ShareDialog.tsx)
- [WCAG Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)
