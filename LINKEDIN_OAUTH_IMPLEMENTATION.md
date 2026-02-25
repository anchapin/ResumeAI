# LinkedIn OAuth Implementation - Issue #324

## Overview

This implementation replaces the mock LinkedIn import functionality with a real LinkedIn OAuth 2.0 integration. Users can now securely connect their LinkedIn profiles and import real profile data, experience, and education information.

## Changes Made

### Backend Implementation

#### 1. **LinkedIn OAuth Routes** (`resume-api/routes/linkedin.py`)

Added complete OAuth 2.0 flow with three new endpoints:

##### **GET `/api/linkedin/oauth/start`**
- Initiates the OAuth flow
- Generates secure state parameter (10-minute expiration)
- Returns LinkedIn authorization URL
- Response:
  ```json
  {
    "auth_url": "https://www.linkedin.com/oauth/v2/authorization?...",
    "state": "secure_random_state"
  }
  ```

##### **POST `/api/linkedin/oauth/callback`**
- Handles OAuth callback after user grants permission
- Exchanges authorization code for access token
- Fetches user profile data from LinkedIn API
- Returns profile data in our format
- Request:
  ```json
  {
    "code": "authorization_code",
    "state": "state_from_start_endpoint"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "access_token": "linked-in-access-token",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "headline": "Software Engineer at Company",
      "summary": "...",
      "email": "john@example.com",
      "location": "United States",
      "experience": [...],
      "education": [...]
    }
  }
  ```

##### **GET `/api/linkedin/profile`**
- Retrieves the currently authenticated user's LinkedIn profile
- Requires valid LinkedIn access token
- Returns full profile data

##### **POST `/api/linkedin/disconnect`**
- Revokes LinkedIn access and clears session data
- Clears stored tokens

#### 2. **Helper Functions in Routes**

- `fetch_linkedin_profile()` - Async function to fetch profile from LinkedIn API
- `parse_linkedin_experience()` - Parses LinkedIn experience format
- `parse_linkedin_education()` - Parses LinkedIn education format
- `format_linkedin_date()` - Normalizes LinkedIn date objects

#### 3. **Configuration** (`resume-api/config/__init__.py`)

Added three new settings:
```python
linkedin_client_id: Optional[str] = None
linkedin_client_secret: Optional[str] = None
linkedin_redirect_uri: Optional[str] = None
```

These are loaded from environment variables:
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`

### Frontend Implementation

#### 1. **API Client** (`utils/api-client.ts`)

Replaced all mock functions with real API implementations:

##### `connectLinkedIn(): Promise<string>`
- Calls backend `/api/linkedin/oauth/start`
- Returns LinkedIn authorization URL
- Opens OAuth authorization flow in popup window

##### `handleLinkedInCallback(code: string, state: string): Promise<LinkedInProfile>`
- Calls backend `/api/linkedin/oauth/callback`
- Exchanges authorization code for profile data
- Stores access token in localStorage for future API calls
- Returns complete profile object

##### `importLinkedInProfile(): Promise<LinkedInProfile>`
- Retrieves stored LinkedIn access token
- Fetches profile data if needed
- Returns profile in our internal format

##### `fetchGitHubRepositories(): Promise<GitHubRepository[]>`
- Calls backend GitHub repositories endpoint
- Returns list of user's repositories

##### `disconnectLinkedIn(): Promise<void>`
- Clears stored LinkedIn access token
- Notifies backend to revoke access

#### 2. **LinkedInImportDialog Component** (`components/LinkedInImportDialog.tsx`)

Enhanced OAuth flow handling:
- Receives profile data directly from OAuth callback
- Populates form fields with real LinkedIn data
- Supports both `profile.experience`/`profile.positions` field names
- Handles skill arrays properly
- Shows success toast on import completion

### Configuration Files

#### `.env.example` (Frontend)
Added LinkedIn OAuth configuration instructions:
```env
# LinkedIn OAuth Configuration (Optional)
# Create OAuth App at https://www.linkedin.com/developers/apps
# Authorized redirect URL: http://localhost:5173 (for development)
# LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
# LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
```

#### `resume-api/.env.example` (Backend)
Added LinkedIn OAuth settings:
```env
# LinkedIn OAuth Configuration (Optional)
# Register an OAuth App at https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=your_linkedin_client_id_here
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:5173/auth/linkedin/callback
```

## Setup Instructions

### 1. Register LinkedIn OAuth App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Accept terms and create app
4. In **App settings**:
   - App name: `ResumeAI`
   - App logo: (upload or skip)
5. In **Auth** tab:
   - Add `Authorized redirect URLs`:
     - Development: `http://localhost:5173/auth/linkedin/callback`
     - Production: `https://yourdomain.com/auth/linkedin/callback`
6. Copy **Client ID** and **Client secret**

### 2. Environment Configuration

**Backend (.env in resume-api/):**
```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:5173/auth/linkedin/callback
```

