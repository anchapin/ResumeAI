---
phase: 10-ats-compatibility-check
plan: 02
type: execute
wave: 2
depends_on: ["10-01"]
files_modified:
  - resume-api/lib/ats/optimizer.py
  - resume-api/lib/scoring/resume_scorer.py
  - src/components/analytics/ATSOptimizerCard.tsx
  - src/hooks/useResumeScore.ts
autonomous: true
requirements:
  - ANA-05
  - ANA-06
  - ANA-07
  - ANA-08

# Goal-backward verification (derived during planning, verified after execution)
must_haves:
  truths:
    - ATS score integrates with job match scoring for better recommendations
    - User can see how ATS issues affect job matching
    - Bulk ATS checking available for multiple resumes
    - Historical ATS score tracking over time
  artifacts:
    - path: resume-api/lib/ats/optimizer.py
      provides: ATS optimization suggestions integrated with match scoring
      min_lines: 100
    - path: src/components/analytics/ATSOptimizerCard.tsx
      provides: UI for ATS-score-aware job matching
      exports: ["ATSOptimizerCard"]
  key_links:
    - from: resume-api/lib/scoring/resume_scorer.py
      to: resume-api/lib/ats/optimizer.py
      via: ATSOptimizer class
      pattern: ATSOptimizer\\.get_ats_aware_score
---

<objective>
Enhance ATS features with match scoring integration and bulk operations.

Purpose: Provide users with ATS-aware job matching and bulk analysis capabilities.
Output: ATS optimizer module, bulk checking, and historical tracking.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-ats-compatibility-check/CONTEXT.md

# Reference prior plan:
@.planning/phases/10-ats-compatibility-check/01-PLAN.md

# Integration with Phase 09:
@resume-api/lib/scoring/resume_scorer.py
@resume-api/lib/scoring/models.py

# Existing hooks:
@src/hooks/useResumeScore.ts
</context>

<tasks>

<task type="auto">
  <name>Create ATS optimizer module</name>
  <files>resume-api/lib/ats/optimizer.py</files>
  <action>
Create ATS optimization module that integrates with match scoring:

1. Create `resume-api/lib/ats/optimizer.py`:
   - `ATSOptimizer` class
   - `get_ats_aware_score(job_description: str, resume_data: dict, ats_score: float) -> dict`
   - Adjust match score based on ATS compatibility:
     - If ATS score < 50, reduce match confidence
     - If ATS score < 20, flag as "unlikely to parse"
   - Generate optimization suggestions combining ATS and match insights
   
2. Update scoring to factor in ATS:
   - Integrate with existing `resume_scorer.py`
   - Add ATS factor to overall match calculation
   - Provide confidence adjustment based on ATS

3. Create recommendations that address both ATS and match issues
  </action>
  <verify>
- Python syntax check passes
- Import works: from lib.ats import ATSOptimizer
- Integration with scoring module works
  </verify>
  <done>
- ATSOptimizer provides ATS-aware scoring
- Match recommendations include ATS fixes
- Confidence levels adjusted based on ATS compatibility
  </done>
</task>

<task type="auto">
  <name>Implement bulk ATS checking</name>
  <files>resume-api/api/ats_routes.py</files>
  <action>
Add bulk ATS checking endpoint:

1. Update `ats_routes.py`:
   - Add `POST /ats/check/bulk` endpoint
   - Accept list of files or resume IDs
   - Return array of ATSCheckResult
   - Process in parallel for performance
   - Add rate limiting for bulk operations

2. Create frontend bulk checking:
   - Add bulk option to useATSCheck hook
   - Handle multiple files
   - Show progress indicator
   - Aggregate results
  </action>
  <verify>
- Bulk endpoint accepts multiple files
- Returns array of results
- Frontend handles bulk display
  </verify>
  <done>
- Bulk ATS checking available
- Performance optimized for multiple resumes
- Results displayed in comparison view
  </done>
</task>

<task type="auto">
  <name>Add ATS score history tracking</name>
  <files>resume-api/lib/ats/tracker.py, resume-api/database.py</files>
  <action>
Implement ATS score history tracking:

1. Create `resume-api/lib/ats/tracker.py`:
   - `ATSHistoryEntry` model (resume_id, score, issues, created_at)
   - `save_ats_result(result: ATSCheckResult, resume_id: str)`
   - `get_ats_history(resume_id: str) -> list[ATSHistoryEntry]`
   - `get_ats_trend(resume_id: str) -> dict`

2. Add database table if needed:
   - Track ATS scores over time
   - Store issue patterns for analytics

3. Update API:
   - Add `GET /ats/history/{resume_id}` endpoint
   - Return historical scores and trends
  </action>
  <verify>
- Database stores ATS history
- API returns historical data
- Trend calculation works
  </verify>
  <done>
- ATS scores tracked over time
- Historical data available via API
- Trend visualization possible
  </done>
</task>

<task type="auto">
  <name>Create ATS optimizer UI component</name>
  <files>src/components/analytics/ATSOptimizerCard.tsx</files>
  <action>
Create UI component for ATS-aware matching:

1. Create `src/components/analytics/ATSOptimizerCard.tsx`:
   - Display ATS score alongside match score
   - Show how ATS affects match confidence
   - Provide combined recommendations
   - Integration with existing MatchScoreCard

2. Update existing components:
   - Enhance MatchScoreCard with ATS factor
   - Show optimization suggestions
  </action>
  <verify>
- npm run build succeeds
- Component renders correctly
- ATS and match scores displayed together
  </verify>
  <done>
- ATS optimizer UI available
- Combined ATS/match recommendations shown
- User understands ATS impact on matching
  </done>
</task>

</tasks>

<verification>
- [ ] ATSOptimizer integrates with match scoring
- [ ] Bulk checking handles multiple resumes
- [ ] History tracking stores and retrieves data
- [ ] UI components display combined insights
- [ ] Performance acceptable for bulk operations
</verification>

<success_criteria>
- All tasks completed
- ATS-aware job matching implemented
- Bulk checking available
- Historical tracking functional
- Enhanced UI provides combined insights
</success_criteria>

<output>
After completion, create `.planning/phases/10-ats-compatibility-check/10-02-SUMMARY.md`
</output>
