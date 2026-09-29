# Research: Phase 1 - Error Recovery Actions

**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

This phase implements user-facing error recovery for save failures. The codebase already has solid foundations:

- `ErrorType` enum in `utils/errorMessages.ts` categorizes errors
- `ActionableToast` component exists but needs integration
- `ErrorDisplay` component already implements retry/download backup logic
- Store has `saveStatus` state tracking

The main work involves: (1) integrating ActionableToast with error utilities, (2) adding manual save to the store, and (3) wiring up error toasts with action buttons.

## Key Findings

### 1. ActionableToast Integration

**Status:** Component exists but has type issues and isn't wired up.

The `ActionableToast` component at `src/utils/ActionableToast.tsx` references `ToastComponentProps` which doesn't exist in the codebase. This type needs to be created using react-toastify's `ToastContainerRenderedProps` or custom props interface.

**Recommended Approach:**

```typescript
// src/types/toast.ts (new file)
import { ToastOptions } from 'react-toastify';

export interface ToastComponentProps<T = unknown> extends ToastOptions {
  toastProps: {
    closeToast: () => void;
    toastId: number;
    isIn: boolean;
    style: React.CSSProperties;
    props: T;
  };
  // Custom data passed to toast
  message: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    className?: string;
  }>;
}
```

**Toast Integration Pattern:**

```typescript
import { toast } from 'react-toastify';
import ActionableToast from './ActionableToast';

// Show actionable error toast
const showActionableError = (
  message: string,
  errorType: ErrorType,
  actions: { label: string; onClick: () => void }[]
) => {
  toast.error(message, {
    // @ts-expect-error - custom component props
    component: ({ closeToast, toastProps }) => (
      <ActionableToast
        toastProps={{ closeToast, toastProps }}
        message={message}
        actions={actions}
      />
    ),
    autoClose: false, // Keep actionable toasts open
    closeOnClick: false,
  });
};
```

### 2. Retry Handler Architecture

**Status:** ErrorDisplay already has retry implementation; need to replicate for toast context.

**Where Retry Logic Should Live:**

| Layer                    | Responsibility                               |
| ------------------------ | -------------------------------------------- |
| `utils/errorMessages.ts` | Returns action label, not logic              |
| `utils/errorHandler.ts`  | Central error handling, decides what to show |
| Store actions            | Actual retry logic (e.g., `saveResume()`)    |
| Components               | Call store actions on retry                  |

**Recommended Pattern:**

```typescript
// In component using the toast
const handleSaveError = async (error: StorageError) => {
  const errorType = mapStorageErrorToErrorType(error);
  const actionLabel = getActionLabel(errorType);

  if (actionLabel === 'Retry') {
    showActionableError(getErrorMessageByType(errorType).userMessage, errorType, [
      {
        label: 'Retry',
        onClick: () => performSave(), // The actual retry logic
      },
    ]);
  }
};
```

The retry callback should call the **same function that originally failed**, not a generic "retry last operation." For save failures, this means calling `saveResumeData()` again.

### 3. Manual Save Fallback UI

**Status:** Need to add to store and create UI component.

**Store Changes Required:**

```typescript
// store/store.ts additions
interface AppActions {
  // ... existing
  manualSave: () => Promise<boolean>; // Returns success/failure
  autoSaveFailed: () => void; // Marks auto-save as failed
  clearAutoSaveFailed: () => void; // Clears after successful manual save
}

autoSaveFailed: () => set({
  autoSaveFailed: true, // new state
  saveStatus: 'error'
}),

clearAutoSaveFailed: () => set({
  autoSaveFailed: false,
  saveStatus: 'saved'
}),

manualSave: async () => {
  try {
    set({ saveStatus: 'saving' });
    await saveResumeData(get().resumeData);
    set({
      saveStatus: 'saved',
      lastSaved: new Date(),
      autoSaveFailed: false
    });
    return true;
  } catch (error) {
    set({ saveStatus: 'error' });
    return false;
  }
}
```

**UI Component Recommendation:**
Add to editor layout - fixed position button that appears only when `autoSaveFailed` is true:

```tsx
// components/ManualSaveButton.tsx
const ManualSaveButton: React.FC = () => {
  const { autoSaveFailed, manualSave, saveStatus } = useStore((state) => ({
    autoSaveFailed: state.autoSaveFailed,
    manualSave: state.manualSave,
    saveStatus: state.saveStatus,
  }));

  if (!autoSaveFailed) return null;

  return (
    <button
      onClick={manualSave}
      disabled={saveStatus === 'saving'}
      className="fixed bottom-4 right-4 btn-primary"
    >
      {saveStatus === 'saving' ? 'Saving...' : 'Manual Save'}
    </button>
  );
};
```

