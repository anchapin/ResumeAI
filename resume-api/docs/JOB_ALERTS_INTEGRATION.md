# Job Alerts Integration Guide

**Version:** 1.5  
**Last Updated:** 2026-03-13

---

## Overview

The Job Alerts feature notifies users of relevant job openings via email and SMS based on their saved search criteria.

---

## Features

### 1. Job Alerts

- Create alerts with search criteria
- Filter by remote, location, salary, type, level
- Frequency options (instant, daily, weekly)
- Pause/resume/delete alerts

### 2. Notifications

- Email notifications (SMTP)
- SMS notifications (Twilio, optional)
- Daily digest (9 AM local time)
- Weekly digest (Monday 9 AM)

### 3. Preferences

- Email/SMS toggles
- Digest frequency options
- Timezone support
- Unsubscribe links

---

## User Guide

### Creating a Job Alert

1. Go to **Job Alerts** page
2. Click **New Alert**
3. Fill in alert details:
   - Alert name (required)
   - Keywords (optional)
   - Remote only toggle
   - Location filter
   - Minimum salary
   - Employment type
   - Experience level
   - Notification frequency
4. Click **Create Alert**

### Managing Alerts

1. Go to **Job Alerts** page
2. View all your alerts
3. Actions available:
   - **Pause**: Temporarily stop notifications
   - **Resume**: Restart notifications
   - **Edit**: Modify alert criteria
   - **Delete**: Remove alert permanently

### Notification Preferences

1. Go to **Settings** > **Notifications**
2. Configure preferences:
   - Enable/disable email notifications
   - Enable/disable SMS notifications
   - Set digest frequency (daily/weekly)
   - Set timezone
3. Click **Save Preferences**

---

## Developer Guide

### API Endpoints

#### GET /api/v1/alerts

List user's job alerts.

**Query Parameters:**
- `active_only` - Only return active alerts (true/false)

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "name": "Remote Python Jobs",
      "query": "Python Engineer",
      "remote": true,
      "location": "San Francisco",
      "min_salary": 100000,
      "employment_type": "full-time",
      "experience_level": "mid",
      "frequency": "daily",
      "is_active": true,
      "last_sent_at": "2026-03-13T09:00:00Z",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### POST /api/v1/alerts

Create a new job alert.

**Request:**
```json
{
  "name": "Remote Python Jobs",
  "query": "Python Engineer",
  "remote": true,
  "location": "San Francisco",
  "min_salary": 100000,
  "employment_type": "full-time",
  "experience_level": "mid",
  "frequency": "daily"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Remote Python Jobs",
  ...
}
```

---

#### PUT /api/v1/alerts/{id}

Update an alert.

**Request:**
```json
{
  "name": "Updated Alert Name",
  "frequency": "weekly"
}
```

---

#### DELETE /api/v1/alerts/{id}

Delete an alert.

**Response:**
```json
{
  "success": true
}
```

---

#### POST /api/v1/alerts/{id}/pause

Pause an alert.

**Response:**
```json
{
  "success": true
}
```

---

#### POST /api/v1/alerts/{id}/resume

Resume a paused alert.

**Response:**
```json
{
  "success": true
}
```

---

#### GET /api/v1/alerts/preferences

Get user's notification preferences.

**Response:**
```json
{
  "email_enabled": true,
  "email_address": "user@example.com",
  "sms_enabled": false,
  "phone_number": null,
  "phone_country_code": "+1",
  "daily_digest": true,
  "weekly_digest": false,
  "instant_alerts": true,
  "timezone": "America/New_York"
}
```

---

#### PUT /api/v1/alerts/preferences

Update notification preferences.

**Request:**
```json
{
  "email_enabled": true,
  "sms_enabled": true,
  "phone_number": "5551234567",
  "phone_country_code": "+1",
  "daily_digest": true,
  "weekly_digest": false,
  "instant_alerts": true,
  "timezone": "America/New_York"
}
```

---

### Frontend Components

#### AlertList

```tsx
import { AlertList } from '@/components/alerts';

<AlertList
  onCreateAlert={() => setShowForm(true)}
  onEditAlert={(alert) => editAlert(alert)}
/>
```

