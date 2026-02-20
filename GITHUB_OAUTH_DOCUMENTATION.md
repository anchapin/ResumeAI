# GitHub OAuth Documentation

## Overview

This document describes the GitHub OAuth integration implemented for the ResumeAI application.

## Endpoints

### GET /github/connect

Initiates the GitHub OAuth authorization flow.

#### Request

**Query Parameters:**
- `redirect_uri` (optional): Custom redirect URI for OAuth callback. If not provided, uses the default from settings.

#### Response

```json
{
  "authorization_url": "https://github.com/login/oauth/authorize?client_id=...",
  "state": "random_state_string",
  "expires_in": 600
}
```

#### Example Usage

```python
import httpx

# Request authorization URL
response = httpx.get("http://api.example.com/github/connect")
data = response.json()

# Redirect user to authorization_url
# Store data['state'] in session for callback verification
window.location.href = data['authorization_url']
```

### GET /github/callback

Handles the OAuth callback from GitHub (placeholder for full implementation).

**Query Parameters:**
- `code`: Authorization code from GitHub
- `state`: State parameter for CSRF verification

### GET /github/health

Health check endpoint for GitHub OAuth service.

## Configuration

The GitHub OAuth integration requires the following environment variables:

```bash
# Required
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional (defaults to http://localhost:3000/auth/github/callback)
GITHUB_OAUTH_REDIRECT_URI=http://your-app.com/auth/github/callback
```

## OAuth Scopes

The following OAuth scopes are requested:

- `read:user`: Access to user profile information
- `public_repo`: Access to public repositories

## Security Features

1. **State Parameter**: A cryptographically secure random state parameter is generated for each OAuth request to prevent CSRF attacks.

2. **Rate Limiting**: The endpoint is rate-limited to 10 requests per minute per user.

3. **Redirect URI Validation**: Custom redirect URIs are validated to ensure they start with `http://` or `https://`.

4. **State Expiration**: State parameters should be treated as expiring after 10 minutes.

## OAuth Flow

1. **Initiation**: Frontend calls `GET /github/connect` to get the authorization URL
2. **Redirect**: User is redirected to GitHub's authorization page
3. **Authorization**: User authorizes the application
4. **Callback**: GitHub redirects to the callback URI with an authorization code
5. **Token Exchange**: Backend exchanges the authorization code for an access token (placeholder)
6. **User Data**: Backend fetches user profile from GitHub API (placeholder)

## Environment-Specific Redirect URIs

The endpoint supports custom redirect URIs via the `redirect_uri` query parameter, allowing different configurations for:

- **Development**: `http://localhost:3000/auth/github/callback`
- **Staging**: `https://staging.example.com/auth/github/callback`
- **Production**: `https://app.example.com/auth/github/callback`

## Testing

Unit tests are located in `tests/test_github_oauth.py` and cover:

- State parameter generation and uniqueness
- Authorization URL building
- OAuth flow initiation
- Custom redirect URI support
- Error handling
- Security validation

Run tests with:
```bash
cd resume-api
python -m pytest tests/test_github_oauth.py -v
```

## Implementation Status

- [x] GET /github/connect endpoint
- [x] State parameter generation
- [x] Custom redirect URI support
- [x] OAuth scopes configuration
- [x] API documentation
- [x] Unit tests
- [ ] GET /github/callback full implementation
- [ ] Token exchange with GitHub
- [ ] User profile fetching
- [ ] User account linking
- [ ] JWT token generation

## Related Issues

- Issue #280: Implement GET /github/connect endpoint for OAuth flow initiation
- Phase 1: Add OAuth Support (Backward Compatible)
