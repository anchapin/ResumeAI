# GitHub OAuth Integration - Implementation Issues

## Phase 1: Add OAuth Support (Backward Compatible)

### Issue 1.1: Create GitHub OAuth App and Configure Environment
```yaml
Title: Create GitHub OAuth App and configure environment variables
Labels: enhancement, backend, github-integration
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Register a GitHub OAuth App and add required environment configuration for OAuth-based GitHub integration.
  
  ## Tasks
  - [ ] Create GitHub OAuth App at https://github.com/settings/developers
    - Application name: ResumeAI
    - Homepage URL: Configure for staging/production
    - Authorization callback URL: `/github/callback` endpoint
  - [ ] Add environment variables to config:
    - `GITHUB_CLIENT_ID`
    - `GITHUB_CLIENT_SECRET`
    - `GITHUB_CALLBACK_URL`
  - [ ] Update `config/settings.py` to include GitHub OAuth settings
  - [ ] Add variables to `.env.example` for documentation
  - [ ] Configure secrets in deployment environment (staging/production)
  
  ## Acceptance Criteria
  - GitHub OAuth App is registered and verified
  - Environment variables are accessible in application config
  - Secrets are properly secured in deployment environments
```

---

### Issue 1.2: Create Database Schema for GitHub Connections
```yaml
Title: Create database schema for storing GitHub OAuth connections
Labels: enhancement, database, github-integration
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create a database table to store user GitHub OAuth connections with encrypted tokens.
  
  ## Tasks
  - [ ] Create SQLAlchemy model `UserGitHubConnection` in `database/models.py`:
    ```python
    class UserGitHubConnection(Base):
        __tablename__ = "user_github_connections"
        
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey("users.id"), unique=True)
        github_user_id = Column(String(255), unique=True)
        github_username = Column(String(255))
        access_token = Column(Text)  # Encrypted
        refresh_token = Column(Text, nullable=True)
        token_expires_at = Column(DateTime, nullable=True)
        scopes = Column(ARRAY(String))
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ```
  - [ ] Create Alembic migration for the new table
  - [ ] Add indexes for `user_id` and `github_user_id`
  - [ ] Create CRUD operations in `database/crud.py`:
    - `create_github_connection()`
    - `get_github_connection_by_user()`
    - `get_github_connection_by_github_user()`
    - `update_github_connection()`
    - `delete_github_connection()`
  
  ## Acceptance Criteria
  - Migration runs successfully
  - CRUD operations work correctly
  - Indexes are created for performance
```

---

### Issue 1.3: Implement Token Encryption/Decryption
```yaml
Title: Implement secure token encryption and decryption utilities
Labels: enhancement, security, backend
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create a secure token encryption utility for storing GitHub OAuth tokens at rest.
  
  ## Tasks
  - [ ] Add `cryptography` dependency to `requirements.txt`
  - [ ] Create `lib/token_encryption.py`:
    ```python
    from cryptography.fernet import Fernet
    from config import settings
    
    class TokenEncryption:
        def __init__(self, key: bytes = None):
            self.fernet = Fernet(key or settings.token_encryption_key.encode())
        
        def encrypt(self, token: str) -> str:
            return self.fernet.encrypt(token.encode()).decode()
        
        def decrypt(self, encrypted_token: str) -> str:
            return self.fernet.decrypt(encrypted_token.encode()).decode()
    ```
  - [ ] Add `TOKEN_ENCRYPTION_KEY` to environment config
  - [ ] Generate and document key generation command:
    ```bash
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ```
  - [ ] Add unit tests for encryption/decryption
  - [ ] Add key rotation documentation
  
  ## Acceptance Criteria
  - Tokens are encrypted before database storage
  - Tokens can be decrypted for API calls
  - Unit tests pass with 100% coverage
  - Key generation is documented
```

---