**Frontend (.env.local in root):**
No separate configuration needed - frontend uses API_URL from VITE_API_URL

### 3. LinkedIn API Permissions

The current implementation requests these OAuth scopes:
- `openid` - OpenID Connect
- `profile` - Basic profile information
- `email` - Email address

For enhanced data access (like skills, certifications):
```python
# In resume-api/routes/linkedin.py, modify the scope:
"scope": "openid profile email w_member_social"
```

## Data Mapping

### Profile Data Mapping
- `firstName` → User's first name
- `lastName` → User's last name
- `headline` → Current role/position
- `summary` → About/Bio section
- `location` → Geographic location (country)
- `email` → Primary email address
- `phone` → Phone number (if available)

### Experience Data
- `companyName` → `company`
- `title` → `title`
- `startDate` → `startDate` (formatted as YYYY-MM)
- `endDate` → `endDate` (formatted as YYYY-MM)
- `description` → `description`

### Education Data
- `schoolName` → `institution`
- `degreeName` → `degree`
- `fieldOfStudy` → `field`
- `startDate` → `startDate` (year only)
- `endDate` → `endDate` (year only)

## Security Features

1. **State Parameter Validation**
   - Each OAuth flow generates a unique state token
   - 10-minute expiration to prevent replay attacks
   - State validated before token exchange

2. **Access Token Storage**
   - Stored in browser localStorage (client-side only)
   - Not persisted to server (stateless)
   - User can disconnect to clear token

3. **HTTPS Required**
   - OAuth redirect must use HTTPS in production
   - Credentials never sent over unencrypted connection

4. **Error Handling**
   - Comprehensive error logging
   - User-friendly error messages
   - Graceful fallback handling

## Error Handling

### Frontend
- OAuth popup blocked: User notified to allow popups
- Network errors: Generic error toast with retry option
- Invalid state: User directed to start over
- Missing credentials: Clear error message

### Backend
- Missing OAuth config: 500 error with clear message
- Token exchange failure: Logged and reported to client
- Profile fetch failure: Partial data returned or error
- Invalid state: 400 Bad Request

## Testing

### Manual Testing Flow

1. **OAuth Flow Test**
   ```
   1. Open LinkedIn Import Dialog
   2. Click "Connect with LinkedIn"
   3. Enter LinkedIn credentials
   4. Grant permissions
   5. Should see profile data populate
   ```

2. **Data Import Test**
   ```
   1. Verify profile fields populated correctly
   2. Check experience entries imported
   3. Verify education entries imported
   4. Modify fields as needed
   5. Complete import
   ```

3. **Disconnect Test**
   ```
   1. Navigate to LinkedIn settings
   2. Click disconnect
   3. Verify token cleared from localStorage
   4. Verify localStorage.LINKEDIN_ACCESS_TOKEN removed
   ```

### API Testing

```bash
# Start OAuth flow
curl http://localhost:8000/api/linkedin/oauth/start

# Handle callback (after user authorizes)
curl -X POST http://localhost:8000/api/linkedin/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{"code": "auth_code", "state": "state_value"}'

# Disconnect
curl -X POST http://localhost:8000/api/linkedin/disconnect
```

## Limitations & Future Improvements

### Current Limitations
1. **Profile Storage**: Profile data is not persisted (stateless)
   - User must re-authenticate on each session
   - Consider: Save profile to database with user account

2. **OAuth State Storage**: Uses in-memory dict
   - Not scalable across multiple servers
   - Consider: Use Redis or database for production

3. **Token Refresh**: No automatic token refresh
   - LinkedIn tokens expire after ~365 days
   - Consider: Implement token refresh flow

4. **Limited Data Scope**: Only basic profile data
   - Cannot access skills, certifications without additional scopes
   - Consider: Add W3C member social scope

### Future Enhancements
- [ ] Persist profile data to database
- [ ] Implement token refresh flow
- [ ] Add more LinkedIn data (skills, certifications, etc.)
- [ ] Support LinkedIn company pages
- [ ] Add LinkedIn recommendation fetching
- [ ] Implement automatic profile sync on login

## Files Modified

1. `resume-api/routes/linkedin.py` - Added OAuth endpoints
2. `resume-api/config/__init__.py` - Added LinkedIn settings
3. `utils/api-client.ts` - Replaced mock functions
4. `components/LinkedInImportDialog.tsx` - Enhanced OAuth handling
5. `.env.example` - Added LinkedIn OAuth documentation
6. `resume-api/.env.example` - Added LinkedIn OAuth settings

## Dependencies

- `httpx` (already in requirements.txt) - Async HTTP client
- `pydantic` (already in requirements.txt) - Data validation
- `fastapi` (already in requirements.txt) - Web framework

No new Python dependencies needed!

## References

- [LinkedIn API Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [LinkedIn Profile API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/integrations-overview)
