"""
Integration tests for GitHub routes with database.

Tests cover:
- Database storage of GitHub connections
- OAuth callback storing connections in database
- Status endpoint checking database for connections
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from main import app
from database import GitHubConnection, get_db, engine
from lib.token_encryption import generate_encryption_key


@pytest.fixture
async def db_session():
    """Create a test database session."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    # Use in-memory SQLite for testing
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(GitHubConnection.metadata.create_all)

    async with async_session_maker() as session:
        yield session

    # Cleanup
    await test_engine.dispose()


@pytest.fixture
def test_encryption_key():
    """Generate a test encryption key."""
    import os

    key = generate_encryption_key()
    os.environ["TOKEN_ENCRYPTION_KEY"] = key
    yield key
    # Clean up
    del os.environ["TOKEN_ENCRYPTION_KEY"]


class TestGitHubDatabaseIntegration:
    """Test suite for GitHub routes with database integration."""

    @pytest.mark.asyncio
    async def test_status_no_connection(self, db_session, test_encryption_key):
        """Test status endpoint when no connection exists."""
        from fastapi.testclient import TestClient

        client = TestClient(app)

        # Set OAuth mode
        import os
        os.environ["GITHUB_AUTH_MODE"] = "oauth"

        response = client.get(
            "/api/github/status",
            headers={"X-User-Identifier": "test_user"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
        assert data["auth_mode"] == "oauth"
        assert data["username"] is None

    @pytest.mark.asyncio
    async def test_status_with_connection(self, db_session, test_encryption_key):
        """Test status endpoint when connection exists."""
        from fastapi.testclient import TestClient
        from sqlalchemy import select
        from lib.token_encryption import TokenEncryption

        client = TestClient(app)

        # Set OAuth mode
        import os
        os.environ["GITHUB_AUTH_MODE"] = "oauth"
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"

        # Create test connection
        encryption = TokenEncryption(test_encryption_key)
        encrypted_token = encryption.encrypt("test_access_token")

        connection = GitHubConnection(
            user_identifier="test_user",
            github_user_id=12345,
            github_username="testuser",
            github_email="test@example.com",
            access_token_encrypted=encrypted_token,
            scopes="repo user:email",
            token_type="bearer",
            is_active=True,
        )

        db_session.add(connection)
        await db_session.commit()

        # Check status
        response = client.get(
            "/api/github/status",
            headers={"X-User-Identifier": "test_user"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["username"] == "testuser"
        assert data["auth_mode"] == "oauth"
        assert data["scopes"] == "repo user:email"

    @pytest.mark.asyncio
    async def test_status_inactive_connection(self, db_session, test_encryption_key):
        """Test status endpoint with inactive connection."""
        from fastapi.testclient import TestClient
        from lib.token_encryption import TokenEncryption

        client = TestClient(app)

        # Set OAuth mode
        import os
        os.environ["GITHUB_AUTH_MODE"] = "oauth"
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"

        # Create inactive connection
        encryption = TokenEncryption(test_encryption_key)
        encrypted_token = encryption.encrypt("test_access_token")

        connection = GitHubConnection(
            user_identifier="test_user",
            github_user_id=12345,
            github_username="testuser",
            github_email="test@example.com",
            access_token_encrypted=encrypted_token,
            scopes="repo user:email",
            token_type="bearer",
            is_active=False,  # Inactive
        )

        db_session.add(connection)
        await db_session.commit()

        # Check status
        response = client.get(
            "/api/github/status",
            headers={"X-User-Identifier": "test_user"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
        assert data["username"] is None

    @pytest.mark.asyncio
    async def test_status_multiple_connections(self, db_session, test_encryption_key):
        """Test status endpoint with multiple connections (should return active one)."""
        from fastapi.testclient import TestClient
        from lib.token_encryption import TokenEncryption

        client = TestClient(app)

        # Set OAuth mode
        import os
        os.environ["GITHUB_AUTH_MODE"] = "oauth"
        os.environ["GITHUB_CLIENT_ID"] = "test_client_id"

        encryption = TokenEncryption(test_encryption_key)

        # Create inactive connection
        encrypted_token1 = encryption.encrypt("old_access_token")
        connection1 = GitHubConnection(
            user_identifier="test_user",
            github_user_id=12345,
            github_username="olduser",
            access_token_encrypted=encrypted_token1,
            scopes="repo",
            token_type="bearer",
            is_active=False,
        )

        # Create active connection
        encrypted_token2 = encryption.encrypt("new_access_token")
        connection2 = GitHubConnection(
            user_identifier="test_user",
            github_user_id=67890,
            github_username="newuser",
            access_token_encrypted=encrypted_token2,
            scopes="repo user:email",
            token_type="bearer",
            is_active=True,
        )

        db_session.add(connection1)
        db_session.add(connection2)
        await db_session.commit()

        # Check status
        response = client.get(
            "/api/github/status",
            headers={"X-User-Identifier": "test_user"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["username"] == "newuser"  # Should return active connection
        assert data["scopes"] == "repo user:email"
