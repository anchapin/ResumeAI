"""
Configuration for API integration tests.

Sets up test environment and fixtures for testing FastAPI endpoints.
"""

import pytest
import sys
import os
from pathlib import Path

# Set environment variables for testing BEFORE importing the app
os.environ.setdefault("TESTING", "True")
os.environ.setdefault("REQUIRE_API_KEY", "False")  # Disable API key for tests
os.environ.setdefault("ENABLE_RATE_LIMITING", "False")  # Disable rate limiting
os.environ.setdefault("DEBUG", "False")

# Add the resume-api directory to path for imports
resume_api_path = Path(__file__).parent.parent.parent / "resume-api"
sys.path.insert(0, str(resume_api_path))


@pytest.fixture(scope="session")
def test_app():
    """Create the test FastAPI application."""
    from main import app
    return app


@pytest.fixture
def client():
    """Create a test client for the API."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
def sample_resume_data():
    """Complete resume with all sections."""
    return {
        "basics": {
            "name": "Jane Developer",
            "label": "Senior Software Engineer",
            "email": "jane@example.com",
            "phone": "+1-555-987-6543",
            "url": "https://janedeveloper.com",
            "summary": "Experienced software engineer passionate about building scalable systems.",
        },
        "work": [
            {
                "name": "Tech Giant Inc",
                "position": "Senior Engineer",
                "startDate": "2021-06-01",
                "endDate": "2024-01-31",
                "summary": "Led team of engineers building microservices.",
                "highlights": [
                    "Improved API performance by 60%",
                    "Mentored junior engineers",
                ],
            }
        ],
        "education": [
            {
                "institution": "State University",
                "studyType": "Bachelor of Science",
                "area": "Computer Science",
                "startDate": "2015-09-01",
                "endDate": "2019-05-31",
            }
        ],
    }


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "api: marks tests as API endpoint tests"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "auth: marks tests as authentication tests"
    )
    config.addinivalue_line(
        "markers", "rate_limit: marks tests as rate limiting tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
