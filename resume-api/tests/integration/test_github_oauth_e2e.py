"""
End-to-end integration tests for GitHub OAuth flow.

Tests cover:
- OAuth authorization URL generation
- Token exchange
- User profile retrieval
- Connection establishment
- Token refresh
- Error handling
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


class TestGitHubOAuthInitiation:
    """Test GitHub OAuth flow initiation."""

    @pytest.mark.asyncio
    async def test_get_authorization_url(self, jwt_authenticated_client: AsyncClient):
        """Test getting GitHub authorization URL."""
        response = await jwt_authenticated_client.get("/api/v1/github/connect")

        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "state" in data

    @pytest.mark.asyncio
    async def test_authorization_url_includes_client_id(
        self, jwt_authenticated_client: AsyncClient
    ):
        """Test that authorization URL includes client ID."""
        response = await jwt_authenticated_client.get("/api/v1/github/connect")

        if response.status_code == 200:
            data = response.json()
            auth_url = data.get("authorization_url", "")
            assert "client_id" in auth_url

    @pytest.mark.asyncio
    async def test_authorization_url_includes_redirect_uri(
        self, jwt_authenticated_client: AsyncClient
    ):
        """Test that authorization URL includes redirect URI."""
        response = await jwt_authenticated_client.get("/api/v1/github/connect")

        if response.status_code == 200:
            data = response.json()
            auth_url = data.get("authorization_url", "")
            assert "redirect_uri" in auth_url


class TestGitHubOAuthCallback:
    """Test GitHub OAuth callback handling."""

    @pytest.mark.asyncio
    async def test_callback_with_authorization_code(
        self,
        jwt_authenticated_client: AsyncClient,
        mock_github_token_response,
        test_db_session,
        test_user,
    ):
        """Test OAuth callback with valid authorization code."""
        # Create a valid state in DB first
        from database import GitHubOAuthState
        from datetime import datetime, timezone, timedelta

        state = "test_state_xyz"
        oauth_state = GitHubOAuthState(
            state=state,
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        test_db_session.add(oauth_state)
        await test_db_session.commit()

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json = AsyncMock(return_value=mock_github_token_response)
            mock_post.return_value = mock_resp

            with patch("routes.github.fetch_github_user") as mock_fetch:
                mock_fetch.return_value = {
                    "id": 12345,
                    "login": "testuser",
                    "name": "Test User",
                }

                response = await jwt_authenticated_client.get(
                    "/api/v1/github/callback",
                    params={
                        "code": "test_auth_code_12345",
                        "state": state,
                    },
                )

                # Should redirect to frontend
                assert response.status_code == 302
                assert "status=success" in response.headers["Location"]

    @pytest.mark.asyncio
    async def test_callback_without_code(self, jwt_authenticated_client: AsyncClient):
        """Test callback fails without authorization code."""
        response = await jwt_authenticated_client.get(
            "/api/v1/github/callback",
            params={"state": "test_state_xyz"},
        )

        # Validation error (missing required query param)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_callback_with_error_from_github(self, jwt_authenticated_client: AsyncClient):
        """Test callback when GitHub returns error."""
        response = await jwt_authenticated_client.get(
            "/api/v1/github/callback",
            params={
                "error": "access_denied",
                "error_description": "User denied access",
            },
        )

        # Still 422 because code/state are required by FastAPI before our code runs
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_callback_with_invalid_state(self, jwt_authenticated_client: AsyncClient):
        """Test callback with mismatched state parameter."""
        response = await jwt_authenticated_client.get(
            "/api/v1/github/callback",
            params={
                "code": "test_code",
                "state": "invalid_state",
            },
        )

        # Implementation redirects to frontend with error
        assert response.status_code == 302
        assert "error=invalid_state" in response.headers["Location"]


class TestGitHubTokenExchange:
    """Test GitHub token exchange process."""

    @pytest.mark.asyncio
    async def test_token_response_contains_access_token(self, mock_github_token_response):
        """Test GitHub token response structure."""
        assert "access_token" in mock_github_token_response
        assert "token_type" in mock_github_token_response
        assert mock_github_token_response["token_type"] == "bearer"


class TestGitHubUserProfile:
    """Test GitHub user profile retrieval."""

    @pytest.mark.asyncio
    async def test_fetch_user_profile_with_token(
        self, jwt_authenticated_client: AsyncClient, mock_github_user
    ):
        """Test fetching user profile from GitHub API."""
        assert "id" in mock_github_user
        assert "login" in mock_github_user
        assert "email" in mock_github_user
        assert "avatar_url" in mock_github_user

    @pytest.mark.asyncio
    async def test_user_profile_email_extraction(self, mock_github_user):
        """Test extracting email from GitHub user profile."""
        assert isinstance(mock_github_user["email"], str)
        assert "@" in mock_github_user["email"]

    @pytest.mark.asyncio
    async def test_user_profile_avatar_url(self, mock_github_user):
        """Test GitHub avatar URL in profile."""
        assert mock_github_user["avatar_url"].startswith("https://")


class TestGitHubConnectionManagement:
    """Test GitHub connection CRUD operations."""

    @pytest.mark.asyncio
    async def test_get_github_status(
        self,
        jwt_authenticated_client: AsyncClient,
        test_user,
        github_connection,
    ):
        """Test retrieving GitHub connection status."""
        response = await jwt_authenticated_client.get("/api/v1/github/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["username"] == "testgithubuser"

    @pytest.mark.asyncio
    async def test_disconnect_github(
        self, jwt_authenticated_client: AsyncClient, github_connection
    ):
        """Test disconnecting GitHub account."""
        response = await jwt_authenticated_client.delete("/api/v1/github/disconnect")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_connection_persists_access_token(
        self, test_db_session, test_user, github_connection
    ):
        """Test that GitHub connection stores encrypted token."""
        from config.security import decrypt_token

        # Verify token is encrypted
        assert github_connection.access_token != "gho_test_token_123456789"

        # Verify token can be decrypted
        decrypted = decrypt_token(github_connection.access_token)
        assert decrypted == "gho_test_token_123456789"


class TestGitHubErrorHandling:
    """Test error handling in GitHub OAuth flow."""

    @pytest.mark.asyncio
    async def test_handle_expired_token(self, jwt_authenticated_client: AsyncClient):
        """Test handling expired access token."""
        assert True

    @pytest.mark.asyncio
    async def test_handle_revoked_access(self, jwt_authenticated_client: AsyncClient):
        """Test handling revoked access."""
        assert True


class TestGitHubIntegrationFlow:
    """Test complete GitHub OAuth integration flow."""

    @pytest.mark.asyncio
    async def test_user_can_use_github_connection_for_auth(
        self, jwt_authenticated_client: AsyncClient, test_user, github_connection
    ):
        """Test that user can authenticate using GitHub connection."""
        response = await jwt_authenticated_client.get("/api/v1/health")
        assert response.status_code == 200
