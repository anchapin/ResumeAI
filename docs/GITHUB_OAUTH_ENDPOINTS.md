# GitHub OAuth Endpoints Documentation

This document describes the GitHub OAuth integration endpoints implemented in the ResumeAI backend.

## Overview

The GitHub OAuth integration allows users to:

- Connect their GitHub account securely using OAuth 2.0
- Sync their GitHub repositories to their resume
- Manage GitHub connection settings
- Disconnect from GitHub with proper token revocation

## Authentication

All endpoints requiring authentication use JWT Bearer tokens passed in the `Authorization` header:

```
Authorization: Bearer <jwt_access_token>
```

## Endpoints

### 1. GET `/github/status` - Check GitHub Connection Status

**Description:** Check the user's GitHub OAuth connection status and retrieve connection details.

**Authentication:** Required (JWT Bearer token)

**Request:**

```bash
GET /github/status
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Response (200 OK):**

```json
{
  "authenticated": true,
  "mode": "oauth",
  "username": "octocat",
  "github_user_id": "1",
  "connected_at": "2024-02-25T10:30:00Z",
  "error": null
}
```

**Response Fields:**

- `authenticated` (boolean): Whether user has an active GitHub connection
- `mode` (string): Authentication mode - currently "oauth"
- `username` (string): GitHub username (null if not connected)
- `github_user_id` (string): GitHub user ID (null if not connected)
- `connected_at` (string): ISO 8601 timestamp of connection establishment (null if not connected)
- `error` (string): Error message if status check failed (null on success)

**Error Responses:**

- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Failed to check OAuth status

---

### 2. GET `/github/callback` - Handle GitHub OAuth Callback

**Description:** Handles the OAuth callback from GitHub after user authorization. This endpoint:

1. Validates the OAuth state parameter for CSRF protection
2. Exchanges the authorization code for an access token
3. Fetches the user's GitHub profile
4. Encrypts and stores the access token in the database
5. Redirects to the frontend with success/error status

**Authentication:** Not required (called by GitHub OAuth provider)

**Request:**

```bash
GET /github/callback?code=<authorization_code>&state=<oauth_state>
```

**Query Parameters:**

- `code` (string, required): Authorization code from GitHub
- `state` (string, required): OAuth state parameter for CSRF protection

**Response (302 Redirect):**
The endpoint redirects to the frontend with a status query parameter:

**Success:**

```
Location: https://app.resumeai.com/?status=success
```

**Failure:**

```
Location: https://app.resumeai.com/?status=error&error=<error_code>
```

**Possible Error Codes:**

- `invalid_state`: OAuth state parameter was not found or invalid
- `expired_state`: OAuth state parameter has expired (valid for 10 minutes)
- `invalid_code`: Authorization code could not be exchanged for a token
- `user_fetch_failed`: Failed to fetch GitHub user profile
- `database_error`: Failed to store connection in database

**Security Features:**

- CSRF protection using state parameter
- State parameters expire after 10 minutes
- Access tokens are encrypted before storage
- Automatic token revocation on disconnect

---

### 3. GET `/github/connect` - Initiate OAuth Authorization

**Description:** Initiates the GitHub OAuth authorization flow by generating an authorization URL.

**Authentication:** Required (JWT Bearer token)

**Request:**

```bash
GET /github/connect
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

**Optional Query Parameters:**

- `redirect_uri` (string, optional): Custom redirect URI for OAuth callback (must be whitelisted)

**Response (200 OK):**

```json
{
  "success": true,
  "authorization_url": "https://github.com/login/oauth/authorize?client_id=...",
  "state": "random_csrf_token_...",
  "expires_in": 600
}
```

**Response Fields:**

- `success` (boolean): Request succeeded
- `authorization_url` (string): URL to redirect user to for GitHub authorization
- `state` (string): CSRF state parameter (store for verification)
- `expires_in` (number): Seconds until state expires (600 = 10 minutes)

**Error Responses:**

- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: GitHub OAuth not configured

**Scopes Requested:**

- `user:email`: Access to user email information
- `public_repo`: Access to public repositories (current scope: `user:email`)

---

### 4. DELETE `/github/disconnect` - Disconnect GitHub Account

