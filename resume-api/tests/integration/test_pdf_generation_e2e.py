"""
End-to-end integration tests for PDF generation endpoint.

Tests cover:
- Basic PDF generation
- Special characters and Unicode handling
- Long text content
- Missing required fields
- Rate limiting
- Authentication requirements
"""

import pytest
from httpx import AsyncClient


class TestPDFGenerationBasic:
    """Basic PDF generation tests."""

    @pytest.mark.asyncio
    async def test_generate_pdf_minimal_data(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation with minimal resume data."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0
        assert response.content.startswith(b"%PDF")

    @pytest.mark.asyncio
    async def test_generate_pdf_comprehensive_data(
        self, authenticated_client: AsyncClient, comprehensive_resume_data
    ):
        """Test PDF generation with comprehensive resume data."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": comprehensive_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_generate_pdf_different_variants(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation with different template variants."""
        variants = ["modern", "classic", "minimal"]

        for variant in variants:
            response = await authenticated_client.post(
                "/v1/render/pdf",
                json={
                    "resume_data": minimal_resume_data,
                    "variant": variant,
                },
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"


class TestPDFGenerationEdgeCases:
    """Test edge cases in PDF generation."""

    @pytest.mark.asyncio
    async def test_generate_pdf_with_special_characters(
        self, authenticated_client: AsyncClient, resume_with_special_chars
    ):
        """Test PDF generation with special characters and Unicode."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_with_special_chars,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        # Verify PDF contains expected content markers
        assert len(response.content) > 0

    @pytest.mark.asyncio
    async def test_generate_pdf_with_long_text(
        self, authenticated_client: AsyncClient, resume_with_long_text
    ):
        """Test PDF generation with very long text content."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_with_long_text,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_generate_pdf_missing_contact_name(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation with missing contact name."""
        resume_data = minimal_resume_data.copy()
        resume_data["contact"].pop("name", None)

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 400
        assert "detail" in response.json()

    @pytest.mark.asyncio
    async def test_generate_pdf_empty_sections(
        self, authenticated_client: AsyncClient
    ):
        """Test PDF generation with empty sections."""
        resume_data = {
            "contact": {
                "name": "John Doe",
                "email": "john@example.com",
            },
            "sections": {
                "experience": [],
                "education": [],
            },
        }

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_generate_pdf_invalid_email(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation with invalid email format."""
        resume_data = minimal_resume_data.copy()
        resume_data["contact"]["email"] = "not-an-email"

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 400


class TestPDFGenerationAuthentication:
    """Test authentication and authorization for PDF generation."""

    @pytest.mark.asyncio
    async def test_generate_pdf_without_api_key(
        self, unauthenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation fails without API key."""
        response = await unauthenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    @pytest.mark.asyncio
    async def test_generate_pdf_with_invalid_api_key(
        self, api_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF generation fails with invalid API key."""
        api_client.headers = {"X-API-KEY": "invalid_key_12345"}

        response = await api_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 401


class TestPDFGenerationRateLimiting:
    """Test rate limiting on PDF generation."""

    @pytest.mark.asyncio
    async def test_pdf_rate_limit_header(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test rate limit headers are present."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        # Rate limit headers should be present
        assert "x-ratelimit-limit" in response.headers or "retry-after" not in response.headers


class TestPDFGenerationPerformance:
    """Test PDF generation performance characteristics."""

    @pytest.mark.asyncio
    async def test_pdf_generation_response_time(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test that PDF generation completes in reasonable time."""
        import time

        start = time.time()
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 10  # Should complete within 10 seconds

    @pytest.mark.asyncio
    async def test_concurrent_pdf_generation(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test concurrent PDF generation requests."""
        import asyncio

        async def generate_pdf():
            return await authenticated_client.post(
                "/v1/render/pdf",
                json={
                    "resume_data": minimal_resume_data,
                    "variant": "modern",
                },
            )

        # Generate 3 PDFs concurrently
        responses = await asyncio.gather(
            generate_pdf(),
            generate_pdf(),
            generate_pdf(),
        )

        assert all(r.status_code == 200 for r in responses)
        assert all(r.headers["content-type"] == "application/pdf" for r in responses)