### 4. Error to Action Mapping

Already implemented in `utils/errorMessages.ts`:

- `getActionLabel(ErrorType.NETWORK)` → `"Retry"`
- `getActionLabel(ErrorType.TIMEOUT)` → `"Retry"`
- `getActionLabel(ErrorType.STORAGE)` → `"Download Backup"`
- `getActionLabel(ErrorType.SERVER)` → `"Report Issue"`
- `getActionLabel(ErrorType.AUTH)` → `"Sign In"`

Download backup is already implemented in `ErrorDisplay.tsx` (lines 190-205) - can reuse this logic.

## Implementation Plan

### ERR-01: Categorized Error Messages

1. Create `ToastComponentProps` type
2. Fix ActionableToast imports
3. Add `showActionableError` utility in `utils/toast.ts`
4. Update error handlers to use categorized messages from `ERROR_MESSAGES`

### ERR-02: Retry via Action Buttons

1. Pass retry callback to error toasts
2. Retry callback calls the failed operation again
3. Update UI to reflect success/failure

### ERR-03: Download Backup for Storage Errors

1. Extract `handleDownloadBackup` from ErrorDisplay to `utils/errorHandler.ts` or `utils/storage.ts`
2. Wire up to STORAGE error action in toast
3. Test with full localStorage (can simulate via DevTools)

### ERR-04: Manual Save Button

1. Add `autoSaveFailed` and `manualSave` to store
2. Create `ManualSaveButton` component
3. Show only when auto-save fails
4. Hide after successful manual save

## Testing Strategy

### Unit Tests

1. **Error Type Mapping**
   - Test `getActionLabel()` returns correct labels
   - Test `isErrorRetryable()` for each error type
2. **Toast Integration**
   - Test `showActionableError` creates toast with correct actions
   - Test ActionableToast renders actions and handles clicks

3. **Store**
   - Test `manualSave` succeeds when storage works
   - Test `manualSave` fails gracefully when storage full
   - Test `autoSaveFailed` state transitions

### Integration Tests

1. **E2E: Save Failure → Retry**
   - Fill resume form
   - Simulate storage error (block localStorage)
   - See error toast with Retry button
   - Click Retry
   - Verify save succeeds after fix

2. **E2E: Storage Full → Download Backup**
   - Fill resume form
   - Simulate quota exceeded
   - See "Download Backup" toast
   - Click button
   - Verify JSON file downloads

3. **E2E: Auto-save Fail → Manual Save**
   - Disable localStorage
   - Trigger auto-save
   - See Manual Save button appear
   - Click Manual Save
   - Verify button disappears after success

### Testing Utilities

```typescript
// For simulating storage errors
const simulateStorageFull = () => {
  const originalSetItem = localStorage.setItem;
  jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  return () => jest.restoreAllMocks();
};
```

## Files to Modify

| File                              | Change                                        |
| --------------------------------- | --------------------------------------------- |
| `src/types/toast.ts`              | NEW - ToastComponentProps type                |
| `src/utils/ActionableToast.tsx`   | Fix type import                               |
| `utils/toast.ts`                  | Add showActionableError                       |
| `utils/errorHandler.ts`           | Add download backup function, integrate toast |
| `store/store.ts`                  | Add autoSaveFailed state, manualSave action   |
| `components/ManualSaveButton.tsx` | NEW - Manual save fallback UI                 |

## Research Gaps

- **Gap:** How does auto-save currently work? Is there an existing auto-save hook?
- **Investigation:** Need to find where auto-save triggers to know where to hook in error handling
- **Gap:** Toast positioning - ensure doesn't conflict with ErrorDisplay
- **Recommendation:** Use toast for transient errors, ErrorDisplay for persistent ones

## Confidence Assessment

| Area                 | Confidence | Notes                                                    |
| -------------------- | ---------- | -------------------------------------------------------- |
| Error categorization | HIGH       | ErrorType enum already exists                            |
| Toast integration    | MEDIUM     | Pattern identified, need to verify react-toastify compat |
| Manual save          | HIGH       | Clear pattern from store analysis                        |
| Retry handlers       | HIGH       | Same operation pattern is standard                       |
| Download backup      | HIGH       | Already implemented in ErrorDisplay                      |
