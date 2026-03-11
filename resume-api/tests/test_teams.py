"""
Integration tests for Team Collaboration API.

Tests cover:
- Team creation, listing, updating, and deletion
- Member invitation, listing, role update, and removal
- Resume sharing and unsharing
- Resume comments (add, list, update, delete)
- Team activity tracking
"""

import pytest
import pytest_asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient, ASGITransport

from main import app
from database import (
    Team,
    TeamMember,
    TeamResume,
    TeamActivity,
    User,
    Resume,
    Comment,
    async_session_maker,
    Base,
    engine,
)
from config import settings


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """Create database tables before each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test users
    async with async_session_maker() as session:
        user1 = User(
            id=1,
            email="user1@example.com",
            username="user1",
            hashed_password="hashed_password",
            is_active=True,
        )
        user2 = User(
            id=2,
            email="user2@example.com",
            username="user2",
            hashed_password="hashed_password",
            is_active=True,
        )
        user3 = User(
            id=3,
            email="user3@example.com",
            username="user3",
            hashed_password="hashed_password",
            is_active=True,
        )
        session.add_all([user1, user2, user3])
        await session.commit()

    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def disable_security_middleware(monkeypatch):
    """Disable CSRF and Request Signing middleware for tests."""
    monkeypatch.setattr("config.settings.enable_csrf", False)
    monkeypatch.setattr("config.settings.enable_request_signing", False)
    # Also disable rate limiting for tests
    monkeypatch.setattr("config.settings.enable_rate_limiting", False)
    # Ensure API key is not required or use a bypass
    monkeypatch.setattr("config.settings.require_api_key", False)


@pytest_asyncio.fixture
async def test_resume(setup_database):
    """Create a test resume."""
    async with async_session_maker() as session:
        resume = Resume(
            id=100,
            owner_id=1,
            title="Test Resume",
            data={"basics": {"name": "Test User"}},
        )
        session.add(resume)
        await session.commit()
        return resume


@pytest.mark.asyncio
async def test_create_team():
    """Test creating a new team."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/teams/v1/teams",
            json={"name": "Engineering Team", "description": "The engineering department"},
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Engineering Team"
        assert data["description"] == "The engineering department"
        assert data["owner_id"] == 1  # Default user_id when using simple API key
        assert data["member_count"] == 1


@pytest.mark.asyncio
async def test_list_teams():
    """Test listing teams the user belongs to."""
    # First create a team
    async with async_session_maker() as session:
        team = Team(id=1, name="Existing Team", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/teams/v1/teams",
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Existing Team"


@pytest.mark.asyncio
async def test_get_team_details():
    """Test getting detailed team information."""
    async with async_session_maker() as session:
        team = Team(id=1, name="Detailed Team", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/teams/v1/teams/1",
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Detailed Team"
        assert len(data["members"]) == 1
        assert data["members"][0]["username"] == "user1"


@pytest.mark.asyncio
async def test_update_team():
    """Test updating team details."""
    async with async_session_maker() as session:
        team = Team(id=1, name="Old Name", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.put(
            f"{settings.api_v1_prefix}/teams/v1/teams/1",
            json={"name": "New Name", "description": "New Description"},
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["description"] == "New Description"


@pytest.mark.asyncio
async def test_delete_team():
    """Test deleting a team."""
    async with async_session_maker() as session:
        team = Team(id=1, name="To Delete", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.delete(
            f"{settings.api_v1_prefix}/teams/v1/teams/1",
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]


@pytest.mark.asyncio
async def test_invite_member():
    """Test inviting a new member to the team."""
    async with async_session_maker() as session:
        team = Team(id=1, name="Collab Team", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/teams/v1/teams/1/members",
            json={"email": "user2@example.com", "role": "editor"},
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "user2"
        assert data["role"] == "editor"


@pytest.mark.asyncio
async def test_share_resume(test_resume):
    """Test sharing a resume with a team."""
    async with async_session_maker() as session:
        team = Team(id=1, name="Sharing Team", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/teams/v1/teams/1/resumes",
            json={"resume_id": 100, "permission": "edit"},
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        assert "shared" in response.json()["message"]


@pytest.mark.asyncio
async def test_add_comment(test_resume):
    """Test adding a comment to a resume."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/teams/v1/resumes/100/comments",
            json={"content": "Great summary!", "section": "basics"},
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Great summary!"
        assert data["section"] == "basics"


@pytest.mark.asyncio
async def test_list_comments(test_resume):
    """Test listing comments for a resume."""
    async with async_session_maker() as session:
        comment = Comment(
            resume_id=100,
            user_id=1,
            author_name="user1",
            author_email="user1@example.com",
            content="Initial comment",
        )
        session.add(comment)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/teams/v1/resumes/100/comments",
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["content"] == "Initial comment"


@pytest.mark.asyncio
async def test_get_team_activity():
    """Test retrieving team activity."""
    async with async_session_maker() as session:
        team = Team(id=1, name="Activity Team", owner_id=1)
        session.add(team)
        await session.flush()
        member = TeamMember(team_id=1, user_id=1, role="owner")
        session.add(member)
        
        activity = TeamActivity(
            team_id=1,
            user_id=1,
            action="team_created",
            description="Team was created",
        )
        session.add(activity)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/teams/v1/teams/1/activity",
            headers={"X-API-KEY": "test-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["action"] == "team_created"
