---
phase: 01-error-recovery-actions
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - store/store.ts
  - components/ManualSaveButton.tsx
autonomous: true
requirements:
  - ERR-03
  - ERR-04

must_haves:
  truths:
    - User can download backup when save fails due to storage issues
    - Manual Save button appears contextually when auto-save fails
  artifacts:
    - path: 'store/store.ts'
      provides: 'autoSaveFailed state, manualSave action'
      min_lines: 15
    - path: 'components/ManualSaveButton.tsx'
      provides: 'Manual save fallback UI component'
      exports: 'ManualSaveButton, default'
  key_links:
    - from: 'components/ManualSaveButton.tsx'
      to: 'store/store.ts'
      via: 'useStore hook for autoSaveFailed, manualSave'
    - from: 'store/store.ts'
      to: 'utils/storage.ts'
      via: 'saveResumeData function'
---

<objective>
Add auto-save failure state and manual save action to the store, then create ManualSaveButton component for fallback UI.

Purpose: Enable users to manually save their resume when auto-save fails, providing a recovery path for storage/network issues.
Output: Updated store with autoSaveFailed state and manualSave action, ManualSaveButton component
</objective>

<execution_context>
@/home/alex/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/alex/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-error-recovery-actions/01-CONTEXT.md
@.planning/phases/01-error-recovery-actions/01-RESEARCH.md

# Existing code references

@store/store.ts - Existing store with saveStatus, resumeData
@utils/storage.ts - loadResumeData, saveResumeData, StorageError
@components/ErrorDisplay.tsx - handleDownloadBackup function (lines 190-205) for backup download logic
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add autoSaveFailed state and manualSave action to store</name>
  <files>store/store.ts</files>
  <action>
Add the following to store/store.ts:

1. Add to AppState interface (around line 26-40):

```typescript
autoSaveFailed: boolean;
```

2. Add to AppActions interface (around line 42-58):

```typescript
autoSaveFailed: () => void;
clearAutoSaveFailed: () => void;
manualSave: () => Promise<boolean>;
```

3. Add to initial state (around line 124-140):

```typescript
autoSaveFailed: false,
```

4. Add action implementations (before the closing of persist callback):

```typescript
autoSaveFailed: () => set({
  autoSaveFailed: true,
  saveStatus: 'error'
}),

clearAutoSaveFailed: () => set({
  autoSaveFailed: false,
  saveStatus: 'saved'
}),

manualSave: async () => {
  try {
    set({ saveStatus: 'saving' });
    // Import saveResumeData at top of file if not already present
    const { saveResumeData } = await import('../utils/storage');
    const state = useStore.getState();
    await saveResumeData(state.resumeData);
    set({
      saveStatus: 'saved',
      lastSaved: new Date(),
      autoSaveFailed: false
    });
    return true;
  } catch (error) {
    set({ saveStatus: 'error', autoSaveFailed: true });
    return false;
  }
},
```

Note: Add saveResumeData import from utils/storage at the top of the file.
</action>
<verify>
<automated>grep -n "autoSaveFailed\|manualSave" store/store.ts | head -20</automated>
</verify>
<done>Store has autoSaveFailed boolean state, autoSaveFailed() to mark failure, clearAutoSaveFailed() to clear after success, and manualSave() async action that returns boolean</done>
</task>

<task type="auto">
  <name>Task 2: Create ManualSaveButton component</name>
  <files>components/ManualSaveButton.tsx</files>
  <action>
Create new component at components/ManualSaveButton.tsx:

```tsx
import React from 'react';
import { useStore } from '../store/store';

/**
 * ManualSaveButton - Appears when auto-save fails to allow manual save
 * Only visible when autoSaveFailed is true in the store
 */
const ManualSaveButton: React.FC = () => {
  const autoSaveFailed = useStore((state) => state.autoSaveFailed);
  const manualSave = useStore((state) => state.manualSave);
  const saveStatus = useStore((state) => state.saveStatus);

  if (!autoSaveFailed) {
    return null;
  }

  const handleManualSave = async () => {
    await manualSave();
  };

  const isSaving = saveStatus === 'saving';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleManualSave}
        disabled={isSaving}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-lg
          transition-all duration-200
          ${
            isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }
        `}
        aria-label={isSaving ? 'Saving manually...' : 'Manually save resume'}
      >
        <span className="material-symbols-outlined text-lg">
          {isSaving ? 'hourglass_empty' : 'save'}
        </span>
        {isSaving ? 'Saving...' : 'Manual Save'}
      </button>
    </div>
  );
};

export default ManualSaveButton;
```

This component:

- Only renders when autoSaveFailed is true in the store
- Calls the manualSave action from the store
- Shows loading state while saving
- Uses fixed positioning (bottom-right) to be visible in editor
- Follows existing button styling patterns from the codebase
  </action>
  <verify>
  <automated>ls -la components/ManualSaveButton.tsx && grep -n "export default" components/ManualSaveButton.tsx</automated>
  </verify>
  <done>ManualSaveButton component exists, conditionally renders when autoSaveFailed is true, calls manualSave on click</done>
  </task>

</tasks>

<verification>
- [ ] store/store.ts has autoSaveFailed boolean state
- [ ] store/store.ts has manualSave async action that returns boolean
- [ ] components/ManualSaveButton.tsx exports default component
- [ ] ManualSaveButton only renders when autoSaveFailed is true
- [ ] TypeScript compiles without errors
</verification>

<success_criteria>
User can manually save resume when auto-save fails, and can download backup when storage is full.
</success_criteria>

<output>
After completion, create `.planning/phases/01-error-recovery-actions/01-error-recovery-actions-02-SUMMARY.md`
</output>