### Issue 1.4: Create GitHub API Client Class
```yaml
Title: Create GitHub API client class for OAuth-based API calls
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Replace `gh` CLI subprocess calls with direct GitHub API calls using user OAuth tokens.
  
  ## Tasks
  - [ ] Create `lib/github_api_client.py`:
    ```python
    import httpx
    from typing import List, Dict, Any, Optional
    
    class GitHubAPIClient:
        def __init__(self, access_token: str):
            self.access_token = access_token
            self.base_url = "https://api.github.com"
            self.headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            }
        
        async def get_user(self) -> dict
        async def list_repos(self, per_page, sort, affiliation) -> list
        async def get_repo_topics(self, owner, repo) -> list
        async def get_repo(self, owner, repo) -> dict
    ```
  - [ ] Implement error handling for:
    - Rate limiting (403 with X-RateLimit headers)
    - Token expiration/revocation
    - Network errors
  - [ ] Add retry logic with exponential backoff
  - [ ] Add unit tests with mocked HTTP responses
  - [ ] Add integration tests against GitHub API (optional)
  
  ## Acceptance Criteria
  - All `gh` CLI functionality is replicated
  - Proper error handling for all API responses
  - Rate limit handling with proper headers
  - Unit tests pass
```

---

### Issue 1.5: Implement OAuth Connect Endpoint
```yaml
Title: Implement GET /github/connect endpoint for OAuth flow initiation
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create endpoint that generates GitHub OAuth authorization URL for the frontend to redirect to.
  
  ## Tasks
  - [ ] Add endpoint in `routes/github.py`:
    ```python
    @router.get("/github/connect")
    async def github_connect(
        redirect_uri: Optional[str] = None,
        auth: AuthorizedAPIKey = Depends()
    ):
        # Generate secure state parameter
        # Store state in Redis/cache with user_id
        # Build authorization URL
        # Return { authorization_url, state }
    ```
  - [ ] Implement state parameter generation and storage
  - [ ] Support custom redirect URIs for different environments
  - [ ] Add proper OAuth scopes: `read:user public_repo`
  - [ ] Add API documentation
  - [ ] Add unit tests
  
  ## Acceptance Criteria
  - Endpoint returns valid GitHub authorization URL
  - State parameter is securely generated and stored
  - Proper scopes are requested
  - Documentation is complete
```

---

### Issue 1.6: Implement OAuth Callback Endpoint
```yaml
Title: Implement GET /github/callback endpoint for OAuth flow completion
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create endpoint that handles the OAuth callback from GitHub, exchanges code for token, and stores connection.
  
  ## Tasks
  - [ ] Add endpoint in `routes/github.py`:
    ```python
    @router.get("/github/callback")
    async def github_callback(
        code: str,
        state: str,
        db: AsyncSession = Depends(get_db)
    ):
        # Validate state parameter
        # Exchange code for access token
        # Get GitHub user info
        # Encrypt and store token
        # Redirect to frontend
    ```
  - [ ] Implement state validation against stored value
  - [ ] Implement token exchange with GitHub:
    ```python
    POST https://github.com/login/oauth/access_token
    {
        "client_id": "...",
        "client_secret": "...",
        "code": "...",
        "redirect_uri": "..."
    }
    ```
  - [ ] Fetch GitHub user profile with token
  - [ ] Encrypt token before database storage
  - [ ] Handle errors (invalid code, expired state, etc.)
  - [ ] Redirect to frontend with success/error status
  - [ ] Add unit tests
  
  ## Acceptance Criteria
  - Valid OAuth codes are exchanged for tokens
  - Tokens are encrypted and stored in database
  - Invalid requests return appropriate errors
  - User is redirected to frontend with status
```

---

