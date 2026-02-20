"""
Unit tests for GitHub integration routes.

Tests cover:
- OAuth connect endpoint with state generation
- GitHub status endpoint for both OAuth and CLI modes
- OAuth URL construction
- State validation
- Scope validation
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import uuid
from urllib.parse import urlparse, parse_qs

from main import app
from routes.github import (
    get_github_config,
    generate_state,
    store_state,
    validate_state,
    build_github_oauth_url,
    _oauth_states,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_oauth_states():
    """Clear OAuth states before each test."""
    _oauth_states.clear()
    yield
    _oauth_states.clear()


class TestGitHubConnect:
    """Test suite for GET /api/github/connect endpoint."""

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_connect_default_params(self):
        """Test GitHub connect with default parameters."""
        response = client.get("/api/github/connect")

        assert response.status_code == 200
        data = response.json()

        assert "auth_url" in data
        assert "state" in data

        # Verify auth_url structure
        parsed_url = urlparse(data["auth_url"])
        assert parsed_url.scheme == "https"
        assert parsed_url.netloc == "github.com"
        assert parsed_url.path == "/login/oauth/authorize"

        # Verify query parameters
        query = parse_qs(parsed_url.query)
        assert query.get("client_id") == ["test_client_id"]
        assert "state" in query
        assert query.get("scope") == ["repo user:email"]

        # Verify state is valid UUID
        try:
            uuid.UUID(data["state"])
        except ValueError:
            pytest.fail(f"State {data['state']} is not a valid UUID")

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_connect_custom_redirect_uri(self):
        """Test GitHub connect with custom redirect URI."""
        custom_uri = "https://example.com/callback"
        response = client.get(f"/api/github/connect?redirect_uri={custom_uri}")

        assert response.status_code == 200
        data = response.json()

        # Verify redirect_uri is in auth_url
        parsed_url = urlparse(data["auth_url"])
        query = parse_qs(parsed_url.query)
        assert query.get("redirect_uri") == [custom_uri]

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_connect_custom_scopes(self):
        """Test GitHub connect with custom scopes."""
        custom_scopes = "user repo public_repo"
        response = client.get(f"/api/github/connect?scopes={custom_scopes}")

        assert response.status_code == 200
        data = response.json()

        parsed_url = urlparse(data["auth_url"])
        query = parse_qs(parsed_url.query)
        assert query.get("scope") == [custom_scopes]

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_connect_invalid_scope(self):
        """Test GitHub connect with invalid scope."""
        invalid_scope = "invalid_scope"
        response = client.get(f"/api/github/connect?scopes={invalid_scope}")

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower()

    @patch.dict("os.environ", {})
    def test_github_connect_missing_client_id(self):
        """Test GitHub connect when GITHUB_CLIENT_ID is not configured."""
        response = client.get("/api/github/connect")

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "GITHUB_CLIENT_ID" in data["detail"]

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_connect_multiple_calls_generate_different_states(self):
        """Test that multiple connect calls generate different states."""
        response1 = client.get("/api/github/connect")
        response2 = client.get("/api/github/connect")

        assert response1.status_code == 200
        assert response2.status_code == 200

        state1 = response1.json()["state"]
        state2 = response2.json()["state"]

        # States should be different
        assert state1 != state2


class TestGitHubStatus:
    """Test suite for GET /api/github/status endpoint."""

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "oauth"})
    def test_github_status_oauth_mode(self):
        """Test GitHub status in OAuth mode."""
        response = client.get("/api/github/status")

        assert response.status_code == 200
        data = response.json()

        assert "connected" in data
        assert "auth_mode" in data
        assert data["auth_mode"] == "oauth"
        # Not connected yet (database not implemented)
        assert data["connected"] is False

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_status_cli_mode_authenticated(self, mock_run):
        """Test GitHub status in CLI mode when authenticated."""
        # Mock gh CLI response
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Logged in to github.com as testuser (keyring)",
        )

        response = client.get("/api/github/status")

        assert response.status_code == 200
        data = response.json()

        assert data["auth_mode"] == "cli"
        assert data["connected"] is True
        assert data["username"] == "testuser"

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_status_cli_mode_not_authenticated(self, mock_run):
        """Test GitHub status in CLI mode when not authenticated."""
        # Mock gh CLI failure
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="You are not logged in",
        )

        response = client.get("/api/github/status")

        assert response.status_code == 200
        data = response.json()

        assert data["auth_mode"] == "cli"
        assert data["connected"] is False
        assert data["username"] is None

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run", side_effect=FileNotFoundError)
    def test_github_status_cli_mode_not_installed(self, mock_run):
        """Test GitHub status in CLI mode when gh CLI is not installed."""
        response = client.get("/api/github/status")

        assert response.status_code == 200
        data = response.json()

        assert data["auth_mode"] == "cli"
        assert data["connected"] is False

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "invalid"})
    def test_github_status_invalid_mode(self):
        """Test GitHub status with invalid auth mode."""
        response = client.get("/api/github/status")

        assert response.status_code == 500
        data = response.json()
        assert "Invalid GITHUB_AUTH_MODE" in data["detail"]


class TestGitHubUser:
    """Test suite for GET /api/github/user endpoint."""

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "oauth"})
    def test_github_user_oauth_mode_not_implemented(self):
        """Test GitHub user endpoint in OAuth mode (not yet implemented)."""
        response = client.get("/api/github/user")

        assert response.status_code == 501
        data = response.json()
        assert "not yet implemented" in data["detail"].lower()

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_user_cli_mode_success(self, mock_run):
        """Test GitHub user endpoint in CLI mode."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='{"id": 12345, "login": "testuser", "name": "Test User", "email": "test@example.com", "avatar_url": "https://example.com/avatar.png", "bio": "Test bio", "public_repos": 10}',
        )

        response = client.get("/api/github/user")

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == 12345
        assert data["login"] == "testuser"
        assert data["name"] == "Test User"
        assert data["email"] == "test@example.com"
        assert data["avatar_url"] == "https://example.com/avatar.png"
        assert data["bio"] == "Test bio"
        assert data["public_repos"] == 10

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_user_cli_mode_not_authenticated(self, mock_run):
        """Test GitHub user endpoint when CLI is not authenticated."""
        mock_run.return_value = MagicMock(returncode=1)

        response = client.get("/api/github/user")

        assert response.status_code == 401
        data = response.json()
        assert "not authenticated" in data["detail"].lower()


