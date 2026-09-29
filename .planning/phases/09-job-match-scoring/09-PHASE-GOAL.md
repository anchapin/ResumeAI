# Phase 9: Job Match Scoring

**Goal:** Users can see how well their resume matches a job description with actionable improvement suggestions.

**Requirements:** ANA-01, ANA-02, ANA-03, ANA-04

**Success Criteria:**

1. Match score (0-100%) calculated using AI/embedding analysis
2. Gap analysis showing missing skills and keywords
3. Specific suggestions to improve match score
4. Side-by-side comparison UI

**Dependencies:** Phase 2 v1.1 (JD input exists), Phase 3 v1.1 (AI tailoring exists)

**Out of Scope:** Historical match score tracking, batch matching multiple JDs

**Plans:** 4 plans

---

## Plan List

| Plan | Goal | Requirements | Estimated Effort |
|------|------|--------------|------------------|
| 01 | Match Score API | ANA-01, ANA-02 | 3-4 days backend |
| 02 | Match Score UI | ANA-01, ANA-03 | 2 days frontend |
| 03 | Gap Analysis UI | ANA-02, ANA-03 | 1-2 days frontend |
| 04 | Integration & Testing | ANA-04 | 1 day full-stack |

---

## Plan 01: Match Score API Backend

**Goal:** Implement `/api/v1/match` endpoint with hybrid SBERT + keyword matching.

**Requirements:** ANA-01, ANA-02

**Success Criteria:**

1. Endpoint accepts resume text + job description
2. Returns match score (0-100%) with component breakdown
3. Returns gap analysis (missing skills, suggestions)
4. Response time < 500ms on CPU
5. 90%+ test coverage

**What's Involved:**

1. **Install Dependencies**
   - `sentence-transformers` (SBERT model)
   - `spacy` (NER for skill extraction)
   - `scikit-learn` (cosine similarity)
   - Download `all-MiniLM-L6-v2` model (~90MB)
   - Download `en_core_web_sm` spaCy model (~12MB)

2. **Create Skill Ontology**
   - Define 100+ common tech skills with synonyms
   - Store as JSON or Python dict
   - Include: languages, frameworks, tools, soft skills

3. **Implement Match Score Calculator**
   - Semantic similarity (40% weight): SBERT embeddings + cosine similarity
   - Skills match (35% weight): Ontology lookup + NER
   - Experience match (15% weight): Years extraction + comparison
   - Education match (10% weight): Level mapping

4. **Implement Gap Analysis**
   - Extract skills from resume and JD
   - Find missing skills (JD skills - resume skills)
   - Find semantic near-matches (threshold 0.75)
   - Generate actionable suggestions

5. **Create API Endpoint**
   - POST `/api/v1/match`
   - Request: `{ "resume_text": str, "job_description": str }`
   - Response: `{ "match_score": float, "semantic_score": float, "skills_match": float, "missing_skills": list, "suggestions": list }`

6. **Add Caching**
   - Cache embeddings for repeated comparisons
   - Redis or in-memory LRU cache

7. **Write Tests**
   - Unit tests for scoring components
   - Integration tests for endpoint
   - Performance tests (< 500ms latency)

**Files Likely Affected:**

- New: `resume-api/lib/matchers/job_matcher.py`
- New: `resume-api/lib/matchers/skill_ontology.py`
- New: `resume-api/routes/match.py`
- New: `resume-api/tests/test_job_matcher.py`
- Update: `resume-api/requirements.txt`

**Verification:**

```bash
# Run tests
pytest resume-api/tests/test_job_matcher.py -v

# Test endpoint manually
curl -X POST http://localhost:8000/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "...", "job_description": "..."}'

# Check response time
time curl -X POST http://localhost:8000/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "...", "job_description": "..."}'
```

---

## Plan 02: Match Score UI Component

**Goal:** Create frontend components for displaying match score and component breakdown.

**Requirements:** ANA-01, ANA-03

**Success Criteria:**

1. Match score gauge (0-100%) with color coding
2. Component breakdown (semantic, skills, experience, education)
3. Loading state during calculation
4. Error handling with retry option
5. Responsive design (mobile-friendly)

