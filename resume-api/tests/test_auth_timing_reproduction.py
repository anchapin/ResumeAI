import os
import tempfile
import pytest
import pytest_asyncio
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from main import app
from database import Base, get_async_session


# Use tempfile for database
@pytest_asyncio.fixture(scope="module")
def test_db_path():
    """Create a temporary database file."""
    # Use delete=False because Windows can't open open files again, and to control cleanup manually
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    yield path
    # Cleanup
    if os.path.exists(path):
        os.unlink(path)


@pytest_asyncio.fixture(scope="module")
async def test_engine_fixture(test_db_path):
    """Create async engine with temp database."""
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{test_db_path}",
        echo=False,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="module")
async def test_async_session_maker_fixture(test_engine_fixture):
    """Create session maker."""
    yield async_sessionmaker(
        test_engine_fixture,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture(scope="function")
async def override_get_async_session_fixture(test_async_session_maker_fixture):
    """Override database session for testing."""

    async def _get_session():
        async with test_async_session_maker_fixture() as session:
            yield session

    return _get_session


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_database(test_engine_fixture, override_get_async_session_fixture):
    """Create test database tables before each test."""
    async with test_engine_fixture.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Override the dependency
    app.dependency_overrides[get_async_session] = override_get_async_session_fixture

    yield

    # Clean up after test
    app.dependency_overrides.clear()
    async with test_engine_fixture.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_timing_attack_mitigation(client):
    """
    Test that verify_password IS called when user does not exist.
    This confirms the timing attack mitigation (constant time verification).
    """
    # Patch the verify_password function imported in routes.auth
    with patch("routes.auth.verify_password") as mock_verify:
        # We need to make sure verify_password returns False if called
        mock_verify.return_value = False

        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "anypassword"},
        )

        # After fix, verify_password MUST be called to prevent timing attacks
        assert response.status_code == 401
        mock_verify.assert_called_once()