class TestGitHubRepositories:
    """Test suite for GET /api/github/repositories endpoint."""

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "oauth"})
    def test_github_repos_oauth_mode_not_implemented(self):
        """Test GitHub repositories endpoint in OAuth mode (not yet implemented)."""
        response = client.get("/api/github/repositories")

        assert response.status_code == 501
        data = response.json()
        assert "not yet implemented" in data["detail"].lower()

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_repos_cli_mode_success(self, mock_run):
        """Test GitHub repositories endpoint in CLI mode."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout='[{"name": "repo1", "description": "Test repo 1", "url": "https://github.com/user/repo1"}, {"name": "repo2", "description": "Test repo 2", "url": "https://github.com/user/repo2"}]',
        )

        response = client.get("/api/github/repositories")

        assert response.status_code == 200
        data = response.json()

        assert "repositories" in data
        assert "total" in data
        assert len(data["repositories"]) == 2
        assert data["total"] == 2
        assert data["repositories"][0]["name"] == "repo1"

    @patch.dict("os.environ", {"GITHUB_AUTH_MODE": "cli"})
    @patch("subprocess.run")
    def test_github_repos_with_limit(self, mock_run):
        """Test GitHub repositories endpoint with limit parameter."""
        mock_run.return_value = MagicMock(returncode=0, stdout="[]")

        response = client.get("/api/github/repositories?limit=50")

        assert response.status_code == 200

        # Verify the limit parameter was passed to gh CLI
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert "--limit" in call_args
        assert "50" in call_args


class TestHelperFunctions:
    """Test suite for helper functions."""

    def test_generate_state_returns_uuid(self):
        """Test that generate_state returns a valid UUID."""
        state = generate_state()

        try:
            uuid.UUID(state)
        except ValueError:
            pytest.fail(f"Generated state {state} is not a valid UUID")

    def test_generate_states_are_unique(self):
        """Test that generate_state produces unique values."""
        states = [generate_state() for _ in range(100)]

        assert len(set(states)) == 100

    def test_store_and_validate_state(self):
        """Test storing and validating a state."""
        state = generate_state()
        redirect_uri = "https://example.com/callback"

        store_state(state, redirect_uri)

        assert validate_state(state) is True

        # State should be removed after validation (no replay)
        assert validate_state(state) is False

    def test_validate_nonexistent_state(self):
        """Test validating a non-existent state."""
        assert validate_state("nonexistent_state") is False

    def test_validate_expired_state(self):
        """Test that expired states are rejected."""
        state = generate_state()

        # Store state with old timestamp
        import time

        _oauth_states[state] = {
            "redirect_uri": None,
            "created_at": time.time() - 700,  # 700 seconds ago (> 10 minutes)
        }

        assert validate_state(state) is False

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_get_github_config(self):
        """Test getting GitHub configuration."""
        config = get_github_config()

        assert config["client_id"] == "test_client_id"

    @patch.dict("os.environ", {}, clear=True)
    def test_get_github_config_missing_client_id(self):
        """Test getting GitHub config when client ID is missing."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException):  # Should raise HTTPException
            get_github_config()

    def test_build_github_oauth_url(self):
        """Test building GitHub OAuth URL."""
        client_id = "test_client_id"
        state = "test_state"
        redirect_uri = "https://example.com/callback"
        scopes = "repo user:email"

        url = build_github_oauth_url(client_id, state, redirect_uri, scopes)

        parsed_url = urlparse(url)
        query = parse_qs(parsed_url.query)

        assert parsed_url.scheme == "https"
        assert parsed_url.netloc == "github.com"
        assert parsed_url.path == "/login/oauth/authorize"
        assert query.get("client_id") == [client_id]
        assert query.get("state") == [state]
        assert query.get("redirect_uri") == [redirect_uri]
        assert query.get("scope") == [scopes]

    def test_build_github_oauth_url_without_redirect_uri(self):
        """Test building GitHub OAuth URL without custom redirect URI."""
        client_id = "test_client_id"
        state = "test_state"
        scopes = "repo user:email"

        url = build_github_oauth_url(client_id, state, None, scopes)

        parsed_url = urlparse(url)
        query = parse_qs(parsed_url.query)

        assert "redirect_uri" not in query


