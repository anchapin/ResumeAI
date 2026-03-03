"""
Template Variant Manager.

This module manages resume template variants, including listing,
metadata retrieval, and validation.
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class VariantManager:
    """Manages resume template variants and their metadata."""

    def __init__(self, templates_dir: str):
        self.templates_dir = Path(templates_dir)
        self.variants = self._discover_variants()
        logger.info(f"VariantManager initialized with: {self.templates_dir}")

    def _discover_variants(self) -> List[str]:
        """Discover available template variants."""
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            return ["base"]

        variants = []
        for item in self.templates_dir.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                variants.append(item.name)

        return variants if variants else ["base"]

    def list_variants(self) -> List[str]:
        """List all available variants."""
        return self.variants

    def get_variant_metadata(self, variant: str) -> Dict[str, Any]:
        """Get metadata for a specific variant."""
        metadata_file = self.templates_dir / variant / "metadata.yaml"

        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as f:
                    return yaml.safe_load(f)
            except Exception as e:
                logger.error(f"Error loading metadata for {variant}: {e}")

        # Default metadata
        return {
            "name": variant,
            "display_name": variant.capitalize(),
            "description": f"{variant.capitalize()} resume template",
            "category": "General",
            "format": "latex",
            "output_formats": ["pdf"],
            "layout": "single-column",
            "color_theme": "blue",
            "tags": ["recommended"],
        }

    def validate_variant(self, variant: str) -> bool:
        """Validate if a variant exists."""
        return variant in self.variants

    def get_variants_with_metadata(self) -> List[Dict[str, Any]]:
        """Get all variants with their metadata."""
        return [self.get_variant_metadata(v) for v in self.variants]

    def filter_variants(
        self,
        search: str = None,
        tags: List[str] = None,
        category: str = None,
        industry: str = None,
        layout: str = None,
        color_theme: str = None,
    ) -> List[Dict[str, Any]]:
        """Filter variants by various criteria."""
        variants = self.get_variants_with_metadata()
        filtered = []

        for v in variants:
            # Search filter
            if search:
                search_lower = search.lower()
                if (
                    search_lower not in v["name"].lower()
                    and search_lower not in v["display_name"].lower()
                    and search_lower not in v["description"].lower()
                ):
                    continue

            # Category filter
            if category and v.get("category") != category:
                continue

            # Tag filter
            if tags:
                v_tags = v.get("tags", [])
                if not any(tag in v_tags for tag in tags):
                    continue

            # Layout filter
            if layout and v.get("layout") != layout:
                continue

            # Color theme filter
            if color_theme and v.get("color_theme") != color_theme:
                continue

            filtered.append(v)

        return filtered


class MockVariantManager:
    """Mock variant manager for testing."""

    def __init__(self, *args, **kwargs):
        self._mock_variants = ["base", "modern", "classic", "minimal"]

    def list_variants(self) -> List[str]:
        """List mock variants."""
        return self._mock_variants.copy()

    def get_variant_metadata(self, variant: str) -> Dict[str, Any]:
        """Get mock variant metadata."""
        categories = {
            "base": "Professional",
            "modern": "Professional",
            "classic": "Professional",
            "minimal": "Minimal",
        }
        return {
            "name": variant,
            "display_name": variant.capitalize(),
            "description": f"{variant.capitalize()} resume template",
            "category": categories.get(variant, "General"),
            "format": "latex",
            "output_formats": ["pdf"],
            "layout": "single-column",
            "color_theme": "blue",
            "tags": ["recommended"],
        }

    def validate_variant(self, variant: str) -> bool:
        """Validate mock variant."""
        return variant in self._mock_variants

    def get_variants_with_metadata(self) -> List[Dict[str, Any]]:
        """Get all mock variants with metadata."""
        return [self.get_variant_metadata(v) for v in self._mock_variants]

    def filter_variants(
        self,
        search: str = None,
        tags: List[str] = None,
        category: str = None,
        industry: str = None,
        layout: str = None,
        color_theme: str = None,
    ) -> List[Dict[str, Any]]:
        """Mock filtering implementation."""
        variants = self.get_variants_with_metadata()
        filtered = []
        for v in variants:
            if search and search.lower() not in v["name"].lower():
                continue
            if category and category.lower() != v.get("category", "").lower():
                continue
            filtered.append(v)
        return filtered
