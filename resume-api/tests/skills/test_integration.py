"""
Integration tests for Skills API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


class TestSkillsAPI:
    """Integration tests for skills endpoints."""

    @pytest.mark.asyncio
    async def test_extract_endpoint(self, client):
        """Test /api/v1/skills/extract endpoint."""
        response = await client.post(
            "/api/v1/skills/extract",
            json={
                "text": "We are looking for a Python developer with AWS experience",
                "include_metadata": True,
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "skills" in data
        assert "total_count" in data
        assert "processing_time_ms" in data

    @pytest.mark.asyncio
    async def test_extract_empty_text(self, client):
        """Test /api/v1/skills/extract with empty text."""
        response = await client.post(
            "/api/v1/skills/extract",
            json={"text": ""}
        )
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_extract_short_text(self, client):
        """Test /api/v1/skills/extract with short text."""
        response = await client.post(
            "/api/v1/skills/extract",
            json={"text": "test"}
        )
        
        assert response.status_code == 422  # Validation error (min length)

    @pytest.mark.asyncio
    async def test_match_endpoint(self, client):
        """Test /api/v1/skills/match endpoint."""
        response = await client.post(
            "/api/v1/skills/match",
            json={
                "jd_text": "Looking for Python developer with AWS",
                "resume_text": "I have experience with Python and Java",
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "matched_skills" in data
        assert "missing_skills" in data
        assert "coverage_score" in data

    @pytest.mark.asyncio
    async def test_match_with_resume_skills(self, client):
        """Test /api/v1/skills/match with pre-extracted resume skills."""
        response = await client.post(
            "/api/v1/skills/match",
            json={
                "jd_text": "Looking for Python developer",
                "resume_text": "My resume",
                "resume_skills": ["Python", "Java"],
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "matched_skills" in data

    @pytest.mark.asyncio
    async def test_gap_endpoint(self, client):
        """Test /api/v1/skills/gap endpoint."""
        response = await client.get(
            "/api/v1/skills/gap",
            params={
                "jd_text": "Looking for Python developer with AWS",
                "resume_text": "I have experience with Python",
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "gap_score" in data
            assert "matched_skills" in data
            assert "recommendations" in data

    @pytest.mark.asyncio
    async def test_categories_endpoint(self, client):
        """Test /api/v1/skills/categories endpoint."""
        response = await client.get("/api/v1/skills/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "statistics" in data
        
        # Should have main categories
        assert "technical" in data["categories"]
        assert "tools" in data["categories"]
        assert "soft" in data["categories"]

    @pytest.mark.asyncio
    async def test_search_endpoint(self, client):
        """Test /api/v1/skills/search endpoint."""
        response = await client.get(
            "/api/v1/skills/search",
            params={"q": "Python", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "query" in data
        assert "results" in data
        assert "count" in data
        assert data["query"] == "Python"

    @pytest.mark.asyncio
    async def test_search_limit(self, client):
        """Test /api/v1/skills/search with limit."""
        response = await client.get(
            "/api/v1/skills/search",
            params={"q": "a", "limit": 3}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert len(data["results"]) <= 3

    @pytest.mark.asyncio
    async def test_extract_complex_jd(self, client):
        """Test extraction with complex job description."""
        jd_text = """
        We are looking for a Senior Software Engineer with:
        - 5+ years of Python programming
        - Experience with AWS cloud services (EC2, S3, Lambda)
        - Strong knowledge of React and Node.js
        - Docker and Kubernetes experience
        - Excellent communication and leadership skills
        """
        
        response = await client.post(
            "/api/v1/skills/extract",
            json={"text": jd_text, "include_metadata": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 5

    @pytest.mark.asyncio
    async def test_match_empty_resume(self, client):
        """Test matching with empty resume."""
        response = await client.post(
            "/api/v1/skills/match",
            json={
                "jd_text": "Looking for Python developer",
                "resume_text": "",
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert len(data["missing_skills"]) > 0
            assert data["coverage_score"] == 0

    @pytest.mark.asyncio
    async def test_extract_by_category(self, client):
        """Test that extraction returns categorized skills."""
        response = await client.post(
            "/api/v1/skills/extract",
            json={
                "text": "Python developer with AWS and leadership skills",
                "include_metadata": True,
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "by_category" in data
        
        # Should have at least one category
        assert len(data["by_category"]) > 0
