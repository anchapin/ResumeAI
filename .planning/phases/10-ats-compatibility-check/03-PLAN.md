---
phase: 10-ats-compatibility-check
plan: 03
type: execute
wave: 3
depends_on: ["10-01", "10-02"]
files_modified:
  - resume-api/tests/test_ats_analyzer.py
  - tests/integration/ats-integration.test.ts
  - resume-api/lib/ats/analyzer.py
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
    - Comprehensive test coverage for ATS analyzer
    - Integration tests verify end-to-end flow
    - Edge cases handled gracefully
    - Performance optimized and verified
  artifacts:
    - path: resume-api/tests/test_ats_analyzer.py
      provides: Unit tests for ATS analyzer
      min_lines: 100
    - path: tests/integration/ats-integration.test.ts
      provides: Integration tests for ATS API
      min_lines: 50
  key_links:
    - from: resume-api/tests/test_ats_analyzer.py
      to: resume-api/lib/ats/analyzer.py
      via: Test cases
---

<objective>
Comprehensive testing, edge case handling, and performance optimization for ATS features.

Purpose: Ensure ATS system is robust, tested, and production-ready.
Output: Test suite, bug fixes, performance improvements.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-ats-compatibility-check/CONTEXT.md

# Reference prior plans:
@.planning/phases/10-ats-compatibility-check/01-PLAN.md
@.planning/phases/10-ats-compatibility-check/02-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Create comprehensive unit tests</name>
  <files>resume-api/tests/test_ats_analyzer.py</files>
  <action>
Create thorough unit test suite:

1. Create `resume-api/tests/test_ats_analyzer.py`:
   - Test score calculation with various issue combinations
   - Test issue detection for each type:
     - Images (embedded, inline)
     - Tables (grid, nested)
     - Headers/footers
     - Special characters
     - Custom columns
   - Test text extraction from PDF
   - Test text extraction from DOCX
   - Test edge cases:
     - Empty file
     - Corrupted file
     - Very large file
     - Non-English characters
     - Multiple pages
   - Test performance timing

2. Run tests and fix any issues
  </action>
  <verify>
- All tests pass: pytest resume-api/tests/test_ats_analyzer.py
- Code coverage > 80%
- No regression in existing tests
  </verify>
  <done>
- Comprehensive test coverage achieved
- All edge cases handled
- Performance within targets
  </done>
</task>

<task type="auto">
  <name>Create integration tests</name>
  <files>tests/integration/ats-integration.test.ts</files>
  <action>
Create frontend integration tests:

1. Create `tests/integration/ats-integration.test.ts`:
   - Test file upload flow
   - Test API response parsing
   - Test loading states
   - Test error handling
   - Test component rendering with results

2. Run Playwright tests if available
  </action>
  <verify>
- Integration tests pass
- No console errors
- E2E tests pass if configured
  </verify>
  <done>
- Integration tests verify full flow
- Error cases handled properly
- UI behaves correctly
  </done>
</task>

<task type="auto">
  <name>Handle edge cases and polish</name>
  <files>resume-api/lib/ats/analyzer.py, src/components/analytics/ATSCheckerCard.tsx</files>
  <action>
Address edge cases and polish:

1. Backend edge cases:
   - Handle password-protected PDFs
   - Handle scanned images (OCR detection)
   - Handle non-standard encodings
   - Handle very long text (truncation)
   - Better error messages

2. Frontend polish:
   - Loading skeleton improvements
   - Error message clarity
   - Accessibility improvements
   - Responsive design check

3. Performance optimization:
   - Cache parsed results
   - Optimize large file handling
   - Lazy loading for preview
  </action>
  <verify>
- Edge cases tested and working
- Performance meets <5 second target
- UI accessible and responsive
  </verify>
  <done>
- All edge cases handled gracefully
- Performance optimized
- UI polished and accessible
  </done>
</task>

<task type="auto">
  <name>Final verification and documentation</name>
  <files>All ATS-related files</files>
  <action>
Final verification and documentation:

1. Verify all requirements met:
   - ANA-05: ATS score working
   - ANA-06: Issue detection complete
   - ANA-07: Fixes actionable
   - ANA-08: Preview accurate

2. Check success criteria:
   - Upload and score < 5 seconds ✓
   - All common issues detected ✓
   - Recommendations specific ✓
   - Preview accurate ✓

3. Create brief documentation:
   - How to use ATS check
   - Understanding the score
   - Interpreting fixes
  </verify>
  <verify>
- All requirements satisfied
- All success criteria met
- Documentation complete
  </verify>
  <done>
- Phase 10 complete and verified
- All requirements satisfied
- Ready for user testing
  </done>
</task>

</tasks>

<verification>
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests pass
- [ ] Edge cases handled
- [ ] Performance <5 seconds verified
- [ ] All 4 requirements (ANA-05-ANA-08) satisfied
</verification>

<success_criteria>
- All tasks completed
- Comprehensive test coverage
- Edge cases handled
- Performance verified
- Phase ready for release
</success_criteria>

<output>
After completion, create `.planning/phases/10-ats-compatibility-check/10-PHASE-SUMMARY.md`
</output>
