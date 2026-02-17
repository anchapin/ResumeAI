"""
Test suite for user authentication system.

Tests cover:
1. User registration
2. User login
3. Token refresh
4. User logout
5. Get current user
6. Update user profile
7. Change password
8. Authentication edge cases
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from main import app
from database import Base, User, get_async_session
from config.security import hash_password, verify_password
from config.jwt_utils import verify_access_token, verify_refresh_token, create_access_token


# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_auth.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

test_async_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_async_session():
    """Override database session for testing."""
    async with test_async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_database():
    """Create test database tables before each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Override the dependency
    app.dependency_overrides[get_async_session] = override_get_async_session

    yield

    # Clean up after test
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user():
    """Create a test user in the database."""
    async with test_async_session_maker() as session:
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password=hash_password("testpassword123"),
            full_name="Test User",
            is_active=True,
            is_verified=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def auth_tokens(client, test_user):
    """Get auth tokens for test user."""
    response = await client.post(
        "/auth/login",
        json={"email": "test@example.com", "password": "testpassword123"},
    )
    return response.json()


# =============================================================================
# Registration Tests
# =============================================================================


@pytest.mark.asyncio
class TestUserRegistration:
    """Test user registration functionality."""

    async def test_register_success(self, client):
        """Test successful user registration."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "securepassword123",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert data["full_name"] == "New User"
        assert "id" in data
        assert "hashed_password" not in data

    async def test_register_duplicate_email(self, client, test_user):
        """Test registration with existing email."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "username": "differentuser",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 409
        assert "Email already registered" in response.json()["detail"]

    async def test_register_duplicate_username(self, client, test_user):
        """Test registration with existing username."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "different@example.com",
                "username": "testuser",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 409
        assert "Username already taken" in response.json()["detail"]

    async def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "invalid-email",
                "username": "newuser",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 422

    async def test_register_short_password(self, client):
        """Test registration with password too short."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "short",
            },
        )
        assert response.status_code == 422

    async def test_register_invalid_username(self, client):
        """Test registration with invalid username characters."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "invalid@user",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 422

    async def test_register_short_username(self, client):
        """Test registration with username too short."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "ab",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 422

    async def test_register_email_case_insensitive(self, client, test_user):
        """Test that email is case-insensitive."""
        response = await client.post(
            "/auth/register",
            json={
                "email": "TEST@EXAMPLE.COM",
                "username": "newuser",
                "password": "securepassword123",
            },
        )
        assert response.status_code == 409  # Should fail as duplicate


# =============================================================================
# Login Tests
# =============================================================================


