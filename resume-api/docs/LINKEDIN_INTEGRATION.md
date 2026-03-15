# LinkedIn Integration Guide

**Version:** 1.5  
**Last Updated:** 2026-03-13

---

## Overview

The LinkedIn Integration feature allows users to connect their LinkedIn account to import their professional profile data directly into their resume.

---

## Features

### 1. OAuth 2.0 Connection

- Secure OAuth 2.0 authentication with PKCE
- Official LinkedIn branding
- Popup-based OAuth flow
- Automatic token refresh

### 2. Profile Import

- Import basic info (name, email, headline)
- Import work experience
- Import education history
- Import skills
- Section-based selection
- Merge with existing data

### 3. Profile Sync

- Automatic token refresh
- Profile caching (1 hour TTL)
- Manual refresh option
- Sync status tracking

---

## User Guide

### Connecting LinkedIn

1. Go to **Settings** > **LinkedIn Integration**
2. Click **Connect with LinkedIn**
3. Authorize ResumeAI in the LinkedIn popup
4. Your profile will be imported automatically

### Importing Profile

1. After connecting, click **Import Profile to Resume**
2. Select which sections to import:
   - Basic Info (name, email, headline)
   - Work Experience
   - Education
   - Skills
3. Click **Import**
4. Review imported data in your resume

### Refreshing Profile

1. Go to **Settings** > **LinkedIn Integration**
2. Click **Refresh** next to connection status
3. Your profile will be updated from LinkedIn

### Disconnecting LinkedIn

1. Go to **Settings** > **LinkedIn Integration**
2. Click **Disconnect LinkedIn**
3. Confirm disconnection

**Note:** Disconnecting removes LinkedIn access but imported data remains in your resume.

---

## Developer Guide

### API Endpoints

#### POST /api/v1/linkedin/connect

Initiate OAuth connection.

**Request:**
```http
POST /api/v1/linkedin/connect
Authorization: Bearer {token}
```

**Response:**
```json
{
  "authorization_url": "https://www.linkedin.com/oauth/v2/authorization?...",
  "state": "random_state_string"
}
```

---

#### GET /api/v1/linkedin/callback

Handle OAuth callback.

**Request:**
```http
GET /api/v1/linkedin/callback?code={code}&state={state}
```

**Response:**
```json
{
  "success": true,
  "message": "LinkedIn connected successfully",
  "profile": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

---

#### GET /api/v1/linkedin/status

Get connection status.

**Response:**
```json
{
  "isConnected": true,
  "connectedAt": "2026-03-13T10:00:00Z",
  "lastSyncedAt": "2026-03-13T12:00:00Z",
  "scopes": ["r_liteprofile", "r_emailaddress"]
}
```

---

#### GET /api/v1/linkedin/profile

Get imported profile data.

**Response:**
```json
{
  "id": "...",
  "firstName": "John",
  "lastName": "Doe",
  "headline": "Software Engineer",
  "email": "john@example.com",
  "locations": [...],
  "positions": [...],
  "education": [...],
  "skills": [...]
}
```

---

#### POST /api/v1/linkedin/refresh

Refresh profile data.

**Response:**
```json
{
  "success": true,
  "profile": {...}
}
```

---

#### POST /api/v1/linkedin/disconnect

Disconnect LinkedIn account.

**Response:**
```json
{
  "success": true,
  "message": "LinkedIn disconnected"
}
```

---

### Frontend Components

#### LinkedInConnectButton

```tsx
import { LinkedInConnectButton } from '@/components/linkedin';

<LinkedInConnectButton
  onConnect={() => console.log('Connected!')}
  onDisconnect={() => console.log('Disconnected!')}
/>
```

#### LinkedInStatus

```tsx
import { LinkedInStatus } from '@/components/linkedin';

<LinkedInStatus
  connection={{ isConnected: true, lastSyncedAt: '...' }}
  onRefresh={() => refreshProfile()}
/>
```

#### ProfileImportPreview

```tsx
import { ProfileImportPreview } from '@/components/linkedin';

<ProfileImportPreview
  profile={profileData}
  onImport={(sections) => importSections(sections)}
  onCancel={() => setShowPreview(false)}
/>
```

---

### Hooks

#### useLinkedInOAuth

```typescript
import { useLinkedInOAuth } from '@/hooks/useLinkedInOAuth';

const {
  isConnecting,
  isConnected,
  error,
  initiateOAuth,
  handleCallback,
  disconnect,
} = useLinkedInOAuth();
```

#### useLinkedInProfile

```typescript
import { useLinkedInProfile } from '@/hooks/useLinkedInProfile';

const {
  profile,
  isLoading,
  error,
  fetchProfile,
  refreshProfile,
} = useLinkedInProfile();
```

---

## Configuration

### Environment Variables

```bash
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

### LinkedIn App Setup

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/auth/linkedin/callback`
4. Enable these products:
   - Sign In with LinkedIn
5. Copy Client ID and Client Secret to `.env`

### Required OAuth Scopes

- `r_liteprofile` - Basic profile (name, photo, headline)
- `r_emailaddress` - Email address
- `w_member_social` - Post, comment, like (optional)

---

## Security

### Token Storage

- Access tokens encrypted at rest using Fernet encryption
- Refresh tokens encrypted separately
- Tokens stored in database with user association

### OAuth Security

- PKCE (Proof Key for Code Exchange) prevents authorization code interception
- State parameter prevents CSRF attacks
- Tokens automatically refreshed before expiry
- Tokens revoked on disconnect

### Rate Limiting

- LinkedIn API: 500 requests/day per user
- API rate limiting: 100 requests/minute
- Response caching: 1 hour TTL

---

## Troubleshooting

### "Invalid OAuth state"

**Cause:** State parameter mismatch or CSRF attempt

**Solution:**
1. Clear browser cache
2. Try connecting again
3. Ensure cookies are enabled

---

### "Token expired"

**Cause:** Access token expired and refresh failed

**Solution:**
1. Disconnect LinkedIn
2. Reconnect your account
3. Contact support if issue persists

---

### "Profile import failed"

**Cause:** LinkedIn API error or network issue

**Solution:**
1. Check LinkedIn connection status
2. Refresh profile manually
3. Try again later

---

### "Rate limit exceeded"

**Cause:** Too many API requests to LinkedIn

**Solution:**
1. Wait a few minutes
2. Profile data is cached for 1 hour
3. Reduce refresh frequency

---

## Privacy

### Data Storage

- LinkedIn profile data stored encrypted in database
- Cache expires after 1 hour
- Users can disconnect at any time

### Data Usage

- Imported data merged with resume
- Users control which sections to import
- Disconnected data remains in resume unless manually removed

### GDPR Compliance

- Users can request data export
- Users can request data deletion
- Connection can be revoked at any time

---

## API Reference

For complete API documentation, see `/docs` endpoint when running the API.

---

_Last updated: 2026-03-13_
