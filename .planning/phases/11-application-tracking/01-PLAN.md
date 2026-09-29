---
phase: 11-application-tracking
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - resume-api/lib/tracking/__init__.py
  - resume-api/lib/tracking/models.py
  - resume-api/lib/tracking/storage.py
  - resume-api/api/tracking_routes.py
  - resume-api/main.py
autonomous: true
requirements:
  - ANA-09
  - ANA-10
  - ANA-11
  - ANA-12

# Goal-backward verification (derived during planning, verified after execution)
must_haves:
  truths:
    - User can create application with status (Applied, Interviewing, Rejected, Offered)
    - Notes and attachments persist correctly
    - Reminders trigger at correct times
    - Timeline displays all key dates
  artifacts:
    - path: resume-api/lib/tracking/models.py
      provides: Application tracking data models
      min_lines: 100
    - path: resume-api/lib/tracking/storage.py
      provides: LocalStorage persistence for applications
      min_lines: 80
    - path: resume-api/api/tracking_routes.py
      provides: FastAPI endpoints for CRUD operations
      exports: ["GET /applications", "POST /applications", "PUT /applications/{id}", "DELETE /applications/{id}"]
  key_links:
    - from: src/hooks/useApplicationTracking.ts
      to: /api/applications
      via: fetch calls
      pattern: fetch.*applications
    - from: resume-api/api/tracking_routes.py
      to: resume-api/lib/tracking/storage.py
      via: ApplicationStorage class
      pattern: ApplicationStorage\.
---

<objective>
Implement complete Application Tracking feature with backend storage and API, and frontend integration.

Purpose: Enable users to track job applications with status, notes, attachments, reminders, and timeline view.
Output: Backend storage layer, API endpoints, React hook, and integrated UI components.
</objective>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/11-application-tracking/CONTEXT.md

# Existing patterns from similar features:
@resume-api/api/routes.py
@src/hooks/useJobMatchScore.ts
@src/pages/Workspace.tsx

# Phase 10 reference (similar structure):
@.planning/phases/10-ats-compatibility-check/01-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Create tracking data models</name>
  <files>resume-api/lib/tracking/__init__.py, resume-api/lib/tracking/models.py, resume-api/lib/tracking/storage.py</files>
  <action>
Create the application tracking data models and storage:

1. Create `resume-api/lib/tracking/` directory structure
2. Implement `models.py` with:
   - `ApplicationStatus` enum (APPLIED, INTERVIEWING, REJECTED, OFFERED)
   - `Application` dataclass:
     - id: str (UUID)
     - job_title: str
     - company: str
     - job_url: Optional[str]
     - status: ApplicationStatus
     - applied_date: datetime
     - notes: List[ApplicationNote]
     - attachments: List[str] (file paths or base64)
     - reminders: List[Reminder]
     - timeline: List[TimelineEvent]
     - created_at: datetime
     - updated_at: datetime
   - `ApplicationNote` dataclass (id, content, created_at)
   - `Reminder` dataclass (id, message, remind_at, triggered)
   - `TimelineEvent` dataclass (id, event_type, description, timestamp)

3. Implement `storage.py` with `ApplicationStorage` class:
   - JSON file-based storage in user data directory
   - Methods: load(), save(), add_application(), update_application(), delete_application(), get_applications()
   - Auto-create storage file if not exists

4. Create `__init__.py` exporting models and storage
  </action>
  <verify>
- Python syntax check: python3 -m py_compile resume-api/lib/tracking/models.py
- Import test: python3 -c "from lib.tracking import Application, ApplicationStatus; print('OK')"
- Storage can save and load applications
  </verify>
  <done>
- All data models created with proper types
- Application CRUD operations work via storage
- Data persists across restarts
- Timeline events automatically created on status changes
  </done>
</task>

<task type="auto">
  <name>Create tracking API endpoints</name>
  <files>resume-api/api/tracking_routes.py, resume-api/main.py</files>
  <action>
