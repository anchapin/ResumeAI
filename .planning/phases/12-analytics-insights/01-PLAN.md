---
phase: 12-analytics-insights
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [ANA-13, ANA-14, ANA-15, ANA-16, ANA-17, ANA-18, ANA-19, ANA-20]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "Analytics data persists in SQLite database"
    - "Resume variants can be stored and retrieved"
    - "Application statistics can be tracked"
  artifacts:
    - path: "src/lib/db/analytics.ts"
      provides: "Analytics database schema and queries"
      contains: "analytics_skills|analytics_keywords|analytics_timeline|analytics_applications|resume_variants|variant_metrics"
  key_links: []
---

<objective>
Create database models and migrations for analytics storage.

Purpose: Foundation for all analytics features - skills distribution, timeline, keywords, applications, and variants.
Output: SQLite tables and TypeScript models for analytics data.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-ats-resume-parsing/10-01-SUMMARY.md (if exists - provides resume parsing data)
@.planning/phases/11-application-tracking/11-01-SUMMARY.md (if exists - provides application data)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create analytics database schema</name>
  <files>src/lib/db/analytics.ts</files>
  <action>
    Create SQLite schema with tables:
    - analytics_skills: id, user_id, skill_name, category, frequency, created_at, updated_at
    - analytics_keywords: id, user_id, keyword, density, position, count, created_at
    - analytics_timeline: id, user_id, company, title, start_date, end_date, description, order_index
    - analytics_applications: id, user_id, job_id, variant_id, status, applied_at, response_at, source
    - resume_variants: id, user_id, name, description, content, is_default, created_at, updated_at
    - variant_metrics: id, variant_id, views, downloads, applications, response_rate, period_start, period_end
  </action>
  <verify>tsc --noEmit passes</verify>
  <done>All 6 tables defined with TypeScript interfaces</done>
</task>

<task type="auto">
  <name>Task 2: Create database migration utility</name>
  <files>src/lib/db/migrate-analytics.ts</files>
  <action>
    Create migration script to create all analytics tables if they don't exist.
    Use SQLite CREATE TABLE IF NOT EXISTS syntax.
  </action>
  <verify>tsc --noEmit passes</verify>
  <done>Migration script creates all tables successfully</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] Database schema compiles without errors
</verification>

<success_criteria>
- All 6 analytics tables defined
- TypeScript interfaces for all models
- Migration utility functional
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-01-SUMMARY.md`
</output>
---
phase: 12-analytics-insights
plan: 02
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [ANA-13, ANA-14, ANA-15, ANA-16, ANA-17, ANA-18, ANA-19, ANA-20]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "Analytics data accessible via REST API endpoints"
    - "Variant CRUD operations work"
    - "Statistics computed on-demand"
  artifacts:
    - path: "src/app/api/analytics/route.ts"
      provides: "Analytics API endpoints"
      contains: "GET|POST"
  key_links:
    - from: "src/app/api/analytics/route.ts"
      to: "src/lib/db/analytics.ts"
      via: "import and use database functions"
</context>

<objective>
Create analytics API endpoints for all features.

Purpose: Expose analytics data via REST API - skills, timeline, keywords, applications, variants.
Output: API routes for CRUD operations and statistics.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/12-analytics-insights/12-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create analytics API routes</name>
  <files>src/app/api/analytics/route.ts, src/app/api/analytics/skills/route.ts, src/app/api/analytics/timeline/route.ts, src/app/api/analytics/keywords/route.ts, src/app/api/analytics/applications/route.ts</files>
  <action>
    Create API routes:
    - GET /api/analytics - dashboard summary
    - GET /api/analytics/skills - skills distribution
    - GET/POST /api/analytics/timeline - experience timeline
    - GET /api/analytics/keywords - keyword density
    - GET /api/analytics/applications - application statistics
  </action>
  <verify>tsc --noEmit passes</verify>
  <done>All analytics endpoints respond correctly</done>
</task>

<task type="auto">
  <name>Task 2: Create variant API routes</name>
  <files>src/app/api/variants/route.ts, src/app/api/variants/[id]/route.ts</files>
  <action>
    Create variant CRUD endpoints:
    - GET /api/variants - list all variants
    - POST /api/variants - create variant
    - GET /api/variants/[id] - get single variant
    - PUT /api/variants/[id] - update variant
    - DELETE /api/variants/[id] - delete variant
  </action>
  <verify>tsc --noEmit passes</verify>
  <done>Variant CRUD operations work</done>
</task>

<task type="auto">
  <name>Task 3: Create metrics API routes</name>
  <files>src/app/api/variants/[id]/metrics/route.ts</files>
  <action>
    Create metrics endpoints:
    - GET /api/variants/[id]/metrics - get variant performance
    - POST /api/variants/[id]/metrics - record metric event
    - GET /api/variants/[id]/metrics/compare - compare variants
  </action>
  <verify>tsc --noEmit passes</verify>
  <done>Metrics tracking works</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] All API endpoints respond with valid JSON
</verification>

<success_criteria>
- Analytics endpoints functional
- Variant CRUD functional
- Metrics tracking functional
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-02-SUMMARY.md`
</output>
---
phase: 12-analytics-insights
plan: 03
type: execute
wave: 2
depends_on: ["12-01", "12-02"]
files_modified: []
autonomous: true
requirements: [ANA-13]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "User can see skills distribution as bar/pie chart"
    - "Chart renders with real data from API"
  artifacts:
    - path: "src/components/analytics/SkillsChart.tsx"
      provides: "Skills distribution visualization"
      contains: "Recharts"
  key_links:
    - from: "src/components/analytics/SkillsChart.tsx"
      to: "/api/analytics/skills"
      via: "fetch in useEffect"
