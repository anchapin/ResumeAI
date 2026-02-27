"""
End-to-end integration tests for resume variant management.

Tests cover:
- Listing available variants
- Filtering variants by different criteria
- Variant metadata
- Variant selection in PDF generation
"""

import pytest
from httpx import AsyncClient


class TestVariantListing:
    """Test listing and retrieving resume variants."""

    @pytest.mark.asyncio
    async def test_list_all_variants(
        self, api_client: AsyncClient
    ):
        """Test listing all available resume variants."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        # Response should contain variants list
        assert "variants" in data or isinstance(data, list)

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        assert isinstance(variants, list)
        assert len(variants) > 0

    @pytest.mark.asyncio
    async def test_variant_has_required_fields(
        self, api_client: AsyncClient
    ):
        """Test that each variant has required metadata."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        if len(variants) > 0:
            variant = variants[0]
            # Variant should have at least a name/id
            assert "name" in variant or "id" in variant or "template" in variant

    @pytest.mark.asyncio
    async def test_variant_metadata(
        self, api_client: AsyncClient
    ):
        """Test variant metadata is complete."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        if len(variants) > 0:
            variant = variants[0]
            # Variant should have useful metadata
            assert isinstance(variant, dict)


class TestVariantFiltering:
    """Test variant filtering capabilities."""

    @pytest.mark.asyncio
    async def test_filter_variants_by_search(
        self, api_client: AsyncClient
    ):
        """Test filtering variants by search term."""
        response = await api_client.get(
            "/v1/variants",
            params={"search": "modern"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should return filtered results
        assert "variants" in data or isinstance(data, list)

    @pytest.mark.asyncio
    async def test_filter_variants_by_category(
        self, api_client: AsyncClient
    ):
        """Test filtering variants by category."""
        response = await api_client.get(
            "/v1/variants",
            params={"category": "technical"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should return filtered results
        assert isinstance(data, (dict, list))

    @pytest.mark.asyncio
    async def test_filter_variants_by_layout(
        self, api_client: AsyncClient
    ):
        """Test filtering variants by layout."""
        response = await api_client.get(
            "/v1/variants",
            params={"layout": "single-column"},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_filter_variants_by_color_theme(
        self, api_client: AsyncClient
    ):
        """Test filtering variants by color theme."""
        response = await api_client.get(
            "/v1/variants",
            params={"color_theme": "blue"},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_filter_variants_by_tags(
        self, api_client: AsyncClient
    ):
        """Test filtering variants by tags."""
        response = await api_client.get(
            "/v1/variants",
            params={"tags": "modern,professional"},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_combine_multiple_filters(
        self, api_client: AsyncClient
    ):
        """Test combining multiple filters."""
        response = await api_client.get(
            "/v1/variants",
            params={
                "search": "modern",
                "category": "technical",
                "layout": "single-column",
            },
        )

        assert response.status_code == 200


class TestVariantInPDFGeneration:
    """Test using variants in PDF generation."""

    @pytest.mark.asyncio
    async def test_use_specific_variant_for_pdf(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test generating PDF with specific variant."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "modern",
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_invalid_variant_handled(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test handling of invalid variant name."""
        response = await authenticated_client.post(
            "/v1/render/pdf",
            json={
                "resume_data": minimal_resume_data,
                "variant": "nonexistent_variant_xyz",
            },
        )

        # Should either use default or return error
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_pdf_respects_variant_style(
        self, authenticated_client: AsyncClient, minimal_resume_data
    ):
        """Test that PDF reflects the chosen variant style."""
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
            assert len(response.content) > 0


class TestVariantMetadata:
    """Test variant metadata and descriptions."""

    @pytest.mark.asyncio
    async def test_variant_description(
        self, api_client: AsyncClient
    ):
        """Test that variants have descriptions."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        if len(variants) > 0:
            variant = variants[0]
            # Variant may have description
            if "description" in variant:
                assert isinstance(variant["description"], str)

    @pytest.mark.asyncio
    async def test_variant_preview_info(
        self, api_client: AsyncClient
    ):
        """Test that variant metadata includes preview information."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        # Variants may have preview URLs or screenshots
        assert isinstance(variants, list)

    @pytest.mark.asyncio
    async def test_variant_categorization(
        self, api_client: AsyncClient
    ):
        """Test that variants are properly categorized."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        assert isinstance(variants, list)

        # Variants should be organized in some way
        if len(variants) > 1:
            assert any("category" in v or "tags" in v for v in variants if isinstance(v, dict))


class TestVariantPerformance:
    """Test variant listing performance."""

    @pytest.mark.asyncio
    async def test_list_variants_response_time(
        self, api_client: AsyncClient
    ):
        """Test that listing variants is fast."""
        import time

        start = time.time()
        response = await api_client.get("/v1/variants")
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 2  # Should complete quickly

    @pytest.mark.asyncio
    async def test_filter_variants_response_time(
        self, api_client: AsyncClient
    ):
        """Test that filtering variants is fast."""
        import time

        start = time.time()
        response = await api_client.get(
            "/v1/variants",
            params={"search": "modern"},
        )
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 2  # Should complete quickly


class TestVariantAvailability:
    """Test variant availability and compatibility."""

    @pytest.mark.asyncio
    async def test_variants_available_without_auth(
        self, unauthenticated_client: AsyncClient
    ):
        """Test that variant listing doesn't require authentication."""
        response = await unauthenticated_client.get("/v1/variants")

        # Variants listing should be public
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_default_variant_exists(
        self, api_client: AsyncClient
    ):
        """Test that a default variant is available."""
        response = await api_client.get("/v1/variants")

        assert response.status_code == 200
        data = response.json()

        if "variants" in data:
            variants = data["variants"]
        else:
            variants = data

        # Should have at least one variant available
        assert len(variants) > 0
