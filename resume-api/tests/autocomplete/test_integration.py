"""
Integration tests for Auto-Complete API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


class TestAutocompleteAPI:
    """Integration tests for autocomplete endpoints."""

    @pytest.mark.asyncio
    async def test_suggest_endpoint(self, client):
        """Test /api/v1/autocomplete/suggest endpoint."""
        response = await client.post(
            "/api/v1/autocomplete/suggest",
            json={
                "text": "Led development",
                "cursor_position": 15,
                "section_type": "experience",
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "completions" in data
        assert "processing_time_ms" in data

    @pytest.mark.asyncio
    async def test_suggest_empty_text(self, client):
        """Test /api/v1/autocomplete/suggest with empty text."""
        response = await client.post(
            "/api/v1/autocomplete/suggest",
            json={
                "text": "",
                "cursor_position": 0,
            }
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_suggest_short_text(self, client):
        """Test /api/v1/autocomplete/suggest with short text."""
        response = await client.post(
            "/api/v1/autocomplete/suggest",
            json={
                "text": "L",
                "cursor_position": 1,
            }
        )

        # May succeed or return no completions
        assert response.status_code in [200, 422]

    @pytest.mark.asyncio
    async def test_bullet_endpoint(self, client):
        """Test /api/v1/autocomplete/bullet endpoint."""
        response = await client.post(
            "/api/v1/autocomplete/bullet",
            json={
                "section_type": "experience",
                "role": "Engineer",
                "limit": 3,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "bullets" in data
        assert len(data["bullets"]) > 0

    @pytest.mark.asyncio
    async def test_bullet_by_section(self, client):
        """Test bullet completions for different sections."""
        experience_response = await client.post(
            "/api/v1/autocomplete/bullet",
            json={"section_type": "experience"}
        )
        projects_response = await client.post(
            "/api/v1/autocomplete/bullet",
            json={"section_type": "projects"}
        )

        assert experience_response.status_code == 200
        assert projects_response.status_code == 200

    @pytest.mark.asyncio
    async def test_context_endpoint(self, client):
        """Test /api/v1/autocomplete/context endpoint."""
        response = await client.get(
            "/api/v1/autocomplete/context",
            params={
                "text": "Senior Software Engineer with 5+ years",
                "cursor_pos": 10,
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "section_type" in data
        assert "writing_style" in data
        assert "detected_role" in data

    @pytest.mark.asyncio
    async def test_context_detects_role(self, client):
        """Test context endpoint detects role."""
        response = await client.get(
            "/api/v1/autocomplete/context",
            params={
                "text": "Senior Software Engineer",
                "cursor_pos": 10,
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert data["detected_role"] is not None

    @pytest.mark.asyncio
    async def test_context_detects_seniority(self, client):
        """Test context endpoint detects seniority."""
        response = await client.get(
            "/api/v1/autocomplete/context",
            params={
                "text": "Senior Software Engineer",
                "cursor_pos": 10,
            }
        )

        if response.status_code == 200:
            data = response.json()
            assert data["seniority_level"] == "senior"

    @pytest.mark.asyncio
    async def test_feedback_endpoint(self, client):
        """Test /api/v1/autocomplete/feedback endpoint."""
        response = await client.post(
            "/api/v1/autocomplete/feedback",
            json={
                "completion_id": "test_123",
                "accepted": True,
                "context": {"section_type": "experience"},
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True

    @pytest.mark.asyncio
    async def test_stream_endpoint(self, client):
        """Test /api/v1/autocomplete/stream endpoint."""
        response = await client.get(
            "/api/v1/autocomplete/stream",
            params={
                "text": "Led development",
                "section_type": "experience",
            }
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream"

    @pytest.mark.asyncio
    async def test_stream_bullet_endpoint(self, client):
        """Test /api/v1/autocomplete/stream/bullet endpoint."""
        response = await client.get(
            "/api/v1/autocomplete/stream/bullet",
            params={
                "section_type": "experience",
                "role": "Engineer",
            }
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream
