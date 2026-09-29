# Application Tracking Patterns Research Report

**Project:** ResumeAI v1.5 Job Board Integration
**Phase:** Phase 4 - Unified Application Tracking
**Date:** March 13, 2026
**Author:** Research Agent

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Status Workflow](#2-application-status-workflow)
3. [LinkedIn Sync](#3-linkedin-sync)
4. [Manual Entry Patterns](#4-manual-entry-patterns)
5. [Status Mapping Across Platforms](#5-status-mapping-across-platforms)
6. [Database Schema](#6-database-schema)
7. [Analytics & Insights](#7-analytics--insights)
8. [Privacy & Retention](#8-privacy--retention)
9. [Implementation Recommendations](#9-implementation-recommendations)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Executive Summary

### Recommended Approach

For ResumeAI v1.5 Phase 4, we recommend a **unified application tracking system** that combines:

1. **Direct LinkedIn Integration** (where API access is available)
2. **Manual Entry with Smart Defaults** (for applications outside the platform)
3. **Status Mapping Layer** (to normalize statuses across different job boards)
4. **Browser Extension** (future phase for auto-tracking)

### Key Findings

| Finding | Impact | Recommendation |
|---------|--------|----------------|
| **LinkedIn Apply Connect API** | High | Requires Enterprise Talent Solutions partnership - not available for standard integration |
| **No Public Easy Apply API** | High | Build independent tracking system with manual status updates |
| **Existing Application Tracker** | Low | Already implemented in codebase - extend with sync capabilities |
| **Status Inconsistency Across Boards** | Medium | Implement status mapping layer for unified view |
| **GDPR Compliance Required** | Medium | Implement data retention policies and deletion workflows |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Unified Application Tracking Architecture             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ LinkedIn     │  │ Job Boards   │  │ Manual       │                  │
│  │ (API/Sync)   │  │ (RSS/API)    │  │ Entry        │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                           │
│         └────────────────┬┴────────────────┘                           │
│                          │                                              │
│                   ┌──────▼──────┐                                      │
│                   │   Status    │                                      │
│                   │   Mapping   │                                      │
│                   │   Layer     │                                      │
│                   └──────┬──────┘                                      │
│                          │                                              │
│                   ┌──────▼──────┐                                      │
│                   │  Unified    │                                      │
│                   │  Dashboard  │                                      │
│                   └──────┬──────┘                                      │
│                          │                                              │
│         ┌────────────────┼────────────────┐                            │
│         │                │                │                            │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                    │
│  │  Analytics  │  │  Export     │  │  Privacy    │                    │
│  │  Engine     │  │  Services   │  │  Manager    │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Priority

| Phase | Component | Effort | Priority |
|-------|-----------|--------|----------|
| Phase 4.1 | Extend existing application tracker | 1 week | High |
| Phase 4.2 | Status mapping layer | 1 week | High |
| Phase 4.3 | LinkedIn sync (where available) | 2 weeks | Medium |
| Phase 4.4 | Analytics dashboard | 2 weeks | Medium |
| Phase 4.5 | Privacy & retention features | 1 week | High |

---

## 2. Application Status Workflow

### 2.1 Standard Status States

The application lifecycle follows a standard workflow with the following states:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Application Status Workflow                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐                                                            │
│  │  DRAFT  │ ──────────────────────────────────────────────────┐        │
│  └────┬────┘                                                   │        │
│       │                                                        │        │
│       ▼                                                        │        │
│  ┌─────────┐     ┌────────────┐     ┌──────────────┐          │        │
│  │ APPLIED │ ──▶ │ SCREENING  │ ──▶ │ INTERVIEWING │          │        │
│  └────┬────┘     └─────┬──────┘     └──────┬───────┘          │        │
│       │                │                   │                   │        │
│       │                │                   │                   │        │
│       │                ▼                   ▼                   │        │
│       │          ┌──────────┐        ┌──────────┐             │        │
│       │          │ REJECTED │        │  OFFER   │             │        │
│       │          └──────────┘        └────┬─────┘             │        │
│       │                                   │                   │        │
│       │                                   ▼                   │        │
│       │                            ┌───────────┐              │        │
│       └───────────────────────────▶│ WITHDRAWN │◀─────────────┘        │
│                                    └───────────┘                       │
│                                          ▲                             │
│                                          │                             │
│                                    ┌───────────┐                       │
│                                    │ ACCEPTED  │                       │
│                                    └───────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Status Definitions

| Status | Description | Trigger | Next Possible States |
|--------|-------------|---------|---------------------|
| `draft` | Application saved but not submitted | User creates draft | `applied`, `withdrawn` |
| `applied` | Application submitted to employer | Submission confirmed | `screening`, `rejected`, `withdrawn` |
| `screening` | Initial recruiter screening | Recruiter contact | `interviewing`, `rejected`, `withdrawn` |
| `interviewing` | Active interview process | Interview scheduled | `offer`, `rejected`, `withdrawn` |
| `offer` | Job offer received | Offer extended | `accepted`, `rejected`, `withdrawn` |
| `accepted` | Offer accepted | User accepts offer | (Terminal state) |
| `rejected` | Application rejected | Employer decision | (Terminal state) |
| `withdrawn` | Application withdrawn by user | User decision | (Terminal state) |

### 2.3 Status Transitions (State Machine)

```typescript
// /utils/application-workflow.ts

export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'screening'
  | 'interviewing'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

// Valid status transitions
export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['applied', 'withdrawn'],
  applied: ['screening', 'rejected', 'withdrawn'],
  screening: ['interviewing', 'rejected', 'withdrawn'],
  interviewing: ['offer', 'rejected', 'withdrawn'],
  offer: ['accepted', 'rejected', 'withdrawn'],
  accepted: [], // Terminal state
  rejected: [], // Terminal state
  withdrawn: [], // Terminal state
};

// Terminal states (cannot transition from these)
export const TERMINAL_STATES: ApplicationStatus[] = ['accepted', 'rejected', 'withdrawn'];

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get available next states for a given status.
 */
export function getNextStates(status: ApplicationStatus): ApplicationStatus[] {
  return VALID_TRANSITIONS[status] || [];
}
```

### 2.4 Existing Implementation

The current implementation in `/home/alex/Projects/ResumeAI/resume-api/routes/applications.py` already supports all standard statuses:

```python
VALID_STATUSES = [
    "draft",
    "applied",
    "screening",
    "interviewing",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
]
```

**Database Model** (`/home/alex/Projects/ResumeAI/resume-api/database.py`):

```python
class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Status & Timeline
    status = Column(
        String(50),
        nullable=False,
        default="applied",
        index=True
    )
    date_applied = Column(DateTime(timezone=True), nullable=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
```

---

## 3. LinkedIn Sync

### 3.1 LinkedIn API Capabilities

Based on our research in the LinkedIn API report (`01-linkedin-api-report.md`), here are the relevant capabilities:

| Feature | Availability | Access Level |
|---------|-------------|--------------|
| **Sign In with LinkedIn** | Available | Public (OAuth 2.0) |
| **Profile Import API** | Available | Public with scopes |
| **Job Posting API** | Limited | Partner Program |
| **Apply Connect** | Enterprise Only | Talent Solutions |
| **Application Status Sync** | Not Publicly Available | N/A |

### 3.2 Sync Architecture

Since LinkedIn does not provide a public API for application status sync, we recommend a **hybrid approach**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LinkedIn Sync Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Option A: Apply Connect                       │    │
│  │                    (Enterprise Partnership)                      │    │
│  │                                                                  │    │
│  │  ResumeAI ──▶ LinkedIn Apply Connect API ──▶ Employer ATS       │    │
│  │       │              │                              │            │    │
│  │       │              │◀───── Status Updates ────────│            │    │
│  │       │              │                              │            │    │
│  │       │◀── Webhook ──│                              │            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Option B: Manual Tracking (Recommended)             │    │
│  │                                                                  │    │
│  │  User applies via LinkedIn ──▶ User manually logs in ResumeAI   │    │
│  │       │                              │                           │    │
│  │       │                              │                           │    │
│  │       └──────────────────────────────┘                           │    │
│  │              Browser extension can auto-detect                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Sync Frequency Recommendations

| Sync Type | Frequency | Method |
|-----------|-----------|--------|
| Profile data | Every 24 hours | OAuth token refresh |
| Application status (if API available) | Every 6 hours | Polling |
| Application status (manual) | User-initiated | Manual entry |
| Job listings | Every 1-4 hours | RSS/API polling |

### 3.4 OAuth Integration Points

The existing LinkedIn OAuth implementation (`/home/alex/Projects/ResumeAI/resume-api/routes/linkedin.py`) can be extended:

```python
# Existing endpoints
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_ACCESS_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_EXPERIENCE_URL = "https://api.linkedin.com/v2/me/experience"
LINKEDIN_EDUCATION_URL = "https://api.linkedin.com/v2/me/education"

# Additional scopes needed for enhanced sync
ADDITIONAL_SCOPES = [
    "r_liteprofile",      # Basic profile
    "r_emailaddress",     # Email address
    "w_member_social",    # Post/share content
]
```

### 3.5 Token Management

```python
# /resume-api/lib/linkedin_sync.py

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx

class LinkedInSyncService:
    """Service for syncing data with LinkedIn."""

    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.base_url = "https://api.linkedin.com/v2"

    async def get_profile(self) -> Dict[str, Any]:
        """Fetch user profile from LinkedIn."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/me",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            return response.json()

    async def get_applications(self) -> list:
        """
        Fetch user's applications (if Apply Connect available).

        Note: This endpoint requires Enterprise partnership.
        For standard users, applications must be tracked manually.
        """
        # This would require Apply Connect partnership
        # Placeholder for future implementation
        pass

    def is_token_expired(self, token_expiry: datetime) -> bool:
        """Check if access token is expired."""
        return datetime.utcnow() >= token_expiry

    async def refresh_access_token(
        self,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": self.refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                }
            )
            return response.json()
```

---

## 4. Manual Entry Patterns

### 4.1 UI Patterns for Manual Entry

#### Quick Add Modal

```typescript
// /components/applications/QuickAddApplication.tsx

interface QuickAddApplicationProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationCreate) => Promise<void>;
}

export const QuickAddApplication: React.FC<QuickAddApplicationProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<ApplicationCreate>>({
    status: 'applied',
    date_applied: new Date().toISOString().split('T')[0],
    priority: 'medium',
    salary_currency: 'USD',
    salary_period: 'yearly',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Application">
      <form onSubmit={handleSubmit}>
        {/* Required Fields */}
        <FormField label="Company Name" required>
          <Input
            value={formData.company_name}
            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
            placeholder="e.g., Google"
          />
        </FormField>

        <FormField label="Job Title" required>
          <Input
            value={formData.job_title}
            onChange={(e) => setFormData({...formData, job_title: e.target.value})}
            placeholder="e.g., Software Engineer"
          />
        </FormField>

        {/* Optional Fields */}
        <FormField label="Job URL">
          <Input
            type="url"
            value={formData.job_url}
            onChange={(e) => setFormData({...formData, job_url: e.target.value})}
            placeholder="https://..."
          />
        </FormField>

        <FormField label="Location">
          <Input
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            placeholder="e.g., San Francisco, CA (Remote)"
          />
        </FormField>

        <FormField label="Status">
          <Select
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value as ApplicationStatus})}
            options={Object.entries(STATUS_CONFIG).map(([key, config]) => ({
              value: key,
              label: config.label,
            }))}
          />
        </FormField>

        <FormField label="Date Applied">
          <Input
            type="date"
            value={formData.date_applied}
            onChange={(e) => setFormData({...formData, date_applied: e.target.value})}
          />
        </FormField>

        {/* Source Attribution */}
        <FormField label="Where did you find this job?">
          <Select
            value={formData.source}
            onChange={(e) => setFormData({...formData, source: e.target.value})}
            options={[
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'indeed', label: 'Indeed' },
              { value: 'company_website', label: 'Company Website' },
              { value: 'referral', label: 'Employee Referral' },
              { value: 'glassdoor', label: 'Glassdoor' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </FormField>

        <FormField label="Priority">
          <Select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value as ApplicationPriority})}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Add any notes about this application..."
            rows={3}
          />
        </FormField>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Add Application</Button>
        </div>
      </form>
    </Modal>
  );
};
```

#### Kanban Board View

```typescript
// /components/applications/KanbanBoard.tsx

interface KanbanBoardProps {
  applications: JobApplication[];
  onStatusChange: (id: number, newStatus: ApplicationStatus) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onStatusChange,
}) => {
  const columns: { status: ApplicationStatus; title: string }[] = [
    { status: 'applied', title: 'Applied' },
    { status: 'screening', title: 'Screening' },
    { status: 'interviewing', title: 'Interviewing' },
    { status: 'offer', title: 'Offer' },
    { status: 'rejected', title: 'Rejected' },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto">
      {columns.map((column) => (
        <div key={column.status} className="flex-shrink-0 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">{column.title}</h3>
            <span className="text-sm text-gray-500">
              {applications.filter(app => app.status === column.status).length}
            </span>
          </div>

          <div className="space-y-2">
            {applications
              .filter(app => app.status === column.status)
              .map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onStatusChange={onStatusChange}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 4.2 Data Validation

```typescript
// /utils/application-validation.ts

interface ValidationError {
  field: string;
  message: string;
}

export function validateApplicationCreate(
  data: Partial<ApplicationCreate>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.company_name || data.company_name.trim().length === 0) {
    errors.push({ field: 'company_name', message: 'Company name is required' });
  }

  if (!data.job_title || data.job_title.trim().length === 0) {
    errors.push({ field: 'job_title', message: 'Job title is required' });
  }

  // URL validation
  if (data.job_url && !isValidUrl(data.job_url)) {
    errors.push({ field: 'job_url', message: 'Invalid URL format' });
  }

  // Date validation
  if (data.date_applied) {
    const appliedDate = new Date(data.date_applied);
    if (appliedDate > new Date()) {
      errors.push({
        field: 'date_applied',
        message: 'Application date cannot be in the future',
      });
    }
  }

  // Salary validation
  if (data.salary_min !== undefined && data.salary_max !== undefined) {
    if (data.salary_min > data.salary_max) {
      errors.push({
        field: 'salary_min',
        message: 'Minimum salary cannot exceed maximum salary',
      });
    }
  }

  // Status validation
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push({
      field: 'status',
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  return errors;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### 4.3 Smart Defaults

```typescript
// /utils/application-defaults.ts

export function getApplicationDefaults(): Partial<ApplicationCreate> {
  return {
    status: 'applied',
    date_applied: new Date().toISOString().split('T')[0],
    priority: 'medium',
    salary_currency: 'USD',
    salary_period: 'yearly',
    tags: [],
    contacts: [],
  };
}

/**
 * Infer source from job URL.
 */
export function inferSourceFromUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname.toLowerCase();

    if (domain.includes('linkedin.com')) return 'linkedin';
    if (domain.includes('indeed.com')) return 'indeed';
    if (domain.includes('glassdoor.com')) return 'glassdoor';
    if (domain.includes('wellfound.com') || domain.includes('angel.co')) return 'wellfound';
    if (domain.includes('lever.co')) return 'lever';
    if (domain.includes('greenhouse.io')) return 'greenhouse';
    if (domain.includes('workable.com')) return 'workable';

    return 'company_website';
  } catch {
    return null;
  }
}

/**
 * Suggest follow-up date based on status.
 */
export function suggestFollowUpDate(
  status: ApplicationStatus,
  appliedDate: string
): string | null {
  const date = new Date(appliedDate);

  switch (status) {
    case 'applied':
      // Follow up after 1 week if no response
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];

    case 'screening':
      // Follow up after 3 days
      date.setDate(date.getDate() + 3);
      return date.toISOString().split('T')[0];

    case 'interviewing':
      // Follow up after 2 days
      date.setDate(date.getDate() + 2);
      return date.toISOString().split('T')[0];

    default:
      return null;
  }
}
```

---

## 5. Status Mapping Across Platforms

### 5.1 Platform-Specific Statuses

Different job boards use different status terminologies:

| Platform | Statuses |
|----------|----------|
| **LinkedIn** | Saved, Applied, Interviewing, Offer, Not Selected |
| **Indeed** | Saved, Applied, Interviewing, Offer, Rejected |
| **Glassdoor** | Saved, Applied, Interviewing, Offer, Rejected |
| **Wellfound** | Interested, Applied, Interviewing, Offer, Passed |
| **Lever** | Lead, Applied, Interviewing, Offer, Hired, Rejected |
| **Greenhouse** | New, Applied, Interviewing, Offer, Hired, Rejected |
| **ResumeAI (Standard)** | Draft, Applied, Screening, Interviewing, Offer, Accepted, Rejected, Withdrawn |

### 5.2 Status Mapping Layer

```python
# /resume-api/lib/application/status_mapper.py

from typing import Dict, Optional, List
from enum import Enum

class PlatformSource(str, Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    WELLFOUND = "wellfound"
    LEVER = "lever"
    GREENHOUSE = "greenhouse"
    MANUAL = "manual"
    OTHER = "other"

# Standard ResumeAI statuses
STANDARD_STATUSES = [
    "draft",
    "applied",
    "screening",
    "interviewing",
    "offer",
    "accepted",
    "rejected",
    "withdrawn",
]

# Platform-specific status mappings
PLATFORM_STATUS_MAPPINGS: Dict[PlatformSource, Dict[str, str]] = {
    PlatformSource.LINKEDIN: {
        "saved": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "not_selected": "rejected",
    },
    PlatformSource.INDEED: {
        "saved": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "rejected": "rejected",
    },
    PlatformSource.GLASSDOOR: {
        "saved": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "rejected": "rejected",
    },
    PlatformSource.WELLFOUND: {
        "interested": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "passed": "rejected",
    },
    PlatformSource.LEVER: {
        "lead": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "hired": "accepted",
        "rejected": "rejected",
    },
    PlatformSource.GREENHOUSE: {
        "new": "draft",
        "applied": "applied",
        "interviewing": "interviewing",
        "offer": "offer",
        "hired": "accepted",
        "rejected": "rejected",
    },
}

class StatusMapper:
    """Maps platform-specific statuses to standard ResumeAI statuses."""

    @staticmethod
    def to_standard(platform_status: str, source: PlatformSource) -> str:
        """
        Convert platform-specific status to standard ResumeAI status.

        Args:
            platform_status: Status from the external platform
            source: Source platform identifier

        Returns:
            Standard ResumeAI status
        """
        mappings = PLATFORM_STATUS_MAPPINGS.get(source, {})
        return mappings.get(platform_status.lower(), "applied")

    @staticmethod
    def from_standard(
        standard_status: str,
        source: PlatformSource
    ) -> Optional[str]:
        """
        Find the equivalent platform-specific status.

        Args:
            standard_status: Standard ResumeAI status
            source: Target platform

        Returns:
            Platform-specific status or None if no mapping exists
        """
        mappings = PLATFORM_STATUS_MAPPINGS.get(source, {})

        # Reverse lookup
        for platform_status, standard in mappings.items():
            if standard == standard_status:
                return platform_status

        return None

    @staticmethod
    def get_all_platform_statuses(source: PlatformSource) -> List[str]:
        """Get all known statuses for a platform."""
        return list(PLATFORM_STATUS_MAPPINGS.get(source, {}).keys())
```

### 5.3 Unified View Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Unified Application View Architecture                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ LinkedIn     │  │ Indeed       │  │ Manual       │                  │
│  │ Status:      │  │ Status:      │  │ Status:      │                  │
│  │ "Applied"    │  │ "Interview"  │  │ "Applied"    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                           │
│         │  Map: "Applied" │  Map:           │  Already                 │
│         │  → "applied"    │  "Interview"    │  Standard                │
│         │                 │  → "interviewing"│                         │
│         │                 │                 │                           │
│         └────────────────┬┴────────────────┘                           │
│                          │                                              │
│                   ┌──────▼──────┐                                      │
│                   │   Unified   │                                      │
│                   │   Status    │                                      │
│                   │   "applied" │                                      │
│                   │ "interviewing"                                     │
│                   │   "applied" │                                      │
│                   └──────┬──────┘                                      │
│                          │                                              │
│                   ┌──────▼──────┐                                      │
│                   │  Dashboard  │                                      │
│                   │  (Standard  │                                      │
│                   │   Statuses) │                                      │
│                   └─────────────┘                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema

### 6.1 Current Schema Analysis

The existing schema in `/home/alex/Projects/ResumeAI/resume-api/database.py` is comprehensive:

```python
class JobApplication(Base):
    """Job application tracking model."""

    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Job Details
    company_name = Column(String(200), nullable=False, index=True)
    job_title = Column(String(200), nullable=False)
    job_url = Column(String(500), nullable=True)
    location = Column(String(200), nullable=True)

    # Status & Timeline
    status = Column(String(50), nullable=False, default="applied", index=True)
    date_applied = Column(DateTime(timezone=True), nullable=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Compensation
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String(10), default="USD")
    salary_period = Column(String(20), default="yearly")

    # Context
    source = Column(String(100), nullable=True)  # LinkedIn, Indeed, Referral, etc.
    application_method = Column(String(100), nullable=True)

    # Documents
    resume_version_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    cover_letter_id = Column(Integer, nullable=True)

    # Contacts
    contacts = Column(JSON, nullable=True, default=list)

    # Organization
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    priority = Column(String(20), default="medium")

    # Follow-up
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    last_contact_date = Column(DateTime(timezone=True), nullable=True)

    # Interviews
    interview_rounds = Column(JSON, nullable=True, default=list)

    # Metadata
    logo_url = Column(String(500), nullable=True)
    job_description = Column(Text, nullable=True)
    rejection_reason = Column(String(200), nullable=True)
    withdrawn_reason = Column(String(200), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="job_applications")
    resume_version = relationship("Resume")

    # Indexes
    __table_args__ = (
        Index("idx_applications_user_status", "user_id", "status"),
        Index("idx_applications_follow_up", "user_id", "follow_up_date"),
    )
```

### 6.2 Recommended Schema Extensions

For v1.5 Phase 4, we recommend adding the following fields:

```python
# /resume-api/database.py (extensions)

class JobApplication(Base):
    # ... existing fields ...

    # ============== NEW FIELDS FOR v1.5 ==============

    # External Sync Tracking
    external_id = Column(String(200), nullable=True, index=True)  # LinkedIn/Indeed job ID
    external_source = Column(String(50), nullable=True)  # Platform source
    external_status = Column(String(100), nullable=True)  # Original platform status
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String(20), default="manual")  # manual, synced, pending

    # Application Tracking
    application_id_hash = Column(String(64), nullable=True, index=True)  # For deduplication
    job_board_id = Column(String(100), nullable=True)  # Internal job board reference

    # Analytics
    days_in_status = Column(Integer, nullable=True, default=0)
    response_time_days = Column(Integer, nullable=True)  # Days from apply to first response

    # Privacy & Compliance
    data_retention_date = Column(DateTime(timezone=True), nullable=True)
    gdpr_exported = Column(Boolean, default=False)

    # Indexes for new fields
    __table_args__ = (
        # Existing indexes...
        Index("idx_applications_external", "external_source", "external_id"),
        Index("idx_applications_sync", "sync_status", "last_synced_at"),
        Index("idx_applications_dedup", "application_id_hash"),
    )
```

### 6.3 Complete Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Application Tracking Database Schema                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │      users      │         │     resumes     │                       │
│  ├─────────────────┤         ├─────────────────┤                       │
│  │ id (PK)         │         │ id (PK)         │                       │
│  │ email           │         │ user_id (FK)    │                       │
│  │ name            │         │ title           │                       │
│  │ ...             │         │ content (JSON)  │                       │
│  └────────┬────────┘         └────────┬────────┘                       │
│           │                           │                                 │
│           │ 1:N                       │ 1:N                             │
│           │                           │                                 │
│           ▼                           ▼                                 │
│  ┌─────────────────────────────────────────────────┐                   │
│  │              job_applications                    │                   │
│  ├─────────────────────────────────────────────────┤                   │
│  │ id (PK)                                         │                   │
│  │ user_id (FK) ───────────────────────────────────┤                   │
│  │ company_name                                    │                   │
│  │ job_title                                       │                   │
│  │ job_url                                         │                   │
│  │ status                                          │                   │
│  │ date_applied                                    │                   │
│  │ date_created                                    │                   │
│  │ date_updated                                    │                   │
│  │ salary_min, salary_max, salary_currency         │                   │
│  │ source, application_method                      │                   │
│  │ resume_version_id (FK) ─────────────────────────┤                   │
│  │ contacts (JSON)                                 │                   │
│  │ notes, tags (JSON), priority                    │                   │
│  │ follow_up_date, follow_up_notes                 │                   │
│  │ interview_rounds (JSON)                         │                   │
│  │ external_id, external_source, external_status   │                   │
│  │ last_synced_at, sync_status                     │                   │
│  │ application_id_hash, job_board_id               │                   │
│  │ days_in_status, response_time_days              │                   │
│  │ data_retention_date, gdpr_exported              │                   │
│  └─────────────────────────────────────────────────┘                   │
│                                                                          │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │  application_   │         │    job_         │                       │
│  │    statuses     │         │    boards       │                       │
│  ├─────────────────┤         ├─────────────────┤                       │
│  │ id (PK)         │         │ id (PK)         │                       │
│  │ application_id  │         │ name            │                       │
│  │ (FK)            │         │ api_endpoint    │                       │
│  │ from_status     │         │ status_mapping  │                       │
│  │ to_status       │         │ (JSON)          │                       │
│  │ changed_at      │         │ ...             │                       │
│  │ changed_by      │         └─────────────────┘                       │
│  └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Status History Table (New)

For audit trail and analytics:

```python
class ApplicationStatusHistory(Base):
    """Track status changes for analytics and audit."""

    __tablename__ = "application_status_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    from_status = Column(String(50), nullable=True)  # None for initial status
    to_status = Column(String(50), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    changed_by = Column(String(50), default="user")  # user, system, sync

    # Context
    reason = Column(String(200), nullable=True)
    metadata = Column(JSON, nullable=True)  # Additional context

    # Relationships
    application = relationship("JobApplication", backref="status_history")
    user = relationship("User")
```

---

## 7. Analytics & Insights

### 7.1 Key Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total Applications** | Count of all applications | `COUNT(*)` |
| **Active Applications** | Applications not in terminal state | `COUNT(*) WHERE status NOT IN ('accepted', 'rejected', 'withdrawn')` |
| **Interview Rate** | Percentage reaching interview stage | `COUNT(interviewing) / COUNT(applied)` |
| **Offer Rate** | Percentage receiving offers | `COUNT(offer) / COUNT(applied)` |
| **Acceptance Rate** | Percentage of offers accepted | `COUNT(accepted) / COUNT(offer)` |
| **Avg Response Time** | Days from apply to first response | `AVG(response_time_days)` |
| **Time in Stage** | Average days per status | `AVG(days_in_status)` per status |
| **Source Effectiveness** | Applications per source | `COUNT(*) GROUP BY source` |

### 7.2 Funnel Analysis

```typescript
// /components/insights/ApplicationFunnelChart.tsx (existing)

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

interface FunnelResponse {
  stages: FunnelStage[];
  total_applications: number;
}

// Example data structure
const exampleFunnelData: FunnelResponse = {
  stages: [
    { stage: 'Applied', count: 100, percentage: 100, conversion_rate: 100 },
    { stage: 'Screening', count: 45, percentage: 45, conversion_rate: 45 },
    { stage: 'Interviewing', count: 25, percentage: 25, conversion_rate: 55.6 },
    { stage: 'Offer', count: 8, percentage: 8, conversion_rate: 32 },
    { stage: 'Accepted', count: 5, percentage: 5, conversion_rate: 62.5 },
  ],
  total_applications: 100,
};
```

### 7.3 Trends Chart

```typescript
// /components/insights/ApplicationTrendsChart.tsx (existing)

interface TrendDataPoint {
  date: string;
  applied: number;
  interviewing: number;
  offers: number;
  rejected: number;
}

interface TrendsResponse {
  data: TrendDataPoint[];
  period: 'week' | 'month' | 'quarter';
}
```

### 7.4 Analytics API Endpoints

```python
# /resume-api/routes/application_analytics.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, cast, Date
from datetime import datetime, timedelta
from typing import List, Dict, Any

from database import get_async_session, JobApplication, ApplicationStatusHistory
from config.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/applications/analytics", tags=["Application Analytics"])


@router.get("/funnel")
async def get_application_funnel(
    days: int = Query(90, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Get application funnel analysis.

    Shows conversion rates between status stages.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Count applications at each stage
    status_counts = {}
    for status in ["applied", "screening", "interviewing", "offer", "accepted"]:
        result = await db.execute(
            select(func.count()).where(
                JobApplication.user_id == current_user["id"],
                JobApplication.status == status,
                JobApplication.date_created >= cutoff_date,
            )
        )
        status_counts[status] = result.scalar() or 0

    total = status_counts.get("applied", 0) or 1  # Avoid division by zero

    stages = []
    stage_order = ["applied", "screening", "interviewing", "offer", "accepted"]

    for i, status in enumerate(stage_order):
        count = status_counts.get(status, 0)
        percentage = round((count / total) * 100, 1) if total > 0 else 0

        # Calculate conversion from previous stage
        if i > 0:
            prev_count = status_counts.get(stage_order[i-1], 0)
            conversion = round((count / prev_count) * 100, 1) if prev_count > 0 else 0
        else:
            conversion = 100.0

        stages.append({
            "stage": status.capitalize(),
            "count": count,
            "percentage": percentage,
            "conversion_rate": conversion,
        })

    return {
        "stages": stages,
        "total_applications": total,
        "period_days": days,
    }


@router.get("/timeline")
async def get_application_timeline(
    period: str = Query("month", regex="^(week|month|quarter)$"),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Get application trends over time.
    """
    # Determine date range
    now = datetime.utcnow()
    if period == "week":
        start_date = now - timedelta(weeks=4)
        date_trunc = extract("week", JobApplication.date_created)
    elif period == "month":
        start_date = now - timedelta(days=90)
        date_trunc = extract("month", JobApplication.date_created)
    else:  # quarter
        start_date = now - timedelta(days=365)
        date_trunc = extract("quarter", JobApplication.date_created)

    # Group by date and status
    query = select(
        cast(JobApplication.date_created, Date).label("date"),
        JobApplication.status,
        func.count().label("count"),
    ).where(
        JobApplication.user_id == current_user["id"],
        JobApplication.date_created >= start_date,
    ).group_by(
        cast(JobApplication.date_created, Date),
        JobApplication.status,
    ).order_by(
        cast(JobApplication.date_created, Date),
    )

    result = await db.execute(query)
    rows = result.fetchall()

    # Aggregate by date
    timeline: Dict[str, Dict[str, int]] = {}
    for row in rows:
        date_str = str(row.date)
        if date_str not in timeline:
            timeline[date_str] = {"applied": 0, "interviewing": 0, "offers": 0, "rejected": 0}

        status = row.status
        if status == "offer":
            timeline[date_str]["offers"] += row.count
        elif status in ["applied", "screening", "interviewing", "rejected"]:
            timeline[date_str][status] = timeline[date_str].get(status, 0) + row.count

    data = [
        {
            "date": date,
            "applied": counts["applied"],
            "interviewing": counts["interviewing"],
            "offers": counts["offers"],
            "rejected": counts["rejected"],
        }
        for date, counts in sorted(timeline.items())
    ]

    return {
        "data": data,
        "period": period,
    }


@router.get("/sources")
async def get_source_breakdown(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Get application breakdown by source.
    """
    query = select(
        JobApplication.source,
        func.count().label("count"),
        func.avg(
            cast(
                JobApplication.response_time_days,
                type_=type(float),
            )
        ).label("avg_response_time"),
    ).where(
        JobApplication.user_id == current_user["id"],
    ).group_by(
        JobApplication.source,
    ).order_by(
        func.count().desc(),
    )

    result = await db.execute(query)
    rows = result.fetchall()

    total = sum(row.count for row in rows) or 1

    sources = [
        {
            "source": row.source or "Unknown",
            "count": row.count,
            "percentage": round((row.count / total) * 100, 1),
            "avg_response_time": round(row.avg_response_time, 1) if row.avg_response_time else None,
        }
        for row in rows
    ]

    return {"sources": sources}


@router.get("/status-history/{application_id}")
async def get_status_history(
    application_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Get status change history for an application.
    """
    query = select(ApplicationStatusHistory).where(
        ApplicationStatusHistory.application_id == application_id,
        ApplicationStatusHistory.user_id == current_user["id"],
    ).order_by(
        ApplicationStatusHistory.changed_at.desc(),
    )

    result = await db.execute(query)
    history = result.scalars().all()

    return {
        "history": [
            {
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_at": h.changed_at.isoformat(),
                "changed_by": h.changed_by,
                "reason": h.reason,
            }
            for h in history
        ],
    }
```

### 7.5 Dashboard Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Application Analytics Dashboard                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Summary Cards                                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Total    │ │ Active   │ │          │ │ Avg      │           │   │
│  │  │ 156      │ │ 23       │ │ 32%      │ │ 5.2 days │           │   │
│  │  │ Applied  │ │ Pipeline │ │ Interview│ │ Response │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐       │
│  │  Application Funnel         │ │  Applications Over Time     │       │
│  │  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │       │
│  │  │ Applied    ████████   │  │ │  │    ╱╲    ╱╲           │  │       │
│  │  │ Screening  ████       │  │ │  │   ╱  ╲  ╱  ╲          │  │       │
│  │  │ Interview  ██         │  │ │  │  ╱    ╲╱    ╲         │  │       │
│  │  │ Offer      █          │  │ │  │ ╱             ╲       │  │       │
│  │  │ Accepted   █          │  │ │  └───────────────────────┘  │       │
│  │  └───────────────────────┘  │ │  Last 90 days               │       │
│  │  Conversion: 32% interview  │ │ └─────────────────────────────┘       │
│  └─────────────────────────────┘                                         │
│                                                                          │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐       │
│  │  Sources                    │ │  Time in Stage              │       │
│  │  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │       │
│  │  │ LinkedIn   45% ██████ │  │ │  │ Applied    7 days     │  │       │
│  │  │ Indeed     25% ███    │  │ │  │ Screening  3 days     │  │       │
│  │  │ Referral   15% ██     │  │ │  │ Interview  5 days     │  │       │
│  │  │ Direct     15% ██     │  │ │  │ Offer      2 days     │  │       │
│  │  └───────────────────────┘  │ │  └───────────────────────┘  │       │
│  └─────────────────────────────┘ └─────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Privacy & Retention

### 8.1 GDPR Compliance Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Right to Access** | Export all application data in machine-readable format |
| **Right to Rectification** | Allow users to edit/correct application data |
| **Right to Erasure** | Delete applications on user request |
| **Right to Portability** | Export data in JSON/CSV format |
| **Data Minimization** | Only collect necessary data |
| **Storage Limitation** | Auto-delete old applications after retention period |
| **Consent Management** | Track consent for data processing |

### 8.2 Data Retention Policy

```python
# /resume-api/config/data_retention.py

from datetime import timedelta
from enum import Enum

class RetentionPeriod(str, Enum):
    ACTIVE = "active"  # Keep while application is active
    ONE_YEAR = "1_year"  # Keep for 1 year
    TWO_YEARS = "2_years"  # Keep for 2 years
    THREE_YEARS = "3_years"  # Keep for 3 years
    INDEFINITE = "indefinite"  # Keep until user deletes

# Default retention settings
DEFAULT_RETENTION = {
    "active_applications": RetentionPeriod.ACTIVE,
    "completed_applications": RetentionPeriod.TWO_YEARS,
    "rejected_applications": RetentionPeriod.ONE_YEAR,
    "withdrawn_applications": RetentionPeriod.ONE_YEAR,
}

def get_retention_date(
    application_status: str,
    last_updated: datetime,
    user_preference: RetentionPeriod = None
) -> datetime:
    """
    Calculate data retention date based on status and policy.
    """
    if user_preference == RetentionPeriod.INDEFINITE:
        return None  # No automatic deletion

    period = user_preference or DEFAULT_RETENTION.get(
        application_status,
        RetentionPeriod.TWO_YEARS,
    )

    if period == RetentionPeriod.ACTIVE:
        # Keep while not in terminal state
        terminal_states = ["accepted", "rejected", "withdrawn"]
        if application_status not in terminal_states:
            return None  # Keep active applications indefinitely

        # For completed applications, use 2 years
        period = RetentionPeriod.TWO_YEARS

    retention_days = {
        RetentionPeriod.ONE_YEAR: 365,
        RetentionPeriod.TWO_YEARS: 730,
        RetentionPeriod.THREE_YEARS: 1095,
    }

    return last_updated + timedelta(days=retention_days[period])
```

### 8.3 Data Deletion Workflow

```python
# /resume-api/routes/data_privacy.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from database import get_async_session, JobApplication, User
from config.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/privacy", tags=["Data Privacy"])


@router.post("/export")
async def export_user_data(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Export all user data (GDPR right to portability).

    Returns a JSON file with all application data.
    """
    # Get all applications
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.user_id == current_user["id"]
        )
    )
    applications = result.scalars().all()

    # Get user profile
    user_result = await db.execute(
        select(User).where(User.id == current_user["id"])
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    # Build export data
    export_data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat(),
        },
        "applications": [
            {
                "id": app.id,
                "company_name": app.company_name,
                "job_title": app.job_title,
                "status": app.status,
                "date_applied": app.date_applied.isoformat() if app.date_applied else None,
                "source": app.source,
                "notes": app.notes,
                "salary": {
                    "min": app.salary_min,
                    "max": app.salary_max,
                    "currency": app.salary_currency,
                    "period": app.salary_period,
                },
                "date_created": app.date_created.isoformat(),
            }
            for app in applications
        ],
        "total_applications": len(applications),
    }

    # Mark as exported
    for app in applications:
        app.gdpr_exported = True

    await db.commit()

    return export_data


@router.delete("/applications/{application_id}")
async def delete_application_data(
    application_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a specific application (GDPR right to erasure).
    """
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user["id"],
        )
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(404, "Application not found")

    await db.delete(application)
    await db.commit()

    return {"deleted": True, "application_id": application_id}


@router.post("/cleanup/expired")
async def cleanup_expired_data(
    db: AsyncSession = Depends(get_async_session),
):
    """
    Background job to delete expired application data.

    Run periodically (e.g., daily) to enforce retention policy.
    """
    now = datetime.now(timezone.utc)

    # Find applications past retention date
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.data_retention_date != None,
            JobApplication.data_retention_date < now,
        )
    )
    expired_applications = result.scalars().all()

    deleted_count = 0
    for app in expired_applications:
        await db.delete(app)
        deleted_count += 1

    await db.commit()

    return {
        "deleted_count": deleted_count,
        "cleanup_timestamp": now.isoformat(),
    }
```

### 8.4 Privacy Settings UI

```typescript
// /components/settings/PrivacySettings.tsx

interface PrivacySettings {
  retention_period: '1_year' | '2_years' | '3_years' | 'indefinite';
  auto_delete_expired: boolean;
  export_reminder_enabled: boolean;
  share_anonymized_data: boolean;
}

export const PrivacySettings: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    retention_period: '2_years',
    auto_delete_expired: true,
    export_reminder_enabled: true,
    share_anonymized_data: false,
  });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-medium text-gray-900">Data Retention</h3>
        <p className="text-sm text-gray-500">
          Choose how long to keep your application data.
        </p>

        <div className="mt-4 space-y-3">
          <RadioGroup
            value={settings.retention_period}
            onChange={(value) => setSettings({...settings, retention_period: value})}
          >
            <Radio value="1_year" label="1 year" description="Automatically delete after 1 year" />
            <Radio value="2_years" label="2 years" description="Automatically delete after 2 years (recommended)" />
            <Radio value="3_years" label="3 years" description="Automatically delete after 3 years" />
            <Radio value="indefinite" label="Indefinitely" description="Keep until manually deleted" />
          </RadioGroup>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-gray-900">Data Export</h3>

        <div className="mt-4 space-y-4">
          <Toggle
            label="Export reminder"
            description="Receive a reminder to export your data annually"
            checked={settings.export_reminder_enabled}
            onChange={(checked) => setSettings({...settings, export_reminder_enabled: checked})}
          />

          <Button onClick={handleExport}>
            Export My Data (JSON)
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-gray-900 text-red-600">Danger Zone</h3>

        <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-700">
            Once you delete your data, there is no going back. Please be certain.
          </p>

          <Button
            variant="danger"
            onClick={handleDeleteAllData}
            className="mt-3"
          >
            Delete All Application Data
          </Button>
        </div>
      </section>
    </div>
  );
};
```

---

## 9. Implementation Recommendations

### 9.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Application Tracking Implementation                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRONTEND LAYER                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /pages/applications                                             │   │
│  │  ├── ApplicationDashboard.tsx  (Main view)                       │   │
│  │  ├── ApplicationList.tsx       (Table view)                      │   │
│  │  ├── KanbanBoard.tsx         (Drag-drop status)                  │   │
│  │  ├── ApplicationForm.tsx     (Create/Edit)                       │   │
│  │  └── ApplicationDetail.tsx   (Single application view)           │   │
│  │                                                                   │   │
│  │  /components/applications                                         │   │
│  │  ├── QuickAddModal.tsx                                           │   │
│  │  ├── StatusBadge.tsx                                             │   │
│  │  ├── SourceIcon.tsx                                              │   │
│  │  └── FollowUpReminder.tsx                                        │   │
│  │                                                                   │   │
│  │  /components/insights                                             │   │
│  │  ├── ApplicationFunnelChart.tsx                                  │   │
│  │  ├── ApplicationTrendsChart.tsx                                  │   │
│  │  └── SourceBreakdownChart.tsx                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  API LAYER                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /resume-api/routes/applications.py                              │   │
│  │  ├── POST   /api/v1/applications        (Create)                 │   │
│  │  ├── GET    /api/v1/applications        (List with filters)      │   │
│  │  ├── GET    /api/v1/applications/{id}   (Get single)             │   │
│  │  ├── PUT    /api/v1/applications/{id}   (Update)                 │   │
│  │  ├── DELETE /api/v1/applications/{id}   (Delete)                 │   │
│  │  ├── POST   /api/v1/applications/{id}/status (Quick update)      │   │
│  │  ├── GET    /api/v1/applications/stats/summary                   │   │
│  │  ├── GET    /api/v1/applications/export/csv                      │   │
│  │  └── GET    /api/v1/applications/export/json                     │   │
│  │                                                                   │   │
│  │  /resume-api/routes/application_analytics.py                     │   │
│  │  ├── GET    /api/v1/applications/analytics/funnel                │   │
│  │  ├── GET    /api/v1/applications/analytics/timeline              │   │
│  │  ├── GET    /api/v1/applications/analytics/sources               │   │
│  │  └── GET    /api/v1/applications/analytics/status-history/{id}   │   │
│  │                                                                   │   │
│  │  /resume-api/routes/data_privacy.py                              │   │
│  │  ├── POST   /api/v1/privacy/export                               │   │
│  │  ├── DELETE /api/v1/privacy/applications/{id}                    │   │
│  │  └── POST   /api/v1/privacy/cleanup/expired                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  SERVICE LAYER                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /resume-api/lib/application/                                    │   │
│  │  ├── status_mapper.py        (Platform status mapping)           │   │
│  │  ├── sync_service.py         (LinkedIn/external sync)            │   │
│  │  ├── analytics_service.py    (Funnel, trends calculations)       │   │
│  │  ├── retention_service.py    (Data retention policies)           │   │
│  │  └── deduplication.py        (Duplicate detection)               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  DATA LAYER                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /resume-api/database.py                                         │   │
│  │  ├── JobApplication           (Main application table)           │   │
│  │  ├── ApplicationStatusHistory (Audit trail)                      │   │
│  │  └── JobBoard                 (Source configuration)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Implementation Phases

#### Phase 4.1: Core Enhancements (Week 1)

| Task | Files | Description |
|------|-------|-------------|
| Add schema fields | `database.py` | Add external sync fields, analytics fields |
| Create migration | `alembic/versions/` | Database migration for new fields |
| Update API models | `routes/applications.py` | Add new fields to Pydantic models |
| Update frontend types | `utils/applications-api.ts` | Add new TypeScript types |

#### Phase 4.2: Status Mapping (Week 2)

| Task | Files | Description |
|------|-------|-------------|
| Create status mapper | `lib/application/status_mapper.py` | Platform status mapping logic |
| Add source config | `lib/application/source_config.py` | Job board configurations |
| Update API endpoints | `routes/applications.py` | Add source field handling |
| Create UI components | `components/applications/SourceIcon.tsx` | Display source attribution |

#### Phase 4.3: Analytics Dashboard (Weeks 3-4)

| Task | Files | Description |
|------|-------|-------------|
| Create analytics routes | `routes/application_analytics.py` | Funnel, trends, sources endpoints |
| Create funnel chart | `components/insights/ApplicationFunnelChart.tsx` | Already exists, enhance |
| Create trends chart | `components/insights/ApplicationTrendsChart.tsx` | Already exists, enhance |
| Create dashboard page | `pages/applications/dashboard.tsx` | Main analytics view |

#### Phase 4.4: Privacy & Retention (Week 5)

| Task | Files | Description |
|------|-------|-------------|
| Create privacy routes | `routes/data_privacy.py` | Export, delete endpoints |
| Add retention service | `lib/application/retention_service.py` | Retention policy logic |
| Create cleanup job | `lib/jobs/cleanup_expired.py` | Background cleanup task |
| Create settings UI | `components/settings/PrivacySettings.tsx` | Privacy settings page |

### 9.3 File Structure

```
/home/alex/Projects/ResumeAI/
├── resume-api/
│   ├── routes/
│   │   ├── applications.py              # Existing - extend
│   │   ├── application_analytics.py     # NEW
│   │   └── data_privacy.py              # NEW
│   ├── lib/
│   │   └── application/                 # NEW directory
│   │       ├── __init__.py
│   │       ├── status_mapper.py         # NEW
│   │       ├── sync_service.py          # NEW
│   │       ├── analytics_service.py     # NEW
│   │       ├── retention_service.py     # NEW
│   │       └── deduplication.py         # NEW
│   └── database.py                      # Extend JobApplication model
│
├── src/
│   └── pages/
│       └── applications/                # NEW directory
│           ├── dashboard.tsx            # NEW - Analytics dashboard
│           ├── list.tsx                 # NEW - List view
│           └── [id].tsx                 # NEW - Detail view
│
├── components/
│   ├── applications/                    # Extend existing
│   │   ├── ApplicationList.tsx          # Existing
│   │   ├── ApplicationForm.tsx          # NEW
│   │   ├── ApplicationDetail.tsx        # NEW
│   │   ├── KanbanBoard.tsx              # NEW
│   │   ├── QuickAddModal.tsx            # NEW
│   │   ├── StatusBadge.tsx              # NEW
│   │   └── SourceIcon.tsx               # NEW
│   └── insights/
│       ├── ApplicationFunnelChart.tsx   # Existing - enhance
│       ├── ApplicationTrendsChart.tsx   # Existing - enhance
│       └── SourceBreakdownChart.tsx     # NEW
│
└── utils/
    ├── applications-api.ts              # Existing - extend
    ├── application-workflow.ts          # NEW
    ├── application-validation.ts        # NEW
    └── application-defaults.ts          # NEW
```

---

## 10. Future Enhancements

### 10.1 Browser Extension (Phase 5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Browser Extension Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Browser Extension                                               │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  Content Script                                            │  │   │
│  │  │  - Detect job pages (LinkedIn, Indeed, etc.)               │  │   │
│  │  │  - Extract job details (title, company, URL)               │  │   │
│  │  │  - Detect application submission                           │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  Background Service                                        │  │   │
│  │  │  - Queue application events                                │  │   │
│  │  │  - Sync with ResumeAI backend                              │  │   │
│  │  │  - Handle authentication                                   │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  Popup UI                                                  │  │   │
│  │  │  - Quick add application                                   │  │   │
│  │  │  - View recent applications                                │  │   │
│  │  │  - Update status                                           │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Detection Patterns:                                                     │
│  - LinkedIn: /jobs/view/*                                                │
│  - Indeed: /viewjob                                                      │
│  - Glassdoor: /job-listing                                               │
│  - Lever: jobs.lever.co/*                                                │
│  - Greenhouse: boards.greenhouse.io/*                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Auto-Fill Applications

```typescript
// /utils/application-autofill.ts

interface JobPageData {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salary?: { min: number; max: number; currency: string };
  requirements: string[];
  source: string;
}

/**
 * Extract job data from LinkedIn job page.
 */
export function extractLinkedInJobData(): JobPageData | null {
  try {
    const title = document.querySelector('[data-test="job-title"]')?.textContent?.trim();
    const company = document.querySelector('[data-test="company-name"]')?.textContent?.trim();
    const location = document.querySelector('[data-test="job-location"]')?.textContent?.trim();
    const description = document.querySelector('[data-test="job-description"]')?.textContent?.trim();

    if (!title || !company) return null;

    return {
      title,
      company,
      location: location || '',
      url: window.location.href,
      description: description || '',
      source: 'linkedin',
    };
  } catch {
    return null;
  }
}

/**
 * Auto-create application from detected job page.
 */
export async function autoCreateApplication(jobData: JobPageData): Promise<void> {
  const application: ApplicationCreate = {
    company_name: jobData.company,
    job_title: jobData.title,
    job_url: jobData.url,
    location: jobData.location,
    source: jobData.source,
    status: 'applied',
    date_applied: new Date().toISOString().split('T')[0],
    job_description: jobData.description,
  };

  await createApplication(application);
}
```

### 10.3 AI-Powered Insights

```python
# /resume-api/lib/application/ai_insights.py

from typing import List, Dict, Any

class ApplicationInsights:
    """Generate AI-powered insights from application data."""

    async def generate_recommendations(
        self,
        applications: List[JobApplication],
        user_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate personalized recommendations based on application patterns.
        """
        insights = {
            "timing": self._analyze_timing(applications),
            "sources": self._analyze_sources(applications),
            "improvements": self._suggest_improvements(applications),
        }

        return insights

    def _analyze_timing(self, applications: List[JobApplication]) -> Dict[str, Any]:
        """Analyze application timing patterns."""
        # Find best days/times to apply
        # Analyze response times by day of week
        pass

    def _analyze_sources(self, applications: List[JobApplication]) -> Dict[str, Any]:
        """Analyze which sources yield best results."""
        # Calculate interview rate by source
        # Calculate offer rate by source
        pass

    def _suggest_improvements(
        self,
        applications: List[JobApplication]
    ) -> List[str]:
        """Generate improvement suggestions."""
        suggestions = []

        # Check for low interview rate
        interview_rate = self._calculate_interview_rate(applications)
        if interview_rate < 0.2:
            suggestions.append(
                "Your interview rate is below average. Consider tailoring your "
                "resume more specifically to each job description."
            )

        # Check for slow follow-up
        pending_apps = [a for a in applications if a.status == 'applied']
        for app in pending_apps:
            days_since_apply = (datetime.utcnow() - app.date_created).days
            if days_since_apply > 14:
                suggestions.append(
                    f"Consider following up on your {app.company_name} application "
                    f"({days_since_apply} days ago)."
                )

        return suggestions
```

### 10.4 Integration Roadmap

| Feature | Phase | Effort | Priority |
|---------|-------|--------|----------|
| Status mapping layer | 4.2 | 1 week | High |
| Analytics dashboard | 4.3 | 2 weeks | High |
| Privacy & retention | 4.4 | 1 week | High |
| Browser extension | 5.1 | 3 weeks | Medium |
| Auto-fill applications | 5.2 | 2 weeks | Medium |
| AI-powered insights | 5.3 | 2 weeks | Low |
| Calendar integration | 5.4 | 1 week | Low |
| Email notifications | 5.5 | 1 week | Medium |

---

## Appendix A: API Endpoint Reference

### Application Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/applications` | Create new application |
| GET | `/api/v1/applications` | List applications (paginated) |
| GET | `/api/v1/applications/{id}` | Get single application |
| PUT | `/api/v1/applications/{id}` | Update application |
| DELETE | `/api/v1/applications/{id}` | Delete application |
| POST | `/api/v1/applications/{id}/status` | Quick status update |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/applications/stats/summary` | Get summary statistics |
| GET | `/api/v1/applications/analytics/funnel` | Get funnel analysis |
| GET | `/api/v1/applications/analytics/timeline` | Get trends over time |
| GET | `/api/v1/applications/analytics/sources` | Get source breakdown |
| GET | `/api/v1/applications/analytics/status-history/{id}` | Get status history |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/applications/export/csv` | Export as CSV |
| GET | `/api/v1/applications/export/json` | Export as JSON |

### Privacy

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/privacy/export` | Export all user data |
| DELETE | `/api/v1/privacy/applications/{id}` | Delete application |
| POST | `/api/v1/privacy/cleanup/expired` | Cleanup expired data |

---

## Appendix B: Status Mapping Reference

| ResumeAI | LinkedIn | Indeed | Glassdoor | Wellfound | Lever | Greenhouse |
|----------|----------|--------|-----------|-----------|-------|------------|
| draft | saved | saved | saved | interested | lead | new |
| applied | applied | applied | applied | applied | applied | applied |
| screening | - | - | - | - | - | - |
| interviewing | interviewing | interviewing | interviewing | interviewing | interviewing | interviewing |
| offer | offer | offer | offer | offer | offer | offer |
| accepted | - | - | - | - | hired | hired |
| rejected | not_selected | rejected | rejected | passed | rejected | rejected |
| withdrawn | - | - | - | - | - | - |

---

**Report Complete**

This report provides comprehensive guidance for implementing Phase 4 of the ResumeAI v1.5 Job Board Integration, focusing on unified application tracking across all job boards.
