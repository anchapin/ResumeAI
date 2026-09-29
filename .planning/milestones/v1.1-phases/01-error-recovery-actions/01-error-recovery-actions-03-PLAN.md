---
phase: 01-error-recovery-actions
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - pages/Editor.tsx
  - store/store.ts
  - utils/toast.ts
autonomous: true
requirements:
  - ERR-03
  - ERR-04
gap_closure: true

must_haves:
  truths:
    - User can download backup when save fails due to storage issues
    - User sees Manual Save button only when auto-save fails
  artifacts:
    - path: 'pages/Editor.tsx'
      provides: 'Editor page with ManualSaveButton imported and auto-save mechanism'
      min_lines: 5
    - path: 'store/store.ts'
      provides: 'autoSaveFailed triggered when save errors occur'
      changes: 'Call autoSaveFailed() in catch block of save operations'
  key_links:
    - from: 'pages/Editor.tsx'
      to: 'components/ManualSaveButton.tsx'
      via: 'import and render'
    - from: 'store/store.ts'
      to: 'utils/toast.ts'
      via: 'call showActionableError on save failure'
---

<objective>
Wire up the existing error recovery infrastructure to make it functional. Connect the orphaned showActionableError toast to error handling flow, and import ManualSaveButton in the Editor.

Purpose: Close verification gaps by connecting existing components to the application flow.
Output: Working error recovery - toasts appear on errors, ManualSaveButton shows on failure
</objective>

<execution_context>
@/home/alex/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/alex/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-error-recovery-actions/01-CONTEXT.md

# Gap Analysis from VERIFICATION.md

## Gap 1 (ERR-03): showActionableError not wired

- **Problem:** showActionableError function exists in utils/toast.ts but is NEVER called
- **Missing:** The function must be called when storage errors are detected
- **Solution:** Import and call showActionableError in the error handling flow

## Gap 2 (ERR-04): ManualSaveButton not imported

- **Problem:** ManualSaveButton component exists but not imported in Editor.tsx
- **Missing:** Import ManualSaveButton and render it in the Editor page
- **Additional:** Need auto-save mechanism that catches errors and sets autoSaveFailed=true

# Existing code references

@components/ManualSaveButton.tsx - Component exists, conditionally renders when autoSaveFailed=true
@store/store.ts - Has autoSaveFailed() action, manualSave() action
@utils/toast.ts - Has showActionableError(message, errorType, onAction?) function
@utils/errorMessages.ts - ErrorType enum (NETWORK, STORAGE, TIMEOUT, etc.)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Import ManualSaveButton in Editor.tsx</name>
  <files>pages/Editor.tsx</files>
  <action>
1. Add import for ManualSaveButton at the top of the file with other component imports:
```typescript
import ManualSaveButton from '../components/ManualSaveButton';
```

2. Add the ManualSaveButton component to the Editor page JSX - render it inside the main editor container (around where other status indicators appear):

```tsx
<ManualSaveButton />
```

The component already conditionally renders itself based on autoSaveFailed state, so simply adding it to the JSX will make it appear when needed.
</action>
<verify>
<automated>grep -n "ManualSaveButton" pages/Editor.tsx</automated>
</verify>
<done>ManualSaveButton is imported and rendered in Editor.tsx</done>
</task>

<task type="auto">
  <name>Task 2: Wire autoSaveFailed to save error handling</name>
  <files>store/store.ts</files>
  <action>
Find where save operations happen in the store and ensure autoSaveFailed() is called when save errors occur.

Look for the saveResumeData calls or any save-related actions in store.ts. In the catch blocks of save operations, add a call to trigger the error handling:

```typescript
// After existing error handling in save operations:
set({ saveStatus: 'error' });
// Call autoSaveFailed to show ManualSaveButton
// The autoSaveFailed action is already defined - call it
```

Ensure that when a save fails (catches an error), the store calls the autoSaveFailed action to:

1. Set autoSaveFailed: true (so ManualSaveButton appears)
2. Set saveStatus: 'error' (so UI reflects the error state)
   </action>
   <verify>
   <automated>grep -n "autoSaveFailed" store/store.ts | head -10</automated>
   </verify>
   <done>Save error handlers call autoSaveFailed() to trigger ManualSaveButton visibility</done>
   </task>

<task type="auto">
  <name>Task 3: Wire showActionableError to error handling flow</name>
  <files>store/store.ts</files>
  <action>
Import and call showActionableError when save errors occur, to display actionable toast.

1. Add import at top of store.ts:

```typescript
import { showActionableError } from '../utils/toast';
import { ErrorType } from '../utils/errorMessages';
```

2. In the catch blocks of save operations, call showActionableError:

```typescript
catch (error) {
  // Determine error type
  const errorType = error instanceof Error ?
    (error.message.includes('network') ? ErrorType.NETWORK :
     error.message.includes('storage') ? ErrorType.STORAGE :
     error.message.includes('timeout') ? ErrorType.TIMEOUT :
     ErrorType.SERVER)
    : ErrorType.SERVER;

  showActionableError(
    error instanceof Error ? error.message : 'Failed to save',
    errorType,
    () => {
      // Retry action - call the save function again
      saveResumeData(state.resumeData);
    }
  );

  set({ saveStatus: 'error' });
}
```

This will show toast with:

- Retry button for NETWORK/TIMEOUT errors
- Download Backup button for STORAGE errors
  </action>
  <verify>
  <automated>grep -n "showActionableError" store/store.ts</automated>
  </verify>
  <done>showActionableError is called when save errors occur, showing actionable toast with Retry/Download Backup</done>
  </task>

</tasks>

<verification>
- [ ] ManualSaveButton appears in Editor page
- [ ] autoSaveFailed state is triggered when save errors occur
- [ ] showActionableError toast appears with appropriate action button
- [ ] TypeScript compiles without errors
</verification>

<success_criteria>
User sees actionable error toast with Retry (network/timeout) or Download Backup (storage) button when save fails, and ManualSaveButton appears when auto-save fails.
</success_criteria>

<output>
After completion, create `.planning/phases/01-error-recovery-actions/01-error-recovery-actions-03-SUMMARY.md`
</output>
