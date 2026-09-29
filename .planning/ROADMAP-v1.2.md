# Roadmap: ResumeAI - Analytics Dashboard

**Created:** 2026-03-12
**Version:** 1.2

## Summary

| Phase | Goal                          | Requirements              | Status    |
| ----- | ----------------------------- | ------------------------- | --------- |
| 1     | Job Match Scoring             | ANA-01, ANA-02, ANA-03, ANA-04 | **Planned** |
| 2     | ATS Compatibility Check       | ANA-05, ANA-06, ANA-07, ANA-08 | Pending   |
| 3     | Application Tracker           | ANA-09, ANA-10, ANA-11, ANA-12 | Pending   |
| 4     | Insights Dashboard            | ANA-13, ANA-14, ANA-15, ANA-16 | Pending   |
| 5     | A/B Testing                   | ANA-17, ANA-18, ANA-19, ANA-20 | Pending   |
| 6     | Industry Benchmarking         | ANA-21, ANA-22, ANA-23, ANA-24 | Pending   |

**Overall Progress:** Research complete, Phase 1 planned, ready for execution

---

## Milestone: v1.2 Analytics Dashboard

**Goal:** Provide data-driven insights to help users optimize their resume and track application performance.

**Target Features:**

- AI-powered job match scoring with gap analysis
- ATS compatibility checking with actionable fixes
- Application tracker with status management
- Visual insights dashboard (skills, timeline, keywords)
- A/B testing for resume variants
- Industry benchmarking and salary insights

---

## Phase 1: Job Match Scoring

**Goal:** Users can see how well their resume matches a job description with actionable improvement suggestions.

**Requirements:** ANA-01, ANA-02, ANA-03, ANA-04

**Success Criteria:**

1. Match score (0-100%) calculated using AI/embedding analysis
2. Gap analysis showing missing skills and keywords
3. Specific suggestions to improve match score
4. Side-by-side comparison UI

**Dependencies:** Phase 2 (JD input exists), Phase 3 (AI tailoring exists)

**Out of Scope:** Historical match score tracking

**Plans:** 4 plans (COMPLETE)

**Plan list:**

- [x] 09-01-PLAN.md — Match Score API Backend (5.5 hours)
- [x] 09-02-PLAN.md — Match Score UI Component (4 hours)
- [x] 09-03-PLAN.md — Gap Analysis UI (4 hours)
- [x] 09-04-PLAN.md — Side-by-Side Comparison & Integration (5 hours)

**Total Estimated Effort:** ~18.5 hours

---

## Phase 2: ATS Compatibility Check

**Goal:** Users can verify their resume is ATS-friendly and fix issues before applying.

**Requirements:** ANA-05, ANA-06, ANA-07, ANA-08

**Success Criteria:**

1. ATS compatibility score based on formatting analysis
2. Detection of problematic elements (images, tables, columns)
3. Actionable fix list with priority ordering
4. Preview showing parsed resume text

**Dependencies:** None (can analyze existing resume content)

**Out of Scope:** ATS-specific templates per company

---

## Phase 3: Application Tracker

**Goal:** Users can track all job applications in one place with status and follow-ups.

**Requirements:** ANA-09, ANA-10, ANA-11, ANA-12

**Success Criteria:**

1. Add applications with company, role, status, dates
2. Status workflow: Applied → Interviewing → Rejected/Offered
3. Notes and attachments per application
4. Follow-up reminders and timeline view

**Dependencies:** None (standalone feature)

**Out of Scope:** Job board auto-import, email integration

---

## Phase 4: Insights Dashboard

**Goal:** Visual dashboard showing skills distribution, experience timeline, and application stats.

**Requirements:** ANA-13, ANA-14, ANA-15, ANA-16

**Success Criteria:**

1. Skills visualization (word cloud or bar chart)
2. Interactive experience timeline
3. Keyword density heatmap
4. Application funnel metrics (applied → interviews → offers)

**Dependencies:** Phase 3 (application data)

**Out of Scope:** Exportable reports, shareable dashboards

---

## Phase 5: A/B Testing

**Goal:** Users can test multiple resume variants and track which performs better.

**Requirements:** ANA-17, ANA-18, ANA-19, ANA-20

**Success Criteria:**

1. Create variants from base resume (A/B/C)
2. Track applications per variant with outcomes
3. Statistical significance calculator
4. Auto-pause recommendations for underperformers

**Dependencies:** Phase 3 (application tracking)

**Out of Scope:** Multivariate testing, automated variant generation

---

## Phase 6: Industry Benchmarking

**Goal:** Users can compare their resume against industry standards and market data.

**Requirements:** ANA-21, ANA-22, ANA-23, ANA-24

**Success Criteria:**

1. Resume strength score vs industry percentile
2. Salary range estimation based on skills/experience
3. Skills gap analysis for target roles
4. Market demand trends for user's skill set

**Dependencies:** External API integration (salary data, job market)

**Out of Scope:** Real-time market data, geographic comparisons

---

## Requirements Traceability

| Requirement | Phase   | Status    |
| ----------- | ------- | --------- |
| ANA-01      | Phase 1 | Pending   |
| ANA-02      | Phase 1 | Pending   |
| ANA-03      | Phase 1 | Pending   |
| ANA-04      | Phase 1 | Pending   |
| ANA-05      | Phase 2 | Pending   |
| ANA-06      | Phase 2 | Pending   |
| ANA-07      | Phase 2 | Pending   |
| ANA-08      | Phase 2 | Pending   |
| ANA-09      | Phase 3 | Pending   |
| ANA-10      | Phase 3 | Pending   |
| ANA-11      | Phase 3 | Pending   |
| ANA-12      | Phase 3 | Pending   |
| ANA-13      | Phase 4 | Pending   |
| ANA-14      | Phase 4 | Pending   |
| ANA-15      | Phase 4 | Pending   |
| ANA-16      | Phase 4 | Pending   |
| ANA-17      | Phase 5 | Pending   |
| ANA-18      | Phase 5 | Pending   |
| ANA-19      | Phase 5 | Pending   |
| ANA-20      | Phase 5 | Pending   |
| ANA-21      | Phase 6 | Pending   |
| ANA-22      | Phase 6 | Pending   |
| ANA-23      | Phase 6 | Pending   |
| ANA-24      | Phase 6 | Pending   |

**Coverage:**

- v1.2 requirements: 24 total
- Mapped to phases: 24 ✅
- Unmapped: 0 ✅

---

_Last updated: 2026-03-12 - v1.2 milestone initialized, ready for research_
