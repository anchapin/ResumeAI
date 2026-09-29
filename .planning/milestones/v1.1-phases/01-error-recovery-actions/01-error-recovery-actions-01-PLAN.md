---
phase: 01-error-recovery-actions
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/toast.ts
  - src/utils/ActionableToast.tsx
  - utils/toast.ts
autonomous: true
requirements:
  - ERR-01
  - ERR-02

must_haves:
  truths:
    - User sees categorized error messages (not generic "Failed to save")
    - Error toasts include actionable buttons (Retry, Download Backup)
  artifacts:
    - path: 'src/types/toast.ts'
      provides: 'ToastComponentProps type for ActionableToast'
      min_lines: 20
    - path: 'src/utils/ActionableToast.tsx'
      provides: 'Toast component with action button support'
      exports: 'default'
    - path: 'utils/toast.ts'
      provides: 'showActionableError utility function'
      exports: 'showActionableError'
  key_links:
    - from: 'utils/toast.ts'
      to: 'src/utils/ActionableToast.tsx'
      via: 'toast.error with custom component'
    - from: 'ActionableToast.tsx'
      to: 'src/types/toast.ts'
      via: 'ToastComponentProps import'
    - from: 'utils/toast.ts'
      to: 'utils/errorMessages.ts'
      via: 'getActionLabel, ErrorType'
---

<objective>
Integrate ActionableToast component with error utilities to display categorized error messages with actionable buttons.

Purpose: Enable user-facing error recovery through toast notifications with Retry and Download Backup actions.
Output: Toast type definitions, fixed ActionableToast component, showActionableError utility
</objective>

<execution_context>
@/home/alex/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/alex/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-error-recovery-actions/01-CONTEXT.md
@.planning/phases/01-error-recovery-actions/01-RESEARCH.md

# Existing code references

@utils/errorMessages.ts - ErrorType enum, getActionLabel(), ERROR_MESSAGES
@utils/toast.ts - showErrorToast, showSuccessToast utilities
@src/utils/ActionableToast.tsx - Existing component with type issue (imports non-existent ToastComponentProps)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ToastComponentProps type</name>
  <files>src/types/toast.ts</files>
  <action>
Create new type file at src/types/toast.ts with ToastComponentProps interface:

```typescript
import { ToastOptions } from 'react-toastify';

export interface ToastAction {
  label: string;
  onClick: () => void;
  className?: string;
}

export interface ToastComponentProps<T = unknown> extends ToastOptions {
  toastProps: {
    closeToast: () => void;
    toastId: number | string;
    isIn: boolean;
    style: React.CSSProperties;
    props: T;
  };
  message: string;
  actions: ToastAction[];
}
```

This type supports the ActionableToast component with custom message and actions props.
</action>
<verify>
<automated>ls -la src/types/toast.ts && head -30 src/types/toast.ts</automated>
</verify>
<done>src/types/toast.ts exists with ToastComponentProps and ToastAction interfaces exported</done>
</task>

<task type="auto">
  <name>Task 2: Fix ActionableToast type import</name>
  <files>src/utils/ActionableToast.tsx</files>
  <action>
Update the import on line 2 from:
`import { ToastComponentProps } from '../types';`

To:
`import { ToastComponentProps } from '../types/toast';`

This fixes the broken import that references non-existent '../types' (should be '../types/toast').
</action>
<verify>
<automated>grep -n "from '../types/toast'" src/utils/ActionableToast.tsx</automated>
</verify>
<done>ActionableToast imports ToastComponentProps from correct path src/types/toast</done>
</task>

<task type="auto">
  <name>Task 3: Add showActionableError utility</name>
  <files>utils/toast.ts</files>
  <action>
Add showActionableError function to utils/toast.ts after the existing showToast function:

```typescript
import ActionableToast from '../src/utils/ActionableToast';
import { ErrorType } from './errorMessages';

/**
 * Display an actionable error toast with retry/download options
 * @param message - The error message to display
 * @param errorType - The type of error (determines action button)
 * @param onAction - Optional callback for the action button (retry, etc.)
 */
export const showActionableError = (
  message: string,
  errorType: ErrorType,
  onAction?: () => void,
) => {
  const actionLabel = errorType ? errorType.toString() : null;

  // Determine actions based on error type
  const actions = [];

  if (errorType === ErrorType.NETWORK || errorType === ErrorType.TIMEOUT) {
    actions.push({
      label: 'Retry',
      onClick: () => {
        if (onAction) onAction();
      },
      className: 'bg-blue-500 text-white hover:bg-blue-600',
    });
  } else if (errorType === ErrorType.STORAGE) {
    actions.push({
      label: 'Download Backup',
      onClick: () => {
        // Trigger download - handled by component
        if (onAction) onAction();
      },
      className: 'bg-green-500 text-white hover:bg-green-600',
    });
  }

  toast.error(message, {
    component: ({ closeToast, toastProps }: { closeToast?: () => void; toastProps?: unknown }) => (
      <ActionableToast
        toastProps={{ closeToast: closeToast || (() => {}), toastProps: toastProps || {}, toastId: 0, isIn: true, style: {} }}
        message={message}
        actions={actions}
      />
    ),
    autoClose: false, // Keep actionable toasts open until user dismisses
    closeOnClick: false,
  });
};
```

  </action>
  <verify>
    <automated>grep -n "showActionableError" utils/toast.ts</automated>
  </verify>
  <done>showActionableError exported from utils/toast.ts, accepts message, errorType, and optional onAction callback</done>
</task>

</tasks>

<verification>
- [ ] src/types/toast.ts exists with ToastComponentProps and ToastAction exports
- [ ] ActionableToast.tsx imports from correct path
- [ ] showActionableError can be imported from utils/toast.ts
- [ ] TypeScript compiles without errors
</verification>

<success_criteria>
User sees categorized error messages with action buttons in toast notifications when errors occur.
</success_criteria>

<output>
After completion, create `.planning/phases/01-error-recovery-actions/01-error-recovery-actions-01-SUMMARY.md`
</output>
