"""
Test suite for GitHub OAuth integration.

Tests cover:
1. OAuth authorization flow initiation
2. OAuth callback handling
3. Token exchange with GitHub
4. GitHub user profile fetching
5. Token encryption and storage
6. Connection status retrieval
7. Connection disconnection
8. Error handling (invalid state, expired state, invalid code)
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from unittest.mock import AsyncMock, patch

from main import app
from database import Base, User, OAuthState, GitHubConnection, get_async_session
from config.security import hash_password, encrypt_token, decrypt_token

# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_github_oauth.db"

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

    # Override dependency
    app.dependency_overrides[get_async_session] = override_get_async_session

    yield

    # Clean up after test
    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# Patch settings for all tests
@pytest.fixture(autouse=True)
def patch_settings():
    """Patch settings for all tests."""
    with patch("routes.github.settings") as mock_settings:
        mock_settings.github_client_id = "test_github_client_id"
        mock_settings.github_client_secret = "test_github_client_secret"
        mock_settings.frontend_url = "http://localhost:5173"
        yield mock_settings


@pytest_asyncio.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(client):
    """Create a test user in database."""
    async with test_async_session_maker() as session:
        user = User(
            email="github@example.com",
            username="githubuser",
            hashed_password=hash_password("testpassword123"),
            full_name="GitHub User",
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
        json={"email": "github@example.com", "password": "testpassword123"},
    )
    return response.json()


@pytest_asyncio.fixture
async def oauth_state(test_user):
    """Create a test OAuth state in database."""
    async with test_async_session_maker() as session:
        state = OAuthState(
            state="test_state_12345",
            user_id=test_user.id,
            provider="github",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        session.add(state)
        await session.commit()
        await session.refresh(state)
        # Refresh again to get the actual stored datetime (may be timezone-naive)
        await session.refresh(state)
        return state


@pytest_asyncio.fixture
async def expired_oauth_state(test_user):
    """Create an expired OAuth state in database."""
    async with test_async_session_maker() as session:
        state = OAuthState(
            state="expired_state_12345",
            user_id=test_user.id,
            provider="github",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        session.add(state)
        await session.commit()
        await session.refresh(state)
        # Refresh again to get the actual stored datetime (may be timezone-naive)
        await session.refresh(state)
        return state


@pytest_asyncio.fixture
async def github_connection(test_user):
    """Create a test GitHub connection in database."""
    async with test_async_session_maker() as session:
        encrypted_token = encrypt_token("test_access_token")
        connection = GitHubConnection(
            user_id=test_user.id,
            github_user_id="123456",
            github_username="testuser",
            github_email="test@github.com",
            encrypted_access_token=encrypted_token,
            token_scope="user:email",
            token_type="bearer",
            is_active=True,
        )
        session.add(connection)
        await session.commit()
        await session.refresh(connection)
        return connection


# =============================================================================
# Authorization Flow Tests
# =============================================================================


@pytest.mark.asyncio
class TestGitHubOAuthAuthorize:
    """Test GitHub OAuth authorization flow initiation."""

    async def test_authorize_redirects_to_github(self, client, auth_tokens):
        """Test that authorize endpoint redirects to GitHub."""
        response = await client.get(
            "/github/authorize",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )
        assert response.status_code == 302
        assert "github.com/login/oauth/authorize" in response.headers["location"]

    async def test_authorize_creates_oauth_state(self, client, auth_tokens, test_user):
        """Test that authorize creates OAuth state in database."""
        await client.get(
            "/github/authorize",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )

        async with test_async_session_maker() as session:
            result = await session.execute(
                OAuthState.__table__.select().where(
                    OAuthState.user_id == test_user.id,
                    OAuthState.provider == "github",
                )
            )
            oauth_state = result.fetchone()
            assert oauth_state is not None
            # Handle both timezone-aware and timezone-naive datetimes
            expires_at = oauth_state.expires_at
            if expires_at.tzinfo is None:
                from datetime import timezone as tz

                expires_at = expires_at.replace(tzinfo=tz.utc)
            assert expires_at > datetime.now(timezone.utc)

    async def test_authorize_requires_authentication(self, client):
        """Test that authorize requires authentication."""
        response = await client.get("/github/authorize")
        assert response.status_code == 401


# =============================================================================
# Callback Tests
# =============================================================================


@pytest.mark.asyncio
class TestGitHubOAuthCallback:
    """Test GitHub OAuth callback handling."""

    async def test_callback_with_valid_code(self, client, oauth_state):
        """Test callback with valid authorization code."""
        # Mock GitHub token exchange
        mock_token_response = {
            "access_token": "gho_test_token_12345",
            "scope": "user:email",
            "token_type": "bearer",
        }

        # Mock GitHub user API
        mock_user_response = {
            "id": 987654,
            "login": "octocat",
            "email": "octocat@github.com",
            "name": "Octocat",
        }

        # Create mock response objects
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self._json_data = json_data

            async def json(self):
                return self._json_data

        mock_token_response_obj = MockResponse(200, mock_token_response)
        mock_user_response_obj = MockResponse(200, mock_user_response)

        with patch("routes.github.AsyncClient") as mock_client:
            # Mock the async context manager
            mock_client_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_client_instance

            # Mock the post and get methods to return the mock responses
            # Use regular functions instead of AsyncMock since they return objects with async methods
            async def mock_post(*args, **kwargs):
                return mock_token_response_obj

            async def mock_get(*args, **kwargs):
                return mock_user_response_obj

            mock_client_instance.post = mock_post
            mock_client_instance.get = mock_get

            response = await client.get(
                "/github/callback",
                params={
                    "code": "valid_authorization_code",
                    "state": oauth_state.state,
                },
            )

            assert response.status_code == 302
            assert "settings?status=success" in response.headers["location"]

    async def test_callback_creates_github_connection(
        self, client, oauth_state, test_user
    ):
        """Test that callback creates GitHub connection in database."""
        mock_token_response = {
            "access_token": "gho_test_token_12345",
            "scope": "user:email",
            "token_type": "bearer",
        }

        mock_user_response = {
            "id": 987654,
            "login": "octocat",
            "email": "octocat@github.com",
        }

        # Create mock response objects
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self._json_data = json_data

            async def json(self):
                return self._json_data

        mock_token_response_obj = MockResponse(200, mock_token_response)
        mock_user_response_obj = MockResponse(200, mock_user_response)

        with patch("routes.github.AsyncClient") as mock_client:
            mock_client_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_client_instance

            # Use regular functions instead of AsyncMock
            async def mock_post(*args, **kwargs):
                return mock_token_response_obj

            async def mock_get(*args, **kwargs):
                return mock_user_response_obj

            mock_client_instance.post = mock_post
            mock_client_instance.get = mock_get

            await client.get(
                "/github/callback",
                params={
                    "code": "valid_authorization_code",
                    "state": oauth_state.state,
                },
            )

            async with test_async_session_maker() as session:
                result = await session.execute(
                    GitHubConnection.__table__.select().where(
                        GitHubConnection.user_id == test_user.id
                    )
                )
                connection = result.fetchone()
                assert connection is not None
                assert connection.github_username == "octocat"
                assert connection.github_user_id == "987654"
                assert connection.encrypted_access_token is not None

    async def test_callback_with_invalid_state(self, client):
        """Test callback with invalid state parameter."""
        response = await client.get(
            "/github/callback",
            params={
                "code": "valid_authorization_code",
                "state": "invalid_state_12345",
            },
        )

        assert response.status_code == 302
        assert "settings?status=error" in response.headers["location"]

    async def test_callback_with_expired_state(self, client, expired_oauth_state):
        """Test callback with expired state parameter."""
        response = await client.get(
            "/github/callback",
            params={
                "code": "valid_authorization_code",
                "state": expired_oauth_state.state,
            },
        )

        assert response.status_code == 302
        assert "settings?status=error" in response.headers["location"]

    async def test_callback_with_invalid_code(self, client, oauth_state):
        """Test callback with invalid authorization code."""
        mock_token_response = {
            "error": "bad_verification_code",
            "error_description": "The code passed is incorrect or expired",
        }

        # Create mock response object
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self._json_data = json_data

            async def json(self):
                return self._json_data

        mock_response = MockResponse(200, mock_token_response)

        with patch("routes.github.AsyncClient") as mock_client:
            mock_client_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_client_instance

            # Use regular function instead of AsyncMock
            async def mock_post(*args, **kwargs):
                return mock_response

            mock_client_instance.post = mock_post

            response = await client.get(
                "/github/callback",
                params={
                    "code": "invalid_code",
                    "state": oauth_state.state,
                },
            )

            assert response.status_code == 302
            assert "settings?status=error" in response.headers["location"]

    async def test_callback_updates_existing_connection(
        self, client, oauth_state, github_connection
    ):
        """Test that callback updates existing GitHub connection."""
        mock_token_response = {
            "access_token": "gho_new_token_67890",
            "scope": "user:email",
            "token_type": "bearer",
        }

        mock_user_response = {
            "id": "999999",  # Different GitHub ID
            "login": "newusername",
            "email": "new@github.com",
        }

        # Create mock response objects
        class MockResponse:
            def __init__(self, status_code, json_data):
                self.status_code = status_code
                self._json_data = json_data

            async def json(self):
                return self._json_data

        mock_token_response_obj = MockResponse(200, mock_token_response)
        mock_user_response_obj = MockResponse(200, mock_user_response)

        with patch("routes.github.AsyncClient") as mock_client:
            mock_client_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_client_instance

            # Use regular functions instead of AsyncMock
            async def mock_post(*args, **kwargs):
                return mock_token_response_obj

            async def mock_get(*args, **kwargs):
                return mock_user_response_obj

            mock_client_instance.post = mock_post
            mock_client_instance.get = mock_get

            await client.get(
                "/github/callback",
                params={
                    "code": "valid_authorization_code",
                    "state": oauth_state.state,
                },
            )

            async with test_async_session_maker() as session:
                result = await session.execute(
                    GitHubConnection.__table__.select().where(
                        GitHubConnection.user_id == github_connection.user_id
                    )
                )
                connection = result.fetchone()
                assert connection.github_username == "newusername"
                assert connection.github_user_id == "999999"


# =============================================================================
# Token Encryption Tests
# =============================================================================


@pytest.mark.asyncio
class TestTokenEncryption:
    """Test token encryption and decryption."""

    async def test_encrypt_decrypt_token(self):
        """Test that token can be encrypted and decrypted correctly."""
        original_token = "gho_test_token_12345"
        encrypted = encrypt_token(original_token)
        decrypted = decrypt_token(encrypted)

        assert original_token == decrypted
        assert encrypted != original_token

    async def test_decrypt_invalid_token_raises_error(self):
        """Test that decrypting invalid token raises ValueError."""
        with pytest.raises(ValueError):
            decrypt_token("invalid_encrypted_token")


# =============================================================================
# Connection Status Tests
# =============================================================================


@pytest.mark.asyncio
class TestGitHubConnectionStatus:
    """Test GitHub connection status retrieval."""

    async def test_get_connected_status(self, client, auth_tokens, github_connection):
        """Test getting connection status when connected."""
        response = await client.get(
            "/github/connection",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["github_username"] == "testuser"
        assert data["github_email"] == "test@github.com"
        assert data["connected_at"] is not None

    async def test_get_disconnected_status(self, client, auth_tokens, test_user):
        """Test getting connection status when not connected."""
        response = await client.get(
            "/github/connection",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
        assert data["github_username"] is None
        assert data["github_email"] is None

    async def test_get_connection_requires_authentication(self, client):
        """Test that getting connection status requires authentication."""
        response = await client.get("/github/connection")
        assert response.status_code == 401


# =============================================================================
# Disconnection Tests
# =============================================================================


@pytest.mark.asyncio
class TestGitHubDisconnection:
    """Test GitHub OAuth disconnection."""

    async def test_disconnect_github(self, client, auth_tokens, github_connection):
        """Test disconnecting GitHub account."""
        response = await client.delete(
            "/github/connection",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify connection is deleted
        async with test_async_session_maker() as session:
            result = await session.execute(
                GitHubConnection.__table__.select().where(
                    GitHubConnection.user_id == github_connection.user_id
                )
            )
            connection = result.fetchone()
            assert connection is None

    async def test_disconnect_when_not_connected(self, client, auth_tokens, test_user):
        """Test disconnecting when not connected."""
        response = await client.delete(
            "/github/connection",
            headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_disconnect_requires_authentication(self, client):
        """Test that disconnecting requires authentication."""
        response = await client.delete("/github/connection")
        assert response.status_code == 401


# =============================================================================
# Helper Function Tests
# =============================================================================


@pytest.mark.asyncio
class TestOAuthStateValidation:
    """Test OAuth state validation."""

    async def test_valid_oauth_state(self, oauth_state):
        """Test validation of valid OAuth state."""
        from routes.github import validate_oauth_state

        async with test_async_session_maker() as session:
            validated_state = await validate_oauth_state(oauth_state.state, session)
            assert validated_state.id == oauth_state.id
            assert validated_state.user_id == oauth_state.user_id

    async def test_expired_oauth_state(self, expired_oauth_state):
        """Test validation fails for expired OAuth state."""
        from routes.github import validate_oauth_state

        async with test_async_session_maker() as session:
            with pytest.raises(Exception):  # HTTPException
                await validate_oauth_state(expired_oauth_state.state, session)

    async def test_nonexistent_oauth_state(self):
        """Test validation fails for nonexistent OAuth state."""
        from routes.github import validate_oauth_state

        async with test_async_session_maker() as session:
            with pytest.raises(Exception):  # HTTPException
                await validate_oauth_state("nonexistent_state", session)
