# Plan 04: Integration & Testing

**Phase:** 02-job-description-input
**Goal:** Connect all pieces and verify end-to-end functionality

## Tasks

### 4.1 End-to-End Testing

- [ ] Test text paste → parse → display flow
- [ ] Test URL fetch → parse → display flow
- [ ] Test validation errors display correctly
- [ ] Test navigation to next phase

### 4.2 Edge Cases

- [ ] Empty input handling
- [ ] Very long JD (>10KB) handling
- [ ] Malformed URL handling
- [ ] Fetch failures with various error codes
- [ ] Network timeout handling
- [ ] Invalid/corrupt HTML handling

### 4.3 Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces states
- [ ] Focus management correct
- [ ] Color contrast meets WCAG AA

### 4.4 Error Recovery

- [ ] Retry button works on fetch failure
- [ ] Fallback to manual paste on URL failure
- [ ] Clear error messages

## Files to Test

- `components/JobDescriptionInput.tsx`
- `resume-api/api/jd_routes.py`
- Store integration

## Dependencies

- Plan 01 (UI ready)
- Plan 02 (API ready)
- Plan 03 (Parsing ready)

## Acceptance Criteria

1. Full flow works: input → fetch/parse → display
2. All edge cases handled gracefully
3. Accessibility requirements met
4. No console errors
