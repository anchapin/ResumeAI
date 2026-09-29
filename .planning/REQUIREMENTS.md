# Requirements: ResumeAI

**Status:** Active Development  
**Last Updated:** 2026-03-15

---

## Core Value

Enable users to create professional resumes quickly with AI-powered assistance, job description matching, and export to multiple formats.

---

## v1.1 Requirements (COMPLETE ✅)

### Error Recovery
- [x] **ERR-01**: User sees categorized error messages (Storage Full, Network Lost, Server Error)
- [x] **ERR-02**: User can retry failed operations via action buttons in error toasts
- [x] **ERR-03**: User can download backup when save fails due to storage issues
- [x] **ERR-04**: User sees "Manual Save" button only when auto-save fails

### Job Description Input
- [x] **JOB-01**: User can input job description via text paste or URL fetch, with validation and parsing

### AI Tailoring
- [x] **JOB-02**: AI tailors resume content to match job description with accept/reject changes

### Cover Letter
- [x] **JOB-03**: AI generates personalized cover letter with tone options and editable preview

### Export Formats
- [x] **JOB-04**: Export tailored resume as DOCX with proper formatting
- [x] **JOB-05**: Export tailored resume as TXT and Markdown (MD) formats
- [x] **JOB-06**: Import projects from GitHub account to enhance resume
- [x] **JOB-07**: Manual editing interface for tailored content with version history
- [x] **JOB-08**: Export as JSON (JSON Resume schema) for developer workflows
- [x] **JOB-09**: Export as HTML with responsive design and multiple templates

---

## v1.2 Requirements (IN PROGRESS)

### Analytics: Job Match Scoring
- [ ] **ANA-01**: AI-powered job match score (0-100%) comparing resume to job description
- [ ] **ANA-02**: Gap analysis showing missing skills and keywords from job description
- [ ] **ANA-03**: Actionable improvement suggestions to increase match score
- [ ] **ANA-04**: Side-by-side comparison view of resume vs JD requirements

### Analytics: ATS Compatibility
- [ ] **ANA-05**: ATS compatibility score based on formatting and content analysis
- [ ] **ANA-06**: Detection of ATS-unfriendly elements (images, tables, columns, icons)
- [ ] **ANA-07**: Actionable fixes list to improve ATS compatibility
- [ ] **ANA-08**: ATS preview showing how resume parses in applicant systems

### Application Tracking
- [ ] **ANA-09**: Track job applications with status (Applied, Interviewing, Rejected, Offered)
- [ ] **ANA-10**: Add notes and attachments to each application
- [ ] **ANA-11**: Follow-up reminders for pending applications
- [ ] **ANA-12**: Application timeline view with key dates

### Analytics: Insights
- [ ] **ANA-13**: Skills distribution visualization (word cloud or chart)
- [ ] **ANA-14**: Experience timeline showing career progression
- [ ] **ANA-15**: Keyword density analysis for resume optimization
- [ ] **ANA-16**: Application statistics (total applied, response rate, interview rate)

### Resume Variants (A/B Testing)
- [ ] **ANA-17**: Create multiple resume variants (A/B/C) from base resume
- [ ] **ANA-18**: Track performance metrics per variant (interviews per application)
- [ ] **ANA-19**: Statistical significance calculator for variant comparison
- [ ] **ANA-20**: Auto-pause underperforming variants

### Analytics: Market Insights
- [ ] **ANA-21**: Compare resume strength against industry standards
- [ ] **ANA-22**: Salary range estimation based on skills and experience
- [ ] **ANA-23**: Skills gap analysis vs target role requirements
- [ ] **ANA-24**: Market demand insights for user's skill set

### Team Collaboration
- [ ] **COL-01**: Users can create teams with name and description
- [ ] **COL-02**: Team members can be invited via email with roles (owner, editor, viewer)
- [ ] **COL-03**: Resumes can be shared with team members based on permissions

---

## v1.3 Requirements (PLANNED)

### AI Enhancements
- [ ] **AI-01**: Advanced AI suggestions for resume content improvement
- [ ] **AI-02**: ATS keyword optimization recommendations
- [ ] **AI-03**: Resume readability analysis and scoring
- [ ] **AI-04**: Quantified achievement suggestions based on industry

### Job Board Integration
- [ ] **JBD-01**: Search and browse jobs from external job boards
- [ ] **JBD-02**: One-click apply with saved resume variants
- [ ] **JBD-03**: Job alert notifications for new matching positions

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Native app requires significant additional work |
| Cloud storage / account sync | User data stays local by default |
| Payment processing / subscriptions | Free tier focus first |
| Real-time collaboration | Not needed for individual workflow |
| Interview preparation | Content feature, not workflow |
| Resume hosting / public URLs | Future feature |

---

## Traceability Matrix

| Requirement | Phase | Status |
|------------|-------|--------|
| ERR-01 to ERR-04 | v1.0 | Complete |
| JOB-01 to JOB-09 | v1.1 | Complete |
| ANA-01 to ANA-04 | 09-Job Match Scoring | In Progress |
| ANA-05 to ANA-08 | 10-ATS Compatibility | Not Started |
| ANA-09 to ANA-12 | 11-Application Tracking | Not Started |
| ANA-13 to ANA-16 | 12-Analytics Insights | Not Started |
| ANA-17 to ANA-20 | 12-Resume Variants | Not Started |
| ANA-21 to ANA-24 | 12-Market Insights | Not Started |
| COL-01 to COL-03 | 13-Team Workspaces | In Progress |
| AI-01 to AI-04 | 14-AI Enhancements | In Progress |
| JBD-01 to JBD-03 | 15-Job Board Integration | In Progress |

---

## Requirement Categories

| Category | Prefix | Description |
|----------|--------|-------------|
| Error Recovery | ERR | Error handling and recovery |
| Job Input | JOB | Job description handling |
| Analytics | ANA | Data analysis and insights |
| Collaboration | COL | Team features |
| AI | AI | AI-powered features |
| Job Board | JBD | Job board integration |

---

_Requirements document - Initialize with GSD workflow_