**What's Involved:**

1. **Create MatchScore Gauge Component**
   - Circular or linear progress indicator
   - Color coding: 0-39 (red), 40-59 (yellow), 60-79 (blue), 80-100 (green)
   - Animated transition on score change
   - Tooltip explaining score components

2. **Create ComponentBreakdown Component**
   - Bar chart or progress bars for each component
   - Labels: Semantic (40%), Skills (35%), Experience (15%), Education (10%)
   - Show individual scores and weights

3. **Create MatchScoreCard Component**
   - Combine gauge + breakdown
   - Header with JD title
   - Overall score prominently displayed
   - Expandable details section

4. **Integrate with API**
   - Create `calculateMatchScore()` function in utils
   - Handle loading, success, error states
   - Add retry logic for failed requests

5. **Add to JobDescriptionInput Page**
   - Show "Calculate Match" button after JD entered
   - Display results below input or in modal
   - Persist results in Zustand store

6. **Write Tests**
   - Component rendering tests
   - User interaction tests (click, retry)
   - API integration tests (mock)

**Files Likely Affected:**

- New: `src/components/analytics/MatchScoreGauge.tsx`
- New: `src/components/analytics/ComponentBreakdown.tsx`
- New: `src/components/analytics/MatchScoreCard.tsx`
- New: `src/utils/match-score.ts`
- Update: `src/pages/Editor.tsx` or `src/components/JobDescriptionInput.tsx`
- New: `src/components/analytics/tests/MatchScoreCard.test.tsx`

**Verification:**

```bash
# Run frontend tests
npm test -- src/components/analytics/tests/MatchScoreCard.test.tsx --run

# Type check
npx tsc --noEmit

# Start dev server and test manually
npm run dev
# Navigate to Editor, enter JD, click "Calculate Match"
```

---

## Plan 03: Gap Analysis UI

**Goal:** Display missing skills and actionable improvement suggestions.

**Requirements:** ANA-02, ANA-03

**Success Criteria:**

1. List of missing skills with priority indicators
2. Semantic near-match explanations ("You have 'ML' which matches 'Machine Learning'")
3. Actionable suggestions for each missing skill
4. "Add to Resume" quick action
5. Keyboard accessible

**What's Involved:**

1. **Create GapAnalysis Component**
   - Section for missing skills (high/medium priority)
   - Section for semantic near-matches
   - Section for keyword suggestions

2. **Create MissingSkillItem Component**
   - Skill name with priority badge
   - "Add to Resume" button
   - Optional: learning resource link
   - Optional: estimated learning time

3. **Create NearMatchItem Component**
   - Explain semantic match
   - Show confidence score
   - Option to "mark as covered" or "add anyway"

4. **Create SuggestionsList Component**
   - Actionable suggestions (e.g., "Add 'Kubernetes' to Skills section")
   - Checkbox to mark as completed
   - Persist suggestions in local storage

5. **Integrate with MatchScoreCard**
   - Show gap analysis below score or in expandable section
   - Tab or accordion layout for organization
   - Smooth animations on expand/collapse

6. **Add "Add to Resume" Functionality**
   - Parse suggestion to identify skill/category
   - Open editor with skill pre-filled
   - Or auto-add to skills section (with confirmation)

7. **Write Tests**
   - Component rendering tests
   - User interaction tests (add to resume, mark complete)
   - Accessibility tests (keyboard navigation, screen reader)

**Files Likely Affected:**

- New: `src/components/analytics/GapAnalysis.tsx`
- New: `src/components/analytics/MissingSkillItem.tsx`
- New: `src/components/analytics/NearMatchItem.tsx`
- New: `src/components/analytics/SuggestionsList.tsx`
- Update: `src/components/analytics/MatchScoreCard.tsx`
- Update: `src/store/resumeStore.ts` (add suggestion state)

**Verification:**

```bash
# Run tests
npm test -- src/components/analytics/tests/GapAnalysis.test.tsx --run

# Accessibility check
npm run test:a11y

# Manual testing
npm run dev
# Enter JD with specific skills, verify gap analysis shows correct missing skills
```

