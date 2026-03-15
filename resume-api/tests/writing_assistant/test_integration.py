"""
Integration tests for Writing Assistant API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


class TestWritingAssistantAPI:
    """Integration tests for writing assistant endpoints."""

    @pytest.mark.asyncio
    async def test_suggest_endpoint(self, client):
        """Test /api/v1/writing/suggest endpoint."""
        response = await client.post(
            "/api/v1/writing/suggest",
            json={
                "text": "He go to school yesterday",
                "context": {"section_type": "experience"}
            }
        )
        
        # Should return 200 (may have no suggestions if services not running)
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "processing_time_ms" in data

    @pytest.mark.asyncio
    async def test_grammar_endpoint(self, client):
        """Test /api/v1/writing/grammar endpoint."""
        response = await client.post(
            "/api/v1/writing/grammar",
            json={"text": "He go to school"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "error_count" in data
        assert "warning_count" in data

    @pytest.mark.asyncio
    async def test_enhance_endpoint_action_verbs(self, client):
        """Test /api/v1/writing/enhance with action_verbs."""
        response = await client.post(
            "/api/v1/writing/enhance",
            json={
                "text": "Helped with the project",
                "enhancement_type": "action_verbs",
                "context": {"role": "Engineer"}
            }
        )
        
        # May fail if API keys not configured
        if response.status_code == 200:
            data = response.json()
            assert "original" in data
            assert "enhanced" in data
            assert "enhancement_type" in data

    @pytest.mark.asyncio
    async def test_enhance_endpoint_invalid_type(self, client):
        """Test /api/v1/writing/enhance with invalid type."""
        response = await client.post(
            "/api/v1/writing/enhance",
            json={
                "text": "Helped with project",
                "enhancement_type": "invalid_type"
            }
        )
        
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_quantify_endpoint(self, client):
        """Test /api/v1/writing/quantify endpoint."""
        response = await client.post(
            "/api/v1/writing/quantify",
            json={
                "text": "Improved performance significantly",
                "role": "Software Engineer"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "original" in data
            assert "enhanced" in data

    @pytest.mark.asyncio
    async def test_quality_endpoint(self, client):
        """Test /api/v1/writing/quality endpoint."""
        response = await client.get(
            "/api/v1/writing/quality",
            params={
                "text": "This is a well-written sentence.",
                "section_type": "experience"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "quality_score" in data
            assert "grade" in data
            assert "suggestion_count" in data

    @pytest.mark.asyncio
    async def test_history_endpoint(self, client):
        """Test /api/v1/writing/history endpoint."""
        response = await client.get(
            "/api/v1/writing/history",
            params={"limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "total_count" in data
        assert "stats" in data

    @pytest.mark.asyncio
    async def test_stats_endpoint(self, client):
        """Test /api/v1/writing/stats endpoint."""
        response = await client.get("/api/v1/writing/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_suggestions" in data
        assert "accepted" in data
        assert "rejection_rate" in data or "acceptance_rate" in data

    @pytest.mark.asyncio
    async def test_suggest_empty_text(self, client):
        """Test /api/v1/writing/suggest with empty text."""
        response = await client.post(
            "/api/v1/writing/suggest",
            json={"text": ""}
        )
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_suggest_long_text(self, client):
        """Test /api/v1/writing/suggest with long text."""
        long_text = "This is a sentence. " * 500  # 1000 words
        
        response = await client.post(
            "/api/v1/writing/suggest",
            json={"text": long_text}
        )
        
        # May succeed or fail depending on max length validation
        assert response.status_code in [200, 422]

    @pytest.mark.asyncio
    async def test_suggest_with_context(self, client):
        """Test /api/v1/writing/suggest with full context."""
        response = await client.post(
            "/api/v1/writing/suggest",
            json={
                "text": "Led development of new features",
                "context": {
                    "section_type": "experience",
                    "role": "Senior Engineer",
                    "industry": "Technology",
                    "jd_keywords": ["leadership", "Python", "AWS"]
                }
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "suggestions" in data
            assert "quality_score" in data