@pytest.mark.asyncio
class TestUserLogin:
    """Test user login functionality."""

    async def test_login_success(self, client, test_user):
        """Test successful login."""
        response = await client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 1800  # 30 minutes

        # Verify tokens are valid
        access_payload = verify_access_token(data["access_token"])
        assert access_payload is not None
        assert access_payload["sub"] == str(test_user.id)

        refresh_payload = verify_refresh_token(data["refresh_token"])
        assert refresh_payload is not None

    async def test_login_invalid_email(self, client):
        """Test login with non-existent email."""
        response = await client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    async def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        response = await client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    async def test_login_disabled_account(self, client):
        """Test login with disabled account."""
        async with test_async_session_maker() as session:
            user = User(
                email="disabled@example.com",
                username="disableduser",
                hashed_password=hash_password("testpassword123"),
                is_active=False,
            )
            session.add(user)
            await session.commit()

        response = await client.post(
            "/auth/login",
            json={"email": "disabled@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 403
        assert "Account is disabled" in response.json()["detail"]

    async def test_login_email_case_insensitive(self, client, test_user):
        """Test that login email is case-insensitive."""
        response = await client.post(
            "/auth/login",
            json={"email": "TEST@EXAMPLE.COM", "password": "testpassword123"},
        )
        assert response.status_code == 200


# =============================================================================
# Token Refresh Tests
# =============================================================================


@pytest.mark.asyncio
class TestTokenRefresh:
    """Test token refresh functionality."""

    async def test_refresh_token_success(self, client, auth_tokens):
        """Test successful token refresh."""
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Verify new access token
        payload = verify_access_token(data["access_token"])
        assert payload is not None

    async def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401


# =============================================================================
# Logout Tests
# =============================================================================


@pytest.mark.asyncio
class TestUserLogout:
    """Test user logout functionality."""

    async def test_logout_success(self, client, auth_tokens):
        """Test successful logout."""
        response = await client.post(
            "/auth/logout",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"

        # Verify token is now invalid
        response = await client.post(
            "/auth/refresh",
            json={"refresh_token": auth_tokens["refresh_token"]},
        )
        assert response.status_code == 401

    async def test_logout_invalid_token(self, client):
        """Test logout with invalid token."""
        response = await client.post(
            "/auth/logout",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 200  # Still returns success for security


# =============================================================================
# Get Current User Tests
# =============================================================================


@pytest.mark.asyncio
class TestGetCurrentUser:
    """Test get current user functionality."""

    async def test_get_current_user_success(self, client, auth_tokens):
        """Test getting current user info."""
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"
        assert "hashed_password" not in data

    async def test_get_current_user_no_token(self, client):
        """Test getting current user without token."""
        response = await client.get("/auth/me")
        assert response.status_code == 401

    async def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/auth/me", headers=headers)
        assert response.status_code == 401


# =============================================================================
# Update User Profile Tests
# =============================================================================


@pytest.mark.asyncio
class TestUpdateUserProfile:
    """Test update user profile functionality."""

    async def test_update_profile_success(self, client, auth_tokens):
        """Test successful profile update."""
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.put(
            "/auth/me",
            headers=headers,
            json={"full_name": "Updated Name", "username": "updateduser"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["username"] == "updateduser"

    async def test_update_profile_duplicate_username(self, client, auth_tokens):
        """Test update with duplicate username."""
        # Create another user
        async with test_async_session_maker() as session:
            user = User(
                email="other@example.com",
                username="otheruser",
                hashed_password=hash_password("testpassword123"),
            )
            session.add(user)
            await session.commit()

        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.put(
            "/auth/me",
            headers=headers,
            json={"username": "otheruser"},
        )
        assert response.status_code == 409
        assert "Username already taken" in response.json()["detail"]

    async def test_update_profile_no_token(self, client):
        """Test update without token."""
        response = await client.put(
            "/auth/me",
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 401


# =============================================================================
# Change Password Tests
# =============================================================================


@pytest.mark.asyncio
class TestChangePassword:
    """Test change password functionality."""

    async def test_change_password_success(self, client, auth_tokens):
        """Test successful password change."""
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.post(
            "/auth/change-password",
            headers=headers,
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword456",
            },
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"

        # Verify new password works
        response = await client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "newpassword456"},
        )
        assert response.status_code == 200

    async def test_change_password_wrong_current(self, client, auth_tokens):
        """Test change password with wrong current password."""
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.post(
            "/auth/change-password",
            headers=headers,
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456",
            },
        )
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    async def test_change_password_short_new_password(self, client, auth_tokens):
        """Test change password with short new password."""
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = await client.post(
            "/auth/change-password",
            headers=headers,
            json={
                "current_password": "testpassword123",
                "new_password": "short",
            },
        )
        assert response.status_code == 422

    async def test_change_password_no_token(self, client):
        """Test change password without token."""
        response = await client.post(
            "/auth/change-password",
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword456",
            },
        )
        assert response.status_code == 401


# =============================================================================
# Health Check Tests
# =============================================================================


@pytest.mark.asyncio
class TestAuthHealth:
    """Test authentication health check."""

    async def test_auth_health(self, client):
        """Test auth health endpoint."""
        response = await client.get("/auth/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "authentication"


# =============================================================================
# Security Tests
# =============================================================================


@pytest.mark.asyncio
class TestSecurity:
    """Test security features."""

    async def test_password_hashing(self):
        """Test that passwords are properly hashed."""
        password = "testpassword123"
        hashed = hash_password(password)

        # Hash should be different from original
        assert hashed != password

        # Verification should work
        assert verify_password(password, hashed)

        # Wrong password should fail
        assert not verify_password("wrongpassword", hashed)

    async def test_access_token_expiration(self):
        """Test that access tokens expire."""
        from datetime import timedelta

        token_data = {"sub": "1", "email": "test@example.com"}
        token = create_access_token(token_data, timedelta(seconds=-1))

        # Token should be invalid (expired)
        payload = verify_access_token(token)
        assert payload is None

    async def test_protected_endpoint_requires_auth(self, client):
        """Test that protected endpoints require authentication."""
        response = await client.get("/auth/me")
        assert response.status_code == 401