#### AlertForm

```tsx
import { AlertForm } from '@/components/alerts';

<AlertForm
  alert={alertToEdit}
  onSubmit={(data) => handleSubmit(data)}
  onCancel={() => setShowForm(false)}
/>
```

#### AlertPreferences

```tsx
import { AlertPreferences } from '@/components/alerts';

<AlertPreferences
  onSave={() => showSuccessMessage()}
/>
```

---

### Hooks

#### useAlerts

```typescript
import { useAlerts } from '@/hooks/useAlerts';

const {
  alerts,
  isLoading,
  error,
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  pauseAlert,
  resumeAlert,
} = useAlerts();

// Create alert
await createAlert({ name: 'Test', frequency: 'daily' });

// Pause alert
await pauseAlert(alertId);
```

#### useAlertPreferences

```typescript
import { useAlertPreferences } from '@/hooks/useAlertPreferences';

const {
  preferences,
  isLoading,
  error,
  fetchPreferences,
  updatePreferences,
} = useAlertPreferences();

// Update preferences
await updatePreferences({ smsEnabled: true });
```

---

## Configuration

### Environment Variables

```bash
# Email Configuration (Required)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@example.com

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Scheduler Configuration
ALERT_SCHEDULER_ENABLED=true
INSTANT_ALERT_INTERVAL=15  # minutes
DAILY_DIGEST_HOUR=9
WEEKLY_DIGEST_DAY=monday
```

### Database Setup

Run migrations to create alert tables:

```bash
cd resume-api
alembic upgrade head
```

Tables created:
- `job_alerts` - User alert configurations
- `alert_job_matches` - Tracking sent jobs
- `notification_preferences` - User preferences

---

## Architecture

### Backend

```
lib/alerts/
├── models.py           # Database models
├── matcher.py          # Alert job matching
├── sender.py           # Email/SMS sending
└── scheduler.py        # Scheduled tasks

routes/alerts.py        # API endpoints
tasks/alert_tasks.py    # Background tasks
templates/emails/       # Email templates
```

### Frontend

```
components/alerts/
├── AlertList.tsx       # Alerts list
├── AlertForm.tsx       # Create/edit form
└── AlertPreferences.tsx # Preferences UI

hooks/
├── useAlerts.ts        # Alert management
└── useAlertPreferences.ts # Preferences management
```

---

## Security

### Authentication

- All alert endpoints require authentication
- Users can only access their own alerts
- Preferences are user-specific

### Rate Limiting

- Create alert: 10 requests/minute
- Update alert: 20 requests/minute
- Delete alert: 5 requests/minute

### Privacy

- Email addresses encrypted at rest
- Phone numbers encrypted at rest
- Unsubscribe links include secure tokens
- GDPR-compliant data retention

---

## Troubleshooting

### Alerts not sending

**Cause:** Scheduler not running or email not configured

**Solution:**
1. Check scheduler is started
2. Verify SMTP configuration
3. Check alert is active
4. Check user preferences

---

### Duplicate jobs sent

**Cause:** Match tracking not working

**Solution:**
1. Check `alert_job_matches` table
2. Verify `mark_jobs_sent` is called
3. Check for database constraints

---

### SMS not sending

**Cause:** Twilio not configured or credits exhausted

**Solution:**
1. Verify Twilio credentials
2. Check account balance
3. Verify phone number format

---

## Performance

### Caching

- Alert queries: 5 minutes
- Preferences: 30 minutes
- Job matches: Per alert run

### Indexing

Database indexes on:
- `job_alerts.user_id`
- `job_alerts.is_active`
- `job_alerts.frequency`
- `alert_job_matches.alert_id`
- `alert_job_matches.job_id`

---

## Monitoring

### Metrics to Track

- Alerts created per day
- Alert match rate
- Email open rate
- SMS delivery rate
- Unsubscribe rate

### Alerts

- Scheduler failure rate > 10%
- Email send failure rate > 5%
- SMS send failure rate > 10%

---

_Last updated: 2026-03-13_
