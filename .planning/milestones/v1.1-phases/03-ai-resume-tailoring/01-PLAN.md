# Phase 3 Plan 01: Resume Tailoring UI Component

**Phase:** 3 - AI Resume Tailoring
**Status:** Planning
**Created:** 2026-03-12

## Goal

Create the user interface component that displays the resume tailoring interface, showing before/after diff and allowing users to accept/reject individual changes.

## Implementation Details

### Component: ResumeTailoringUI

**Location:** `components/ResumeTailoring.tsx` (new)

**Features:**
1. **Loading State** - Show spinner/progress during AI tailoring
2. **Diff Display** - Side-by-side or inline before/after view
3. **Change List** - List of all suggested changes with context
4. **Accept/Reject** - Checkbox or button per change
5. **Apply Button** - Apply all accepted changes to resume
6. **Cancel** - Return without applying changes

### Store Updates

**Location:** `store/store.ts`

Add to `AppState`:
```typescript
tailoredResume: SimpleResumeData | null;
tailoringChanges: Array<{
  section: string;
  field: string;
  original: string;
  proposed: string;
  accepted: boolean;
}>;
isTailoring: boolean;
tailoringError: string | null;
```

Add to `AppActions`:
```typescript
setTailoredResume: (data: SimpleResumeData | null) => void;
setTailoringChanges: (changes: AppState['tailoringChanges']) => void;
acceptChange: (index: number) => void;
rejectChange: (index: number) => void;
applyTailoring: () => void;
setIsTailoring: (isTailoring: boolean) => void;
setTailoringError: (error: string | null) => void;
clearTailoring: () => void;
```

### Navigation Integration

**Location:** `App.tsx`

Add new route/view state:
- `view === 'tailoring'` - Show the tailoring UI

**Trigger:** After JD is entered, show "Tailor Resume" button in JD section or editor

## Dependencies

- Phase 2 (Job Description Input) - Uses `currentJobDescription` from store
- Existing `ResumeTailorer` class in backend (already implemented)

## Files to Modify

1. `components/ResumeTailoring.tsx` - New component
2. `store/store.ts` - Add tailoring state and actions
3. `App.tsx` - Add navigation state for tailoring view

## Acceptance Criteria

1. UI displays loading state during tailoring
2. Shows diff between original and tailored resume
3. User can accept/reject individual changes
4. Apply button updates resume with accepted changes
5. Cancel returns to previous state without changes