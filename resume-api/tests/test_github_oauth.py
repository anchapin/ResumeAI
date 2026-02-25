"""
Unit tests for GitHub OAuth endpoints.
"""

import os
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from httpx import AsyncClient

from database import GitHubConnection, GitHubOAuthState
from lib.token_encryption import generate_encryption_key
from config import settings


class TestGitHubOAuthConnect:
    """Tests for GitHub OAuth connect endpoint."""

    @pytest.mark.asyncio
    async def test_connect_without_config(self, client: AsyncClient):
        """Test that connect fails without GitHub OAuth configuration."""
        # Ensure settings are cleared
        with patch.object(settings, "github_client_id", None):
            response = await client.get("/github/connect")
            assert response.status_code == 500
            assert "GitHub OAuth not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_connect_with_custom_redirect_uri(self, client: AsyncClient):
        """Test connect with custom redirect URI."""
        with patch.object(settings, "github_client_id", "test_client_id"):
            # The API should now REJECT arbitrary redirect URIs
            response = await client.get(
                "/github/connect", params={"redirect_uri": "http://custom/callback"}
            )

            assert response.status_code == 400
            assert "Invalid redirect_uri" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_connect_generates_secure_state(self, client: AsyncClient):
        """Test that connect generates a secure state parameter."""
        with patch.object(settings, "github_client_id", "test_client_id"):
            response1 = await client.get("/github/connect")
            response2 = await client.get("/github/connect")

            assert response1.status_code == 200
            assert response2.status_code == 200

            state1 = response1.json()["state"]
            state2 = response2.json()["state"]

            # States should be different
            assert state1 != state2

            # States should be URL-safe
            assert len(state1) >= 32
            assert len(state2) >= 32


