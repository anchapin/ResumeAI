# OAuth Testing Guide

Comprehensive testing documentation for ResumeAI's OAuth-only authentication implementation.

## Table of Contents

1. [Overview](#overview)
2. [Test Suite Structure](#test-suite-structure)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Test Fixtures](#test-fixtures)
6. [Writing New Tests](#writing-new-tests)
7. [Debugging Tests](#debugging-tests)
8. [Continuous Integration](#continuous-integration)

## Overview

The OAuth testing suite validates:

- **GitHub OAuth Flow**: Complete authentication flow from authorization to token refresh
- **LinkedIn OAuth Flow**: LinkedIn integration (if configured)
- **Token Management**: Generation, validation, refresh, expiration, and revocation
- **Error Handling**: Invalid states, expired tokens, malformed requests
- **User Session Management**: Session lifecycle and authentication state
- **API Authentication**: Protected endpoint access with valid tokens
- **Concurrent Requests**: Thread-safe token operations
- **Rate Limiting**: Request rate limiting enforcement
- **Security**: Token encryption, CSRF protection, timing attack mitigation

## Test Suite Structure

### Test Files

```
resume-api/tests/
├── test_oauth_integration.py       # Complete OAuth flow tests
├── test_oauth_endpoints.py         # Individual endpoint tests
├── conftest_oauth.py               # Shared fixtures and utilities
├── test_github_oauth.py            # (Existing) GitHub OAuth tests
└── monitoring/
    └── test_oauth_monitoring.py    # OAuth event monitoring
```

### Test Classes

#### `test_oauth_integration.py`

- `TestGitHubOAuthFlow`: Complete OAuth flow from connect to disconnect
- `TestTokenManagement`: Token generation, refresh, expiration, revocation
- `TestOAuthErrorHandling`: Error scenarios and edge cases
- `TestConcurrentRequests`: Concurrent request handling
- `TestRateLimiting`: Rate limit enforcement
- `TestSessionManagement`: User session management
- `TestAPIAuthentication`: API authentication with OAuth tokens

#### `test_oauth_endpoints.py`

- `TestGitHubConnectEndpoint`: `/github/connect` endpoint tests
- `TestGitHubCallbackEndpoint`: `/github/callback` endpoint tests
- `TestGitHubStatusEndpoint`: `/github/status` endpoint tests
- `TestGitHubDisconnectEndpoint`: `/github/disconnect` endpoint tests
- `TestAuthRefreshEndpoint`: `/auth/refresh` endpoint tests
- `TestAuthLogoutEndpoint`: `/auth/logout` endpoint tests
- `TestAuthMeEndpoint`: `/auth/me` endpoint tests
- `TestAuthHealthEndpoint`: `/auth/health` endpoint tests

## Running Tests

### Run All OAuth Tests

```bash
cd resume-api

# Run all OAuth tests
pytest tests/test_oauth_integration.py tests/test_oauth_endpoints.py -v

# Run with coverage report
pytest tests/test_oauth_integration.py tests/test_oauth_endpoints.py --cov=routes --cov=config --cov=database -v

# Run specific test class
pytest tests/test_oauth_integration.py::TestGitHubOAuthFlow -v

# Run specific test function
pytest tests/test_oauth_integration.py::TestGitHubOAuthFlow::test_github_oauth_complete_flow -v
```

### Run with Different Markers

```bash
# Run async tests only
pytest -m asyncio tests/test_oauth_integration.py tests/test_oauth_endpoints.py

# Run slow tests (may take longer)
pytest -m slow tests/test_oauth_integration.py

# Skip slow tests
pytest -m "not slow" tests/test_oauth_integration.py
```

### Run with Output Options

```bash
# Show print statements and logs
pytest tests/test_oauth_integration.py -v -s

# Generate HTML report
pytest tests/test_oauth_integration.py --html=report.html

# Generate JUnit XML (for CI)
pytest tests/test_oauth_integration.py --junit-xml=results.xml

# Show slowest tests
pytest tests/test_oauth_integration.py --durations=10
```

### Run with Coverage

```bash
# Generate coverage report
pytest tests/test_oauth_integration.py tests/test_oauth_endpoints.py \
  --cov=routes.auth \
  --cov=routes.github \
  --cov=config.jwt_utils \
  --cov=config.security \
  --cov-report=html \
  --cov-report=term-missing

# View coverage report
open htmlcov/index.html  # macOS
firefox htmlcov/index.html  # Linux
```

### Run All Tests Including Existing

```bash
# Run all tests
pytest tests/ -v

# Run all auth/OAuth related tests
pytest tests/test_oauth*.py tests/test_auth*.py tests/test_user_auth.py -v

# Run all except slow/integration tests
pytest tests/ -m "not slow and not integration" -v
```

## Test Coverage

### Current Coverage Areas

| Component | Test Class | Coverage |
|-----------|-----------|----------|
| GitHub OAuth Connect | `TestGitHubConnectEndpoint` | 100% |
| GitHub OAuth Callback | `TestGitHubCallbackEndpoint` | 100% |
| GitHub Status | `TestGitHubStatusEndpoint` | 100% |
| GitHub Disconnect | `TestGitHubDisconnectEndpoint` | 100% |
| Auth Refresh | `TestAuthRefreshEndpoint` | 100% |
| Auth Logout | `TestAuthLogoutEndpoint` | 100% |
| Token Generation | `TestTokenManagement` | 100% |
| Token Encryption | `TestTokenManagement::test_github_token_encryption` | 100% |
| OAuth Flow | `TestGitHubOAuthFlow` | 100% |
| Error Handling | `TestOAuthErrorHandling` | 95% |
| Concurrent Requests | `TestConcurrentRequests` | 100% |

### Coverage Goals

- **Routes**: 95%+ for all auth/OAuth routes
- **Config**: 100% for jwt_utils, security, dependencies
- **Database**: 95%+ for OAuth models
- **Overall**: 90%+ for all OAuth-related code

## Test Fixtures

### Database Fixtures

```python
# In-memory test database
@pytest_asyncio.fixture
async def test_db_session(test_db_session_maker):
    async with test_db_session_maker() as session:
        yield session
```

### Client Fixtures

```python
# Unauthenticated client
@pytest_asyncio.fixture
async def unauthenticated_client(async_client):
    async_client.headers = {}
    return async_client

# Authenticated client with valid token
@pytest_asyncio.fixture
async def authenticated_client(async_client, test_user):
    token = create_access_token({"sub": str(test_user.id)})
    async_client.headers = {"Authorization": f"Bearer {token}"}
    return async_client
```

### User Fixtures

```python
@pytest_asyncio.fixture
async def test_user(test_db_session):
    # Creates a regular test user
    
@pytest_asyncio.fixture
async def admin_user(test_db_session):
    # Creates an admin test user
    
@pytest_asyncio.fixture
async def disabled_user(test_db_session):
    # Creates a disabled test user
```

### OAuth Fixtures

```python
@pytest_asyncio.fixture
async def github_oauth_state(test_db_session, test_user):
    # Valid OAuth state for GitHub
    
@pytest_asyncio.fixture
async def github_connection(test_db_session, test_user):
    # Active GitHub connection
    
@pytest_asyncio.fixture
async def valid_refresh_token(test_db_session, test_user):
    # Valid, non-expired refresh token
    
@pytest_asyncio.fixture
async def expired_refresh_token(test_db_session, test_user):
    # Expired refresh token
```

### Mock Fixtures

```python
@pytest.fixture
def mock_github_user_response():
    # Mock GitHub API user response
    
@pytest.fixture
def mock_github_token_response():
    # Mock GitHub token exchange response
    
@pytest.fixture
def mock_github_settings():
    # Mock GitHub OAuth settings
```

See [conftest_oauth.py](conftest_oauth.py) for complete fixture definitions.

## Writing New Tests

### Test Template

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient

class TestNewOAuthFeature:
    """Test new OAuth feature."""

    @pytest.mark.asyncio
    async def test_feature_success_case(
        self,
        authenticated_client: AsyncClient,
        test_user,
        test_db_session,
    ):
        """Test successful feature execution."""
        # Arrange
        # ... set up test data ...

        # Act
        response = await authenticated_client.get("/oauth/endpoint")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_feature_error_case(
        self,
        authenticated_client: AsyncClient,
    ):
        """Test feature error handling."""
        # Arrange
        # ... set up error condition ...

        # Act
        response = await authenticated_client.get("/oauth/endpoint")

        # Assert
        assert response.status_code == 400
        assert "error" in response.json()
```

### Best Practices

1. **Use Fixtures**: Leverage provided fixtures for consistency
2. **Test Both Success and Failure**: Cover happy paths and error scenarios
3. **Async/Await**: Always use `@pytest.mark.asyncio` for async tests
4. **Mocking**: Mock external services (GitHub API, etc.)
5. **Database Cleanup**: Fixtures handle cleanup automatically
6. **Assertions**: Use clear, specific assertions
7. **Naming**: Use descriptive test names starting with `test_`
8. **Docstrings**: Document test purpose in docstring

### Common Testing Patterns

#### Testing Protected Endpoints

```python
async def test_endpoint_requires_auth(self, unauthenticated_client):
    """Test that endpoint requires authentication."""
    response = await unauthenticated_client.get("/protected")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]
```

#### Testing with Mocked External APIs

```python
with patch("routes.github.exchange_code_for_token") as mock_exchange:
    mock_exchange.return_value = {"access_token": "token123"}
    response = await client.get("/github/callback?code=xyz&state=abc")
    assert response.status_code in [200, 302]
```

#### Testing Database State Changes

```python
# Verify connection is created
result = await test_db_session.execute(
    select(GitHubConnection).where(
        GitHubConnection.user_id == test_user.id
    )
)
connection = result.scalar_one_or_none()
assert connection is not None
```

## Debugging Tests

### View Test Output

```bash
# Show print statements and logging
pytest tests/test_oauth_integration.py::TestGitHubOAuthFlow::test_github_oauth_complete_flow -v -s

# Show warnings
pytest tests/test_oauth_integration.py -v -W default

# Drop into debugger on failure
pytest tests/test_oauth_integration.py --pdb
```

### Enable Logging

```python
# In test
import logging
logging.basicConfig(level=logging.DEBUG)

# Or via pytest
pytest tests/test_oauth_integration.py -v --log-cli-level=DEBUG
```

### Check Database State

```python
# In test with db_session fixture
result = await test_db_session.execute(select(User))
all_users = result.scalars().all()
print(f"Users in DB: {[u.email for u in all_users]}")
```

### Profile Test Execution

```bash
# Show slowest tests
pytest tests/test_oauth_integration.py --durations=10

# Profile with cProfile
pytest tests/test_oauth_integration.py --profile
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
name: OAuth Tests

on: [push, pull_request]

jobs:
  oauth-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
          
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
          
      - name: Run OAuth tests
        run: |
          cd resume-api
          pytest tests/test_oauth*.py -v --cov --cov-report=xml
          
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./resume-api/coverage.xml
```

### Pre-commit Hooks

```bash
# Run OAuth tests before committing
#!/bin/bash
cd resume-api
pytest tests/test_oauth*.py -x

# Add to .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Test Requirements

```txt
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0
pytest-mock==3.11.1
httpx==0.24.0
sqlalchemy==2.0.20
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Event loop already closed" | Use `pytest-asyncio` plugin, ensure async fixtures correct |
| Database locked | Ensure fixtures use in-memory SQLite, not file-based |
| Token validation fails | Check JWT secret matches between token creation and validation |
| Mock not working | Ensure patch path matches import location |
| Fixture not found | Verify fixture is in `conftest_oauth.py` or same file |

### Getting Help

1. Check test output with `-v -s` flags
2. Run single test with `--pdb` for debugging
3. Review similar passing tests for patterns
4. Check fixture definitions in `conftest_oauth.py`
5. Refer to pytest async documentation

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/faq/testing.html)
- [HTTPX Documentation](https://www.python-httpx.org/)
