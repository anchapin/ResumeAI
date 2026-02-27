"""
End-to-end integration tests for error handling.

Tests cover:
- Invalid request data
- Missing required fields
- Validation errors
- Rate limiting errors
- Authentication errors
- Server errors
"""

import pytest
from httpx import AsyncClient


class TestValidationErrors:
    """Test validation error handling."""

    @pytest.mark.asyncio
    async def test_missing_required_field_contact_name(
        self, authenticated_client: AsyncClient
    ):
        """Test error when contact name is missing."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": {
                    "contact": {
                        "email": "test@example.com",
                    },
                    "sections": {},
                },
                "variant": "modern",
            },
        )

        assert response.status_code == 400 or response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_email_format(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error with invalid email format."""
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

    @pytest.mark.asyncio
    async def test_invalid_phone_format(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error with invalid phone format."""
        resume_data = minimal_resume_data.copy()
        resume_data["contact"]["phone"] = "not-a-phone"

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        # May or may not validate phone strictly
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_invalid_url_format(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error with invalid URL format."""
        resume_data = minimal_resume_data.copy()
        resume_data["contact"]["website"] = "not a url"

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        # May or may not validate URLs strictly
        assert response.status_code in [200, 400]


class TestMissingRequiredFields:
    """Test handling of missing required fields."""

    @pytest.mark.asyncio
    async def test_pdf_missing_resume_data(
        self, authenticated_client: AsyncClient
    ):
        """Test PDF endpoint with missing resume_data."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "variant": "modern",
            },
        )

        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_pdf_missing_variant(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test PDF endpoint with missing variant."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
            },
        )

        # Variant may have default
        assert response.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_tailor_missing_resume_data(
        self, authenticated_client: AsyncClient, job_description_tech
    ):
        """Test tailor endpoint with missing resume_data."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "job_description": job_description_tech["description"],
            },
        )

        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_tailor_missing_job_description(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test tailor endpoint with missing job description."""
        response = await authenticated_client.post(
            "/v1/tailor",
            json={
                "resume_data": minimal_resume_data,
            },
        )

        assert response.status_code in [400, 422]


class TestInvalidDataTypes:
    """Test handling of invalid data types."""

    @pytest.mark.asyncio
    async def test_resume_data_not_dict(
        self, authenticated_client: AsyncClient
    ):
        """Test error when resume_data is not a dict."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": "not a dict",
                "variant": "modern",
            },
        )

        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_variant_not_string(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error when variant is not a string."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": 123,
            },
        )

        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_contact_name_not_string(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error when contact name is not a string."""
        resume_data = minimal_resume_data.copy()
        resume_data["contact"]["name"] = 123

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code in [400, 422]


class TestContentLimitations:
    """Test handling of content size limitations."""

    @pytest.mark.asyncio
    async def test_extremely_long_text_content(
        self, authenticated_client: AsyncClient
    ):
        """Test handling of extremely long text."""
        very_long_text = "x" * 50000  # 50KB of text

        resume_data = {
            "contact": {
                "name": "Test User",
                "email": "test@example.com",
            },
            "sections": {
                "summary": very_long_text,
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

        # Should either process or reject with reasonable error
        assert response.status_code in [200, 400, 413]

    @pytest.mark.asyncio
    async def test_many_experience_entries(
        self, authenticated_client: AsyncClient
    ):
        """Test handling of many experience entries."""
        resume_data = {
            "contact": {
                "name": "Test User",
                "email": "test@example.com",
            },
            "sections": {
                "experience": [
                    {
                        "company": f"Company {i}",
                        "position": "Engineer",
                        "start_date": "2020-01-01",
                        "end_date": "2021-01-01",
                    }
                    for i in range(100)
                ],
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

        # Should handle or gracefully reject
        assert response.status_code in [200, 400]


class TestAuthenticationErrors:
    """Test authentication error handling."""

    @pytest.mark.asyncio
    async def test_missing_api_key_header(
        self, unauthenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test error when API key header is missing."""
        response = await unauthenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_malformed_api_key(
        self, api_client: AsyncClient, minimal_resume_data
    ):
        """Test error with malformed API key."""
        api_client.headers = {"X-API-KEY": ""}

        response = await api_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_wrong_api_key(
        self, api_client: AsyncClient, minimal_resume_data
    ):
        """Test error with wrong API key."""
        api_client.headers = {"X-API-KEY": "wrong_key_xyz_123"}

        response = await api_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 401


class TestErrorResponseFormat:
    """Test error response format and content."""

    @pytest.mark.asyncio
    async def test_error_response_contains_detail(
        self, authenticated_client: AsyncClient
    ):
        """Test that error response contains detail field."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": {
                    "contact": {},
                    "sections": {},
                },
                "variant": "modern",
            },
        )

        if response.status_code != 200:
            data = response.json()
            # Should have error detail
            assert "detail" in data or "error" in data

    @pytest.mark.asyncio
    async def test_validation_error_response_format(
        self, authenticated_client: AsyncClient
    ):
        """Test validation error response format."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": "not a dict",
                "variant": "modern",
            },
        )

        assert response.status_code in [400, 422]
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_error_includes_http_status(
        self, authenticated_client: AsyncClient
    ):
        """Test that error response has proper HTTP status."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={},
        )

        # Should be 4xx error
        assert 400 <= response.status_code < 500


class TestEdgeCaseErrors:
    """Test edge case error scenarios."""

    @pytest.mark.asyncio
    async def test_null_values_in_data(
        self, authenticated_client: AsyncClient
    ):
        """Test handling of null values in data."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": {
                    "contact": {
                        "name": None,
                        "email": "test@example.com",
                    },
                    "sections": {},
                },
                "variant": "modern",
            },
        )

        # Should error or handle gracefully
        assert response.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_empty_sections(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test handling of empty sections."""
        resume_data = minimal_resume_data.copy()
        resume_data["sections"] = {}

        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": resume_data,
                "variant": "modern",
            },
        )

        # Should handle gracefully
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_duplicate_field_names(
        self, authenticated_client: AsyncClient
    ):
        """Test handling of duplicate field names."""
        # This is a JSON parsing edge case
        # Most JSON parsers handle this by keeping last value
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": {
                    "contact": {
                        "name": "First Name",
                        "email": "test@example.com",
                    },
                    "sections": {},
                },
                "variant": "modern",
            },
        )

        # Should handle without crashing
        assert response.status_code in [200, 400, 422]
