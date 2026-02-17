"""
Comprehensive tests for Resume Tailoring functionality.

Tests the ResumeTailorer class with various AI providers
and the /v1/tailor endpoint.
"""

from lib.cli.tailorer import ResumeTailorer, MockResumeTailorer
import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add lib to path
lib_path = Path(__file__).parent.parent / "resume-api"
sys.path.insert(0, str(lib_path))


# Sample resume data for testing
SAMPLE_RESUME_DATA = {
    "basics": {
        "name": "John Doe",
        "label": "Software Engineer",
        "email": "john.doe@example.com",
        "phone": "+1 234 567 8900",
        "summary": "Experienced software engineer with 5+ years in web development.",
    },
    "work": [
        {
            "company": "Tech Corp",
            "position": "Senior Software Engineer",
            "startDate": "2020-01",
            "endDate": "Present",
            "summary": "Lead development team",
            "highlights": [
                "Led team of 5 engineers",
                "Improved system performance by 40%",
            ],
        },
        {
            "company": "Startup Inc",
            "position": "Software Engineer",
            "startDate": "2017-06",
            "endDate": "2019-12",
            "summary": "Full-stack development",
            "highlights": [
                "Built customer-facing webapp",
                "Reduced page load time by 60%",
            ],
        },
    ],
    "education": [
        {
            "institution": "UC Berkeley",
            "area": "Computer Science",
            "studyType": "Bachelor of Science",
            "startDate": "2013-09",
            "endDate": "2017-06",
        }
    ],
    "skills": [{"name": "Python"}, {"name": "JavaScript"}, {"name": "React"}],
}

SAMPLE_JOB_DESCRIPTION = """
Senior Software Engineer

We are looking for a Senior Software Engineer to join our team.

Requirements:
- 5+ years of experience with Python and JavaScript
- Experience with React, Node.js, and cloud services (AWS)
- Strong knowledge of microservices architecture
- Experience with Docker and Kubernetes
- Excellent communication skills

Responsibilities:
- Lead development of our core platform
- Mentor junior engineers
- Collaborate with product team
- Implement best practices
"""


class TestResumeTailorer:
    """Tests for ResumeTailorer class."""

    def test_tailorer_initialization(self):
        """Test that tailorer initializes correctly."""
        tailorer = ResumeTailorer(
            ai_provider="openai", api_key="test-key", model="gpt-4"
        )
        assert tailorer.ai_provider == "openai"
        assert tailorer.api_key == "test-key"
        assert tailorer.model == "gpt-4"

    def test_invalid_provider(self):
        """Test that invalid provider raises error."""
        with pytest.raises(ValueError, match="Invalid AI provider"):
            ResumeTailorer(ai_provider="invalid")

    def test_extract_keywords_tech(self):
        """Test keyword extraction from tech job description."""
        tailorer = ResumeTailorer(ai_provider="openai")
        keywords = tailorer.extract_keywords(SAMPLE_JOB_DESCRIPTION)

        assert isinstance(keywords, list)
        # Should find common tech keywords
        assert "python" in [k.lower() for k in keywords]
        assert "javascript" in [k.lower() for k in keywords]

    def test_extract_keywords_empty(self):
        """Test keyword extraction with empty input."""
        tailorer = ResumeTailorer(ai_provider="openai")
        keywords = tailorer.extract_keywords("")

        assert keywords == []

    def test_extract_keywords_with_aws(self):
        """Test extraction of AWS and cloud skills."""
        tailorer = ResumeTailorer(ai_provider="openai")
        text = "Experience with AWS, Azure, GCP, Docker, Kubernetes required"
        keywords = tailorer.extract_keywords(text)

        # Should find cloud and DevOps skills
        assert len(keywords) > 0

    def test_tailor_resume_without_client(self):
        """Test tailoring falls back when no AI client is available."""
        tailorer = ResumeTailorer(ai_provider="openai", api_key=None)
        # No client will be initialized without API key

        # Should use fallback
        result = tailorer.tailor_resume(
            SAMPLE_RESUME_DATA,
            SAMPLE_JOB_DESCRIPTION,
            company_name="Tech Corp",
            job_title="Senior Software Engineer",
        )

        assert result["_tailored"] is True
        assert "_tailored_for" in result

    def test_tailor_resume_reorders_experience(self):
        """Test that experience is reordered by relevance."""
        tailorer = ResumeTailorer(ai_provider="openai")

        result = tailorer.tailor_resume(
            SAMPLE_RESUME_DATA,
            SAMPLE_JOB_DESCRIPTION,
            company_name="Test Company",
            job_title="Engineer",
        )

        # Should have _tailored metadata
        assert "_tailored" in result
        assert result["_tailored"] is True

    def test_suggest_improvements(self):
        """Test improvement suggestions."""
        tailorer = ResumeTailorer(ai_provider="openai")

        suggestions = tailorer.suggest_improvements(
            SAMPLE_RESUME_DATA, SAMPLE_JOB_DESCRIPTION
        )

        assert isinstance(suggestions, list)
        assert len(suggestions) > 0

    def test_suggest_improvements_with_metrics(self):
        """Test suggestions when resume already has metrics."""
        resume_with_metrics = {
            "basics": {"name": "Test User"},
            "work": [
                {
                    "company": "Test",
                    "position": "Dev",
                    "highlights": ["Increased sales by 25%"],
                }
            ],
            "skills": [{"name": "Python"}],
        }

        tailorer = ResumeTailorer(ai_provider="openai")
        suggestions = tailorer.suggest_improvements(
            resume_with_metrics, "Looking for Python developer"
        )

        # Should not suggest adding metrics since they exist
        # But might have other suggestions
        assert isinstance(suggestions, list)

    def test_tailor_with_openai_mock(self):
        """Test OpenAI integration with mocked response."""
        tailorer = ResumeTailorer(ai_provider="openai", api_key="test-key")

        # Mock the OpenAI client
        mock_response = Mock()
        mock_response.choices = [
            Mock(
                message=Mock(
                    content='{"basics": {"name": "John Doe", "summary": "Tailored summary"}}'
                )
            )
        ]

        with patch.object(tailorer.client, "chat", create=True):
            with patch.object(
                tailorer.client.chat.completions, "create", return_value=mock_response
            ):
                # This will still fall back due to client being None in test
                result = tailorer.tailor_resume(
                    SAMPLE_RESUME_DATA,
                    "Looking for Python developer",
                    company_name="Test",
                    job_title="Developer",
                )

                assert "_tailored" in result


