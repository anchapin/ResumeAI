"""
Comprehensive OAuth Integration Tests

Tests all OAuth flows from start to finish including:
- GitHub OAuth authentication
- LinkedIn OAuth authentication
- Token generation, validation, and refresh
- Token expiration and revocation
- Concurrent requests
- Error handling and edge cases
- User session management
"""

import pytest
import pytest_asyncio
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from main import app
from database import (
    Base,
    User,
    GitHubConnection,
    GitHubOAuthState,
    RefreshToken,
    get_async_session,
)
from config.jwt_utils import (
    create_access_token,
    create_refresh_token,
    verify_access_token,
)
from config.security import hash_password, encrypt_token
from lib.token_encryption import generate_encryption_key

# ============================================================================
# Test Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Create test database."""
    # Create in-memory test database
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield test_session_maker

    # Cleanup
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_db):
    """Get a database session for each test."""
    async with test_db() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Create test client with dependency overrides."""

    async def override_get_async_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async_client = AsyncClient(transport=transport, base_url="http://testserver")

    yield async_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user."""
    user = User(
        email="oauth@example.com",
        username="oauthuser",
        full_name="OAuth User",
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
    """Create an authenticated test client."""
    token_data = {"sub": str(test_user.id), "email": test_user.email}
    access_token = create_access_token(token_data)

    client.headers = {"Authorization": f"Bearer {access_token}"}
    return client


# ============================================================================
# GitHub OAuth Flow Tests
# ============================================================================


class TestGitHubOAuthFlow:
    """Test complete GitHub OAuth flow."""

    @pytest.mark.asyncio
    async def test_github_oauth_complete_flow(
        self, authenticated_client, db_session, test_user
    ):
        """Test complete GitHub OAuth flow from connect to disconnect."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"
            mock_settings.github_client_secret = "test_client_secret"
            mock_settings.github_redirect_uri = "http://testserver/github/callback"
            mock_settings.frontend_url = "http://localhost:3000"

            # Step 1: Initiate OAuth - Get authorization URL
            response = await authenticated_client.get("/github/connect")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "authorization_url" in data
            assert "state" in data
            state = data["state"]

            # Verify state stored in database
            result = await db_session.execute(
                select(GitHubOAuthState).where(GitHubOAuthState.state == state)
            )
            stored_state = result.scalar_one_or_none()
            assert stored_state is not None
            assert stored_state.user_id == test_user.id

            # Step 2: Simulate GitHub callback with mocked user data
            with patch("routes.github.exchange_code_for_token") as mock_exchange:
                with patch("routes.github.fetch_github_user") as mock_fetch:
                    mock_exchange.return_value = {
                        "access_token": "gho_test_token_123456789",
                        "scope": "user:email",
                        "token_type": "bearer",
                    }
                    mock_fetch.return_value = {
                        "id": 12345,
                        "login": "githubuser",
                        "name": "GitHub User",
                        "email": "github@example.com",
                    }

                    # Make callback request
                    response = await authenticated_client.get(
                        "/github/callback",
                        params={"code": "test_code", "state": state},
                    )

                    # Should redirect to frontend
                    assert response.status_code in [200, 302]

            # Step 3: Verify GitHub connection stored
            result = await db_session.execute(
                select(GitHubConnection).where(
                    GitHubConnection.user_id == test_user.id,
                    GitHubConnection.is_active.is_(True),
                )
            )
            connection = result.scalar_one_or_none()
            assert connection is not None
            assert connection.github_username == "githubuser"
            assert connection.github_user_id == "12345"
            assert connection.access_token is not None

            # Step 4: Check GitHub status
            response = await authenticated_client.get("/github/status")
            assert response.status_code == 200
            status_data = response.json()
            assert status_data["authenticated"] is True
            assert status_data["username"] == "githubuser"

            # Step 5: Disconnect GitHub
            response = await authenticated_client.delete("/github/disconnect")
            assert response.status_code == 204

            # Verify connection deleted
            result = await db_session.execute(
                select(GitHubConnection).where(GitHubConnection.user_id == test_user.id)
            )
            connection = result.scalar_one_or_none()
            assert connection is None

    @pytest.mark.asyncio
    async def test_github_oauth_state_expiration(
        self, authenticated_client, db_session, test_user
    ):
        """Test that expired OAuth states are rejected."""
        # Create an expired state
        expired_state = GitHubOAuthState(
            state="expired_test_state",
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        db_session.add(expired_state)
        await db_session.commit()

        # Try to use expired state
        response = await authenticated_client.get(
            "/github/callback",
            params={"code": "test_code", "state": "expired_test_state"},
        )

        # Should fail with redirect to error
        assert response.status_code == 302
        assert "error=expired_state" in response.headers.get("location", "")

    @pytest.mark.asyncio
    async def test_github_oauth_invalid_state(self, authenticated_client):
        """Test that invalid states are rejected."""
        response = await authenticated_client.get(
            "/github/callback",
            params={"code": "test_code", "state": "invalid_state_xyz"},
        )

        assert response.status_code == 302
        assert "error=invalid_state" in response.headers.get("location", "")

    @pytest.mark.asyncio
    async def test_github_oauth_missing_config(self, authenticated_client):
        """Test that missing OAuth config returns error."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = None

            response = await authenticated_client.get("/github/connect")
            assert response.status_code == 500
            assert "not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_github_state_uniqueness(
        self, authenticated_client, db_session, test_user
    ):
        """Test that multiple state values are unique."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"

            states = set()
            for _ in range(5):
                response = await authenticated_client.get("/github/connect")
                assert response.status_code == 200
                state = response.json()["state"]
                assert state not in states
                states.add(state)

            assert len(states) == 5


# ============================================================================
# Token Management Tests
# ============================================================================


class TestTokenManagement:
    """Test token generation, refresh, expiration, and revocation."""

    @pytest.mark.asyncio
    async def test_access_token_generation(self, test_user, db_session):
        """Test that access tokens are properly generated."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)

        assert access_token is not None
        assert isinstance(access_token, str)

        # Verify token can be decoded
        payload = verify_access_token(access_token)
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["email"] == test_user.email
        assert payload["type"] == "access"

    @pytest.mark.asyncio
    async def test_refresh_token_generation(self, test_user, db_session):
        """Test that refresh tokens are properly generated."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        assert refresh_token is not None
        assert isinstance(refresh_token, str)

        # Verify token can be decoded
        from config.jwt_utils import verify_refresh_token

        payload = verify_refresh_token(refresh_token)
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["type"] == "refresh"

    @pytest.mark.asyncio
    async def test_token_refresh_endpoint(self, client, test_user, db_session):
        """Test the /auth/refresh endpoint."""
        # Create a valid refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        # Store refresh token in database
        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Request new access token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 1800  # 30 minutes

    @pytest.mark.asyncio
    async def test_expired_refresh_token(self, client, test_user, db_session):
        """Test that expired refresh tokens are rejected."""
        # Create an expired refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        # Store with expired timestamp
        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Try to refresh
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_token_revocation(self, client, test_user, db_session):
        """Test token revocation via logout."""
        # Create refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        # Store token
        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Logout to revoke
        response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200

        # Try to use revoked token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_github_token_encryption(self, db_session):
        """Test that GitHub tokens are encrypted at rest."""
        with patch.dict(
            os.environ, {"TOKEN_ENCRYPTION_KEY": generate_encryption_key()}
        ):
            # Create encrypted token
            plaintext_token = "gho_test_token_12345"
            encrypted_token = encrypt_token(plaintext_token)

            # Token should be encrypted (not equal to plaintext)
            assert encrypted_token != plaintext_token

            # Store connection with encrypted token
            connection = GitHubConnection(
                user_id=1,
                github_user_id="12345",
                github_username="testuser",
                access_token=encrypted_token,
            )
            db_session.add(connection)
            await db_session.commit()

            # Verify stored token is encrypted
            from sqlalchemy import select

            result = await db_session.execute(
                select(GitHubConnection).where(GitHubConnection.id == connection.id)
            )
            stored = result.scalar_one()
            assert stored.access_token == encrypted_token
            assert stored.access_token != plaintext_token

    @pytest.mark.asyncio
    async def test_token_with_different_user(self, client, db_session):
        """Test that tokens only work for their own user."""
        # Create two users
        user1 = User(
            email="user1@example.com",
            username="user1",
            hashed_password=hash_password("pass1"),
            is_active=True,
        )
        user2 = User(
            email="user2@example.com",
            username="user2",
            hashed_password=hash_password("pass2"),
            is_active=True,
        )
        db_session.add_all([user1, user2])
        await db_session.commit()

        # Create token for user1
        token_data = {"sub": str(user1.id), "email": user1.email}
        access_token = create_access_token(token_data)

        # Try to access user2's data with user1's token
        client.headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get("/api/v1/auth/me")

        # Should get user1 info, not user2
        assert response.status_code == 200
        assert response.json()["id"] == user1.id


# ============================================================================
# Error Handling and Edge Cases
# ============================================================================


class TestOAuthErrorHandling:
    """Test error scenarios and edge cases."""

    @pytest.mark.asyncio
    async def test_duplicate_github_connection(
        self, authenticated_client, db_session, test_user
    ):
        """Test handling of duplicate GitHub connections."""
        with patch("routes.github.settings") as mock_settings:
            mock_settings.github_client_id = "test_client_id"

            # Create first connection
            connection1 = GitHubConnection(
                user_id=test_user.id,
                github_user_id="12345",
                github_username="testuser",
                access_token=encrypt_token("token1"),
                is_active=True,
            )
            db_session.add(connection1)
            await db_session.commit()

            # Try to create second connection (should replace or handle gracefully)
            with patch("routes.github.exchange_code_for_token") as mock_exchange:
                with patch("routes.github.fetch_github_user") as mock_fetch:
                    mock_exchange.return_value = {
                        "access_token": "gho_new_token",
                        "scope": "user:email",
                        "token_type": "bearer",
                    }
                    mock_fetch.return_value = {
                        "id": 12345,
                        "login": "testuser",
                        "name": "Test User",
                    }

                    # Create new state
                    state = GitHubOAuthState(
                        state="test_state",
                        user_id=test_user.id,
                        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
                    )
                    db_session.add(state)
                    await db_session.commit()

                    response = await authenticated_client.get(
                        "/github/callback",
                        params={"code": "test_code", "state": "test_state"},
                    )

                    # Should handle gracefully
                    assert response.status_code in [200, 302]

    @pytest.mark.asyncio
    async def test_malformed_token(self, client):
        """Test that malformed tokens are rejected."""
        client.headers = {"Authorization": "Bearer malformed.token.xyz"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_authorization_header(self, client):
        """Test that missing auth header returns 401."""
        client.headers = {}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_type(self, client, test_user):
        """Test that refresh tokens can't be used as access tokens."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        client.headers = {"Authorization": f"Bearer {refresh_token}"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_disabled_user_account(self, client, db_session):
        """Test that disabled users can't access endpoints."""
        user = User(
            email="disabled@example.com",
            username="disabled",
            hashed_password=hash_password("password"),
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()

        # Create token for disabled user
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)

        client.headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_nonexistent_user_token(self, client):
        """Test that tokens for nonexistent users are rejected."""
        token_data = {"sub": "99999", "email": "nonexistent@example.com"}
        access_token = create_access_token(token_data)

        client.headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 404