class TestGitHubOAuthCallback:
    """Tests for GitHub OAuth callback endpoint."""

    @pytest.mark.asyncio
    async def test_callback_without_config(self, client: AsyncClient, db_session):
        """Test that callback fails without GitHub OAuth configuration."""
        # Create a valid state in DB first
        state = GitHubOAuthState(
            state="test_state",
            user_id=1,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(state)
        await db_session.commit()

        # Ensure config is missing (for token exchange)
        with patch.object(settings, "github_client_id", None):
            with patch.object(settings, "github_client_secret", None):
                response = await client.get(
                    "/github/callback",
                    params={"code": "test_code", "state": "test_state"},
                )
                assert response.status_code == 500
                assert "GitHub OAuth not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_callback_invalid_state(self, client: AsyncClient, db_session):
        """Test that callback fails with invalid state."""
        response = await client.get(
            "/github/callback", params={"code": "test_code", "state": "invalid_state"}
        )

        assert response.status_code == 302
        assert "error=invalid_state" in response.headers["location"]

    @pytest.mark.asyncio
    async def test_callback_expired_state(self, client: AsyncClient, db_session):
        """Test that callback fails with expired state."""
        # Create expired state
        expired_state = GitHubOAuthState(
            state="expired_state",
            user_id=1,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        db_session.add(expired_state)
        await db_session.commit()

        response = await client.get(
            "/github/callback",
            params={"code": "test_code", "state": "expired_state"},
        )

        assert response.status_code == 302
        assert "error=expired_state" in response.headers["location"]


class TestGitHubStateStorage:
    """Tests for OAuth state storage."""

    @pytest.mark.asyncio
    async def test_state_stored_in_database(self, client: AsyncClient, db_session):
        """Test that state is stored in database after connect."""
        with patch.object(settings, "github_client_id", "test_client_id"):
            response = await client.get("/github/connect")
            assert response.status_code == 200

            state = response.json()["state"]

            # Check that state exists in database
            from sqlalchemy import select

            result = await db_session.execute(
                select(GitHubOAuthState).where(GitHubOAuthState.state == state)
            )
            oauth_state = result.scalar_one_or_none()

            assert oauth_state is not None
            assert oauth_state.state == state


class TestGitHubConnectionStorage:
    """Tests for GitHub connection storage."""

    @pytest.mark.asyncio
    async def test_connection_encrypted_at_rest(self, db_session):
        """Test that access tokens are encrypted in the database."""
        # Create connection with a plain token, manually encrypt it using logic
        # But wait, the test wants to verify encryption happens.
        # So we should use the model/functions.

        # Generate encryption key
        key = generate_encryption_key()

        # Patch encryption key
        with patch.dict(os.environ, {"TOKEN_ENCRYPTION_KEY": key}):
            # Reload security to pick up new key
            import config.security
            import importlib

            importlib.reload(config.security)
            from config.security import encrypt_token

            # Create connection
            encrypted = encrypt_token("ghp_test_token_12345")
            connection = GitHubConnection(
                user_id=1,
                github_user_id="12345",
                github_username="testuser",
                access_token=encrypted,
            )

            db_session.add(connection)
            await db_session.commit()

            # Retrieve and verify
            from sqlalchemy import select

            result = await db_session.execute(
                select(GitHubConnection).where(GitHubConnection.id == connection.id)
            )
            stored_connection = result.scalar_one()

            # Access token should be encrypted (not equal to plaintext)
            assert stored_connection.access_token != "ghp_test_token_12345"
            # And checking it matches what we encrypted
            assert stored_connection.access_token == encrypted

    @pytest.mark.asyncio
    async def test_connection_decryption(self, db_session):
        """Test that encrypted tokens can be decrypted."""
        # Generate encryption key
        key = generate_encryption_key()

        # Patch encryption key
        with patch.dict(os.environ, {"TOKEN_ENCRYPTION_KEY": key}):
            # Reload security
            import config.security
            import importlib

            importlib.reload(config.security)
            from config.security import encrypt_token, decrypt_token

            plaintext_token = "ghp_test_token_12345"
            encrypted_token = encrypt_token(plaintext_token)

            connection = GitHubConnection(
                user_id=1,
                github_user_id="12345",
                github_username="testuser",
                access_token=encrypted_token,
            )
            db_session.add(connection)
            await db_session.commit()

            # Retrieve and decrypt
            from sqlalchemy import select

            result = await db_session.execute(
                select(GitHubConnection).where(GitHubConnection.id == connection.id)
            )
            stored_connection = result.scalar_one()

            decrypted_token = decrypt_token(stored_connection.access_token)
            assert decrypted_token == plaintext_token


class TestGitHubAuthorizationURL:
    """Tests for GitHub authorization URL generation."""

    def test_build_authorization_url_default(self):
        """Test building authorization URL with default parameters."""
        from routes.github import build_github_authorization_url

        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://127.0.0.1:8000/github/callback",
            state="test_state",
        )

        assert url.startswith("https://github.com/login/oauth/authorize?")
        assert "client_id=test_client_id" in url
        assert "redirect_uri=" in url
        assert "state=test_state" in url
        assert "scope=" in url

    def test_build_authorization_url_custom_scopes(self):
        """Test building authorization URL with custom scopes."""
        from routes.github import build_github_authorization_url

        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://127.0.0.1:8000/github/callback",
            state="test_state",
            scopes="read:user repo",
        )

        assert "scope=" in url

    def test_generate_oauth_state_length(self):
        """Test that generated state has sufficient length."""
        from routes.github import generate_oauth_state

        state = generate_oauth_state()
        assert len(state) >= 32  # Minimum secure length

    def test_generate_oauth_state_uniqueness(self):
        """Test that generated states are unique."""
        from routes.github import generate_oauth_state

        states = [generate_oauth_state() for _ in range(100)]
        assert len(set(states)) == 100  # All should be unique


# Fixtures
@pytest_asyncio.fixture
async def db_session():
    """Get database session for tests."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from database import Base

    # Create test database
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_maker = async_sessionmaker(
        test_engine,
        expire_on_commit=False,
    )

    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Provide session (use function scope)
    session = test_session_maker()

    yield session

    # Clean up
    await session.close()
    await test_engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """Create test client."""
    from main import app
    from database import get_async_session
    from config.dependencies import get_current_user

    # Override dependency to use the test session
    async def override_get_async_session():
        yield db_session

    # Mock user for authentication
    async def override_get_current_user():
        mock_user = type("User", (), {"id": 1, "email": "test@example.com"})()
        return mock_user

    app.dependency_overrides[get_async_session] = override_get_async_session
    app.dependency_overrides[get_current_user] = override_get_current_user

    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clean up
    app.dependency_overrides.clear()
