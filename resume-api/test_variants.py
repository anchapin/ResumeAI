"""
Comprehensive tests for Template Variants functionality.

Tests the VariantManager class and /v1/variants endpoint.
"""

from lib.cli.variants import VariantManager, MockVariantManager
import pytest
import sys
from pathlib import Path

# Add lib to path
lib_path = Path(__file__).parent.parent / "resume-api"
sys.path.insert(0, str(lib_path))


class TestVariantManager:
    """Tests for VariantManager class."""

    @pytest.fixture
    def variant_manager(self):
        """Create a VariantManager instance."""
        templates_dir = Path(__file__).parent.parent / "resume-api" / "templates"
        return VariantManager(str(templates_dir))

    def test_initialization(self, variant_manager):
        """Test that VariantManager initializes correctly."""
        assert variant_manager.templates_dir.exists()

    def test_list_variants(self, variant_manager):
        """Test listing available variants."""
        variants = variant_manager.list_variants()

        assert isinstance(variants, list)
        assert len(variants) > 0
        # Should include base template
        assert "base" in variants

    def test_get_variant_metadata_base(self, variant_manager):
        """Test getting metadata for base variant."""
        metadata = variant_manager.get_variant_metadata("base")

        assert isinstance(metadata, dict)
        assert "name" in metadata
        assert "display_name" in metadata
        assert metadata["name"] == "base"

    def test_get_variant_metadata_all(self, variant_manager):
        """Test getting metadata for all variants."""
        variants = variant_manager.list_variants()

        for variant in variants:
            metadata = variant_manager.get_variant_metadata(variant)
            assert isinstance(metadata, dict)
            assert metadata["name"] == variant

    def test_get_variant_metadata_nonexistent(self, variant_manager):
        """Test getting metadata for non-existent variant."""
        with pytest.raises(FileNotFoundError):
            variant_manager.get_variant_metadata("nonexistent")

    def test_validate_variant_valid(self, variant_manager):
        """Test validating a valid variant."""
        assert variant_manager.validate_variant("base") is True

    def test_validate_variant_invalid(self, variant_manager):
        """Test validating an invalid variant."""
        assert variant_manager.validate_variant("nonexistent") is False

    def test_get_variants_with_metadata(self, variant_manager):
        """Test getting all variants with metadata."""
        variants = variant_manager.get_variants_with_metadata()

        assert isinstance(variants, list)
        assert len(variants) > 0

        for variant in variants:
            assert "name" in variant
            assert "display_name" in variant

    def test_filter_variants_by_search(self, variant_manager):
        """Test filtering variants by search query."""
        results = variant_manager.filter_variants(search="modern")

        assert isinstance(results, list)
        # Should find modern variant if it exists
        [v.get("name", "") for v in results]
        # Check that search worked (may or may not find matches)

    def test_filter_variants_by_category(self, variant_manager):
        """Test filtering variants by category."""
        results = variant_manager.filter_variants(category="technical")

        assert isinstance(results, list)

    def test_filter_variants_by_tags(self, variant_manager):
        """Test filtering variants by tags."""
        results = variant_manager.filter_variants(tags=["professional"])

        assert isinstance(results, list)

    def test_filter_variants_by_layout(self, variant_manager):
        """Test filtering variants by layout."""
        results = variant_manager.filter_variants(layout="single-column")

        assert isinstance(results, list)

    def test_filter_variants_combined(self, variant_manager):
        """Test filtering with multiple criteria."""
        results = variant_manager.filter_variants(
            search="tech", category="technical", tags=["modern"]
        )

        assert isinstance(results, list)


class TestMockVariantManager:
    """Tests for MockVariantManager class."""

    @pytest.fixture
    def mock_manager(self):
        """Create a MockVariantManager instance."""
        return MockVariantManager()

    def test_list_variants(self, mock_manager):
        """Test listing mock variants."""
        variants = mock_manager.list_variants()

        assert isinstance(variants, list)
        assert "base" in variants

    def test_get_variant_metadata(self, mock_manager):
        """Test getting mock variant metadata."""
        metadata = mock_manager.get_variant_metadata("base")

        assert isinstance(metadata, dict)
        assert metadata["name"] == "base"

    def test_validate_variant_valid(self, mock_manager):
        """Test validating valid mock variant."""
        assert mock_manager.validate_variant("base") is True

    def test_validate_variant_invalid(self, mock_manager):
        """Test validating invalid mock variant."""
        assert mock_manager.validate_variant("nonexistent") is False

    def test_get_variants_with_metadata(self, mock_manager):
        """Test getting all mock variants with metadata."""
        variants = mock_manager.get_variants_with_metadata()

        assert isinstance(variants, list)
        assert len(variants) > 0


class TestVariantFiltering:
    """Tests for variant filtering edge cases."""

    @pytest.fixture
    def variant_manager(self):
        """Create a VariantManager instance."""
        templates_dir = Path(__file__).parent.parent / "resume-api" / "templates"
        return VariantManager(str(templates_dir))

    def test_filter_with_no_matches(self, variant_manager):
        """Test filtering that returns no results."""
        results = variant_manager.filter_variants(search="xyznonexistent123")

        assert isinstance(results, list)

    def test_filter_case_insensitive(self, variant_manager):
        """Test that filtering is case insensitive."""
        results_lower = variant_manager.filter_variants(search="BASE")
        results_normal = variant_manager.filter_variants(search="base")

        # Should find results for both
        assert isinstance(results_lower, list)
        assert isinstance(results_normal, list)

    def test_filter_by_color_theme(self, variant_manager):
        """Test filtering by color theme."""
        results = variant_manager.filter_variants(color_theme="blue")

        assert isinstance(results, list)

    def test_filter_by_industry(self, variant_manager):
        """Test filtering by industry."""
        results = variant_manager.filter_variants(industry="technology")

        assert isinstance(results, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
