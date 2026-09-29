# Requirements: ResumeAI - Analytics Dashboard

**Created:** 2026-03-12
**Milestone:** v1.2 Analytics Dashboard
**Core Value:** Users gain insights into their job application performance and can optimize their resume based on data-driven feedback.

---

## v1.2 Requirements

### Core Features (Phase 1-3)

#### Job Match Scoring
- [ ] **ANA-01**: AI-powered job match score (0-100%) comparing resume to job description
- [ ] **ANA-02**: Gap analysis showing missing skills and keywords from job description
- [ ] **ANA-03**: Actionable improvement suggestions to increase match score
- [ ] **ANA-04**: Side-by-side comparison view of resume vs JD requirements

#### ATS Compatibility Check
- [ ] **ANA-05**: ATS compatibility score based on formatting and content analysis
- [ ] **ANA-06**: Detection of ATS-unfriendly elements (images, tables, columns, icons)
- [ ] **ANA-07**: Actionable fixes list to improve ATS compatibility
- [ ] **ANA-08**: ATS preview showing how resume parses in applicant systems

#### Application Tracker
- [ ] **ANA-09**: Track job applications with status (Applied, Interviewing, Rejected, Offered)
- [ ] **ANA-10**: Add notes and attachments to each application
- [ ] **ANA-11**: Follow-up reminders for pending applications
- [ ] **ANA-12**: Application timeline view with key dates

### Bonus Features (Phase 4-6)

#### Insights Dashboard
- [ ] **ANA-13**: Skills distribution visualization (word cloud or chart)
- [ ] **ANA-14**: Experience timeline showing career progression
- [ ] **ANA-15**: Keyword density analysis for resume optimization
- [ ] **ANA-16**: Application statistics (total applied, response rate, interview rate)

#### A/B Testing
- [ ] **ANA-17**: Create multiple resume variants (A/B/C) from base resume
- [ ] **ANA-18**: Track performance metrics per variant (interviews per application)
- [ ] **ANA-19**: Statistical significance calculator for variant comparison
- [ ] **ANA-20**: Auto-pause underperforming variants

#### Industry Benchmarking
- [ ] **ANA-21**: Compare resume strength against industry standards
- [ ] **ANA-22**: Salary range estimation based on skills and experience
- [ ] **ANA-23**: Skills gap analysis vs target role requirements
- [ ] **ANA-24**: Market demand insights for user's skill set

---

## Out of Scope for v1.2

| Feature                     | Reason                              |
| --------------------------- | ----------------------------------- |
| Real-time collaboration     | Not needed for individual users     |
| Interview preparation tools | Separate feature in backlog         |
| Job board integration       | API complexity, deferred to v1.3    |
| Social media analytics      | Out of scope for resume analytics   |
| Recruiter messaging         | Platform feature, not analytics     |
| Resume distribution network | Business model decision required    |

---

## Requirements Traceability Matrix

| Requirement | Phase | Status    |
| ----------- | ----- | --------- |
| ANA-01      | TBD   | Pending   |
| ANA-02      | TBD   | Pending   |
| ANA-03      | TBD   | Pending   |
| ANA-04      | TBD   | Pending   |
| ANA-05      | TBD   | Pending   |
| ANA-06      | TBD   | Pending   |
| ANA-07      | TBD   | Pending   |
| ANA-08      | TBD   | Pending   |
| ANA-09      | TBD   | Pending   |
| ANA-10      | TBD   | Pending   |
| ANA-11      | TBD   | Pending   |
| ANA-12      | TBD   | Pending   |
| ANA-13      | TBD   | Pending   |
| ANA-14      | TBD   | Pending   |
| ANA-15      | TBD   | Pending   |
| ANA-16      | TBD   | Pending   |
| ANA-17      | TBD   | Pending   |
| ANA-18      | TBD   | Pending   |
| ANA-19      | TBD   | Pending   |
| ANA-20      | TBD   | Pending   |
| ANA-21      | TBD   | Pending   |
| ANA-22      | TBD   | Pending   |
| ANA-23      | TBD   | Pending   |
| ANA-24      | TBD   | Pending   |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 0 (research pending)
- Unmapped: 24

---

## Research Questions

Before planning phases, research will answer:

1. **Job Match Scoring**: What algorithms work best for resume-JD matching? (TF-IDF, embeddings, hybrid?)
2. **ATS Compatibility**: What are the top ATS systems and their parsing limitations?
3. **Application Tracking**: What data model supports flexible application workflows?
4. **Data Visualization**: What charting libraries work best with Next.js for analytics dashboards?
5. **A/B Testing**: How to statistically validate resume variant performance with small sample sizes?
6. **Benchmarking**: What industry salary/skills data sources are available via API?

---

_Created: 2026-03-12 for v1.2 milestone planning_
