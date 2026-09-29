# Plan 03: JD Parsing Integration

**Phase:** 02-job-description-input
**Goal:** Parse extracted job description to identify key requirements

## Tasks

### 3.1 Integrate Existing Parser

- [ ] Use existing `JobDescriptionParser` from `resume-api/lib/utils/`
- [ ] Verify parser extracts: requirements, qualifications, keywords
- [ ] Test with various JD formats

### 3.2 Frontend Parsing Display

- [ ] Show extracted requirements list
- [ ] Show extracted keywords (skills, tools)
- [ ] Show parsed summary (years experience, education)
- [ ] Display raw text for confirmation

### 3.3 Store Integration

- [ ] Add `parsedJobDescription` to store
- [ ] Persist between sessions (optional)
- [ ] Pass to next phase (AI Tailoring)

## Technical Details

The existing backend already has:
- `parse_job_description()` function
- `JobDescriptionParser` class
- Returns: requirements, skills, keywords, summary

## Files to Modify

- `store/store.ts` - Add parsed state
- `components/JobDescriptionInput.tsx` - Add display

## Dependencies

- Plan 01 (UI ready)
- Plan 02 (URL fetch working)

## Acceptance Criteria

1. Parsed data displays correctly
2. User can see extracted keywords
3. Parsed data available for next phase
4. Graceful handling of parse failures
