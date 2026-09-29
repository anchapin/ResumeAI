# Plan 01: Cover Letter Generation UI

**Phase:** 04-cover-letter-generation  
**Requirement:** JOB-03  
**Goal:** Create frontend UI for AI-powered cover letter generation

## What's Involved

1. **CoverLetterGenerator Component**
   - Display current job description and tailored resume summary
   - Tone selector (Formal, Conversational, Enthusiastic)
   - "Generate Cover Letter" button with loading state
   - Generated cover letter preview area

2. **Store Integration**
   - Add `coverLetter` field to store
   - Add `coverLetterTone` field to store
   - Connect component to existing resume data

3. **Navigation Flow**
   - Route: `/cover-letter`
   - Entry: After tailoring complete (or from sidebar)
   - Exit: Navigate to editor or export

## Files Likely Affected

- `src/components/CoverLetterGenerator.tsx` (new)
- `src/store/store.ts` (add fields)
- `src/App.tsx` (add route)
- `src/components/Sidebar.tsx` (add nav item)

## Implementation Notes

- Use existing API client for backend calls
- Reuse loading/error states from ResumeTailoring component
- Tone values: `formal`, `conversational`, `enthusiastic`

## Success Criteria

- [ ] Component renders with tone selector
- [ ] Generate button triggers API call (placeholder for now)
- [ ] Preview displays generated cover letter
- [ ] Navigation to/from works correctly
