"""
Unit tests for GitHub OAuth endpoints.

Tests cover:
- GET /github/connect - OAuth flow initiation
- State parameter generation and validation
- Custom redirect URI support
- OAuth scopes configuration
- Error handling
"""

import sys
import urllib.parse
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Add resume-api to python path
sys.path.insert(0, str(Path(__file__).parent.parent.absolute()))

from routes.github import (
    router,
    GitHubConnectRequest,
    _generate_state,
    _build_authorization_url,
)

# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("routes.github.settings") as mock:
        mock.github_client_id = "test_client_id"
        mock.github_client_secret = "test_client_secret"
        mock.github_oauth_redirect_uri = "http://localhost:3000/auth/github/callback"
        yield mock


@pytest.fixture
def mock_limiter():
    """Mock rate limiter."""
    with patch("routes.github.limiter") as mock:
        mock.limit = lambda x: lambda f: f
        yield mock


@pytest.fixture
def app(mock_settings, mock_limiter):
    """Create test app with GitHub router."""
    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_db():
    """Mock database session."""
    with patch("routes.github.get_async_session") as mock:
        mock.return_value = MagicMock()
        yield mock


# =============================================================================
# State Parameter Tests
# =============================================================================


def test_generate_state():
    """Test state parameter generation is secure and unique."""
    state1 = _generate_state()
    state2 = _generate_state()

    # States should be different
    assert state1 != state2

    # States should be strings
    assert isinstance(state1, str)
    assert isinstance(state2, str)

    # States should have reasonable length (secrets.token_urlsafe(32) produces ~43 chars)
    assert len(state1) >= 32
    assert len(state2) >= 32

    # States should be URL-safe
    assert urllib.parse.quote(state1, safe="") == state1
    assert urllib.parse.quote(state2, safe="") == state2


# =============================================================================
# Authorization URL Building Tests
# =============================================================================


def test_build_authorization_url_basic():
    """Test building authorization URL with basic parameters."""
    client_id = "test_client_id"
    redirect_uri = "http://localhost:3000/auth/github/callback"
    state = "test_state_12345"

    url = _build_authorization_url(client_id, redirect_uri, state)

    assert url.startswith("https://github.com/login/oauth/authorize?")
    assert f"client_id={client_id}" in url
    assert f"redirect_uri={urllib.parse.quote(redirect_uri, safe='')}" in url
    assert f"state={state}" in url
    assert "response_type=code" in url


def test_build_authorization_url_with_scopes():
    """Test building authorization URL with custom scopes."""
    client_id = "test_client_id"
    redirect_uri = "http://localhost:3000/auth/github/callback"
    state = "test_state"
    scopes = "read:user public_repo repo"

    url = _build_authorization_url(client_id, redirect_uri, state, scopes)

    # Check that scopes are in the URL (URL-encoded)
    assert "scope=" in url
    # Parse the URL and check scopes parameter
    from urllib.parse import parse_qs

    parsed = urllib.parse.urlparse(url)
    params = parse_qs(parsed.query)
    assert "scope" in params
    assert params["scope"][0] == scopes


# =============================================================================
# GET /github/connect Tests
# =============================================================================


def test_github_connect_success(client, mock_settings):
    """Test successful GitHub connect endpoint."""
    response = client.get("/github/connect")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "authorization_url" in data
    assert "state" in data
    assert "expires_in" in data

    # Verify authorization_url
    assert data["authorization_url"].startswith(
        "https://github.com/login/oauth/authorize?"
    )
    assert "client_id=test_client_id" in data["authorization_url"]
    # Check scopes are in the URL (may be URL-encoded with + or %20)
    assert "scope=" in data["authorization_url"]
    parsed = urllib.parse.urlparse(data["authorization_url"])
    params = urllib.parse.parse_qs(parsed.query)
    assert "scope" in params
    assert params["scope"][0] == "read:user public_repo"

    # Verify state is generated
    assert len(data["state"]) >= 32

    # Verify expires_in
    assert data["expires_in"] == 600  # 10 minutes


def test_github_connect_with_custom_redirect_uri(client, mock_settings):
    """Test GitHub connect with custom redirect URI."""
    custom_redirect = "https://myapp.com/auth/github/callback"

    response = client.get(
        f"/github/connect?redirect_uri={urllib.parse.quote(custom_redirect, safe='')}"
    )

    assert response.status_code == 200
    data = response.json()

    # Verify custom redirect URI is used (URL-encoded)
    assert "redirect_uri=" in data["authorization_url"]
    parsed = urllib.parse.urlparse(data["authorization_url"])
    params = urllib.parse.parse_qs(parsed.query)
    assert params["redirect_uri"][0] == custom_redirect