</context>

<objective>
Build skills distribution visualization component.

Purpose: ANA-13 - Visualize skills from parsed resume data as interactive chart.
Output: SkillsChart component using Recharts.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/12-analytics-insights/12-01-SUMMARY.md
@.planning/phases/12-analytics-insights/12-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Recharts library</name>
  <files>package.json</files>
  <action>Install recharts: npm install recharts</action>
  <verify>npm list recharts</verify>
  <done>Recharts installed successfully</verify>
</task>

<task type="auto">
  <name>Task 2: Create SkillsChart component</name>
  <files>src/components/analytics/SkillsChart.tsx</files>
  <action>
    Create SkillsChart component:
    - Use BarChart and PieChart from Recharts
    - Support toggle between chart types
    - Group skills by category
    - Display frequency/proficiency level
    - Responsive design
  </action>
  <verify>npm run build succeeds</verify>
  <done>SkillsChart renders correctly</done>
</task>

<task type="auto">
  <name>Task 3: Create analytics dashboard page</name>
  <files>src/app/analytics/page.tsx</files>
  <action>
    Create analytics dashboard page that includes SkillsChart.
    Add summary stats cards for quick overview.
  </action>
  <verify>npm run build succeeds</verify>
  <done>Dashboard page loads without errors</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] SkillsChart renders with sample data
</verification>

<success_criteria>
- Skills distribution visualization works
- Chart is interactive and responsive
- Data loads from API
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-03-SUMMARY.md`
</output>
---
phase: 12-analytics-insights
plan: 04
type: execute
wave: 2
depends_on: ["12-01", "12-02"]
files_modified: []
autonomous: true
requirements: [ANA-14]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "User can see career timeline as horizontal timeline"
    - "Timeline shows company, title, dates"
  artifacts:
    - path: "src/components/analytics/ExperienceTimeline.tsx"
      provides: "Experience timeline visualization"
  key_links:
    - from: "src/components/analytics/ExperienceTimeline.tsx"
      to: "/api/analytics/timeline"
      via: "fetch in useEffect"
</context>

<objective>
Build experience timeline visualization component.

Purpose: ANA-14 - Display career progression as interactive horizontal timeline.
Output: ExperienceTimeline component.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/12-analytics-insights/12-01-SUMMARY.md
@.planning/phases/12-analytics-insights/12-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ExperienceTimeline component</name>
  <files>src/components/analytics/ExperienceTimeline.tsx</files>
  <action>
    Create ExperienceTimeline component:
    - Horizontal scrollable timeline
    - Show company, title, start/end dates
    - Display duration
    - Support add/edit experience entries
    - Responsive design for mobile
  </action>
  <verify>npm run build succeeds</verify>
  <done>ExperienceTimeline renders correctly</done>
</task>

<task type="auto">
  <name>Task 2: Add timeline to analytics dashboard</name>
  <files>src/app/analytics/page.tsx</files>
  <action>Integrate ExperienceTimeline into analytics dashboard page</action>
  <verify>npm run build succeeds</verify>
  <done>Timeline visible on dashboard</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] Timeline renders with data
</verification>

<success_criteria>
- Timeline displays career progression
- Can add/edit entries
- Responsive on mobile
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-04-SUMMARY.md`
</output>
---
phase: 12-analytics-insights
plan: 05
type: execute
wave: 2
depends_on: ["12-01", "12-02"]
files_modified: []
autonomous: true
requirements: [ANA-15, ANA-16]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "User can see keyword density analysis"
    - "User can view application statistics"
  artifacts:
    - path: "src/components/analytics/KeywordAnalysis.tsx"
      provides: "Keyword density visualization"
    - path: "src/components/analytics/ApplicationStats.tsx"
      provides: "Application statistics cards"
  key_links:
    - from: "src/components/analytics/KeywordAnalysis.tsx"
      to: "/api/analytics/keywords"
      via: "fetch in useEffect"
    - from: "src/components/analytics/ApplicationStats.tsx"
      to: "/api/analytics/applications"
      via: "fetch in useEffect"
</context>

