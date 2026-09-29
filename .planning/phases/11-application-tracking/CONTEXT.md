# Context: Phase 11 - Application Tracking

**Phase:** 11  
**Goal:** Track job applications with status, notes, and reminders.

---

## Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| ANA-09 | Track applications with status (Applied, Interviewing, Rejected, Offered) | Not Started |
| ANA-10 | Add notes and attachments to each application | Not Started |
| ANA-11 | Follow-up reminders for pending applications | Not Started |
| ANA-12 | Application timeline view with key dates | Not Started |

---

## Success Criteria

1. User can create application with status (Applied, Interviewing, Rejected, Offered)
2. Notes and attachments persist correctly
3. Reminders trigger at correct times
4. Timeline displays all key dates

---

## Dependencies

- **Phase 09 (Job Match Scoring):** Complete ✅ - Provides job data structure
- **Phase 10 (ATS):** In Progress - Can work in parallel
- **Blocks:** Phase 12 (Analytics Insights) depends on this for application data

---

## Technical Context

### Existing Codebase

- **Backend:** FastAPI in `resume-api/`
- **Frontend:** React + TypeScript in `src/`
- **Storage:** Uses localStorage for MVP (no database yet)
- **State Management:** React state + localStorage

### Key Modules

- `resume-api/api/routes/` - API endpoints
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/pages/` - Page components (Dashboard, Workspace)

### Application Tracking Data Model

Need to create:
- Application status enum (Applied, Interviewing, Rejected, Offered)
- Application record (job info, status, notes, attachments, dates)
- Reminder system (timing, notifications)
- Timeline events (status changes, notes, etc.)

### Estimated Effort

3-4 plans (~12 hours)

---

## Discretion Areas

- Storage approach (localStorage vs database)
- Reminder notification mechanism (in-app, browser notifications, email)
- UI component structure for application list vs timeline view
- Integration with job data from Phase 09

---

## Technical Constraints

- Must persist data across sessions (localStorage for MVP)
- Should integrate with Phase 09 job description input
- Reminders need to work even when app is closed (browser notifications)
- Timeline should show chronological application history