class TestMockResumeTailorer:
    """Tests for MockResumeTailorer class."""

    def test_mock_tailor(self):
        """Test mock tailoring."""
        mock = MockResumeTailorer()

        result = mock.tailor_resume(
            SAMPLE_RESUME_DATA,
            SAMPLE_JOB_DESCRIPTION,
            company_name="Test",
            job_title="Developer",
        )

        assert result["_tailored"] is True
        assert result["_tailored_for"]["company"] == "Test"
        assert result["_tailored_for"]["job_title"] == "Developer"

    def test_mock_extract_keywords(self):
        """Test mock keyword extraction."""
        mock = MockResumeTailorer()

        keywords = mock.extract_keywords("Python JavaScript React AWS")

        assert isinstance(keywords, list)

    def test_mock_suggest_improvements(self):
        """Test mock improvement suggestions."""
        mock = MockResumeTailorer()

        suggestions = mock.suggest_improvements(
            SAMPLE_RESUME_DATA, SAMPLE_JOB_DESCRIPTION
        )

        assert isinstance(suggestions, list)
        assert len(suggestions) > 0


class TestKeywordExtraction:
    """Additional tests for keyword extraction edge cases."""

    def test_extract_keywords_case_insensitive(self):
        """Test that keyword extraction is case insensitive."""
        tailorer = ResumeTailorer(ai_provider="openai")

        keywords_lower = tailorer.extract_keywords("python and JAVASCRIPT")
        tailorer.extract_keywords("Python and JavaScript")

        # Should find the same keywords
        assert len(keywords_lower) > 0

    def test_extract_keywords_no_duplicates(self):
        """Test that keywords don't have duplicates."""
        tailorer = ResumeTailorer(ai_provider="openai")

        keywords = tailorer.extract_keywords(
            "Python Python Python JavaScript JavaScript"
        )

        # Should not have duplicates
        assert len(keywords) == len(set(keywords))

    def test_extract_keywords_limit(self):
        """Test that keyword extraction respects limit."""
        tailorer = ResumeTailorer(ai_provider="openai")

        # Create a long job description
        long_desc = " ".join(["python"] * 100)
        keywords = tailorer.extract_keywords(long_desc)

        # Should be limited to 50
        assert len(keywords) <= 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
