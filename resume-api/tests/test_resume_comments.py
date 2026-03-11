"""Tests for resume comment CRUD operations."""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import Resume, Comment, User


@pytest_asyncio.fixture
async def test_resume(test_db_session, test_user):
    """Create a test resume."""
    resume = Resume(
        title="Test Resume",
        owner_id=test_user.id,
        data={"basics": {"name": "Test User"}},
    )
    test_db_session.add(resume)
    await test_db_session.commit()
    await test_db_session.refresh(resume)
    return resume


@pytest.mark.asyncio
async def test_add_comment(authenticated_client, test_resume, test_user):
    """Test adding a comment to a resume."""
    payload = {
        "content": "This is a test comment",
        "section": "basics",
        "position": {"line": 10}
    }
    
    response = await authenticated_client.post(
        f"/api/v1/teams/v1/resumes/{test_resume.id}/comments",
        json=payload,
        headers={"X-API-KEY": "test-api-key"}
    )
    
    # Note: AuthorizedAPIKey dependency in team_routes.py might need specific setup
    # If it fails due to auth, we might need to override the dependency
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["section"] == payload["section"]
    assert data["user_id"] == test_user.id
    assert data["username"] == test_user.username


@pytest.mark.asyncio
async def test_list_comments(authenticated_client, test_resume, test_user, test_db_session):
    """Test listing comments on a resume."""
    # Create a comment manually
    comment = Comment(
        resume_id=test_resume.id,
        user_id=test_user.id,
        author_name=test_user.username,
        author_email=test_user.email,
        content="Existing comment",
        section="work",
        is_resolved=False
    )
    test_db_session.add(comment)
    await test_db_session.commit()
    
    response = await authenticated_client.get(
        f"/api/v1/teams/v1/resumes/{test_resume.id}/comments",
        headers={"X-API-KEY": "test-api-key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["content"] == "Existing comment"


@pytest.mark.asyncio
async def test_update_comment(authenticated_client, test_resume, test_user, test_db_session):
    """Test updating a comment."""
    comment = Comment(
        resume_id=test_resume.id,
        user_id=test_user.id,
        author_name=test_user.username,
        author_email=test_user.email,
        content="Original content",
        is_resolved=False
    )
    test_db_session.add(comment)
    await test_db_session.commit()
    await test_db_session.refresh(comment)
    
    payload = {
        "content": "Updated content",
        "is_resolved": True
    }
    
    response = await authenticated_client.put(
        f"/api/v1/teams/v1/resumes/{test_resume.id}/comments/{comment.id}",
        json=payload,
        headers={"X-API-KEY": "test-api-key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Updated content"
    assert data["is_resolved"] is True


@pytest.mark.asyncio
async def test_delete_comment(authenticated_client, test_resume, test_user, test_db_session):
    """Test deleting a comment."""
    comment = Comment(
        resume_id=test_resume.id,
        user_id=test_user.id,
        author_name=test_user.username,
        author_email=test_user.email,
        content="To be deleted"
    )
    test_db_session.add(comment)
    await test_db_session.commit()
    await test_db_session.refresh(comment)
    
    response = await authenticated_client.delete(
        f"/api/v1/teams/v1/resumes/{test_resume.id}/comments/{comment.id}",
        headers={"X-API-KEY": "test-api-key"}
    )
    
    assert response.status_code == 200
    
    # Verify it's gone
    stmt = select(Comment).where(Comment.id == comment.id)
    result = await test_db_session.execute(stmt)
    assert result.scalar_one_or_none() is None