Create FastAPI endpoints for application tracking:

1. Create `resume-api/api/tracking_routes.py`:
   - Router: `tracking_router = APIRouter(prefix="/applications", tags=["Applications"])`
   - Endpoints:
     - `GET /` - List all applications (with filters for status)
     - `POST /` - Create new application
     - `GET /{id}` - Get single application
     - `PUT /{id}` - Update application (including status, notes, reminders)
     - `DELETE /{id}` - Delete application
     - `POST /{id}/notes` - Add note to application
     - `POST /{id}/reminders` - Add reminder to application
     - `GET /timeline` - Get timeline view of all applications

2. Request/Response models using Pydantic:
   - `ApplicationCreate` - Create request
   - `ApplicationUpdate` - Update request
   - `ApplicationResponse` - Full response with timeline
   - `NoteCreate`, `ReminderCreate`

3. Update `resume-api/main.py`:
   - Import tracking_router
   - Include router: `app.include_router(tracking_router, prefix="/api")`

4. Add automatic timeline events:
   - Status change creates TimelineEvent
   - Note added creates TimelineEvent
   - Reminder triggered creates TimelineEvent
  </verify>
  <verify>
- FastAPI starts without errors: cd resume-api && python3 -c "from api.tracking_routes import tracking_router; print('OK')"
- All endpoints respond correctly
- CRUD operations work
  </verify>
  <done>
- GET /api/applications returns all applications
- POST /api/applications creates new application
- PUT /api/applications/{id} updates application
- DELETE /api/applications/{id} deletes application
- Notes and reminders can be added
- Timeline endpoint provides chronological view
  </done>
</task>

<task type="auto">
  <name>Create frontend tracking hook</name>
  <files>src/hooks/useApplicationTracking.ts</files>
  <action>
Create React hook for application tracking:

1. Create `src/hooks/useApplicationTracking.ts`:
   - Types matching backend models (Application, ApplicationStatus, Note, Reminder, TimelineEvent)
   - State: applications, currentApplication, isLoading, error
   - Functions:
     - loadApplications() - Fetch all applications
     - createApplication(data) - Create new application
     - updateApplication(id, data) - Update application
     - deleteApplication(id) - Delete application
     - addNote(applicationId, content) - Add note
     - addReminder(applicationId, message, remindAt) - Add reminder
     - getTimeline() - Get timeline view

2. API integration:
   - Use fetch to call backend endpoints
   - Handle response and errors
   - Update local state on changes

3. Consider:
   - Integration with existing resume data
   - Filter/sort capabilities
   - Optimistic updates for better UX
  </verify>
  <verify>
- TypeScript compiles: npx tsc --noEmit src/hooks/useApplicationTracking.ts
- Hook exports correctly
- API calls structure matches backend endpoints
  </verify>
  <done>
- useApplicationTracking hook created with proper TypeScript types
- Returns applications, isLoading, error states
- CRUD functions work via API
- Note and reminder functions available
- Timeline data accessible
  </done>
</task>

<task type="auto">
  <name>Integrate tracking into UI components</name>
  <files>src/components/tracking/ApplicationList.tsx, src/components/tracking/ApplicationCard.tsx, src/components/tracking/ApplicationTimeline.tsx</files>
  <action>
Update/create UI components for application tracking:

1. Create `ApplicationList.tsx`:
   - Display all applications in list/grid view
   - Filter by status (All, Applied, Interviewing, Rejected, Offered)
   - Sort by date (newest first)
   - Search by company/job title

2. Create `ApplicationCard.tsx`:
   - Show application details (job, company, status)
   - Status badge with color coding
   - Quick actions (update status, add note)
   - Link to full details

3. Create `ApplicationTimeline.tsx`:
   - Chronological view of all events
   - Filter by application or show all
   - Timeline visualization with icons
   - Date and description for each event

4. Integration:
   - Use useApplicationTracking hook
   - Connect to dashboard or create new tracking page
   - Add to navigation