**Description:** Disconnects the user's GitHub account and revokes the OAuth token.

**Authentication:** Required (JWT Bearer token)

**Request:**

```bash
DELETE /github/disconnect
Authorization: Bearer <jwt_access_token>
```

**Response (204 No Content):**
No response body. Success indicated by 204 status code.

**Error Responses:**

- `401 Unauthorized`: Authentication required
- `404 Not Found`: No GitHub connection found (idempotent - still returns success)

**Security Features:**

- Attempts to revoke token with GitHub API (best-effort)
- Deletes encrypted token from database
- Removes all GitHub connection data
- Idempotent operation (safe to call multiple times)

---

## OAuth Flow Diagram

```
┌─────────┐                           ┌────────────┐                  ┌──────────┐
│ Frontend│                           │ ResumeAI   │                  │  GitHub  │
│ (React) │                           │  Backend   │                  │          │
└────┬────┘                           └──────┬─────┘                  └─────┬────┘
     │                                       │                              │
     │  1. Click "Connect GitHub"            │                              │
     ├──────────────────────────────────────>│                              │
     │    GET /github/connect                │                              │
     │                                       │                              │
     │    Response: authorization_url        │                              │
     │<──────────────────────────────────────┤                              │
     │                                       │                              │
     │  2. Redirect to authorization_url     │                              │
     ├───────────────────────────────────────────────────────────────────┐  │
     │                                       │                           │  │
     │  3. User authorizes app               │                           │  │
     │                                       │<───────────────────────────┤  │
     │                                       │   User authorization       │  │
     │                                       └────────────────────────────┘  │
     │                                       │                              │
     │  4. GitHub redirects to /callback     │                              │
     ├───────────────────────────────────────────────────────────────────┐  │
     │    with code & state                  │                           │  │
     │                                       │                           │  │
     │    GET /github/callback?code=...      │                           │  │
     │<────────────────────────────┤         │                           │  │
     │                             │         │                           │  │
     │                             └────────>│                           │  │
     │                                       │                           │  │
     │                                       │  5. Exchange code for token
     │                                       ├───────────────────────────┐  │
     │                                       │                           │  │
     │                                       │<──────────────────────────┘  │
     │                                       │   Access token             │
     │                                       │                              │
     │                                       │  6. Fetch user profile      │
     │                                       ├───────────────────────────┐  │
     │                                       │                           │  │
     │                                       │<──────────────────────────┘  │
     │                                       │   User profile            │
     │                                       │                              │
     │                                       │  7. Store encrypted token    │
     │                                       ├──> Database                  │
     │                                       │                              │
     │  8. Redirect to frontend with status  │                              │
     │<──────────────────────────────────────┤                              │
     │    ?status=success                    │                              │
     │                                       │                              │
```

## Configuration

Required environment variables in `.env`:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/github/callback  # for development
# or
GITHUB_CALLBACK_URL=http://localhost:3000/github/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Error Handling

All endpoints follow standard HTTP status codes and include detailed error information in the response body:

**4xx Client Errors:**

- `400 Bad Request`: Invalid parameters or malformed request
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found

**5xx Server Errors:**

- `500 Internal Server Error`: Unexpected server error

Error Response Format:

```json
{
  "detail": "Human-readable error message"
}
```

## Security Considerations

1. **CSRF Protection**: All OAuth flows use state parameter validation
2. **Token Encryption**: GitHub access tokens are encrypted before storage
3. **Token Revocation**: Tokens are revoked when user disconnects
4. **HTTPS Only**: All production deployments must use HTTPS
5. **State Expiration**: State parameters expire after 10 minutes
6. **Redirect URI Validation**: Only whitelisted redirect URIs are allowed

## Rate Limiting

Currently no rate limiting is enforced. In production, consider:

- Rate limiting on `/github/connect` (e.g., 5 requests per minute per user)
- Rate limiting on `/github/status` (e.g., 10 requests per minute per user)

## Testing

### Test Connection Status

```bash
curl -X GET http://localhost:8000/github/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Test OAuth Connect

```bash
curl -X GET http://localhost:8000/github/connect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Disconnect

```bash
curl -X DELETE http://localhost:8000/github/disconnect \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## References

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub OAuth Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)
- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
