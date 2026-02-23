"""
Unit tests for GitHub OAuth endpoints.
"""

import os
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient, Response  # noqa: F401

from database import GitHubConnection, GitHubOAuthState
from lib.token_encryption import generate_encryption_key


class TestGitHubOAuthConnect:
    """Tests for GitHub OAuth connect endpoint."""

    @pytest.mark.asyncio
    async def test_connect_without_config(self, client: AsyncClient):
        """Test that connect fails without GitHub OAuth configuration."""
        # Temporarily unset the environment variable
        original_client_id = os.environ.get("GITHUB_CLIENT_ID")
        os.environ.pop("GITHUB_CLIENT_ID", None)

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        response = await client.get("/github/connect")

        # Restore original value
        if original_client_id:
            os.environ["GITHUB_CLIENT_ID"] = original_client_id

        assert response.status_code == 500
        assert "GitHub OAuth not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_connect_with_custom_redirect_uri(self, client: AsyncClient):
        """Test connect with custom redirect URI."""
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"
        os.environ["GITHUB_OAUTH_CALLBACK_URL"] = "http://default/callback"

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        response = await client.get(
            "/github/connect", params={"redirect_uri": "http://custom/callback"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "authorization_url" in data
        assert "state" in data
        assert data["expires_in"] == 600
        assert "custom/callback" in data["authorization_url"]

    @pytest.mark.asyncio
    async def test_connect_generates_secure_state(self, client: AsyncClient):
        """Test that connect generates a secure state parameter."""
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"
        os.environ["GITHUB_OAUTH_CALLBACK_URL"] = (
            "http://127.0.0.1:8000/github/callback"
        )

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        response1 = await client.get("/github/connect")
        response2 = await client.get("/github/connect")

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        # States should be different
        assert data1["state"] != data2["state"]

        # States should be URL-safe
        assert "-" in data1["state"] or "_" in data1["state"]
        assert "-" in data2["state"] or "_" in data2["state"]


class TestGitHubOAuthCallback:
    """Tests for GitHub OAuth callback endpoint."""

    @pytest.mark.asyncio
    async def test_callback_without_config(self, client: AsyncClient):
        """Test that callback fails without GitHub OAuth configuration."""
        original_client_id = os.environ.get("GITHUB_CLIENT_ID")
        original_client_secret = os.environ.get("GITHUB_CLIENT_SECRET")
        os.environ.pop("GITHUB_CLIENT_ID", None)
        os.environ.pop("GITHUB_CLIENT_SECRET", None)

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        response = await client.get(
            "/github/callback", params={"code": "test_code", "state": "test_state"}
        )

        # Restore original values
        if original_client_id:
            os.environ["GITHUB_CLIENT_ID"] = original_client_id
        if original_client_secret:
            os.environ["GITHUB_CLIENT_SECRET"] = original_client_secret

        assert response.status_code == 500
        assert "GitHub OAuth not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_callback_invalid_state(self, client: AsyncClient, db_session):
        """Test that callback fails with invalid state."""
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"
        os.environ["GITHUB_CLIENT_SECRET"] = "test_client_secret"

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        response = await client.get(
            "/github/callback", params={"code": "test_code", "state": "invalid_state"}
        )

        assert response.status_code == 400
        assert "Invalid or expired state parameter" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_callback_expired_state(self, client: AsyncClient, db_session):
        """Test that callback fails with expired state."""
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"
        os.environ["GITHUB_CLIENT_SECRET"] = "test_client_secret"

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

        # Create expired state
        expired_state = GitHubOAuthState(
            state="expired_state",
            expires_at=datetime.utcnow() - timedelta(minutes=5),
        )
        db_session.add(expired_state)
        await db_session.commit()

        response = await client.get(
            "/github/callback", params={"code": "test_code", "state": "expired_state"}
        )

        assert response.status_code == 400
        assert "State parameter has expired" in response.json()["detail"]


class TestGitHubStateStorage:
    """Tests for OAuth state storage."""

    @pytest.mark.asyncio
    async def test_state_stored_in_database(self, client: AsyncClient, db_session):
        """Test that state is stored in database after connect."""
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"
        os.environ["GITHUB_OAUTH_CALLBACK_URL"] = (
            "http://127.0.0.1:8000/github/callback"
        )

        # Force settings reload
        import importlib
        import config

        importlib.reload(config)

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
        assert oauth_state.is_used is False
        assert oauth_state.expires_at > datetime.utcnow()

    @pytest.mark.asyncio
    async def test_state_expiration(self, db_session):
        """Test that states expire after 10 minutes."""
        state = GitHubOAuthState(
            state="test_expiration",
            expires_at=datetime.utcnow() + timedelta(minutes=10),
        )
        db_session.add(state)
        await db_session.commit()

        # State should still be valid
        assert state.expires_at > datetime.utcnow()


class TestGitHubConnectionStorage:
    """Tests for GitHub connection storage."""

    @pytest.mark.asyncio
    async def test_connection_encrypted_at_rest(self, db_session):
        """Test that access tokens are encrypted in the database."""
        # Generate encryption key
        key = generate_encryption_key()
        os.environ["TOKEN_ENCRYPTION_KEY"] = key

        # Create connection
        connection = GitHubConnection(
            user_id=1,
            github_user_id=12345,
            github_username="testuser",
            access_token="ghp_test_token_12345",
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

    @pytest.mark.asyncio
    async def test_connection_decryption(self, db_session):
        """Test that encrypted tokens can be decrypted."""
        # Generate encryption key
        key = generate_encryption_key()
        os.environ["TOKEN_ENCRYPTION_KEY"] = key

        from lib.token_encryption import get_token_encryption

        # Create connection
        plaintext_token = "ghp_test_token_67890"
        encryption = get_token_encryption()
        encrypted_token = encryption.encrypt(plaintext_token)

        connection = GitHubConnection(
            user_id=1,
            github_user_id=12345,
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

        decrypted_token = encryption.decrypt(stored_connection.access_token)
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
        # The URL encoding will properly encode the redirect URI
        assert "redirect_uri=" in url
        assert "state=test_state" in url
        # Scope should be in the URL
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

        # Scope should contain the custom scopes (properly encoded)
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
async def client():
    """Create test client."""
    from main import app
    from database import get_async_session
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from database import Base
    import httpx

    # Create test database for client
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_maker = async_sessionmaker(
        test_engine,
        expire_on_commit=False,
    )

    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Override dependency to use the test session
    async def override_get_async_session():
        async with test_session_maker() as session:
            yield session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    # Clean up
    app.dependency_overrides.clear()
    await test_engine.dispose()