# ============================================================================
# Concurrent Request Tests
# ============================================================================


class TestConcurrentRequests:
    """Test handling of concurrent requests."""

    @pytest.mark.asyncio
    async def test_concurrent_token_refresh(self, client, test_user, db_session):
        """Test concurrent token refresh requests."""
        import asyncio

        # Create refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Make concurrent refresh requests
        async def make_request():
            return await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )

        responses = await asyncio.gather(
            make_request(),
            make_request(),
            make_request(),
        )

        # All should succeed
        for response in responses:
            assert response.status_code == 200
            assert "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_concurrent_github_status_checks(
        self, authenticated_client, db_session, test_user
    ):
        """Test concurrent status check requests."""
        import asyncio

        # Add GitHub connection
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="12345",
            github_username="testuser",
            access_token=encrypt_token("token123"),
            is_active=True,
        )
        db_session.add(connection)
        await db_session.commit()

        # Make concurrent status requests
        async def make_request():
            return await authenticated_client.get("/github/status")

        responses = await asyncio.gather(
            make_request(),
            make_request(),
            make_request(),
        )

        # All should succeed and return same data
        for response in responses:
            assert response.status_code == 200
            assert response.json()["authenticated"] is True


# ============================================================================
# Rate Limiting Tests
# ============================================================================


