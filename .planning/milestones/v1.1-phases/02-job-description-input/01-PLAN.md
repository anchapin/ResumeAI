# Phase 2 Plan: Job Description Input

**Created:** 2026-03-12
**Phase:** 02-job-description-input
**Requirement:** JOB-01

## Goal

Users can input job descriptions via text paste or URL fetch, with validation and parsing.

## Success Criteria

1. Text area for pasting job description content
2. URL input field with fetch button to retrieve JD from web
3. Validation to ensure JD is present and non-empty
4. Parsing to extract key requirements and keywords

---

## Implementation Plans

### Plan 01: JD Input Modal/Page UI

**Goal:** Create the user interface for job description input

**Tasks:**

1. Create new `JobDescriptionInput` component in `components/`
   - Multi-line textarea for pasting JD
   - URL input field with fetch button
   - Character count display
   - Validation states (empty, too short, valid)
   - Loading state for URL fetch

2. Add route/navigation for JD input flow
   - Integrate with existing navigation (App.tsx)
   - Modal or dedicated page option

3. Update store to hold current job description
   - Add `currentJobDescription` state
   - Add `jobDescriptionUrl` state
   - Add `parsedJobDescription` state

**Files to Create:**
- `components/JobDescriptionInput.tsx`

**Files to Modify:**
- `store/store.ts` - Add job description state
- `App.tsx` - Add route/navigation

**Dependencies:** None

**Estimated Effort:** Medium

---

### Plan 02: Backend URL Fetch API

**Goal:** Create API endpoint to fetch job descriptions from URLs

**Tasks:**

1. Create or extend `jd_routes.py` endpoint for URL fetching
   - Accept URL input
   - Fetch and parse HTML from job posting
   - Extract text content (handle various formats)
   - Return raw JD text

2. Handle error cases
   - 404 Not Found
   - Timeout errors
   - Blocked sites/paywalls
   - Invalid URLs

3. Add caching for fetched JDs

**Files to Modify:**
- `resume-api/api/jd_routes.py` - Add `/fetch` endpoint

**Dependencies:** None (can be done in parallel with Plan 01)

**Estimated Effort:** Medium

---

### Plan 03: JD Parsing Integration

**Goal:** Parse extracted job description to identify key requirements

**Tasks:**

1. Integrate existing `JobDescriptionParser` from `lib/utils/`
   - Use existing parsing utilities
   - Extract requirements, qualifications, keywords

2. Create frontend parsing display
   - Show extracted requirements list
   - Show extracted keywords
   - Show parsed summary

3. Store parsed results for next phase

**Files to Modify:**
- `components/JobDescriptionInput.tsx` - Add parsing display
- `store/store.ts` - Add parsed data

**Dependencies:** Plan 01, Plan 02

**Estimated Effort:** Low

---

### Plan 04: Integration & Testing

**Goal:** Connect all pieces and verify end-to-end functionality

**Tasks:**

1. Integration test JD input flow
   - Text paste → parse → display
   - URL fetch → parse → display
   - Validation errors display correctly

2. Edge case testing
   - Empty input
   - Very long JDs
   - Malformed URLs
   - Fetch failures

3. Accessibility testing
   - Keyboard navigation
   - Screen reader support
   - Focus management

**Dependencies:** Plan 01, Plan 02, Plan 03

**Estimated Effort:** Low

---

## Plan Execution Order

```
[Plan 01: JD Input UI] ──────────────┐
                                       ├──► [Plan 04: Integration & Testing]
[Plan 02: URL Fetch API] ─────────────┘
                   │
[Plan 03: Parsing] ──────────────────┘
```

## Parallel Opportunities

- Plan 01 and Plan 02 can be done in parallel (frontend UI + backend API)
- Plan 03 depends on both Plan 01 and 02

## Risks & Mitigations

1. **Risk:** URL fetch blocked by CORS
   - **Mitigation:** Use backend proxy endpoint (Plan 02)

2. **Risk:** HTML parsing fails for complex sites
   - **Mitigation:** Show error message, allow manual paste fallback

3. **Risk:** Parsing quality varies by JD format
   - **Mitigation:** Show raw text for user confirmation

## Out of Scope

- JD analysis display (Phase 3)
- AI tailoring suggestions (Phase 3)
- Auto-save JD between sessions (future)
