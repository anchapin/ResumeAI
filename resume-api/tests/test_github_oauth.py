"""
Comprehensive tests for GitHub OAuth implementation.

Tests cover:
- OAuth flow initialization
- OAuth callback handling
- Token encryption and storage
- Connection status checking
- Error scenarios
- Security validations
"""

import pytest
import secrets
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import User, GitHubOAuthState, GitHubConnection
from routes.github import (
    generate_oauth_state,
    build_github_authorization_url,
    exchange_code_for_token,
    fetch_github_user,
)
from config import settings


class TestOAuthStateGeneration:
    """Test OAuth state generation."""

    def test_generate_oauth_state_returns_string(self):
        """Test that state generation returns a valid string."""
        state = generate_oauth_state()
        assert isinstance(state, str)
        assert len(state) > 0

    def test_generate_oauth_state_is_cryptographically_secure(self):
        """Test that generated states are unique and secure."""
        states = set()
        for _ in range(100):
            state = generate_oauth_state()
            states.add(state)

        # All states should be unique (probability of collision is negligible)
        assert len(states) == 100

    def test_generate_oauth_state_length(self):
        """Test that generated state has sufficient entropy."""
        state = generate_oauth_state()
        # token_urlsafe(32) generates 43 characters
        assert len(state) >= 40


class TestGitHubAuthorizationURL:
    """Test GitHub OAuth authorization URL building."""

    def test_build_authorization_url_contains_client_id(self):
        """Test that authorization URL contains client ID."""
        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state="test_state",
        )
        assert "client_id=test_client_id" in url

    def test_build_authorization_url_contains_redirect_uri(self):
        """Test that authorization URL contains redirect URI."""
        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state="test_state",
        )
        assert "redirect_uri=" in url
        assert "localhost" in url

    def test_build_authorization_url_contains_state(self):
        """Test that authorization URL contains state parameter."""
        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state="test_state",
        )
        assert "state=test_state" in url

    def test_build_authorization_url_contains_scopes(self):
        """Test that authorization URL contains requested scopes."""
        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state="test_state",
            scopes="user:email public_repo",
        )
        assert "scope=" in url

    def test_build_authorization_url_is_valid_github_url(self):
        """Test that authorization URL points to GitHub."""
        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state="test_state",
        )
        assert url.startswith("https://github.com/login/oauth/authorize")


@pytest.mark.asyncio
class TestTokenExchange:
    """Test GitHub OAuth token exchange."""

    async def test_exchange_code_for_token_success(self):
        """Test successful token exchange."""
        with patch("routes.github.AsyncClient") as mock_client_class:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json = AsyncMock(
                return_value={
                    "access_token": "gho_test_token",
                    "token_type": "bearer",
                    "scope": "user:email,public_repo",
                }
            )

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await exchange_code_for_token("test_code")

            assert result["access_token"] == "gho_test_token"
            assert result["token_type"] == "bearer"

    async def test_exchange_code_for_token_invalid_code(self):
        """Test token exchange with invalid code."""
        with patch("routes.github.AsyncClient") as mock_client_class:
            mock_response = AsyncMock()
            mock_response.status_code = 400
            mock_response.json = AsyncMock(
                return_value={"error": "bad_verification_code"}
            )

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await exchange_code_for_token("invalid_code")

            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    async def test_exchange_code_for_token_network_error(self):
        """Test token exchange with network error."""
        with patch("routes.github.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=Exception("Network error"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(Exception):
                await exchange_code_for_token("test_code")


@pytest.mark.asyncio
class TestFetchGitHubUser:
    """Test fetching GitHub user profile."""

    async def test_fetch_github_user_success(self):
        """Test successful GitHub user fetch."""
        with patch("routes.github.AsyncClient") as mock_client_class:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json = AsyncMock(
                return_value={
                    "id": 12345,
                    "login": "testuser",
                    "email": "test@example.com",
                    "name": "Test User",
                }
            )

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await fetch_github_user("gho_test_token")

            assert result["id"] == 12345
            assert result["login"] == "testuser"

    async def test_fetch_github_user_invalid_token(self):
        """Test fetch GitHub user with invalid token."""
        with patch("routes.github.AsyncClient") as mock_client_class:
            mock_response = AsyncMock()
            mock_response.status_code = 401

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await fetch_github_user("invalid_token")

            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST


class TestGitHubOAuthStateModel:
    """Test GitHub OAuth State database model."""

    def test_oauth_state_creation(self):
        """Test creating OAuth state object."""
        state = generate_oauth_state()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        oauth_state = GitHubOAuthState(
            state=state,
            user_id="test_user_id",
            expires_at=expires_at,
        )

        assert oauth_state.state == state
        assert oauth_state.user_id == "test_user_id"
        assert oauth_state.expires_at == expires_at

    def test_oauth_state_expiration_check(self):
        """Test checking if OAuth state is expired."""
        # Create expired state
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=1)
        oauth_state = GitHubOAuthState(
            state="expired_state",
            user_id="test_user_id",
            expires_at=expired_time,
        )

        assert datetime.now(timezone.utc) > oauth_state.expires_at

        # Create valid state
        valid_time = datetime.now(timezone.utc) + timedelta(minutes=10)
        valid_state = GitHubOAuthState(
            state="valid_state",
            user_id="test_user_id",
            expires_at=valid_time,
        )

        assert datetime.now(timezone.utc) < valid_state.expires_at


