# Context: Phase 12 - Analytics Insights

**Phase:** 12  
**Goal:** Provide rich analytics about user's resume and job search performance.

---

## Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| ANA-13 | Skills distribution visualization | Not Started |
| ANA-14 | Experience timeline | Not Started |
| ANA-15 | Keyword density analysis | Not Started |
| ANA-16 | Application statistics | Not Started |
| ANA-17 | Create resume variants | Not Started |
| ANA-18 | Track variant performance | Not Started |
| ANA-19 | Compare variants | Not Started |
| ANA-20 | A/B testing insights | Not Started |

---

## Success Criteria

1. Skills visualization renders correctly
2. Experience timeline shows career progression
3. Keyword analysis identifies important terms
4. Statistics are accurate and update in real-time
5. Variants can be created, tracked, and compared

---

## Dependencies

- **Phase 10 (ATS):** In Progress - Provides resume parsing data
- **Phase 11 (Application Tracking):** In Progress - Provides application data
- **Phase 13 (Team Workspaces):** Complete ✅
- **Blocks:** Phase 15 (Job Board Integration) depends on this for analytics

---

## Locked Decisions

The following decisions have been confirmed by the user:

1. **Database for analytics storage** - Use database (not localStorage) for analytics data persistence
2. **Include A/B testing variants** - Resume variants (ANA-17 to ANA-20) will be implemented in this phase
3. **User flexibility** - All technical implementation details delegated to AI discretion

---

## Technical Recommendations (Claude's Discretion)

### Database Architecture
- **Approach:** Extend existing SQLite database (`resumeai.db`) with analytics tables
- **Rationale:** Maintains consistency with current MVP architecture, easy migration path to PostgreSQL later
- **Tables needed:**
  - `analytics_skills` - Skills frequency and distribution
  - `analytics_keywords` - Keyword density tracking
  - `analytics_timeline` - Experience timeline data
  - `analytics_applications` - Application statistics
  - `resume_variants` - Variant metadata and A/B test data
  - `variant_metrics` - Performance metrics per variant

### Visualization Library
- **Recommendation:** Recharts
- **Rationale:** 
  - Native React integration (matches project stack)
  - Lightweight (~15KB gzipped)
  - Excellent TypeScript support
  - Composable and customizable
  - Good default animations and accessibility

### Real-time Statistics
- **Approach:** Compute aggregations on-write with efficient queries
- **Implementation:** 
  - Materialized counts for common queries
  - Incremental updates when data changes
  - Dashboard caching with 30-second TTL

### UI/UX Approach
- **Dashboard layout:** Card-based metrics with drill-down
- **Components:**
  - SkillsChart (bar/pie chart)
  - ExperienceTimeline (horizontal timeline)
  - KeywordCloud or KeywordBar
  - StatsCards (applications, response rate, etc.)
  - VariantComparison (side-by-side view)
- **Pattern:** Follow existing component patterns in `src/components/`

---

## Technical Constraints

- Must integrate with Phase 10 ATS data for keyword analysis
- Must work with Phase 11 application tracking data
- Analytics should be performant (<200ms query time)
- Variants must be comparable with statistical significance
- Mobile-responsive visualizations

---

## Estimated Effort

5-6 plans (~20 hours)

**Plan breakdown suggestion:**
1. Database models and migrations
2. Analytics API endpoints
3. Skills visualization component
4. Experience timeline component
5. Keyword analysis component
6. Resume variants and A/B testing

---

## Discretion Areas

The following are left to AI implementation discretion:

- Specific chart types for each visualization
- Color schemes and styling
- Component library structure
- API endpoint design details
- Query optimization strategies
- Animation and interaction patterns

---

*Context gathered: 2026-03-16*
