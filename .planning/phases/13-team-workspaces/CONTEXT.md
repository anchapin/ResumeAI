# Phase 13 Context: Team Workspaces

**Phase:** 13
**Name:** Team Workspaces
**Goal:** Users can create teams, invite members, and share resumes with permissions.

---

## Locked Decisions

1. **Database:** Extend existing SQLite database (same as current user data)
2. **Authentication:** Email-based invitation system (invite via email, accept via link)
3. **Sharing Model:** Individual-level permissions (per-member, not team-wide)
4. **Email Provider:** Reuse existing email infrastructure if available

---

## Claude's Discretion

1. **API Endpoint Structure:**
   - Exact REST endpoints design
   - Request/response formats
   - Pagination strategies

2. **Permission Hierarchy:**
   - Owner: Full control, can delete team, transfer ownership
   - Editor: Can invite members, edit resumes, manage sharing
   - Viewer: Read-only access to shared resumes

3. **UI Component Patterns:**
   - Component library selection (reuse existing UI patterns)
   - Dialog/modal designs for team creation and invites
   - Navigation structure for teams section

4. **Database Schema Details:**
   - Exact table structures and indexes
   - Foreign key relationships
   - Migration approach

5. **Security Implementation:**
   - Invitation token generation and expiration
   - Role validation logic
   - Access control middleware

---

## Technical Notes

- **Database Decision:** Using existing SQLite keeps the architecture simple for MVP. The existing `resume-api/database.py` will be extended with Team, TeamMember, and TeamInvitation models.

- **Email Auth:** The system will use email-based invitations where:
  - Owner invites user via email
  - System generates secure token
  - Invitee clicks link to accept/join
  - No separate email/password auth required (uses existing API key auth)

- **Individual Sharing:** Each team member has their own permission level:
  - Owner can share with specific members
  - Member A might have "edit" access while Member B has "view" access
  - Permissions stored per-member-per-resume

- **Dependencies:** This phase has no blocking dependencies - standalone feature

---

## Next Steps

Run `/gsd:plan-phase 13` to create executable plans based on this context.
