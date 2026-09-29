# Phase 1: Error Recovery Actions - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can recover from save failures with clear, actionable error messages. Deliverables:

- Categorized error messages (not generic "Failed to save")
- Action buttons in error notifications (Retry, Download Backup)
- Manual Save button when auto-save fails

</domain>

<decisions>
## Implementation Decisions

### Error Display Approach

- Use toast notifications for transient errors (network, timeout)
- Use ErrorDisplay component for persistent errors that need attention
- Leverage existing `ErrorType` enum in `utils/errorMessages.ts`

### Error Categorization

- Reuse existing ErrorType categories: NETWORK, STORAGE, SERVER, AUTH, VALIDATION, etc.
- Map existing error codes to these types automatically

### Action Integration

- Use `getActionLabel()` from `utils/errorMessages.ts` for button labels
- Wire up retry handlers to call the failed operation again
- Wire up download backup for STORAGE errors

### Manual Save

- Show floating/visible manual save button in editor when auto-save fails
- Button triggers immediate save to localStorage

### Claude's Discretion

- Exact toast positioning and styling
- Auto-dismiss timing
- Error icon choices
- Manual save button placement in editor layout

</decisions>

<specifics>
## Specific Ideas

No specific references from user — standard error recovery patterns acceptable.

</specifics>

# Company

## Existing Code Insights

### Reusable Assets

- `utils/errorMessages.ts` — ErrorType enum, ERROR_MESSAGES record, getActionLabel()
- `src/utils/ActionableToast.tsx` — Toast component with action button support (not yet integrated)
- `components/ErrorDisplay.tsx` — Error display with retry support
- `utils/toast.ts` — showErrorToast, showSuccessToast utilities

### Established Patterns

- react-toastify for notifications
- ErrorType enum for categorization
- Icons from material-symbols-outlined

### Integration Points

- ErrorDisplay can accept onRetry callback
- ActionableToast needs integration with showErrorToast
- Manual save needs to be added to editor context/store

</code_context>

<deferred>
## Deferred Ideas

None — all requirements addressed in this phase scope.

</deferred>

---

_Phase: 01-error-recovery-actions_
_Context gathered: 2026-03-12_