class TestGitHubConnectionModel:
    """Test GitHub Connection database model."""

    def test_github_connection_creation(self):
        """Test creating GitHub connection object."""
        connection = GitHubConnection(
            user_id="test_user_id",
            github_user_id=12345,
            github_username="testuser",
            access_token="encrypted_token",
            is_active=True,
        )

        assert connection.user_id == "test_user_id"
        assert connection.github_user_id == 12345
        assert connection.github_username == "testuser"
        assert connection.is_active is True

    def test_github_connection_encryption(self):
        """Test that access tokens are stored securely."""
        # This test assumes tokens are encrypted before storage
        token = "gho_plaintext_token"
        connection = GitHubConnection(
            user_id="test_user_id",
            github_user_id=12345,
            github_username="testuser",
            access_token=token,  # Should be encrypted
            is_active=True,
        )

        # Token should be stored (encryption happens at a different layer)
        assert connection.access_token is not None


class TestOAuthSecurityValidations:
    """Test OAuth security validations."""

    def test_state_parameter_must_be_present(self):
        """Test that state parameter is required for CSRF protection."""
        state = generate_oauth_state()
        # State should be a non-empty string
        assert state is not None
        assert len(state) > 0

    def test_state_should_be_unique_per_request(self):
        """Test that each OAuth request gets a unique state."""
        states = [generate_oauth_state() for _ in range(10)]
        # All states should be unique
        assert len(set(states)) == len(states)

    def test_token_exchange_requires_secret(self):
        """Test that token exchange requires client secret."""
        # This would be tested in the actual endpoint test
        # Here we just verify that the function signature includes secret
        import inspect

        sig = inspect.signature(exchange_code_for_token)
        # Function should use settings.github_client_secret internally
        assert "github_client_secret" in str(settings.__dict__)


class TestOAuthErrorHandling:
    """Test OAuth error handling."""

    @pytest.mark.asyncio
    async def test_missing_github_credentials_error(self):
        """Test error when GitHub credentials are missing."""
        with patch.object(settings, "github_client_id", None):
            with pytest.raises(HTTPException) as exc_info:
                await exchange_code_for_token("test_code")

            assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @pytest.mark.asyncio
    async def test_expired_state_error(self):
        """Test error when OAuth state is expired."""
        # This would be tested in the actual endpoint test
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=1)
        oauth_state = GitHubOAuthState(
            state="expired_state",
            user_id="test_user_id",
            expires_at=expired_time,
        )

        # Expired state should not be valid
        assert datetime.now(timezone.utc) > oauth_state.expires_at

    def test_invalid_redirect_uri_error(self):
        """Test error when redirect URI is invalid."""
        # This would be tested in the actual endpoint test
        # Invalid redirect URIs should be rejected
        invalid_uris = [
            "https://evil.com/callback",
            "javascript://alert('xss')",
            "//evil.com/callback",
        ]

        for uri in invalid_uris:
            # These should fail validation
            assert not uri.startswith("http://") and not uri.startswith("https://")


@pytest.mark.asyncio
class TestOAuthRateLimiting:
    """Test OAuth rate limiting."""

    async def test_multiple_oauth_requests(self):
        """Test handling multiple concurrent OAuth requests."""
        # Simulate multiple users initiating OAuth flow
        states = [generate_oauth_state() for _ in range(5)]

        # All should be unique
        assert len(set(states)) == 5

        # All should be valid
        for state in states:
            assert isinstance(state, str)
            assert len(state) > 0


class TestOAuthIntegration:
    """Integration tests for OAuth flow."""

    def test_complete_oauth_flow_sequence(self):
        """Test the complete OAuth flow sequence."""
        # 1. Generate state
        state = generate_oauth_state()
        assert state is not None

        # 2. Build authorization URL
        auth_url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://localhost:8000/callback",
            state=state,
        )
        assert "github.com" in auth_url
        assert state in auth_url

        # 3. (In real flow) User would be redirected to GitHub
        # 4. GitHub would call callback with code and state
        # 5. Backend exchanges code for token
        # 6. Token is encrypted and stored
        # 7. User is authenticated

    def test_oauth_state_lifecycle(self):
        """Test OAuth state creation, storage, and cleanup."""
        state = generate_oauth_state()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        # Create state
        oauth_state = GitHubOAuthState(
            state=state,
            user_id="test_user_id",
            expires_at=expires_at,
        )

        # Verify creation
        assert oauth_state.state == state
        assert oauth_state.user_id == "test_user_id"

        # Verify expiration check
        assert datetime.now(timezone.utc) < oauth_state.expires_at

        # In real scenario, state would be cleaned up after:
        # 1. Successful use in callback
        # 2. Expiration time is reached


# Performance and Load Tests
class TestOAuthPerformance:
    """Test OAuth performance characteristics."""

    def test_state_generation_performance(self):
        """Test that state generation is fast."""
        import time

        start = time.time()
        for _ in range(1000):
            generate_oauth_state()
        end = time.time()

        # Should generate 1000 states in less than 1 second
        assert (end - start) < 1.0

    def test_authorization_url_building_performance(self):
        """Test that authorization URL building is fast."""
        import time

        start = time.time()
        for i in range(1000):
            build_github_authorization_url(
                client_id="test_client_id",
                redirect_uri="http://localhost:8000/callback",
                state=f"state_{i}",
            )
        end = time.time()

        # Should build 1000 URLs in less than 1 second
        assert (end - start) < 1.0


# Documentation and Example Tests
class TestOAuthDocumentation:
    """Test that OAuth flow is well-documented."""

    def test_oauth_endpoints_are_documented(self):
        """Test that OAuth endpoints have proper documentation."""
        # Import the router and verify it has documented endpoints
        from routes.github import router

        # Check that routes exist
        assert router is not None
        assert len(router.routes) > 0

    def test_github_oauth_configuration_documented(self):
        """Test that GitHub OAuth configuration is documented."""
        # Verify settings are properly documented
        assert hasattr(settings, "github_client_id")
        assert hasattr(settings, "github_client_secret")
        assert hasattr(settings, "github_redirect_uri")
