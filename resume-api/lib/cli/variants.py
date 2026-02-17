"""
Template Variant Manager.

This module manages resume template variants, including listing,
metadata retrieval, and validation.
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VariantManager:
    """
    Manage resume template variants.
    """

    def __init__(self, templates_dir: str):
        """
        Initialize the VariantManager.

        Args:
            templates_dir: Path to the templates directory
        """
        self.templates_dir = Path(templates_dir)

        if not self.templates_dir.exists():
            raise FileNotFoundError(
                f"Templates directory not found: {self.templates_dir}"
            )

        logger.info(f"VariantManager initialized with: {self.templates_dir}")

    def list_variants(self) -> List[str]:
        """
        List all available template variants.

        Returns:
            List of variant names
        """
        variants = []

        for item in self.templates_dir.iterdir():
            if item.is_dir():
                # Check if it has a main.tex file
                if (item / "main.tex").exists():
                    variants.append(item.name)
                    logger.debug(f"Found variant: {item.name}")

        logger.info(f"Found {len(variants)} variants")
        return variants

    def get_variant_metadata(self, variant: str) -> Dict[str, Any]:
        """
        Get metadata for a specific variant.

        Args:
            variant: Variant name

        Returns:
            Dictionary containing variant metadata

        Raises:
            FileNotFoundError: If variant doesn't exist
        """
        variant_dir = self.templates_dir / variant

        if not variant_dir.exists():
            raise FileNotFoundError(f"Variant '{variant}' not found at {variant_dir}")

        # Default metadata
        metadata = {
            "name": variant,
            "display_name": variant.capitalize(),
            "description": f"{variant.capitalize()} resume template",
            "format": "latex",
            "output_formats": ["pdf"],
        }

        # Try to load metadata.yaml if it exists
        metadata_file = variant_dir / "metadata.yaml"
        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as f:
                    loaded_metadata = yaml.safe_load(f)
                    if loaded_metadata:
                        metadata.update(loaded_metadata)
            except Exception as e:
                logger.warning(f"Failed to load metadata for '{variant}': {e}")

        return metadata

    def validate_variant(self, variant: str) -> bool:
        """
        Validate that a variant is complete and usable.

        Args:
            variant: Variant name

        Returns:
            True if valid, False otherwise
        """
        try:
            variant_dir = self.templates_dir / variant

            if not variant_dir.exists():
                logger.error(f"Variant directory not found: {variant_dir}")
                return False

            # Check for main.tex
            if not (variant_dir / "main.tex").exists():
                logger.error(f"main.tex not found in variant: {variant}")
                return False

            logger.info(f"Variant '{variant}' is valid")
            return True

        except Exception as e:
            logger.error(f"Error validating variant '{variant}': {e}")
            return False

    def get_variants_with_metadata(self) -> List[Dict[str, Any]]:
        """
        Get all variants with their metadata.

        Returns:
            List of dictionaries, each containing variant name and metadata
        """
        variants = self.list_variants()

        result = []
        for variant in variants:
            try:
                metadata = self.get_variant_metadata(variant)
                result.append(metadata)
            except Exception as e:
                logger.warning(f"Failed to get metadata for '{variant}': {e}")

        return result

    def filter_variants(
        self,
        search: str = None,
        tags: List[str] = None,
        category: str = None,
        industry: str = None,
        layout: str = None,
        color_theme: str = None,
    ) -> List[Dict[str, Any]]:
        """
        Filter variants based on search criteria.

        Args:
            search: Search query for name/description
            tags: Comma-separated list of tags
            category: Template category
            industry: Industry filter
            layout: Layout type (single-column, double-column)
            color_theme: Color theme

        Returns:
            List of filtered variants with metadata
        """
        variants = self.get_variants_with_metadata()

        filtered = []

        for variant in variants:
            # Search filter
            if search:
                search_lower = search.lower()
                name = variant.get("name", "").lower()
                display_name = variant.get("display_name", "").lower()
                description = variant.get("description", "").lower()

                if not (
                    search_lower in name
                    or search_lower in display_name
                    or search_lower in description
                ):
                    continue

            # Tags filter
            if tags:
                variant_tags = variant.get("tags", [])
                if isinstance(variant_tags, str):
                    variant_tags = [t.strip() for t in variant_tags.split(",")]

                if not any(
                    tag.lower() in [t.lower() for t in variant_tags] for tag in tags
                ):
                    continue

            # Category filter
            if category:
                variant_category = variant.get("category", "").lower()
                if variant_category != category.lower():
                    continue

            # Industry filter
            if industry:
                variant_industry = variant.get("industry", "").lower()
                if variant_industry != industry.lower():
                    continue

            # Layout filter
            if layout:
                variant_layout = variant.get("layout", "").lower()
                if variant_layout != layout.lower():
                    continue

            # Color theme filter
            if color_theme:
                variant_color = variant.get("color_theme", "").lower()
                if variant_color != color_theme.lower():
                    continue

            filtered.append(variant)

        logger.info(f"Filtered {len(variants)} variants down to {len(filtered)}")
        return filtered


# Mock version for testing
class MockVariantManager:
    """
    Mock variant manager for testing without file system access.
    """

    def __init__(self, templates_dir: str = ""):
        """Initialize mock variant manager."""
        self.templates_dir = templates_dir
        self._mock_variants = [
            "base",
            "backend",
            "creative",
            "minimal",
            "professional",
            "startup",
        ]

    def list_variants(self) -> List[str]:
        """List mock variants."""
        return self._mock_variants.copy()

    def get_variant_metadata(self, variant: str) -> Dict[str, Any]:
        """Get mock variant metadata."""
        return {
            "name": variant,
            "display_name": variant.capitalize(),
            "description": f"{variant.capitalize()} resume template",
            "format": "latex",
            "output_formats": ["pdf"],
        }

    def validate_variant(self, variant: str) -> bool:
        """Validate mock variant."""
        return variant in self._mock_variants

    def get_variants_with_metadata(self) -> List[Dict[str, Any]]:
        """Get all mock variants with metadata."""
        return [self.get_variant_metadata(v) for v in self._mock_variants]
