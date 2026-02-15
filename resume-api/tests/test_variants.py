"""
Tests for the VariantManager class in lib/cli/variants.py

Tests cover:
- Listing variants
- Getting variant metadata
- Validating variants
- Filtering variants
- Mock variant manager
"""

import unittest
import tempfile
import shutil
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add resume-api to path
current_dir = os.path.dirname(os.path.abspath(__file__))
resume_api_dir = os.path.abspath(os.path.join(current_dir, ".."))
if resume_api_dir not in sys.path:
    sys.path.insert(0, resume_api_dir)

from lib.cli.variants import VariantManager, MockVariantManager


class TestVariantManager(unittest.TestCase):
    """Test suite for VariantManager class."""

    def setUp(self):
        """Set up test fixtures with temporary directory."""
        self.test_dir = tempfile.mkdtemp()
        self.templates_dir = Path(self.test_dir) / "templates"
        self.templates_dir.mkdir()
        
        # Create some test variants
        self._create_variant("base")
        self._create_variant("professional")
        self._create_variant("creative")
        
        self.variant_manager = VariantManager(str(self.templates_dir))

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir)

    def _create_variant(self, name):
        """Create a test variant directory with main.tex."""
        variant_dir = self.templates_dir / name
        variant_dir.mkdir()
        (variant_dir / "main.tex").write_text(f"Template for {name}")

    def test_list_variants(self):
        """Test listing available variants."""
        variants = self.variant_manager.list_variants()
        
        self.assertIsInstance(variants, list)
        self.assertEqual(len(variants), 3)
        self.assertIn("base", variants)
        self.assertIn("professional", variants)
        self.assertIn("creative", variants)

    def test_list_variants_empty_directory(self):
        """Test listing variants when no variants exist."""
        empty_dir = tempfile.mkdtemp()
        try:
            manager = VariantManager(empty_dir)
            variants = manager.list_variants()
            self.assertEqual(len(variants), 0)
        finally:
            shutil.rmtree(empty_dir)

    def test_get_variant_metadata(self):
        """Test getting metadata for a variant."""
        metadata = self.variant_manager.get_variant_metadata("base")
        
        self.assertIsInstance(metadata, dict)
        self.assertEqual(metadata["name"], "base")
        self.assertEqual(metadata["display_name"], "Base")
        self.assertIn("description", metadata)
        self.assertEqual(metadata["format"], "latex")
        self.assertIn("output_formats", metadata)

    def test_get_variant_metadata_with_yaml(self):
        """Test getting metadata when metadata.yaml exists."""
        # Create metadata.yaml for a variant
        variant_dir = self.templates_dir / "base"
        metadata_yaml = """name: base
display_name: Base Template
description: A basic resume template
category: professional
tags:
  - simple
  - clean
layout: single-column
color_theme: blue
"""
        (variant_dir / "metadata.yaml").write_text(metadata_yaml)
        
        # Reload the manager to pick up the new metadata
        manager = VariantManager(str(self.templates_dir))
        metadata = manager.get_variant_metadata("base")
        
        self.assertEqual(metadata["category"], "professional")
        self.assertIn("simple", metadata["tags"])
        self.assertEqual(metadata["layout"], "single-column")

    def test_get_variant_metadata_nonexistent(self):
        """Test getting metadata for non-existent variant."""
        with self.assertRaises(FileNotFoundError):
            self.variant_manager.get_variant_metadata("nonexistent")

    def test_validate_variant_valid(self):
        """Test validating a valid variant."""
        result = self.variant_manager.validate_variant("base")
        self.assertTrue(result)

    def test_validate_variant_nonexistent(self):
        """Test validating a non-existent variant."""
        result = self.variant_manager.validate_variant("nonexistent")
        self.assertFalse(result)

    def test_validate_variant_no_main_tex(self):
        """Test validating a variant without main.tex."""
        # Create a directory without main.tex
        variant_dir = self.templates_dir / "incomplete"
        variant_dir.mkdir()
        
        result = self.variant_manager.validate_variant("incomplete")
        self.assertFalse(result)

    def test_get_variants_with_metadata(self):
        """Test getting all variants with metadata."""
        variants_with_metadata = self.variant_manager.get_variants_with_metadata()
        
        self.assertIsInstance(variants_with_metadata, list)
        self.assertEqual(len(variants_with_metadata), 3)
        
        # Check structure of first variant
        first = variants_with_metadata[0]
        self.assertIn("name", first)
        self.assertIn("display_name", first)
        self.assertIn("description", first)

    def test_filter_variants_by_search(self):
        """Test filtering variants by search query."""
        # Add more descriptive metadata
        variant_dir = self.templates_dir / "base"
        (variant_dir / "metadata.yaml").write_text("""name: base
display_name: Base Template
description: A simple and clean resume template for professionals
""")
        
        variant_dir2 = self.templates_dir / "professional"
        (variant_dir2 / "metadata.yaml").write_text("""name: professional
display_name: Professional Template
description: An elegant resume template for corporate roles
""")
        
        # Reload manager
        manager = VariantManager(str(self.templates_dir))
        
        # Filter by search term
        results = manager.filter_variants(search="clean")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "base")

    def test_filter_variants_by_category(self):
        """Test filtering variants by category."""
        # Add category metadata
        variant_dir = self.templates_dir / "base"
        (variant_dir / "metadata.yaml").write_text("""name: base
category: technical
""")
        
        variant_dir2 = self.templates_dir / "professional"
        (variant_dir2 / "metadata.yaml").write_text("""name: professional
category: creative
""")
        
        # Reload manager
        manager = VariantManager(str(self.templates_dir))
        
        # Filter by category
        results = manager.filter_variants(category="technical")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["category"], "technical")

    def test_filter_variants_by_tags(self):
        """Test filtering variants by tags."""
        # Add tags metadata
        variant_dir = self.templates_dir / "base"
        (variant_dir / "metadata.yaml").write_text("""name: base
tags:
  - simple
  - minimal
  - clean
""")
        
        variant_dir2 = self.templates_dir / "professional"
        (variant_dir2 / "metadata.yaml").write_text("""name: professional
tags:
  - corporate
  - elegant
  - professional
""")
        
        # Reload manager
        manager = VariantManager(str(self.templates_dir))
        
        # Filter by tags
        results = manager.filter_variants(tags=["minimal"])
        
        self.assertEqual(len(results), 1)
        self.assertIn("minimal", results[0].get("tags", []))

    def test_filter_variants_no_matches(self):
        """Test filtering when no variants match."""
        results = self.variant_manager.filter_variants(search="xyz123")
        
        self.assertEqual(len(results), 0)

    def test_filter_variants_all_params(self):
        """Test filtering with all parameters."""
        results = self.variant_manager.filter_variants(
            search="test",
            tags=["tag1"],
            category="tech",
            industry="software",
            layout="single-column",
            color_theme="blue"
        )
        
        # Should return empty list or filtered results
        self.assertIsInstance(results, list)


