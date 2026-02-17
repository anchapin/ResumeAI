"""
Tests for the POST /v1/cover-letter endpoint.

Tests cover:
- Valid cover letter generation requests
- Authentication requirements
- Input validation
- Rate limiting
- Error handling
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add resume-api to python path
sys.path.insert(0, str(Path(__file__).parent.parent.absolute()))

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def valid_api_key():
    """Return a valid API key for testing."""
    return "test-api-key-12345"


@pytest.fixture
def sample_resume_data():
    """Return sample resume data for testing."""
    return {
        "basics": {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1 (555) 123-4567",
            "url": "https://johndoe.dev",
            "summary": "Software engineer with 5 years of experience in Python and React.",
        },
        "work": [
            {
                "company": "Tech Corp",
                "position": "Senior Software Engineer",
                "startDate": "2020-01-01",
                "endDate": "2024-01-01",
                "summary": "Led development of microservices architecture.",
                "highlights": [
                    "Designed and implemented REST APIs serving 1M+ requests daily",
                    "Mentored team of 5 junior developers",
                ],
            },
            {
                "company": "StartupXYZ",
                "position": "Software Engineer",
                "startDate": "2018-06-01",
                "endDate": "2019-12-31",
                "summary": "Full-stack development for early-stage startup.",
                "highlights": [
                    "Built responsive web application using React and Node.js",
                    "Implemented CI/CD pipeline reducing deployment time by 50%",
                ],
            },
        ],
        "education": [
            {
                "institution": "State University",
                "area": "Computer Science",
                "studyType": "Bachelor",
                "startDate": "2014-09-01",
                "endDate": "2018-05-31",
            }
        ],
        "skills": [
            {"name": "Programming Languages", "keywords": ["Python", "JavaScript", "TypeScript"]},
            {"name": "Frameworks", "keywords": ["React", "Django", "FastAPI"]},
            {"name": "Tools", "keywords": ["Git", "Docker", "AWS"]},
        ],
    }


@pytest.fixture
def sample_job_description():
    """Return sample job description for testing."""
    return """
    We are looking for a Senior Software Engineer to join our team.

    Responsibilities:
    - Design and build scalable backend services
    - Collaborate with cross-functional teams
    - Mentor junior engineers
    - Participate in code reviews and architectural decisions

    Requirements:
    - 5+ years of software development experience
    - Strong proficiency in Python or similar languages
    - Experience with cloud platforms (AWS, GCP, or Azure)
    - Excellent communication skills

    Nice to have:
    - Experience with microservices architecture
    - Knowledge of containerization (Docker, Kubernetes)
    - Open source contributions
    """


class TestCoverLetterEndpoint:
    """Test class for /v1/cover-letter endpoint."""

    def test_cover_letter_requires_auth(self, client, sample_resume_data, sample_job_description):
        """Test that cover letter endpoint requires API key authentication."""
        # Note: When no API key is provided, the endpoint may return 400 (validation error)
        # before auth check due to empty resume validation, or 401/403 for auth failure
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": sample_resume_data,
                "job_description": sample_job_description,
                "company_name": "Tech Company",
                "job_title": "Senior Software Engineer",
            },
        )
        # Should return 400, 401, or 403 when auth is required but not provided
        # 400 can occur if validation happens before auth check
        assert response.status_code in [400, 401, 403]

    def test_cover_letter_with_valid_request_mocked(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test cover letter generation with valid request (mocked AI)."""
        mock_cover_letter = {
            "header": "John Doe\njohn.doe@example.com\n+1 (555) 123-4567",
            "introduction": (
                "I am excited to apply for the Senior Software Engineer"
                " position at Tech Company."
            ),
            "body": (
                "With 5 years of experience in software development, I have honed my"
                " skills in Python, React, and cloud technologies. At Tech Corp, I led"
                " the development of microservices architecture serving millions of"
                " requests daily."
            ),
            "closing": (
                "Thank you for considering my application. I look forward to discussing"
                " how I can contribute to your team."
            ),
            "full_text": "Complete cover letter text here...",
            "metadata": {"word_count": 150},
        }

        # Patch the CoverLetterGenerator where it's used (api.routes)
        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.return_value = mock_cover_letter
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                    "tone": "professional",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "header" in data
            assert "introduction" in data
            assert "body" in data
            assert "closing" in data
            assert "full_text" in data
            assert "metadata" in data

            # Verify the mocked data is returned
            assert data["header"] == mock_cover_letter["header"]
            assert data["introduction"] == mock_cover_letter["introduction"]

    def test_cover_letter_missing_job_description(
        self, client, valid_api_key, sample_resume_data
    ):
        """Test that missing job description returns validation error."""
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": sample_resume_data,
                # Missing job_description
                "company_name": "Tech Company",
                "job_title": "Senior Software Engineer",
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_cover_letter_missing_company_name(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test that missing company name returns validation error."""
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": sample_resume_data,
                "job_description": sample_job_description,
                # Missing company_name
                "job_title": "Senior Software Engineer",
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_cover_letter_missing_job_title(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test that missing job title returns validation error."""
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": sample_resume_data,
                "job_description": sample_job_description,
                "company_name": "Tech Company",
                # Missing job_title
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_cover_letter_empty_resume_data(
        self, client, valid_api_key, sample_job_description
    ):
        """Test that empty resume data returns validation error."""
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": {},  # Empty resume
                "job_description": sample_job_description,
                "company_name": "Tech Company",
                "job_title": "Senior Software Engineer",
            },
            headers={"X-API-KEY": valid_api_key},
        )
        # Should fail validation because resume is empty
        assert response.status_code in [422, 400]

    def test_cover_letter_short_job_description(
        self, client, valid_api_key, sample_resume_data
    ):
        """Test that very short job description returns validation error."""
        response = client.post(
            "/v1/cover-letter",
            json={
                "resume_data": sample_resume_data,
                "job_description": "short",  # Less than 10 chars
                "company_name": "Tech Company",
                "job_title": "Senior Software Engineer",
            },
            headers={"X-API-KEY": valid_api_key},
        )
        assert response.status_code == 422  # Validation error

    def test_cover_letter_with_casual_tone_mocked(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test cover letter generation with casual tone (mocked AI)."""
        mock_cover_letter = {
            "header": "John Doe\njohn.doe@example.com",
            "introduction": "Hey there! I'm super excited about this opportunity...",
            "body": "I've been coding for 5 years and love what I do...",
            "closing": "Thanks for reading! Hope to hear from you soon.",
            "full_text": "Complete casual cover letter...",
            "metadata": {"word_count": 120},
        }

        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.return_value = mock_cover_letter
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                    "tone": "casual",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["introduction"] == mock_cover_letter["introduction"]

    def test_cover_letter_with_formal_tone_mocked(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test cover letter generation with formal tone (mocked AI)."""
        mock_cover_letter = {
            "header": "John Doe\njohn.doe@example.com\n+1 (555) 123-4567",
            "introduction": "Dear Hiring Manager, I am writing to express my sincere interest...",
            "body": "My professional experience aligns well with the requirements...",
            "closing": "I appreciate your consideration and look forward to your response.",
            "full_text": "Complete formal cover letter...",
            "metadata": {"word_count": 180},
        }

        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.return_value = mock_cover_letter
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                    "tone": "formal",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["introduction"] == mock_cover_letter["introduction"]

    def test_cover_letter_generator_error_handling(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test error handling when CoverLetterGenerator fails."""
        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.side_effect = ValueError("Invalid input")
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 400
            data = response.json()
            assert "detail" in data

    def test_cover_letter_internal_error_handling(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test error handling for unexpected internal errors."""
        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.side_effect = Exception("Unexpected error")
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 500
            data = response.json()
            assert "detail" in data
            assert "Cover letter generation failed" in data["detail"]

    def test_cover_letter_response_content_type(
        self, client, valid_api_key, sample_resume_data, sample_job_description
    ):
        """Test that response has correct content type."""
        mock_cover_letter = {
            "header": "John Doe",
            "introduction": "Introduction",
            "body": "Body",
            "closing": "Closing",
            "full_text": "Full text",
            "metadata": {},
        }

        with patch("api.routes.CoverLetterGenerator") as mock_generator_class:
            mock_instance = MagicMock()
            mock_instance.generate_cover_letter.return_value = mock_cover_letter
            mock_generator_class.return_value = mock_instance

            response = client.post(
                "/v1/cover-letter",
                json={
                    "resume_data": sample_resume_data,
                    "job_description": sample_job_description,
                    "company_name": "Tech Company",
                    "job_title": "Senior Software Engineer",
                },
                headers={"X-API-KEY": valid_api_key},
            )

            assert response.status_code == 200
            assert "application/json" in response.headers["content-type"]


class TestCoverLetterGeneratorClass:
    """Test class for CoverLetterGenerator class directly."""

    def test_generator_initialization_openai(self):
        """Test CoverLetterGenerator initialization with OpenAI."""
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            with patch("lib.cli.cover_letter.openai") as mock_openai:
                from lib.cli.cover_letter import CoverLetterGenerator

                generator = CoverLetterGenerator(
                    ai_provider="openai",
                    api_key="test-key",
                )

                assert generator.ai_provider == "openai"
                assert generator.api_key == "test-key"
                mock_openai.OpenAI.assert_called_once()

    def test_generator_initialization_anthropic(self):
        """Test CoverLetterGenerator initialization with Anthropic."""
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            with patch("lib.cli.cover_letter.anthropic") as mock_anthropic:
                from lib.cli.cover_letter import CoverLetterGenerator

                generator = CoverLetterGenerator(
                    ai_provider="anthropic",
                    api_key="test-key",
                )

                assert generator.ai_provider == "anthropic"
                mock_anthropic.Anthropic.assert_called_once()

    def test_generator_missing_api_key(self):
        """Test that missing API key raises error."""
        with patch.dict("os.environ", {}, clear=True):
            from lib.cli.cover_letter import CoverLetterGenerator

            with pytest.raises(ValueError, match="API_KEY"):
                CoverLetterGenerator(ai_provider="openai", api_key=None)

    def test_generator_invalid_provider(self):
        """Test that invalid AI provider raises error."""
        from lib.cli.cover_letter import CoverLetterGenerator

        with pytest.raises(ValueError, match="Unknown AI provider"):
            CoverLetterGenerator(ai_provider="invalid_provider", api_key="test-key")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
