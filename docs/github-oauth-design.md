# GitHub OAuth Integration Design for Production

## Problem Statement

The current implementation uses the `gh` CLI tool which:
- Only works in local development
- Runs on the server, not the client
- Requires server-side GitHub authentication
- Cannot support multiple users in production

## Proposed Solution: GitHub OAuth App

### Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser  │────▶│  ResumeAPI  │────▶│  GitHub API │
│  (Client)   │     │   Server    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ GitHub OAuth│     │  Database   │
│   Flow      │     │ (Tokens)    │
└─────────────┘     └─────────────┘
```

### OAuth Flow

1. **User initiates connection** - Clicks "Connect GitHub" in settings
2. **Redirect to GitHub** - Server generates OAuth URL with state parameter
3. **User authorizes** - GitHub shows permission dialog
4. **Callback handling** - GitHub redirects back with auth code
5. **Token exchange** - Server exchanges code for access token
6. **Token storage** - Store encrypted token in database
7. **API calls** - Use stored token for GitHub API requests

### Required GitHub OAuth Scopes

```
read:user        - Read user profile data
read:org         - Read org membership (optional)
public_repo      - Read public repositories
```

## Implementation Details

### 1. GitHub OAuth App Registration

Create OAuth App at https://github.com/settings/developers:
- **Application name**: ResumeAI
- **Homepage URL**: https://resumeai.example.com
- **Authorization callback URL**: https://api.resumeai.example.com/github/callback

### 2. Environment Configuration

```env
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
GITHUB_CALLBACK_URL=https://api.resumeai.example.com/github/callback
```

### 3. Database Schema

```sql
-- User GitHub connections
CREATE TABLE user_github_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_user_id VARCHAR(255) NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,  -- Encrypted
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scopes TEXT[],  -- Granted scopes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    UNIQUE(github_user_id)
);

-- Index for quick lookups
CREATE INDEX idx_github_connections_user ON user_github_connections(user_id);
CREATE INDEX idx_github_connections_github_user ON user_github_connections(github_user_id);
```

### 4. API Endpoints

#### GET /github/connect
Initiates OAuth flow, returns authorization URL.

```python
@router.get("/github/connect")
async def github_connect(
    redirect_uri: Optional[str] = None,
    auth: AuthorizedAPIKey = Depends()
):
    """Generate GitHub OAuth authorization URL."""
    state = secrets.token_urlsafe(32)
    # Store state in Redis/cache for validation
    
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": redirect_uri or settings.github_callback_url,
        "scope": "read:user public_repo",
        "state": state,
    }
    
    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return {"authorization_url": auth_url, "state": state}
```

#### GET /github/callback
Handles OAuth callback from GitHub.

```python
@router.get("/github/callback")
async def github_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Exchange OAuth code for access token."""
    # Validate state parameter
    
    # Exchange code for token
    token_response = await exchange_code_for_token(code)
    
    # Get GitHub user info
    github_user = await get_github_user(token_response["access_token"])
    
    # Store connection in database
    # Encrypt access_token before storing!
    
    # Redirect to frontend with success
    return RedirectResponse(url=f"{frontend_url}/settings/github?connected=true")
```

#### DELETE /github/disconnect
Removes GitHub connection.

```python
@router.delete("/github/disconnect")
async def github_disconnect(
    auth: AuthorizedAPIKey = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect GitHub account."""
    # Delete stored tokens
    # Return success
```

#### GET /github/status (Updated)
Returns connection status for current user.

```python
@router.get("/github/status")
async def get_github_status(
    auth: AuthorizedAPIKey = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Get GitHub connection status for current user."""
    connection = await get_user_github_connection(auth.user_id, db)
    
    if not connection:
        return {
            "connected": False,
            "username": None
        }
    
    return {
        "connected": True,
        "username": connection.github_username,
        "connected_at": connection.created_at.isoformat()
    }
```

#### GET /github/projects (Updated)
Fetches projects using stored OAuth token.

```python
@router.get("/github/projects")
async def get_github_projects(
    months: int = 12,
    technologies: Optional[str] = None,
    top_n: int = 5,
    auth: AuthorizedAPIKey = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Fetch GitHub projects using user's OAuth token."""
    # Get user's GitHub connection
    connection = await get_user_github_connection(auth.user_id, db)
    
    if not connection:
        raise HTTPException(
            status_code=401,
            detail="GitHub not connected. Please connect your GitHub account first."
        )
    
    # Decrypt access token
    access_token = decrypt_token(connection.access_token)
    
    # Use GitHub API directly (not gh CLI)
    repos = await fetch_repos_via_api(access_token, months)
    
    # ... rest of the logic
```

### 5. GitHub API Client

Replace `gh` CLI with direct API calls:

```python
import httpx

class GitHubAPIClient:
    """GitHub API client using OAuth tokens."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }
    
    async def get_user(self) -> dict:
        """Get authenticated user info."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/user",
                headers=self.headers
            )
            return response.json()
    
    async def list_repos(
        self,
        per_page: int = 100,
        sort: str = "updated",
        affiliation: str = "owner"
    ) -> list[dict]:
        """List user's repositories."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/user/repos",
                headers=self.headers,
                params={
                    "per_page": per_page,
                    "sort": sort,
                    "affiliation": affiliation,
                    "visibility": "public",  # Only public repos
                }
            )
            return response.json()
    
    async def get_repo_topics(self, owner: str, repo: str) -> list[str]:
        """Get repository topics."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/topics",
                headers={**self.headers, "Accept": "application/vnd.github.mercy-preview+json"}
            )
            return response.json().get("names", [])