class TestGitHubCallback:
    """Test suite for GET /api/github/callback endpoint."""

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    @patch("routes.github.get_encryption")
    @patch("httpx.AsyncClient")
    def test_github_callback_success(self, mock_httpx, mock_encryption):
        """Test successful GitHub OAuth callback."""
        # Setup state
        state = generate_state()
        store_state(state)

        # Mock encryption
        mock_encryptor = MagicMock()
        mock_encryptor.encrypt.return_value = "encrypted_token"
        mock_encryption.return_value = mock_encryptor

        # Mock HTTP client response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "test_access_token",
            "token_type": "bearer",
            "scope": "repo user:email",
        }
        mock_httpx.return_value.__aenter__.return_value.post.return_value = (
            mock_response
        )

        response = client.get(f"/api/github/callback?code=test_code&state={state}")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "connected successfully" in data["message"]

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    def test_github_callback_invalid_state(self):
        """Test GitHub callback with invalid state."""
        response = client.get(
            "/api/github/callback?code=test_code&state=invalid_state"
        )

        assert response.status_code == 400
        data = response.json()
        assert "invalid or expired state" in data["detail"].lower()

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    @patch("httpx.AsyncClient")
    def test_github_callback_exchange_failed(self, mock_httpx):
        """Test GitHub callback when code exchange fails."""
        # Setup state
        state = generate_state()
        store_state(state)

        # Mock HTTP client error response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_httpx.return_value.__aenter__.return_value.post.return_value = (
            mock_response
        )

        response = client.get(f"/api/github/callback?code=test_code&state={state}")

        assert response.status_code == 400

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    @patch("httpx.AsyncClient")
    def test_github_callback_oauth_error(self, mock_httpx):
        """Test GitHub callback when OAuth returns an error."""
        # Setup state
        state = generate_state()
        store_state(state)

        # Mock HTTP client response with error
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "error": "invalid_grant",
            "error_description": "The code has expired.",
        }
        mock_httpx.return_value.__aenter__.return_value.post.return_value = (
            mock_response
        )

        response = client.get(f"/api/github/callback?code=expired_code&state={state}")

        assert response.status_code == 400
        data = response.json()
        assert "error" in data["detail"].lower()


class TestScopeValidation:
    """Test suite for OAuth scope validation."""

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    @pytest.mark.parametrize(
        "scope",
        [
            "repo",
            "repo user:email",
            "public_repo",
            "user:email",
            "read:org",
            "read:public_key",
        ],
    )
    def test_valid_scopes(self, scope):
        """Test that valid scopes are accepted."""
        response = client.get(f"/api/github/connect?scopes={scope}")

        assert response.status_code == 200

    @patch.dict("os.environ", {"GITHUB_CLIENT_ID": "test_client_id"})
    @pytest.mark.parametrize(
        "invalid_scope",
        ["invalid_scope", "admin:repo", "delete_repo", "write:org"],
    )
    def test_invalid_scopes(self, invalid_scope):
        """Test that invalid scopes are rejected."""
        response = client.get(f"/api/github/connect?scopes={invalid_scope}")

        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()