class TestMockVariantManager(unittest.TestCase):
    """Test suite for MockVariantManager class."""

    def setUp(self):
        """Set up mock variant manager."""
        self.mock_manager = MockVariantManager()

    def test_list_variants(self):
        """Test listing mock variants."""
        variants = self.mock_manager.list_variants()
        
        self.assertIsInstance(variants, list)
        self.assertGreater(len(variants), 0)
        self.assertIn("base", variants)

    def test_get_variant_metadata(self):
        """Test getting metadata from mock manager."""
        metadata = self.mock_manager.get_variant_metadata("base")
        
        self.assertIsInstance(metadata, dict)
        self.assertEqual(metadata["name"], "base")
        self.assertEqual(metadata["format"], "latex")

    def test_validate_variant(self):
        """Test validating mock variants."""
        self.assertTrue(self.mock_manager.validate_variant("base"))
        self.assertTrue(self.mock_manager.validate_variant("professional"))
        self.assertFalse(self.mock_manager.validate_variant("nonexistent"))

    def test_get_variants_with_metadata(self):
        """Test getting all variants with metadata."""
        variants_with_metadata = self.mock_manager.get_variants_with_metadata()
        
        self.assertIsInstance(variants_with_metadata, list)
        self.assertEqual(len(variants_with_metadata), len(self.mock_manager.list_variants()))


class TestVariantManagerEdgeCases(unittest.TestCase):
    """Test edge cases for VariantManager."""

    def test_invalid_templates_directory(self):
        """Test initialization with non-existent directory."""
        with self.assertRaises(FileNotFoundError):
            VariantManager("/nonexistent/path/to/templates")

    def test_metadata_yaml_parse_error(self):
        """Test handling of invalid metadata.yaml."""
        test_dir = tempfile.mkdtemp()
        try:
            templates_dir = Path(test_dir) / "templates"
            templates_dir.mkdir()
            
            variant_dir = templates_dir / "base"
            variant_dir.mkdir()
            (variant_dir / "main.tex").write_text("Template")
            
            # Create invalid YAML
            (variant_dir / "metadata.yaml").write_text("invalid: yaml: content:")
            
            manager = VariantManager(str(templates_dir))
            # Should not raise, just log warning
            metadata = manager.get_variant_metadata("base")
            self.assertIsNotNone(metadata)
        finally:
            shutil.rmtree(test_dir)

    def test_empty_search_filter(self):
        """Test filter with empty search returns all variants."""
        test_dir = tempfile.mkdtemp()
        try:
            templates_dir = Path(test_dir) / "templates"
            templates_dir.mkdir()
            
            # Create variants
            for name in ["a", "b", "c"]:
                variant_dir = templates_dir / name
                variant_dir.mkdir()
                (variant_dir / "main.tex").write_text("Template")
            
            manager = VariantManager(str(templates_dir))
            results = manager.filter_variants(search="")
            
            # Empty search should return all variants
            self.assertEqual(len(results), 3)
        finally:
            shutil.rmtree(test_dir)


if __name__ == "__main__":
    unittest.main()