def test_github_connect_with_invalid_redirect_uri(client, mock_settings):
    """Test GitHub connect rejects invalid redirect URI."""
    response = client.get("/github/connect?redirect_uri=ftp://example.com/callback")

    # Should return 422 validation error or 400
    assert response.status_code in [400, 422]


def test_github_connect_no_redirect_uri(client, mock_settings):
    """Test GitHub connect uses default redirect when none provided."""
    response = client.get("/github/connect")

    assert response.status_code == 200
    data = response.json()

    # Verify default redirect URI is used
    default_redirect = "http://localhost:3000/auth/github/callback"
    parsed = urllib.parse.urlparse(data["authorization_url"])
    params = urllib.parse.parse_qs(parsed.query)
    assert params["redirect_uri"][0] == default_redirect


def test_github_connect_oauth_not_configured(client):
    """Test GitHub connect when OAuth is not configured."""
    # Mock settings with no GitHub credentials
    with patch("routes.github.settings") as mock:
        mock.github_client_id = None
        mock.github_client_secret = None

        with patch.dict("os.environ", {}, clear=True):
            response = client.get("/github/connect")

            assert response.status_code == 501
            data = response.json()
            assert "not configured" in data["detail"]


def test_github_connect_oauth_scopes(client, mock_settings):
    """Test that correct OAuth scopes are requested."""
    response = client.get("/github/connect")

    assert response.status_code == 200
    data = response.json()

    # Verify scopes are in authorization URL
    parsed = urllib.parse.urlparse(data["authorization_url"])
    params = urllib.parse.parse_qs(parsed.query)
    assert "scope" in params
    scope_value = params["scope"][0]
    assert "read:user" in scope_value
    assert "public_repo" in scope_value


# =============================================================================
# GET /github/callback Tests
# =============================================================================


def test_github_callback_with_valid_state(app, mock_db, mock_settings):
    """Test GitHub callback with valid state parameter."""
    test_code = "test_authorization_code"
    test_state = "test_state_12345"

    client = TestClient(app)
    response = client.get(f"/github/callback?code={test_code}&state={test_state}")

    assert response.status_code == 200
    data = response.json()

    # Verify callback is received
    assert "message" in data
    assert "status" in data
    assert data["status"] == "pending_full_implementation"


def test_github_callback_without_state(app, mock_db, mock_settings):
    """Test GitHub callback without state parameter is rejected."""
    test_code = "test_authorization_code"

    client = TestClient(app)
    response = client.get(f"/github/callback?code={test_code}")

    assert response.status_code == 400
    data = response.json()

    assert "State parameter is required" in data["detail"]


def test_github_callback_without_code(app, mock_db, mock_settings):
    """Test GitHub callback without code parameter."""
    test_state = "test_state_12345"

    client = TestClient(app)
    response = client.get(f"/github/callback?state={test_state}")

    # FastAPI should reject this due to missing required query parameter
    assert response.status_code == 422


# =============================================================================
# GET /github/health Tests
# =============================================================================