<objective>
Build keyword density analysis and application statistics components.

Purpose: ANA-15 - Analyze keywords in resume; ANA-16 - Track application performance.
Output: KeywordAnalysis and ApplicationStats components.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/12-analytics-insights/12-01-SUMMARY.md
@.planning/phases/12-analytics-insights/12-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create KeywordAnalysis component</name>
  <files>src/components/analytics/KeywordAnalysis.tsx</files>
  <action>
    Create KeywordAnalysis component:
    - Bar chart showing keyword frequency
    - Highlight high-value keywords (job description matches)
    - Show density percentage
    - Support filtering by job posting
  </action>
  <verify>npm run build succeeds</verify>
  <done>KeywordAnalysis renders correctly</done>
</task>

<task type="auto">
  <name>Task 2: Create ApplicationStats component</name>
  <files>src/components/analytics/ApplicationStats.tsx</files>
  <action>
    Create ApplicationStats component:
    - Stats cards: total applications, response rate, interview rate
    - Time-series chart showing applications over time
    - Status breakdown (applied, viewed, interviewed, rejected, accepted)
  </action>
  <verify>npm run build succeeds</verify>
  <done>ApplicationStats renders correctly</done>
</task>

<task type="auto">
  <name>Task 3: Add to analytics dashboard</name>
  <files>src/app/analytics/page.tsx</files>
  <action>Integrate KeywordAnalysis and ApplicationStats into analytics dashboard</action>
  <verify>npm run build succeeds</verify>
  <done>All components visible on dashboard</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] Both components render with data
</verification>

<success_criteria>
- Keyword density shows relevant terms
- Application stats are accurate
- Dashboard is complete
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-05-SUMMARY.md`
</output>
---
phase: 12-analytics-insights
plan: 06
type: execute
wave: 3
depends_on: ["12-01", "12-02", "12-03", "12-04", "12-05"]
files_modified: []
autonomous: true
requirements: [ANA-17, ANA-18, ANA-19, ANA-20]
user_setup: []

# Goal-backward verification (derived during plan time, verified after execution)
must_haves:
  truths:
    - "User can create multiple resume variants"
    - "User can track which variant gets more responses"
    - "User can compare variants side-by-side"
    - "A/B testing shows statistical insights"
  artifacts:
    - path: "src/components/analytics/VariantComparison.tsx"
      provides: "Side-by-side variant comparison"
    - path: "src/components/analytics/ABTestingInsights.tsx"
      provides: "A/B testing statistical insights"
  key_links:
    - from: "src/components/analytics/VariantComparison.tsx"
      to: "/api/variants"
      via: "fetch variants and metrics"
    - from: "src/components/analytics/ABTestingInsights.tsx"
      to: "/api/variants/[id]/metrics/compare"
      via: "fetch comparison data"
</context>

<objective>
Build resume variants management and A/B testing features.

Purpose: ANA-17 to ANA-20 - Create variants, track performance, compare, and provide A/B testing insights.
Output: Variant management UI, comparison view, and statistical insights.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/12-analytics-insights/12-01-SUMMARY.md
@.planning/phases/12-analytics-insights/12-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create variant management UI</name>
  <files>src/components/analytics/VariantManager.tsx</files>
  <action>
    Create VariantManager component:
    - List all resume variants
    - Create new variant (clone from existing)
    - Edit variant content
    - Set default variant
    - Delete variant
  </action>
  <verify>npm run build succeeds</verify>
  <done>VariantManager CRUD works</done>
</task>

<task type="auto">
  <name>Task 2: Create variant comparison view</name>
  <files>src/components/analytics/VariantComparison.tsx</files>
  <action>
    Create VariantComparison component:
    - Side-by-side view of two variants
    - Highlight differences
    - Show performance metrics for each
  </action>
  <verify>npm run build succeeds</verify>
  <done>VariantComparison displays correctly</done>
</task>

<task type="auto">
  <name>Task 3: Create A/B testing insights component</name>
  <files>src/components/analytics/ABTestingInsights.tsx</files>
  <action>
    Create ABTestingInsights component:
    - Statistical significance calculator
    - Response rate comparison
    - Winner declaration with confidence interval
    - Recommendations for optimization
  </action>
  <verify>npm run build succeeds</verify>
  <done>ABTestingInsights shows statistical insights</done>
</task>

<task type="auto">
<name>Task 4: Add variants page to analytics</name>
<files>src/app/analytics/variants/page.tsx</files>
<action>Create dedicated variants page combining all variant management features</action>
<verify>npm run build succeeds</verify>
<done>Variants page is functional</done>
</task>

</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] All variant features work end-to-end
</verification>

<success_criteria>
- User can create and manage variants
- Comparison view shows differences
- A/B testing provides statistical insights
- Phase complete - all 8 requirements addressed
</success_criteria>

<output>
After completion, create `.planning/phases/12-analytics-insights/12-06-SUMMARY.md`
</output>