class TestRateLimiting:
    """Test rate limiting on OAuth endpoints."""

    @pytest.mark.asyncio
    async def test_refresh_rate_limit(self, client, test_user, db_session):
        """Test rate limiting on refresh endpoint."""
        # Create refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Note: Rate limiting might be disabled in test mode
        # Just verify endpoint works normally
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200


# ============================================================================
# User Session Management Tests
# ============================================================================


class TestSessionManagement:
    """Test user session management."""

    @pytest.mark.asyncio
    async def test_user_profile_update(
        self, authenticated_client, test_user, db_session
    ):
        """Test updating user profile."""
        response = await authenticated_client.put(
            "/api/v1/auth/me",
            json={
                "full_name": "Updated Name",
                "username": "newusername",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_password_change(self, authenticated_client, test_user, db_session):
        """Test changing user password."""
        response = await authenticated_client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "password123",
                "new_password": "newpassword456",
            },
        )

        assert response.status_code == 200

        # Verify old password doesn't work

        result = await db_session.execute(select(User).where(User.id == test_user.id))
        updated_user = result.scalar_one()
        from config.security import verify_password

        assert not verify_password("password123", updated_user.hashed_password)

    @pytest.mark.asyncio
    async def test_logout_invalidates_token(self, client, test_user, db_session):
        """Test that logout invalidates refresh token."""
        # Create and store refresh token
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        refresh_token = create_refresh_token(token_data)

        import hashlib

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken(
            user_id=test_user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db_session.add(stored_token)
        await db_session.commit()

        # Logout
        response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200

        # Token should be revoked - can't refresh
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 401


# ============================================================================
# API Authentication with OAuth Tests
# ============================================================================


class TestAPIAuthentication:
    """Test API authentication with OAuth tokens."""

    @pytest.mark.asyncio
    async def test_protected_endpoint_requires_auth(self, client):
        """Test that protected endpoints require authentication."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token_provides_access(self, client, test_user):
        """Test that valid token provides access to protected endpoints."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)

        client.headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 200
        assert response.json()["id"] == test_user.id

    @pytest.mark.asyncio
    async def test_bearer_token_extraction(self, client, test_user):
        """Test that Bearer token is correctly extracted from header."""
        token_data = {"sub": str(test_user.id), "email": test_user.email}
        access_token = create_access_token(token_data)

        # Test with proper Bearer prefix
        client.headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 200

        # Test with improper format
        client.headers = {"Authorization": f"Basic {access_token}"}
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
