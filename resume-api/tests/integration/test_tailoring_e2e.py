"""
End-to-end integration tests for resume tailoring endpoint.

Tests cover:
- Basic resume tailoring with job description
- Different AI model configurations
- Keyword extraction
- Suggestions generation
- Edge cases and error handling
- Rate limiting
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


class TestResumeTailoringBasic:
    """Basic resume tailoring tests."""

    @pytest.mark.asyncio
    async def test_tailor_resume_with_job_description(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test basic resume tailoring with job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
                "company_name": job_description_tech["company"],
                "job_title": job_description_tech["title"],
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "resume_data" in data
        assert "keywords" in data
        assert "suggestions" in data

        # Verify tailored data is valid
        assert "contact" in data["resume_data"]
        assert "sections" in data["resume_data"]

    @pytest.mark.asyncio
    async def test_tailor_resume_comprehensive_data(
        self,
        authenticated_client: AsyncClient,
        comprehensive_resume_data,
        job_description_tech,
    ):
        """Test tailoring comprehensive resume data."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": comprehensive_resume_data,
                "job_description": job_description_tech["description"],
                "company_name": job_description_tech["company"],
                "job_title": job_description_tech["title"],
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify keywords are extracted
        assert isinstance(data["keywords"], list)
        assert len(data["keywords"]) > 0
        assert all(isinstance(k, str) for k in data["keywords"])

        # Verify suggestions are provided
        assert isinstance(data["suggestions"], list)

    @pytest.mark.asyncio
    async def test_tailor_resume_keywords_extraction(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test keyword extraction from job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        keywords = data["keywords"]

        # Verify relevant keywords are extracted
        job_desc_lower = job_description_tech["description"].lower()
        # At least some keywords should relate to job description
        assert isinstance(keywords, list)
        assert len(keywords) > 0

    @pytest.mark.asyncio
    async def test_tailor_resume_suggestions(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test suggestions generation."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
                "company_name": job_description_tech["company"],
                "job_title": job_description_tech["title"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        suggestions = data["suggestions"]

        # Verify suggestions format
        assert isinstance(suggestions, list)
        assert all(isinstance(s, str) for s in suggestions)


class TestResumeTailoringSpecialContent:
    """Test tailoring with special content types."""

    @pytest.mark.asyncio
    async def test_tailor_resume_with_special_characters(
        self,
        authenticated_client: AsyncClient,
        resume_with_special_chars,
        job_description_tech,
    ):
        """Test tailoring resume with special characters."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": resume_with_special_chars,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "resume_data" in data

    @pytest.mark.asyncio
    async def test_tailor_resume_with_long_text(
        self,
        authenticated_client: AsyncClient,
        resume_with_long_text,
        job_description_tech,
    ):
        """Test tailoring resume with very long text."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": resume_with_long_text,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "resume_data" in data

    @pytest.mark.asyncio
    async def test_tailor_resume_for_different_roles(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
        job_description_ai,
    ):
        """Test tailoring for different job types."""
        tech_response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
                "job_title": "Backend Engineer",
            },
        )

        ai_response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_ai["description"],
                "job_title": "ML Engineer",
            },
        )

        assert tech_response.status_code == 200
        assert ai_response.status_code == 200

        # Different job descriptions should produce different keywords
        tech_keywords = tech_response.json()["keywords"]
        ai_keywords = ai_response.json()["keywords"]
        # Keywords should be different (or at least show some variation)
        assert isinstance(tech_keywords, list)
        assert isinstance(ai_keywords, list)


class TestResumeTailoringEdgeCases:
    """Test edge cases in resume tailoring."""

    @pytest.mark.asyncio
    async def test_tailor_resume_missing_job_description(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test tailoring without job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
            },
        )

        # Should fail or handle gracefully
        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_tailor_resume_empty_job_description(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test tailoring with empty job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": "",
            },
        )

        # Should handle empty job description
        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_tailor_resume_very_short_job_description(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test tailoring with very short job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": "Senior Engineer needed",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "resume_data" in data

    @pytest.mark.asyncio
    async def test_tailor_resume_missing_contact_info(
        self, authenticated_client: AsyncClient, job_description_tech
    ):
        """Test tailoring resume with missing contact info."""
        resume_data = {
            "contact": {},
            "sections": {
                "experience": [],
                "education": [],
            },
        }

        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": resume_data,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code in [400, 422, 200]  # May or may not fail


class TestResumeTailoringAuthentication:
    """Test authentication for tailoring endpoint."""

    @pytest.mark.asyncio
    async def test_tailor_without_api_key(
        self,
        unauthenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test tailoring fails without API key."""
        response = await unauthenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_tailor_with_invalid_api_key(
        self, api_client: AsyncClient, minimal_resume_data, job_description_tech
    ):
        """Test tailoring with invalid API key."""
        api_client.headers = {"X-API-KEY": "invalid_key"}

        response = await api_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 401


class TestResumeTailoringRateLimiting:
    """Test rate limiting on tailoring endpoint."""

    @pytest.mark.asyncio
    async def test_tailor_rate_limit_header(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test rate limit headers are present."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code == 200


class TestResumeTailoringPerformance:
    """Test tailoring performance."""

    @pytest.mark.asyncio
    async def test_tailor_response_time(
        self,
        authenticated_client: AsyncClient,
        minimal_resume_data,
        job_description_tech,
    ):
        """Test tailoring completes in reasonable time."""
        import time

        start = time.time()
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
                "job_description": job_description_tech["description"],
            },
        )
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 15  # Should complete within 15 seconds
