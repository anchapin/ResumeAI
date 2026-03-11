"""
Shared pytest fixtures for OAuth testing.

Provides reusable fixtures for:
- Test database setup
- Authenticated clients
- Mock OAuth providers
- Test data generators
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport

from main import app
from database import (
    Base,
    User,
    GitHubConnection,
    GitHubOAuthState,
    RefreshToken,
    get_async_session,
)
from config.jwt_utils import create_access_token, create_refresh_token
from config.security import hash_password, encrypt_token

# ============================================================================
# Database Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_db_session_maker(test_db_engine):
    """Create test database session maker."""
    return async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture(scope="function")
async def test_db_session(test_db_session_maker):
    """Get test database session."""
    async with test_db_session_maker() as session:
        yield session


# ============================================================================
# Client Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def async_client(test_db_session):
    """Create AsyncClient for testing."""

    async def override_get_async_session():
        yield test_db_session

    from database import get_db
    app.dependency_overrides[get_async_session] = override_get_async_session
    app.dependency_overrides[get_db] = override_get_async_session

    # Disable security features for tests
    from config import settings

    settings.enable_request_signing = False
    settings.enable_csrf = False

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://testserver")

    yield client

    app.dependency_overrides.clear()
    await client.aclose()


@pytest_asyncio.fixture(scope="function")
async def unauthenticated_client(async_client):
    """Get unauthenticated client."""
    async_client.headers = {}
    return async_client


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(async_client, test_user):
    """Get authenticated client with valid token."""
    token_data = {"sub": str(test_user.id), "email": test_user.email}
    access_token = create_access_token(token_data)
    async_client.headers = {"Authorization": f"Bearer {access_token}"}
    return async_client


# ============================================================================
# User Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def test_user(test_db_session):
    """Create a test user."""
    user = User(
        email="testuser@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("TestPassword123!"),
        is_active=True,
        is_verified=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(test_db_session):
    """Create an admin test user."""
    user = User(
        email="admin@example.com",
        username="admin",
        full_name="Admin User",
        hashed_password=hash_password("AdminPassword123!"),
        is_active=True,
        is_verified=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def disabled_user(test_db_session):
    """Create a disabled test user."""
    user = User(
        email="disabled@example.com",
        username="disableduser",
        full_name="Disabled User",
        hashed_password=hash_password("DisabledPassword123!"),
        is_active=False,
        is_verified=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user


# ============================================================================
# GitHub OAuth Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def github_oauth_state(test_db_session, test_user):
    """Create a valid GitHub OAuth state."""
    state = GitHubOAuthState(
        state="test_state_12345abcde",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    test_db_session.add(state)
    await test_db_session.commit()
    await test_db_session.refresh(state)
    return state


@pytest_asyncio.fixture
async def expired_oauth_state(test_db_session, test_user):
    """Create an expired GitHub OAuth state."""
    state = GitHubOAuthState(
        state="expired_state_xyz",
        user_id=test_user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    test_db_session.add(state)
    await test_db_session.commit()
    await test_db_session.refresh(state)
    return state


@pytest_asyncio.fixture
async def github_connection(test_db_session, test_user):
    """Create a GitHub connection for test user."""
    connection = GitHubConnection(
        user_id=test_user.id,
        github_user_id="12345",
        github_username="testgithubuser",
        github_display_name="Test GitHub User",
        access_token=encrypt_token("gho_test_token_123456789"),
        token_type="bearer",
        scope="user:email public_repo",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(connection)
    await test_db_session.commit()
    await test_db_session.refresh(connection)
    return connection


# ============================================================================
# Token Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def valid_refresh_token(test_db_session, test_user):
    """Create a valid refresh token."""
    token_data = {"sub": str(test_user.id), "email": test_user.email}
    refresh_token = create_refresh_token(token_data)

    import hashlib

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    stored = RefreshToken(
        user_id=test_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        is_revoked=False,
    )
    test_db_session.add(stored)
    await test_db_session.commit()

    return refresh_token


@pytest_asyncio.fixture
async def expired_refresh_token(test_db_session, test_user):
    """Create an expired refresh token."""
    token_data = {"sub": str(test_user.id), "email": test_user.email}
    refresh_token = create_refresh_token(token_data)

    import hashlib

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    stored = RefreshToken(
        user_id=test_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        is_revoked=False,
    )
    test_db_session.add(stored)
    await test_db_session.commit()

    return refresh_token


@pytest_asyncio.fixture
async def revoked_refresh_token(test_db_session, test_user):
    """Create a revoked refresh token."""
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
    test_db_session.add(stored)
    await test_db_session.commit()

    return refresh_token


# ============================================================================
# Mock Fixtures
# ============================================================================


@pytest.fixture
def mock_github_user_response():
    """Mock GitHub user API response."""
    return {
        "id": 54321,
        "login": "octocat",
        "name": "The Octocat",
        "company": "@github",
        "blog": "https://github.blog",
        "location": "San Francisco",
        "email": "octocat@github.com",
        "bio": "There once was...",
        "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
        "public_repos": 2,
        "followers": 20,
        "following": 0,
    }


@pytest.fixture
def mock_github_token_response():
    """Mock GitHub token exchange response."""
    return {
        "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
        "expires_in": 28800,
        "refresh_token": "ghr_1B4a2e77838347a7E420314A7E38C08022E8DC8B4A7B0E67B2C8B5E3F4D5E6F7A8",
        "refresh_token_expires_in": 15811200,
        "scope": "user:email",
        "token_type": "bearer",
    }


@pytest.fixture
def mock_github_settings():
    """Mock GitHub OAuth settings."""
    return {
        "github_client_id": "test_client_id_123",
        "github_client_secret": "test_client_secret_xyz",
        "github_redirect_uri": "http://localhost:3000/auth/github/callback",
        "github_callback_url": "http://localhost:8000/github/callback",
        "frontend_url": "http://localhost:3000",
    }


# ============================================================================
# Marker and Parametrize Fixtures
# ============================================================================


@pytest.fixture(
    params=[
        "test_user",
        "admin_user",
    ]
)
def any_user(request):
    """Parametrized fixture for testing with different user types."""
    return request.getfixturevalue(request.param)