### Issue 1.7: Implement GitHub Disconnect Endpoint
```yaml
Title: Implement DELETE /github/disconnect endpoint
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create endpoint to remove GitHub connection and delete stored tokens.
  
  ## Tasks
  - [ ] Add endpoint in `routes/github.py`:
    ```python
    @router.delete("/github/disconnect")
    async def github_disconnect(
        auth: AuthorizedAPIKey = Depends(),
        db: AsyncSession = Depends(get_db)
    ):
        # Delete user's GitHub connection
        # Return success status
    ```
  - [ ] Delete encrypted token from database
  - [ ] Optionally: Revoke token with GitHub API
  - [ ] Add unit tests
  
  ## Acceptance Criteria
  - User's GitHub connection is removed
  - Tokens are deleted from database
  - Proper error handling for non-existent connections
```

---

### Issue 1.8: Update GitHub Status Endpoint for OAuth
```yaml
Title: Update GET /github/status to check OAuth connection status
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Update the existing status endpoint to check for OAuth connection instead of `gh` CLI status.
  
  ## Tasks
  - [ ] Update `routes/github.py` status endpoint:
    ```python
    @router.get("/github/status")
    async def get_github_status(
        auth: AuthorizedAPIKey = Depends(),
        db: AsyncSession = Depends(get_db)
    ):
        connection = await get_user_github_connection(auth.user_id, db)
        return {
            "connected": bool(connection),
            "username": connection.github_username if connection else None,
            "connected_at": connection.created_at.isoformat() if connection else None
        }
    ```
  - [ ] Keep backward compatibility with `gh` CLI for local development
  - [ ] Add feature flag to switch between OAuth and CLI mode
  - [ ] Update response model
  - [ ] Add unit tests
  
  ## Acceptance Criteria
  - Returns OAuth connection status when configured
  - Falls back to CLI status in development mode
  - Response format is consistent
```

---

### Issue 1.9: Update GitHub Projects Endpoint for OAuth
```yaml
Title: Update GET /github/projects to use OAuth tokens
Labels: enhancement, backend, api
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Update the projects endpoint to fetch repositories using stored OAuth tokens instead of `gh` CLI.
  
  ## Tasks
  - [ ] Update `routes/github.py` projects endpoint:
    ```python
    @router.get("/github/projects")
    async def get_github_projects(
        months: int = 12,
        technologies: Optional[str] = None,
        top_n: int = 5,
        auth: AuthorizedAPIKey = Depends(),
        db: AsyncSession = Depends(get_db)
    ):
        # Get user's OAuth connection
        # Decrypt access token
        # Use GitHubAPIClient to fetch repos
        # Apply existing filtering/scoring logic
    ```
  - [ ] Use `GitHubAPIClient` instead of subprocess calls
  - [ ] Handle missing connection (user not connected)
  - [ ] Handle token expiration/revocation
  - [ ] Keep backward compatibility with CLI mode
  - [ ] Add unit tests
  
  ## Acceptance Criteria
  - Projects are fetched using OAuth when connected
  - Falls back to CLI in development mode
  - Proper error handling for missing/expired tokens
  - Response format unchanged for frontend compatibility
```

---

### Issue 1.10: Create GitHub Settings Component
```yaml
Title: Create GitHub connection settings component for frontend
Labels: enhancement, frontend, ui
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Create a settings page component for users to connect/disconnect their GitHub account.
  
  ## Tasks
  - [ ] Create `components/GitHubSettings.tsx`:
    - Display connection status
    - "Connect GitHub" button (redirects to OAuth)
    - "Disconnect" button for connected accounts
    - Connected username display
  - [ ] Add to settings page
  - [ ] Handle OAuth callback redirect:
    - Show success message on connection
    - Show error message on failure
  - [ ] Add loading states
  - [ ] Add error handling UI
  
  ## Acceptance Criteria
  - Users can initiate GitHub connection
  - Connection status is displayed correctly
  - Users can disconnect their account
  - Proper error handling and loading states
```

---