5. Status workflow:
   - Update status: Applied -> Interviewing -> Offered OR Rejected
   - Visual indicators for each status
  </verify>
  <verify>
- npm run build succeeds
- Components render without console errors
- Data displays correctly from API
  </verify>
  <done>
- Application list displays all tracked applications
- Filter and sort work correctly
- Application cards show key info
- Timeline shows chronological events
- Status updates work via UI
  </done>
</task>

<task type="auto">
  <name>Implement reminder system</name>
  <files>resume-api/lib/tracking/reminders.py, src/hooks/useReminders.ts</files>
  <action>
Implement reminder functionality:

1. Backend `reminders.py`:
   - `ReminderService` class to check and trigger reminders
   - Method: `check_due_reminders()` - Returns list of due reminders
   - Method: `mark_reminder_triggered(reminder_id)`
   - Background task support for checking reminders

2. API endpoint:
   - `GET /reminders/due` - Get due reminders
   - `POST /reminders/{id}/trigger` - Mark as triggered

3. Frontend `useReminders.ts`:
   - Hook to fetch and display due reminders
   - Poll for new reminders (every 5 minutes)
   - Browser notification permission check
   - Show in-app notification for due reminders

4. Notification integration:
   - Request browser notification permission
   - Show browser notification when reminder due
   - In-app notification banner as fallback
  </verify>
  <verify>
- Reminders can be created with future dates
- Due reminders are detected correctly
- Notifications appear when reminder time reached
  </verify>
  <done>
- Reminders can be set for any application
- System detects when reminders are due
- User receives notification (browser or in-app)
- Reminders can be dismissed/completed
  </done>
</task>

<task type="auto">
  <name>Verify end-to-end functionality</name>
  <files>All created/modified files</files>
  <action>
Test complete application tracking flow:

1. Start backend server
2. Test via API and UI:
   - Create application with job details
   - Update status through workflow (Applied -> Interviewing -> Offered)
   - Add notes to application
   - Add attachment (test with small file)
   - Set reminder for future date
   - Verify timeline captures all events

3. Verify requirements:
   - ANA-09: Status tracking works (Applied, Interviewing, Rejected, Offered)
   - ANA-10: Notes and attachments persist
   - ANA-11: Reminders trigger at correct times
   - ANA-12: Timeline displays all key dates

4. Test edge cases:
   - Empty required fields -> validation error
   - Invalid status -> error
   - Delete application with reminders -> cascade delete
   - Timeline with many events -> paginated if needed

5. UI testing:
   - List view with filters
   - Card detail view
   - Timeline view
   - Reminder notifications
  </verify>
  <verify>
- curl test: CRUD operations work
- Full flow works: create -> update -> add note -> set reminder -> view timeline
- All 4 requirements (ANA-09, ANA-10, ANA-11, ANA-12) satisfied
  </verify>
  <done>
- End-to-end application tracking works
- All requirements satisfied
- Data persists correctly
- UI is functional and intuitive
  </done>
</task>

</tasks>

<verification>
- [ ] Backend: python3 -m py_compile passes for all new .py files
- [ ] Backend: Application models can be created and serialized
- [ ] API: All CRUD endpoints work correctly
- [ ] Frontend: npm run build succeeds
- [ ] Frontend: useApplicationTracking hook integrates with API
- [ ] Integration: Full flow works - create -> update -> add note -> timeline
- [ ] Reminders: Due reminders detected and notifications shown
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- ANA-09: Applications can be tracked with status (Applied, Interviewing, Rejected, Offered)
- ANA-10: Notes and attachments persist correctly
- ANA-11: Follow-up reminders trigger at correct times
- ANA-12: Application timeline displays all key dates
- User can create, update, delete applications
- Timeline provides chronological view of all application events
</success_criteria>

<output>
After completion, create `.planning/phases/11-application-tracking/11-01-SUMMARY.md`
