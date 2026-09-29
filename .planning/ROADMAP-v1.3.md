# Roadmap: ResumeAI - v1.3 Collaboration & Team Features

**Created:** 2026-03-13  
**Version:** 1.3

---

## Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 | Team Workspaces | COL-01, COL-02, COL-03 | Ready to Plan |
| 2 | Comments & Feedback | COL-04, COL-05, COL-06 | Pending |
| 3 | Version History | COL-07, COL-08, COL-09 | Pending |
| 4 | Real-time Collaboration | COL-10, COL-11, COL-12 | Pending |
| 5 | Team Templates | COL-13, COL-14, COL-15 | Pending |
| 6 | Activity & Notifications | COL-16, COL-17, COL-18 | Pending |

**Overall Progress:** 0/6 phases (0%)

---

## Milestone: v1.3 Collaboration & Team Features

**Goal:** Enable teams to collaborate on resumes, share feedback, and manage job applications together.

**Target Users:**
- Job seekers working with career coaches
- Mentors helping mentees with resumes
- Accountability partners in job search
- University career centers
- Bootcamp career services

---

## Phase 1: Team Workspaces

**Goal:** Users can create teams, invite members, and share resumes with permissions.

**Requirements:** COL-01, COL-02, COL-03

**Success Criteria:**
1. Create team with name and description
2. Invite members via email
3. Assign roles (owner, editor, viewer)
4. Share resume with team members
5. Permission-based access control

**Dependencies:** None (standalone feature)

**Estimated Effort:** 4-5 days backend, 3-4 days frontend

---

## Phase 2: Comments & Feedback

**Goal:** Users can add comments and feedback on resumes with threaded discussions.

**Requirements:** COL-04, COL-05, COL-06

**Success Criteria:**
1. Add comments to specific resume sections
2. Reply to comments (threaded)
3. @mention team members
4. Resolve/close comments
5. Comment count indicators

**Dependencies:** Phase 1 (team structure)

**Estimated Effort:** 3-4 days backend, 3-4 days frontend

---

## Phase 3: Version History

**Goal:** Track resume changes over time with ability to restore previous versions.

**Requirements:** COL-07, COL-08, COL-09

**Success Criteria:**
1. Automatic version snapshots on save
2. Version list with timestamps and authors
3. Diff view between versions
4. Restore previous version
5. Version naming/labeling

**Dependencies:** None (can work independently)

**Estimated Effort:** 3-4 days backend, 2-3 days frontend

---

## Phase 4: Real-time Collaboration

**Goal:** Multiple users can edit resume simultaneously with live sync.

**Requirements:** COL-10, COL-11, COL-12

**Success Criteria:**
1. Real-time cursor presence
2. Live text synchronization
3. Conflict detection and resolution
4. "Who's editing" indicators
5. Lock sections during editing

**Dependencies:** Phase 1 (team structure), existing WebSocket infra

**Estimated Effort:** 5-6 days backend, 4-5 days frontend

---

## Phase 5: Team Templates

**Goal:** Create and share resume templates within teams.

**Requirements:** COL-13, COL-14, COL-15

**Success Criteria:**
1. Create template from resume
2. Share template with team
3. Template categories and tags
4. Template preview and selection
5. Template versioning

**Dependencies:** Phase 1 (team structure)

**Estimated Effort:** 2-3 days backend, 3-4 days frontend

---

## Phase 6: Activity & Notifications

**Goal:** Stay updated on team activity with feed and notifications.

**Requirements:** COL-16, COL-17, COL-18

**Success Criteria:**
1. Activity feed showing team actions
2. Email notifications for comments/mentions
3. Notification preferences
4. Unread notification count
5. Mark as read functionality

**Dependencies:** Phase 2 (comments), existing email infra

**Estimated Effort:** 2-3 days backend, 2-3 days frontend

---

## Requirements Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COL-01 | Phase 1 | Ready to Plan |
| COL-02 | Phase 1 | Ready to Plan |
| COL-03 | Phase 1 | Ready to Plan |
| COL-04 | Phase 2 | Pending |
| COL-05 | Phase 2 | Pending |
| COL-06 | Phase 2 | Pending |
| COL-07 | Phase 3 | Pending |
| COL-08 | Phase 3 | Pending |
| COL-09 | Phase 3 | Pending |
| COL-10 | Phase 4 | Pending |
| COL-11 | Phase 4 | Pending |
| COL-12 | Phase 4 | Pending |
| COL-13 | Phase 5 | Pending |
| COL-14 | Phase 5 | Pending |
| COL-15 | Phase 5 | Pending |
| COL-16 | Phase 6 | Pending |
| COL-17 | Phase 6 | Pending |
| COL-18 | Phase 6 | Pending |

**Coverage:**
- v1.3 requirements: 18 total
- Mapped to phases: 18 ✅
- Unmapped: 0 ✅

---

## Execution Order

```
Phase 1 (Team Workspaces)
    ↓
Phase 2 (Comments) ←→ Phase 3 (Version History) [parallel]
    ↓
Phase 4 (Real-time Collaboration)
    ↓
Phase 5 (Team Templates)
    ↓
Phase 6 (Activity & Notifications)
```

---

_Last updated: 2026-03-13 - v1.3 milestone initialized, ready for Phase 1 planning_