### Issue 1.11: Update GitHubSyncDialog for OAuth
```yaml
Title: Update GitHubSyncDialog to handle OAuth connection flow
Labels: enhancement, frontend, ui
Milestone: GitHub OAuth Integration

Body: |
  ## Overview
  Update the GitHub sync dialog to check OAuth connection and prompt users to connect if needed.
  
  ## Tasks
  - [ ] Update `components/GitHubSyncDialog.tsx`:
    - Check connection status on open
    - Show "Connect GitHub" prompt if not connected
    - Use OAuth flow for connection
    - Proceed with project sync if connected
  - [ ] Handle connection state changes
  - [ ] Update error messages for OAuth-specific errors
  - [ ] Add "Connect GitHub" button in dialog
  
  ## Acceptance Criteria
  - Dialog shows connection prompt when not connected
  - Users can connect from within the dialog
  - Project sync works after connection
  - Proper error handling
```

---

## Phase 2: Deprecate CLI Approach

### Issue 2.1: Add Feature Flag for OAuth/CLI Mode
```yaml
Title: Add feature flag to toggle between OAuth and CLI modes
Labels: enhancement, configuration
Milestone: GitHub OAuth Integration - Phase 2

Body: |
  ## Overview
  Add a configuration flag to control whether GitHub integration uses OAuth or CLI mode.
  
  ## Tasks
  - [ ] Add `GITHUB_AUTH_MODE` config option: `oauth` | `cli`
  - [ ] Default to `oauth` in production, `cli` in development
  - [ ] Update all GitHub endpoints to check this flag
  - [ ] Add environment-specific defaults
  - [ ] Document the flag in configuration docs
  
  ## Acceptance Criteria
  - Flag controls authentication mode
  - Defaults are appropriate for each environment
  - All endpoints respect the flag
```

---

### Issue 2.2: Remove CLI Code from Production Deployment
```yaml
Title: Remove gh CLI dependency from production deployment
Labels: refactor, deployment
Milestone: GitHub OAuth Integration - Phase 2

Body: |
  ## Overview
  Update deployment configuration to not require `gh` CLI in production.
  
  ## Tasks
  - [ ] Update Dockerfile to remove `gh` CLI installation
  - [ ] Update deployment scripts
  - [ ] Remove CLI-related environment variables from production
  - [ ] Update CI/CD pipelines
  - [ ] Update documentation
  
  ## Acceptance Criteria
  - Production deployment works without `gh` CLI
  - OAuth is the only authentication method in production
  - Documentation reflects the change
```

---

### Issue 2.3: Add Deprecation Warning for CLI Mode
```yaml
Title: Add deprecation warning when using CLI mode
Labels: maintenance, documentation
Milestone: GitHub OAuth Integration - Phase 2

Body: |
  ## Overview
  Add warnings when the application is running in CLI mode to prepare for removal.
  
  ## Tasks
  - [ ] Add startup warning log when `GITHUB_AUTH_MODE=cli`
  - [ ] Add warning in API responses when using CLI mode
  - [ ] Update documentation to mark CLI as deprecated
  - [ ] Add migration guide for developers
  
  ## Acceptance Criteria
  - Warnings are logged when using CLI mode
  - Documentation clearly marks CLI as deprecated
  - Migration guide is available
```

---

### Issue 2.4: Update Documentation for OAuth-Only Approach
```yaml
Title: Update all documentation to reflect OAuth-only approach
Labels: documentation
Milestone: GitHub OAuth Integration - Phase 2

Body: |
  ## Overview
  Update all documentation to remove CLI references and document OAuth-only usage.
  
  ## Tasks
  - [ ] Update README.md
  - [ ] Update API documentation
  - [ ] Update developer setup guide
  - [ ] Update user documentation
  - [ ] Remove CLI-related troubleshooting sections
  - [ ] Add OAuth troubleshooting section
  
  ## Acceptance Criteria
  - All documentation references OAuth only
  - No CLI-related instructions remain
  - OAuth troubleshooting is comprehensive
```

---

## Phase 3: Production Only OAuth

