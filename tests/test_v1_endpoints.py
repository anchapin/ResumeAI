"""
Test suite for v1 API endpoints.

Tests the three main v1 endpoints:
- POST /v1/render/pdf
- POST /v1/tailor
- GET /v1/variants
"""

import unittest
import sys
import os
import json

# Add parent directory to path to import server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from server import app


class TestV1Endpoints(unittest.TestCase):
    """Test suite for v1 API endpoints."""

    def setUp(self):
        """Set up test client and sample data."""
        self.client = TestClient(app)

        # Sample resume data matching resume.yaml schema
        self.sample_resume_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1-555-0123",
            "location": "San Francisco, CA",
            "role": "Senior Software Engineer",
            "experience": [
                {
                    "id": "1",
                    "company": "Tech Corp",
                    "role": "Software Engineer",
                    "startDate": "2020-01",
                    "endDate": "2022-12",
                    "current": False,
                    "description": "Built amazing features",
                    "tags": ["Python", "React", "AWS"],
                },
                {
                    "id": "2",
                    "company": "Startup Inc",
                    "role": "Senior Engineer",
                    "startDate": "2023-01",
                    "endDate": "Present",
                    "current": True,
                    "description": "Led engineering team",
                    "tags": ["Leadership", "Architecture", "Python"],
                },
            ],
        }

        self.sample_job_description = """
        We are looking for a Senior Software Engineer with experience in:
        - Python and React
        - AWS cloud infrastructure
        - Team leadership and architecture
        - Building scalable web applications
        """

    def test_v1_render_pdf_success(self):
        """Test POST /v1/render/pdf returns PDF content."""
        response = self.client.post(
            "/v1/render/pdf",
            json={"resume_data": self.sample_resume_data, "variant": "professional"},
        )

        self.assertEqual(response.status_code, 200)
        # Verify PDF content starts with PDF header
        self.assertTrue(response.content.startswith(b"%PDF-1.4"))

    def test_v1_render_pdf_different_variants(self):
        """Test POST /v1/render/pdf with different variants."""
        variants = ["base", "backend", "creative", "minimal", "professional", "startup"]

        for variant in variants:
            response = self.client.post(
                "/v1/render/pdf",
                json={"resume_data": self.sample_resume_data, "variant": variant},
            )

            self.assertEqual(
                response.status_code, 200, f"Failed for variant: {variant}"
            )
            self.assertIn("application/pdf", response.headers["content-type"])

    def test_v1_render_pdf_default_variant(self):
        """Test POST /v1/render/pdf with default variant."""
        response = self.client.post(
            "/v1/render/pdf",
            json={
                "resume_data": self.sample_resume_data
                # variant not specified, should default to "base"
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/pdf", response.headers["content-type"])

    def test_v1_tailor_success(self):
        """Test POST /v1/tailor returns tailored resume data."""
        response = self.client.post(
            "/v1/tailor",
            json={
                "resume_data": self.sample_resume_data,
                "job_description": self.sample_job_description,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/json", response.headers["content-type"])

        tailored_data = response.json()

        # Verify the response includes the tailored flag
        self.assertTrue(tailored_data.get("_tailored"))
        self.assertIn("_job_description_preview", tailored_data)

        # Verify experience entries are marked as tailored
        self.assertTrue(len(tailored_data["experience"]) > 0)
        for exp in tailored_data["experience"]:
            self.assertTrue(exp.get("_tailored"))
            self.assertIn("_relevance_score", exp)

    def test_v1_tailor_preserves_original_data(self):
        """Test POST /v1/tailor preserves original resume data."""
        response = self.client.post(
            "/v1/tailor",
            json={
                "resume_data": self.sample_resume_data,
                "job_description": self.sample_job_description,
            },
        )

        tailored_data = response.json()

        # Verify core fields are preserved
        self.assertEqual(tailored_data["name"], self.sample_resume_data["name"])
        self.assertEqual(tailored_data["email"], self.sample_resume_data["email"])
        self.assertEqual(tailored_data["role"], self.sample_resume_data["role"])
        self.assertEqual(
            len(tailored_data["experience"]), len(self.sample_resume_data["experience"])
        )

    def test_v1_variants_success(self):
        """Test GET /v1/variants returns list of available variants."""
        response = self.client.get("/v1/variants")

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/json", response.headers["content-type"])

        variants_data = response.json()

        # Verify the response structure
        self.assertIn("variants", variants_data)
        self.assertIsInstance(variants_data["variants"], list)

        # Verify expected variants are present
        variants = variants_data["variants"]
        self.assertIn("base", variants)
        self.assertIn("backend", variants)
        self.assertIn("creative", variants)
        self.assertIn("minimal", variants)
        self.assertIn("professional", variants)
        self.assertIn("startup", variants)

    def test_v1_variants_returns_list(self):
        """Test GET /v1/variants returns a proper list with expected count."""
        response = self.client.get("/v1/variants")

        self.assertEqual(response.status_code, 200)

        variants_data = response.json()
        variants = variants_data["variants"]

        # Verify it's a list with reasonable number of variants
        self.assertIsInstance(variants, list)
        self.assertGreater(len(variants), 0)
        self.assertLess(len(variants), 20)  # Reasonable upper bound

    def test_health_check(self):
        """Test health check endpoint is still working."""
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "ResumeAI API")


if __name__ == "__main__":
    unittest.main()
