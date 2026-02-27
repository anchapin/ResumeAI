"""
OAuth Endpoints Testing

Tests all OAuth-related endpoints:
- GitHub OAuth (connect, callback, status, disconnect)
- LinkedIn OAuth (if available)
- Token endpoints (refresh, logout)
- User authentication endpoints
"""

import pytest
import pytest_asyncio
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from urllib.parse import urlparse, parse_qs

from main import app
from database import (
    Base,
    User,
    GitHubConnection,
    GitHubOAuthState,
    RefreshToken,
    get_async_session,
)
from config.dependencies import get_current_user
from config.jwt_utils import create_access_token, create_refresh_token
from config.security import hash_password, encrypt_token
from lib.token_encryption import generate_encryption_key

# ============================================================================
# Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Create test database."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield test_session_maker

    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_db):
    """Get a database session for each test."""
    async with test_db() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Create test client."""

    async def override_get_async_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async_client = AsyncClient(transport=transport, base_url="http://testserver")

    yield async_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("password123"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def authenticated_client(client, test_user):
    """Create authenticated client."""
    token_data = {"sub": str(test_user.id), "email": test_user.email}
    access_token = create_access_token(token_data)
    client.headers = {"Authorization": f"Bearer {access_token}"}
    return client


# ============================================================================
# GitHub Connect Endpoint Tests
# ============================================================================


class TestGitHubConnectEndpoint:
    """Test /github/connect endpoint."""

    @pytest.mark.asyncio
    async def test_connect_returns_authorization_url(self, authenticated_client):
        """Test that connect endpoint returns valid authorization URL."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"
            mock_settings.github_callback_url = "http://localhost:3000/callback"

            response = await authenticated_client.get("/github/connect")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "authorization_url" in data
            assert "state" in data
            assert "expires_in" in data

            # Verify URL contains required parameters
            auth_url = data["authorization_url"]
            assert "github.com/login/oauth/authorize" in auth_url
            assert "client_id=test_client_id" in auth_url
            assert "state=" in auth_url

    @pytest.mark.asyncio
    async def test_connect_requires_authentication(self, client):
        """Test that connect endpoint requires authentication."""
        response = await client.get("/github/connect")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_connect_state_persistence(
        self, authenticated_client, db_session, test_user
    ):
        """Test that state is persisted in database."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"

            response = await authenticated_client.get("/github/connect")
            assert response.status_code == 200

            state = response.json()["state"]

            # Verify state in database
            result = await db_session.execute(
                select(GitHubOAuthState).where(GitHubOAuthState.state == state)
            )
            oauth_state = result.scalar_one_or_none()

            assert oauth_state is not None
            assert oauth_state.state == state
            assert oauth_state.user_id == test_user.id

    @pytest.mark.asyncio
    async def test_connect_state_expiration_set(self, authenticated_client, db_session):
        """Test that state expiration is set correctly."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"

            response = await authenticated_client.get("/github/connect")
            state = response.json()["state"]

            result = await db_session.execute(
                select(GitHubOAuthState).where(GitHubOAuthState.state == state)
            )
            oauth_state = result.scalar_one()

            # Should expire in approximately 10 minutes
            time_until_expire = (
                oauth_state.expires_at - datetime.now(timezone.utc)
            ).total_seconds()
            assert 590 < time_until_expire < 610  # ~10 minutes

    @pytest.mark.asyncio
    async def test_connect_custom_redirect_uri_validation(self, authenticated_client):
        """Test that custom redirect URIs are validated."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"
            mock_settings.github_redirect_uri = "http://localhost:3000/oauth/callback"

            # Valid custom URI
            response = await authenticated_client.get(
                "/github/connect",
                params={"redirect_uri": "http://localhost:3000/oauth/callback"},
            )
            assert response.status_code == 200

            # Invalid custom URI
            response = await authenticated_client.get(
                "/github/connect",
                params={"redirect_uri": "http://malicious.com/callback"},
            )
            assert response.status_code == 400
            assert "Invalid redirect_uri" in response.json()["detail"]


# ============================================================================
# GitHub Callback Endpoint Tests
# ============================================================================


class TestGitHubCallbackEndpoint:
    """Test /github/callback endpoint."""

    @pytest.mark.asyncio
    async def test_callback_successful_flow(self, client, db_session, test_user):
        """Test successful OAuth callback."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"
            mock_settings.github_client_secret = "test_secret"
            mock_settings.frontend_url = "http://localhost:3000"

            # Create OAuth state
            state = GitHubOAuthState(
                state="test_state_123",
                user_id=test_user.id,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
            db_session.add(state)
            await db_session.commit()

            with patch("routes.github.exchange_code_for_token") as mock_exchange:
                with patch("routes.github.fetch_github_user") as mock_fetch:
                    mock_exchange.return_value = {
                        "access_token": "gho_token_abc123",
                        "scope": "user:email",
                        "token_type": "bearer",
                    }
                    mock_fetch.return_value = {
                        "id": 54321,
                        "login": "octocat",
                        "name": "The Octocat",
                        "email": "octocat@github.com",
                    }

                    response = await client.get(
                        "/github/callback",
                        params={"code": "auth_code_xyz", "state": "test_state_123"},
                    )

                    assert response.status_code in [200, 302]

                    # Verify connection created
                    result = await db_session.execute(
                        select(GitHubConnection).where(
                            GitHubConnection.github_username == "octocat"
                        )
                    )
                    connection = result.scalar_one_or_none()
                    assert connection is not None

    @pytest.mark.asyncio
    async def test_callback_invalid_code(self, client, db_session, test_user):
        """Test callback with invalid authorization code."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"
            mock_settings.github_client_secret = "test_secret"
            mock_settings.frontend_url = "http://localhost:3000"

            state = GitHubOAuthState(
                state="test_state",
                user_id=test_user.id,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
            db_session.add(state)
            await db_session.commit()

            with patch("routes.github.exchange_code_for_token") as mock_exchange:
                mock_exchange.side_effect = Exception("Invalid code")

                response = await client.get(
                    "/github/callback",
                    params={"code": "invalid_code", "state": "test_state"},
                )

                assert response.status_code in [302, 400]

    @pytest.mark.asyncio
    async def test_callback_state_mismatch(self, client):
        """Test callback with mismatched state."""
        response = await client.get(
            "/github/callback",
            params={"code": "code", "state": "nonexistent_state"},
        )

        assert response.status_code == 302
        assert "error" in response.headers.get("location", "").lower()

    @pytest.mark.asyncio
    async def test_callback_missing_parameters(self, client):
        """Test callback with missing required parameters."""
        # Missing both code and state
        response = await client.get("/github/callback")
        assert response.status_code in [400, 422]

        # Missing code
        response = await client.get("/github/callback", params={"state": "test"})
        assert response.status_code in [400, 422]

        # Missing state
        response = await client.get("/github/callback", params={"code": "test"})
        assert response.status_code in [400, 422]


# ============================================================================
# GitHub Status Endpoint Tests
# ============================================================================


class TestGitHubStatusEndpoint:
    """Test /github/status endpoint."""

    @pytest.mark.asyncio
    async def test_status_returns_connection_info(
        self, authenticated_client, db_session, test_user
    ):
        """Test status endpoint with active connection."""
        # Create connection
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="12345",
            github_username="testuser",
            access_token=encrypt_token("token123"),
            is_active=True,
        )
        db_session.add(connection)
        await db_session.commit()

        response = await authenticated_client.get("/github/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["username"] == "testuser"
        assert data["mode"] == "oauth"
        assert data["github_user_id"] == "12345"

    @pytest.mark.asyncio
    async def test_status_no_connection(self, authenticated_client):
        """Test status endpoint without active connection."""
        response = await authenticated_client.get("/github/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["username"] is None

    @pytest.mark.asyncio
    async def test_status_requires_authentication(self, client):
        """Test that status endpoint requires authentication."""
        response = await client.get("/github/status")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_status_inactive_connection(
        self, authenticated_client, db_session, test_user
    ):
        """Test status with inactive connection."""
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="12345",
            github_username="testuser",
            access_token=encrypt_token("token123"),
            is_active=False,
        )
        db_session.add(connection)
        await db_session.commit()

        response = await authenticated_client.get("/github/status")

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False


# ============================================================================
# GitHub Disconnect Endpoint Tests
# ============================================================================


class TestGitHubDisconnectEndpoint:
    """Test /github/disconnect endpoint."""

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(
        self, authenticated_client, db_session, test_user
    ):
        """Test disconnect removes GitHub connection."""
        # Create connection
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="12345",
            github_username="testuser",
            access_token=encrypt_token("token123"),
            is_active=True,
        )
        db_session.add(connection)
        await db_session.commit()
        connection_id = connection.id

        # Disconnect
        with patch("routes.github._revoke_github_token") as mock_revoke:
            mock_revoke.return_value = True

            response = await authenticated_client.delete("/github/disconnect")
            assert response.status_code == 204

        # Verify connection deleted
        result = await db_session.execute(
            select(GitHubConnection).where(GitHubConnection.id == connection_id)
        )
        deleted_connection = result.scalar_one_or_none()
        assert deleted_connection is None

    @pytest.mark.asyncio
    async def test_disconnect_no_connection(self, authenticated_client):
        """Test disconnect when no connection exists."""
        response = await authenticated_client.delete("/github/disconnect")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_disconnect_requires_authentication(self, client):
        """Test that disconnect requires authentication."""
        response = await client.delete("/github/disconnect")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disconnect_attempts_token_revocation(
        self, authenticated_client, db_session, test_user
    ):
        """Test that disconnect attempts to revoke token."""
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="12345",
            github_username="testuser",
            access_token=encrypt_token("gho_token_123"),
            is_active=True,
        )
        db_session.add(connection)
        await db_session.commit()

        with patch("routes.github._revoke_github_token") as mock_revoke:
            mock_revoke.return_value = True

            response = await authenticated_client.delete("/github/disconnect")
            assert response.status_code == 204
            mock_revoke.assert_called_once()


# ============================================================================
# Auth Refresh Endpoint Tests
# ============================================================================


class TestAuthRefreshEndpoint:
    """Test /auth/refresh endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_valid_token(self, client, test_user, db_session):
        """Test refreshing with valid refresh token."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored)
        await db_session.commit()

        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_refresh_expired_token(self, client, test_user, db_session):
        """Test refreshing with expired token."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db_session.add(stored)
        await db_session.commit()

        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_revoked_token(self, client, test_user, db_session):
        """Test refreshing with revoked token."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_revoked=True,
        )
        db_session.add(stored)
        await db_session.commit()

        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_returns_correct_expiration(
        self, client, test_user, db_session
    ):
        """Test that refresh returns correct token expiration."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored)
        await db_session.commit()

        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["expires_in"] == 1800  # 30 minutes


# ============================================================================
# Auth Logout Endpoint Tests
# ============================================================================


class TestAuthLogoutEndpoint:
    """Test /auth/logout endpoint."""

    @pytest.mark.asyncio
    async def test_logout_revokes_token(self, client, test_user, db_session):
        """Test that logout revokes refresh token."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored)
        await db_session.commit()

        # Logout
        response = await client.post(
            "/auth/logout",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200

        # Token should now be revoked
        result = await db_session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        token = result.scalar_one()
        assert token.is_revoked is True

    @pytest.mark.asyncio
    async def test_logout_nonexistent_token(self, client):
        """Test logout with nonexistent token."""
        response = await client.post(
            "/auth/logout",
            json={"refresh_token": "nonexistent_token_xyz"},
        )
        # Should succeed (idempotent)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_logout_is_idempotent(self, client, test_user, db_session):
        """Test that logout is idempotent."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored)
        await db_session.commit()

        # First logout
        response1 = await client.post(
            "/auth/logout",
            json={"refresh_token": refresh_token},
        )
        assert response1.status_code == 200

        # Second logout with same token
        response2 = await client.post(
            "/auth/logout",
            json={"refresh_token": refresh_token},
        )
        assert response2.status_code == 200


# ============================================================================
# Auth Me Endpoint Tests
# ============================================================================


class TestAuthMeEndpoint:
    """Test /auth/me endpoint."""

    @pytest.mark.asyncio
    async def test_me_returns_user_info(self, authenticated_client, test_user):
        """Test /auth/me returns current user info."""
        response = await authenticated_client.get("/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username

    @pytest.mark.asyncio
    async def test_me_requires_authentication(self, client):
        """Test that /auth/me requires authentication."""
        response = await client.get("/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_with_invalid_token(self, client):
        """Test /auth/me with invalid token."""
        client.headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/auth/me")
        assert response.status_code == 401


# ============================================================================
# Health Check Endpoint Tests
# ============================================================================


class TestAuthHealthEndpoint:
    """Test /auth/health endpoint."""

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test auth health check endpoint."""
        response = await client.get("/auth/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "authentication"