def test_github_oauth_health_healthy(client, mock_settings):
    """Test health check when OAuth is configured."""
    response = client.get("/github/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "github_oauth"
    assert data["configured"] is True
    assert "scopes" in data
    assert "read:user" in data["scopes"]
    assert "public_repo" in data["scopes"]


def test_github_oauth_health_unconfigured():
    """Test health check when OAuth is not configured."""
    # Create app with mock settings that has no GitHub config
    with patch("routes.github.settings") as mock:
        mock.github_client_id = None
        mock.github_client_secret = None

        with patch.dict("os.environ", {}, clear=True):
            test_app = FastAPI()
            test_app.include_router(router)
            client = TestClient(test_app)

            response = client.get("/github/health")

            assert response.status_code == 200
            data = response.json()

            assert data["status"] == "unconfigured"
            assert data["service"] == "github_oauth"
            assert data["configured"] is False


# =============================================================================
# Request Model Tests
# =============================================================================


def test_github_connect_request_valid():
    """Test GitHubConnectRequest with valid redirect URI."""
    request = GitHubConnectRequest(
        redirect_uri="https://myapp.com/auth/github/callback"
    )

    assert request.redirect_uri == "https://myapp.com/auth/github/callback"


def test_github_connect_request_none_redirect_uri():
    """Test GitHubConnectRequest with None redirect URI."""
    request = GitHubConnectRequest(redirect_uri=None)

    assert request.redirect_uri is None


def test_github_connect_request_invalid_scheme():
    """Test GitHubConnectRequest rejects invalid URI scheme."""
    with pytest.raises(ValueError) as exc_info:
        GitHubConnectRequest(redirect_uri="ftp://example.com/callback")

    assert "must start with http:// or https://" in str(exc_info.value)


def test_github_connect_request_invalid_format():
    """Test GitHubConnectRequest rejects invalid URI format."""
    with pytest.raises(ValueError) as exc_info:
        GitHubConnectRequest(redirect_uri="not-a-valid-url")

    # The error message should mention the issue with the URI
    error_msg = str(exc_info.value)
    assert (
        "http" in error_msg.lower()
        or "redirect" in error_msg.lower()
        or "uri" in error_msg.lower()
    )


# =============================================================================
# Security Tests
# =============================================================================


def test_state_parameter_uniqueness():
    """Test that multiple state parameters are unique."""
    states = [_generate_state() for _ in range(100)]

    # All states should be unique
    assert len(states) == len(set(states))

    # All should be different
    for i, state1 in enumerate(states):
        for state2 in states[i + 1 :]:
            assert state1 != state2


def test_authorization_url_contains_required_params():
    """Test authorization URL contains all required parameters."""
    client_id = "test_client_id"
    redirect_uri = "http://localhost:3000/auth/github/callback"
    state = "test_state"

    url = _build_authorization_url(client_id, redirect_uri, state)

    # Required parameters
    required_params = ["client_id", "redirect_uri", "scope", "state", "response_type"]

    for param in required_params:
        assert param in url, f"Required parameter '{param}' not found in URL"


def test_oauth_scopes_read_user():
    """Test OAuth scopes include read:user."""
    client_id = "test_client_id"
    redirect_uri = "http://localhost:3000/auth/github/callback"
    state = "test_state"

    url = _build_authorization_url(client_id, redirect_uri, state)

    # Parse the URL to check scopes
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    assert "scope" in params
    assert "read:user" in params["scope"][0]


def test_oauth_scopes_public_repo():
    """Test OAuth scopes include public_repo."""
    client_id = "test_client_id"
    redirect_uri = "http://localhost:3000/auth/github/callback"
    state = "test_state"

    url = _build_authorization_url(client_id, redirect_uri, state)

    assert "public_repo" in url


# =============================================================================
# Integration Tests
# =============================================================================


def test_full_oauth_flow_initiation(client, mock_settings):
    """Test the full OAuth flow initiation."""
    # Step 1: Request authorization URL
    response = client.get("/github/connect")
    assert response.status_code == 200

    data = response.json()
    authorization_url = data["authorization_url"]
    state = data["state"]

    # Step 2: Verify URL format
    assert "github.com" in authorization_url
    assert "client_id=" in authorization_url
    assert "redirect_uri=" in authorization_url
    assert "state=" + state in authorization_url
    assert "scope=" in authorization_url

    # Step 3: Verify state is stored (in real app, this would be in session)
    assert state is not None
    assert len(state) >= 32


def test_multiple_oauth_requests_different_states(client, mock_settings):
    """Test multiple OAuth requests generate different states."""
    response1 = client.get("/github/connect")
    response2 = client.get("/github/connect")

    assert response1.status_code == 200
    assert response2.status_code == 200

    state1 = response1.json()["state"]
    state2 = response2.json()["state"]

    # States should be different
    assert state1 != state2


# =============================================================================
# Environment Variable Tests
# =============================================================================


def test_github_connect_uses_env_vars_when_not_in_settings():
    """Test that environment variables are used when settings don't have values."""
    with patch("routes.github.settings") as mock:
        mock.github_client_id = None
        mock.github_client_secret = None
        mock.github_oauth_redirect_uri = "http://default.com/callback"

        with patch.dict(
            "os.environ",
            {
                "GITHUB_CLIENT_ID": "env_client_id",
                "GITHUB_CLIENT_SECRET": "env_client_secret",
            },
        ):
            test_app = FastAPI()
            test_app.include_router(router)
            client = TestClient(test_app)

            response = client.get("/github/connect")

            assert response.status_code == 200
            data = response.json()

            # Verify environment variables are used
            assert "env_client_id" in data["authorization_url"]


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