```

### 6. Token Security

**Encryption at Rest:**
```python
from cryptography.fernet import Fernet

class TokenEncryption:
    """Encrypt/decrypt OAuth tokens for storage."""
    
    def __init__(self, key: bytes):
        self.fernet = Fernet(key)
    
    def encrypt(self, token: str) -> str:
        return self.fernet.encrypt(token.encode()).decode()
    
    def decrypt(self, encrypted_token: str) -> str:
        return self.fernet.decrypt(encrypted_token.encode()).decode()
```

**Environment Variable:**
```env
TOKEN_ENCRYPTION_KEY=<generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
```

### 7. Frontend Changes

#### Settings Page - GitHub Connection

```tsx
// components/GitHubSettings.tsx
const GitHubSettings: React.FC = () => {
    const [status, setStatus] = useState<GitHubStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        fetchGitHubStatus();
    }, []);
    
    const handleConnect = async () => {
        const { authorization_url } = await api.get('/github/connect');
        window.location.href = authorization_url;
    };
    
    const handleDisconnect = async () => {
        await api.delete('/github/disconnect');
        setStatus({ connected: false, username: null });
    };
    
    return (
        <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <GitHubIcon className="w-10 h-10" />
                    <div>
                        <h3 className="font-bold">GitHub Connection</h3>
                        {status?.connected ? (
                            <p className="text-sm text-green-600">
                                Connected as {status.username}
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500">
                                Connect to import your repositories
                            </p>
                        )}
                    </div>
                </div>
                {status?.connected ? (
                    <button onClick={handleDisconnect} className="btn-secondary">
                        Disconnect
                    </button>
                ) : (
                    <button onClick={handleConnect} className="btn-primary">
                        Connect GitHub
                    </button>
                )}
            </div>
        </div>
    );
};
```

#### Updated GitHubSyncDialog

```tsx
// components/GitHubSyncDialog.tsx
const GitHubSyncDialog: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
    const [connectionStatus, setConnectionStatus] = useState<GitHubStatus | null>(null);
    
    useEffect(() => {
        if (isOpen) {
            // Check if user has connected GitHub
            fetchGitHubStatus().then(setConnectionStatus);
        }
    }, [isOpen]);
    
    if (!connectionStatus?.connected) {
        return (
            <Dialog open={isOpen} onClose={onClose}>
                <div className="text-center py-8">
                    <GitHubIcon className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Connect Your GitHub</h2>
                    <p className="text-slate-600 mb-6">
                        Connect your GitHub account to import your repositories as projects.
                    </p>
                    <button onClick={handleConnect} className="btn-primary">
                        Connect GitHub Account
                    </button>
                </div>
            </Dialog>
        );
    }
    
    // ... rest of the dialog for fetching and selecting repos
};
```

## Migration Path

### Phase 1: Add OAuth Support (Backward Compatible)
1. Add OAuth endpoints alongside existing `gh` CLI code
2. Add database table for storing connections
3. Update frontend to show connection status
4. Keep `gh` CLI as fallback for local development

### Phase 2: Deprecate CLI Approach
1. Remove `gh` CLI code from production
2. Keep for local development with feature flag
3. Update documentation

### Phase 3: Production Only OAuth
1. Remove all `gh` CLI code
2. OAuth-only approach

## Alternative: GitHub App

For more granular permissions, consider GitHub App instead:

**Pros:**
- Fine-grained repository permissions
- Can be installed on organizations
- Better for team/enterprise use
- Webhook support for real-time updates

**Cons:**
- More complex setup
- Requires GitHub App manifest
- User must "install" the app

**When to use:**
- Enterprise customers
- Need organization-level access
- Want webhook notifications
- Need to write to repositories

## Security Considerations

1. **Token Storage**: Encrypt all tokens at rest
2. **Token Rotation**: Support refresh tokens if available
3. **Scope Limitation**: Request minimal required scopes
4. **State Parameter**: Validate OAuth state to prevent CSRF
5. **Token Revocation**: Support disconnecting/removing tokens
6. **Audit Logging**: Log all GitHub API access

## Cost Considerations

GitHub API Rate Limits:
- **Authenticated requests**: 5,000 requests/hour per user
- **Unauthenticated**: 60 requests/hour per IP

With OAuth, each user has their own rate limit, making this scalable.

## Testing Strategy

1. **Unit Tests**: Mock GitHub API responses
2. **Integration Tests**: Use GitHub's test mode
3. **E2E Tests**: Test OAuth flow with test account
4. **Load Tests**: Verify rate limit handling

## Summary

| Aspect | Current (gh CLI) | Proposed (OAuth) |
|--------|------------------|------------------|
| Multi-user | ❌ No | ✅ Yes |
| Production | ❌ No | ✅ Yes |
| Per-user rate limits | ❌ No | ✅ Yes |
| Token security | ❌ Shared | ✅ Per-user encrypted |
| User experience | ❌ Requires CLI | ✅ Browser-based |
| Scalability | ❌ Limited | ✅ Scales with users |