### Issue 3.1: Remove CLI Code from Codebase
```yaml
Title: Remove all gh CLI-related code from the codebase
Labels: refactor, cleanup
Milestone: GitHub OAuth Integration - Phase 3

Body: |
  ## Overview
  Remove all code related to `gh` CLI subprocess calls and CLI mode.
  
  ## Tasks
  - [ ] Remove `subprocess` calls to `gh` from `routes/github.py`
  - [ ] Remove CLI-specific helper functions
  - [ ] Remove `GITHUB_AUTH_MODE` feature flag
  - [ ] Remove CLI-related imports
  - [ ] Clean up conditional logic
  - [ ] Remove CLI-related tests
  
  ## Files to Update
  - `routes/github.py`
  - `lib/github_api_client.py` (remove CLI fallback)
  - `config/settings.py` (remove CLI config)
  - Tests
  
  ## Acceptance Criteria
  - No `subprocess` calls to `gh` remain
  - No CLI-related code paths exist
  - All tests pass
  - Code is cleaner and simpler
```

---

### Issue 3.2: Remove CLI Dependencies
```yaml
Title: Remove CLI-related dependencies and configuration
Labels: cleanup, dependencies
Milestone: GitHub OAuth Integration - Phase 3

Body: |
  ## Overview
  Clean up any remaining CLI-related dependencies and configuration.
  
  ## Tasks
  - [ ] Remove any CLI-related packages from requirements.txt
  - [ ] Remove CLI environment variables from config
  - [ ] Remove CLI-related CI/CD steps
  - [ ] Update development environment setup
  - [ ] Clean up .env.example
  
  ## Acceptance Criteria
  - No CLI dependencies remain
  - Configuration is clean
  - Development setup works without CLI
```

---

### Issue 3.3: Final Testing and Validation
```yaml
Title: Final testing and validation of OAuth-only implementation
Labels: testing, quality
Milestone: GitHub OAuth Integration - Phase 3

Body: |
  ## Overview
  Comprehensive testing of the OAuth-only implementation before final release.
  
  ## Tasks
  - [ ] End-to-end testing of OAuth flow
  - [ ] Load testing with multiple concurrent users
  - [ ] Security audit of token storage
  - [ ] Rate limit handling verification
  - [ ] Error scenario testing:
    - Token expiration
    - Token revocation
    - GitHub API downtime
    - Invalid tokens
  - [ ] User acceptance testing
  - [ ] Documentation review
  
  ## Acceptance Criteria
  - All tests pass
  - Security review complete
  - Performance is acceptable
  - Documentation is accurate
```

---

### Issue 3.4: Monitor and Alert for OAuth Issues
```yaml
Title: Add monitoring and alerting for OAuth-related issues
Labels: monitoring, operations
Milestone: GitHub OAuth Integration - Phase 3

Body: |
  ## Overview
  Set up monitoring and alerting for OAuth authentication issues.
  
  ## Tasks
  - [ ] Add metrics for:
    - OAuth connection success/failure rate
    - Token refresh events
    - API rate limit hits
    - Token expiration events
  - [ ] Create alerts for:
    - High authentication failure rate
    - Rate limit approaching
    - Token storage issues
  - [ ] Add dashboard for OAuth health
  - [ ] Document runbook for common issues
  
  ## Acceptance Criteria
  - Metrics are collected and visible
  - Alerts are configured
  - Dashboard shows OAuth health
  - Runbook is documented
```

---

## Quick Create Script

Save this as `create-issues.sh` to create all issues at once:

```bash
#!/bin/bash

# Phase 1 Issues
gh issue create --title "Create GitHub OAuth App and configure environment variables" \
  --label "enhancement,backend,github-integration" \
  --milestone "GitHub OAuth Integration" \
  --body-file issue-1.1.md

gh issue create --title "Create database schema for storing GitHub OAuth connections" \
  --label "enhancement,database,github-integration" \
  --milestone "GitHub OAuth Integration" \
  --body-file issue-1.2.md

# ... continue for all issues

echo "All issues created!"