---

## Plan 04: Side-by-Side Comparison & Integration

**Goal:** Integrate match scoring into existing workflow with comparison view.

**Requirements:** ANA-04

**Success Criteria:**

1. Side-by-side view: Resume bullets vs JD requirements
2. Highlight matched requirements in green
3. Highlight missing requirements in red
4. Navigation from comparison to editor
5. All tests passing, TypeScript compilation clean

**What's Involved:**

1. **Create ComparisonView Component**
   - Two-column layout: JD Requirements (left) vs Resume Coverage (right)
   - Matched items: green highlight with checkmark
   - Missing items: red highlight with warning icon
   - Scroll sync between columns

2. **Create RequirementItem Component**
   - Individual JD requirement
   - Match status indicator
   - Match score for that requirement
   - Click to expand details

3. **Create ResumeCoverageItem Component**
   - Matching resume bullet point(s)
   - Semantic similarity score
   - Option to edit bullet point

4. **Integrate with Editor**
   - Add "Compare to JD" tab or button in Editor
   - Show comparison view alongside resume editing
   - Allow quick navigation between comparison and editor

5. **Wire Up Navigation**
   - From JobDescriptionInput: "Calculate Match" → MatchScoreCard → ComparisonView
   - From Editor: "Compare to JD" → ComparisonView
   - Persist JD in store for comparison

6. **Final Integration Testing**
   - End-to-end flow: Enter JD → Calculate Match → View Score → View Gaps → View Comparison
   - Error handling: API failures, empty JD, empty resume
   - Performance: Score calculation < 500ms, UI responsive

7. **Documentation**
   - Update API_DOCUMENTATION.md with `/api/v1/match` endpoint
   - Add usage examples to components
   - Document skill ontology extension process

**Files Likely Affected:**

- New: `src/components/analytics/ComparisonView.tsx`
- New: `src/components/analytics/RequirementItem.tsx`
- New: `src/components/analytics/ResumeCoverageItem.tsx`
- Update: `src/pages/Editor.tsx` (add comparison tab)
- Update: `src/components/JobDescriptionInput.tsx` (add match button)
- Update: `resume-api/routes/match.py` (add comparison endpoint if needed)

**Verification:**

```bash
# Run all tests
npm test -- --run
pytest resume-api/tests/test_job_matcher.py -v

# Type check
npx tsc --noEmit

# Lint
npm run lint

# E2E test (if applicable)
npx playwright test

# Manual E2E flow
npm run dev
# 1. Navigate to Editor
# 2. Enter/paste job description
# 3. Click "Calculate Match"
# 4. Verify score displays correctly
# 5. Verify gap analysis shows missing skills
# 6. Click "Compare to JD" tab
# 7. Verify side-by-side comparison renders
# 8. Click "Add to Resume" on a missing skill
# 9. Verify editor opens with skill pre-filled
```

---

## Dependencies Matrix

| Plan | Depends On | Blocks |
|------|------------|--------|
| 01 | None | 02, 03, 04 |
| 02 | 01 (API must exist) | 04 |
| 03 | 01 (API must exist) | 04 |
| 04 | 01, 02, 03 | None |

**Execution Order:** 01 → (02 + 03 in parallel) → 04

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SBERT model download fails | High | Low | Mirror download, manual install |
| Latency > 500ms | Medium | Medium | Model optimization, caching, GPU |
| Skill ontology incomplete | Medium | High | Start with 100 skills, expand iteratively |
| False positives in gap analysis | Medium | Medium | User feedback loop, threshold tuning |
| API rate limiting (if using external) | High | Low | Self-hosted model, no external API |

---

## Success Metrics

**Phase 9 is successful when:**

1. Match score calculates in < 500ms (p95 latency)
2. 90%+ test coverage on backend and frontend
3. Users can calculate match for any JD in one click
4. Gap analysis identifies at least 3 actionable improvements
5. Comparison view shows clear mapping between JD and resume

---

_Planning completed: 2026-03-12_
_Ready for execution_
