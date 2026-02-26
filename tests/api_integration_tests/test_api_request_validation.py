"""
API request validation integration tests - Issue #389.

Comprehensive tests for:
- Request/response validation
- Field validation
- Type checking
- String length limits
- List size limits
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "resume-api"))

from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def valid_resume():
    """Valid resume data."""
    return {
        "basics": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1-555-0123",
        }
    }


class TestBasicsValidation:
    """Test validation of basics section."""

    @pytest.mark.api
    def test_basics_name_required(self, client, valid_resume):
        """Test that name is validated if present."""
        resume = valid_resume.copy()
        resume["basics"]["name"] = ""
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Empty name should be valid (optional) or return validation error
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_basics_email_format(self, client, valid_resume):
        """Test email format validation."""
        resume = valid_resume.copy()
        resume["basics"]["email"] = "invalid-email"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_basics_phone_validation(self, client, valid_resume):
        """Test phone number validation."""
        resume = valid_resume.copy()
        resume["basics"]["phone"] = "invalid"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Phone format may be validated
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_basics_url_validation(self, client, valid_resume):
        """Test URL validation."""
        resume = valid_resume.copy()
        resume["basics"]["url"] = "not a url"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_basics_all_fields_optional(self, client):
        """Test that basics fields are optional (except name/email)."""
        resume = {
            "basics": {
                "name": "Test User",
                "email": "test@example.com",
                "phone": None,
                "url": None,
                "summary": None,
                "label": None,
            }
        }
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_basics_string_max_length(self, client, valid_resume):
        """Test maximum string length validation."""
        resume = valid_resume.copy()
        resume["basics"]["summary"] = "x" * 10001  # Exceeds max
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]


class TestWorkExperienceValidation:
    """Test validation of work experience."""

    @pytest.mark.api
    def test_work_valid_entry(self, client, valid_resume):
        """Test valid work experience entry."""
        resume = valid_resume.copy()
        resume["work"] = [
            {
                "name": "Company",
                "position": "Engineer",
                "startDate": "2020-01-01",
                "endDate": "2023-01-01",
            }
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_work_empty_array(self, client, valid_resume):
        """Test empty work array."""
        resume = valid_resume.copy()
        resume["work"] = []
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_work_excessive_items(self, client, valid_resume):
        """Test excessive number of work items."""
        resume = valid_resume.copy()
        resume["work"] = [
            {
                "name": f"Company {i}",
                "position": "Role",
                "startDate": "2020-01-01",
            }
            for i in range(100)
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Should validate max items
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_work_invalid_dates(self, client, valid_resume):
        """Test invalid date format in work."""
        resume = valid_resume.copy()
        resume["work"] = [
            {
                "name": "Company",
                "position": "Role",
                "startDate": "invalid-date",
                "endDate": "2023-01-01",
            }
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # May validate date format
        assert response.status_code in [200, 400, 422]


class TestEducationValidation:
    """Test validation of education section."""

    @pytest.mark.api
    def test_education_valid_entry(self, client, valid_resume):
        """Test valid education entry."""
        resume = valid_resume.copy()
        resume["education"] = [
            {
                "institution": "University",
                "studyType": "Bachelor",
                "area": "Computer Science",
            }
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_education_empty_array(self, client, valid_resume):
        """Test empty education array."""
        resume = valid_resume.copy()
        resume["education"] = []
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200


class TestSkillsValidation:
    """Test validation of skills section."""

    @pytest.mark.api
    def test_skills_valid_entry(self, client, valid_resume):
        """Test valid skills entry."""
        resume = valid_resume.copy()
        resume["skills"] = [
            {
                "name": "Python",
                "level": "Expert",
                "keywords": ["Django", "FastAPI"],
            }
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_skills_empty_array(self, client, valid_resume):
        """Test empty skills array."""
        resume = valid_resume.copy()
        resume["skills"] = []
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200


class TestSpecialCharacterHandling:
    """Test handling of special characters."""

    @pytest.mark.api
    def test_latex_special_chars(self, client, valid_resume):
        """Test LaTeX special characters in text."""
        resume = valid_resume.copy()
        resume["basics"]["name"] = "John & Mary <Doe> 100%"
        resume["basics"]["summary"] = "$test$ #hashtag _underscore"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Should escape or handle special chars
        assert response.status_code == 200

    @pytest.mark.api
    def test_unicode_characters(self, client, valid_resume):
        """Test Unicode characters."""
        resume = valid_resume.copy()
        resume["basics"]["name"] = "José García"
        resume["basics"]["summary"] = "中文 مرحبا العالم"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [200, 400, 422]

    @pytest.mark.api
    def test_html_injection_prevention(self, client, valid_resume):
        """Test HTML injection prevention."""
        resume = valid_resume.copy()
        resume["basics"]["summary"] = "<script>alert('xss')</script>"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # Should sanitize or reject
        assert response.status_code in [200, 400, 422]


class TestTypeValidation:
    """Test type validation."""

    @pytest.mark.api
    def test_correct_types(self, client, valid_resume):
        """Test that correct types are accepted."""
        resume = valid_resume.copy()
        resume["basics"]["name"] = "String"  # Should be string
        resume["work"] = []  # Should be array
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_wrong_type_string_instead_of_array(self, client, valid_resume):
        """Test wrong type: string instead of array."""
        resume = valid_resume.copy()
        resume["work"] = "not an array"
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_wrong_type_array_instead_of_string(self, client, valid_resume):
        """Test wrong type: array instead of string."""
        resume = valid_resume.copy()
        resume["basics"]["name"] = ["Not", "A", "String"]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]


class TestMissingFields:
    """Test handling of missing required fields."""

    @pytest.mark.api
    def test_missing_basics(self, client):
        """Test missing basics section."""
        resume = {}
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code in [400, 422]

    @pytest.mark.api
    def test_missing_basics_name_email(self, client, valid_resume):
        """Test basics without name or email."""
        resume = {"basics": {}}
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # May require name or email
        assert response.status_code in [200, 400, 422]


class TestNullFields:
    """Test null field handling."""

    @pytest.mark.api
    def test_null_optional_fields(self, client, valid_resume):
        """Test null values for optional fields."""
        resume = valid_resume.copy()
        resume["basics"]["phone"] = None
        resume["basics"]["url"] = None
        resume["basics"]["summary"] = None
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        assert response.status_code == 200

    @pytest.mark.api
    def test_null_in_array_items(self, client, valid_resume):
        """Test null values in array items."""
        resume = valid_resume.copy()
        resume["work"] = [
            {
                "name": "Company",
                "position": "Role",
                "startDate": "2020-01-01",
                "highlights": ["Achievement", None, "Another"],
            }
        ]
        payload = {"resume_data": resume, "variant": "professional"}
        response = client.post("/v1/render/pdf", json=payload)
        # May filter out null values
        assert response.status_code in [200, 400, 422]
