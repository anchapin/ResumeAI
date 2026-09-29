---
phase: 10-ats-compatibility-check
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - resume-api/lib/ats/analyzer.py
  - resume-api/api/ats_routes.py
  - resume-api/main.py
  - src/hooks/useATSCheck.ts
  - src/components/analytics/ATSCheckerCard.tsx
autonomous: true
requirements:
  - ANA-05
  - ANA-06
  - ANA-07
  - ANA-08

# Goal-backward verification (derived during planning, verified after execution)
must_haves:
  truths:
    - User can upload resume and receive ATS score within 5 seconds
    - All common ATS issues detected (images, tables, headers, special characters)
    - Fix recommendations are actionable and specific
    - Plain text preview accurately represents parsed content
  artifacts:
    - path: resume-api/lib/ats/analyzer.py
      provides: ATS analysis engine with scoring and issue detection
      min_lines: 200
    - path: resume-api/api/ats_routes.py
      provides: FastAPI endpoint for ATS checking
      exports: ["POST /ats/check"]
    - path: src/hooks/useATSCheck.ts
      provides: React hook for ATS checking integration
      exports: ["useATSCheck"]
  key_links:
    - from: src/components/analytics/ATSCheckerCard.tsx
      to: /api/ats/check
      via: useATSCheck hook
      pattern: fetch.*ats/check
    - from: resume-api/api/ats_routes.py
      to: resume-api/lib/ats/analyzer.py
      via: ATSAnalyzer class
      pattern: ATSAnalyzer\\.analyze
---

<objective>
Implement complete ATS Compatibility Check feature with backend analysis engine and frontend integration.

Purpose: Enable users to upload resumes and receive instant ATS compatibility analysis with actionable fixes.
Output: Backend ATS analyzer, API endpoint, React hook, and integrated UI components.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-ats-compatibility-check/CONTEXT.md

# Frontend components already exist:
@components/analytics/ATSScoreGauge.tsx
@components/analytics/ATSCheckerCard.tsx
@components/analytics/ATSIssuesList.tsx
@components/analytics/ATSPreview.tsx

# Existing patterns:
@resume-api/api/routes.py
@resume-api/lib/scoring/models.py
</context>

<tasks>

<task type="auto">
  <name>Create ATS analyzer module</name>
  <files>resume-api/lib/ats/__init__.py, resume-api/lib/ats/analyzer.py, resume-api/lib/ats/models.py</files>
  <action>
Create the ATS analysis engine with the following structure:

1. Create `resume-api/lib/ats/` directory structure
2. Implement `models.py` with:
   - `ATSIssue` dataclass (type, element, description, page, fix)
   - `ATSCheckResult` dataclass (file_type, ats_score, is_parseable, word_count, issues, parsed_text, calculation_time_ms)

3. Implement `analyzer.py` with `ATSAnalyzer` class:
   - `analyze(file_content: bytes, filename: str) -> ATSCheckResult`
   - Score calculation: Start at 100, deduct for issues
   - Issue detection rules:
     - CRITICAL: Images detected, tables detected, text in header/footer
     - WARNING: Special characters, complex formatting, custom columns
     - INFO: Suggestions for improvement
   - Text extraction from PDF/DOCX using existing pypdf/python-docx
   - Performance: Target <5 seconds for full analysis
   - Use rule-based detection (no ML needed for v1)

4. Create `__init__.py` exporting `ATSAnalyzer`
  </action>
  <verify>
- Python syntax check: python3 -m py_compile resume-api/lib/ats/analyzer.py
- Import test: python3 -c "from lib.ats import ATSAnalyzer; print('OK')"
- Unit tests pass for issue detection
  </verify>
  <done>
- ATS analyzer module created with all required data models
- Analyzer can process PDF and DOCX files
- Scoring algorithm deducts points based on issue severity
- Issues include specific, actionable fix recommendations
  </done>
</task>

<task type="auto">
  <name>Create ATS API endpoint</name>
  <files>resume-api/api/ats_routes.py, resume-api/main.py</files>
  <action>
Create FastAPI endpoint for ATS checking:

1. Create `resume-api/api/ats_routes.py`:
   - Router: `ats_router = APIRouter(prefix="/ats", tags=["ATS"])`
   - Endpoint: `POST /ats/check`
   - Request model: Accept file upload (UploadFile)
   - Response model: ATSCheckResult
   - Validation: Check file type (PDF, DOCX, TXT)
   - Call ATSAnalyzer.analyze() with file content
   - Return JSON with score, issues, parsed text
   - Add timing measurement for performance tracking
   - Error handling for parsing failures

2. Update `resume-api/main.py`:
   - Import ats_router
   - Include router: `app.include_router(ats_router, prefix="/api")`

3. Add to existing routes.py import if needed for file validation
  </action>
  <verify>
- FastAPI starts without errors: cd resume-api && python3 -c "from api.ats_routes import ats_router; print('OK')"
- Endpoint responds to OPTIONS check
- File upload validation works
  </verify>
  <done>
- POST /api/ats/check endpoint available
- Accepts file uploads (PDF, DOCX, TXT)
- Returns ATSCheckResult with score, issues, and parsed text
- Performance tracked in response (calculation_time_ms)
- Proper error responses for invalid files
  </done>
</task>

<task type="auto">
  <name>Create frontend ATS hook</name>
  <files>src/hooks/useATSCheck.ts</files>
  <action>
Create React hook for ATS checking:

1. Create `src/hooks/useATSCheck.ts`:
   - Interface matching backend ATSCheckResult
   - State: result, isLoading, error
   - Function: checkResume(file: File) => Promise<void>
   - API call to POST /api/ats/check
   - FormData with file upload
   - Handle response and parse JSON
   - Error handling with user-friendly messages
   - Timeout handling (10 second max)

2. Consider integrating with existing resume data:
   - Can analyze from existing resume object
   - Can analyze uploaded file directly
  </action>
  <verify>
- TypeScript compiles: npx tsc --noEmit src/hooks/useATSCheck.ts
- Hook exports correctly
- API call structure matches backend endpoint
  </verify>
  <done>
- useATSCheck hook created with proper TypeScript types
- Returns result, isLoading, error states
- checkResume function uploads file and returns analysis
- Error handling for network failures and timeouts
  </done>
</task>

<task type="auto">
  <name>Integrate ATS into UI components</name>
  <files>src/components/analytics/ATSCheckerCard.tsx</files>
  <action>
Update existing ATS components for API integration:

1. Update `ATSCheckerCard.tsx`:
   - Import and use useATSCheck hook
   - Add file upload/drag-drop capability
   - Handle loading and error states from hook
   - Pass result to existing ATSScoreGauge, ATSIssuesList, ATSPreview
   - Add "Apply Fix" functionality (can trigger resume regeneration)

2. Consider integration points:
   - Add to resume editor as "Check ATS" button
   - Add to analytics dashboard
   - Make reusable for different contexts

3. Ensure accessibility:
   - Keyboard navigation for file upload
   - Screen reader announcements for results
   - Proper ARIA labels
  </action>
  <verify>
- npm run build succeeds
- Component renders without console errors
- File upload triggers API call
- Results display in existing components
  </verify>
  <done>
- ATSCheckerCard connected to backend API
- File upload works with drag-drop
- Results display correctly with score, issues, preview
- Loading and error states handled
- "Apply Fix" functionality available
  </done>
</task>

<task type="auto">
  <name>Verify end-to-end functionality</name>
  <files>All created/modified files</files>
  <action>
Test complete ATS checking flow:

1. Start backend server
2. Create test PDF with known ATS issues (tables, images)
3. Upload via UI or API
4. Verify:
   - Score calculated correctly (deductions applied)
   - Issues detected and categorized properly
   - Fix recommendations are specific
   - Parsed text extracted accurately
   - Performance <5 seconds

5. Test edge cases:
   - Empty file -> error
   - Unsupported format -> error
   - Very large file -> handled gracefully
   - Corrupted PDF -> error with message
  </verify>
  <verify>
- curl test: POST /api/ats/check with PDF returns valid JSON
- Full flow works: upload -> analyze -> display results
- Performance test passes: <5 seconds for typical resume
  </verify>
  <done>
- End-to-end ATS checking works
- All 4 requirements (ANA-05, ANA-06, ANA-07, ANA-08) satisfied
- Performance target met
- Error handling comprehensive
  </done>
</task>

</tasks>

<verification>
- [ ] Backend: python3 -m py_compile passes for all new .py files
- [ ] Backend: ATSAnalyzer can analyze sample PDF and return issues
- [ ] API: POST /api/ats/check accepts file and returns ATSCheckResult
- [ ] Frontend: npm run build succeeds
- [ ] Frontend: useATSCheck hook integrates with API
- [ ] Integration: Full flow works - upload -> analyze -> display
- [ ] Performance: Analysis completes in <5 seconds
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- ATS compatibility score (ANA-05) implemented with scoring algorithm
- Detection of ATS-unfriendly elements (ANA-06) covers all common issues
- Actionable fixes list (ANA-07) provides specific recommendations
- ATS preview (ANA-08) shows parsed text as ATS would see it
- User can upload resume and receive score within 5 seconds
</success_criteria>

<output>
After completion, create `.planning/phases/10-ats-compatibility-check/10-01-SUMMARY.md`
</output>
