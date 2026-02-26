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
def test_client():
    """Create a test client for the API."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_resume_minimal():
    """Minimal valid resume for quick tests."""
    return {
        "basics": {
            "name": "Test User",
            "email": "test@example.com",
        }
    }


@pytest.fixture
def mock_resume_complete():
    """Complete resume with all sections."""
    return {
        "basics": {
            "name": "Jane Developer",
            "label": "Senior Software Engineer",
            "image": "",
            "email": "jane@example.com",
            "phone": "+1-555-987-6543",
            "url": "https://janedeveloper.com",
            "summary": "Experienced software engineer passionate about building scalable systems.",
            "location": {
                "city": "San Francisco",
                "countryCode": "US",
                "region": "California",
            },
            "profiles": [
                {
                    "network": "LinkedIn",
                    "username": "janedeveloper",
                    "url": "https://linkedin.com/in/janedeveloper",
                }
            ],
        },
        "work": [
            {
                "name": "Tech Giant Inc",
                "position": "Senior Engineer",
                "startDate": "2021-06-01",
                "endDate": "2024-01-31",
                "summary": "Led team of 5 engineers building microservices.",
                "highlights": [
                    "Improved API performance by 60%",
                    "Mentored junior engineers",
                    "Designed event-driven architecture",
                ],
                "url": "https://techgiant.com",
            },
            {
                "name": "Startup Co",
                "position": "Full Stack Engineer",
                "startDate": "2019-01-01",
                "endDate": "2021-05-31",
                "summary": "Built web application from scratch.",
                "highlights": [
                    "Launched MVP in 3 months",
                    "Implemented CI/CD pipeline",
                ],
                "url": "https://startup.co",
            },
        ],
        "education": [
            {
                "institution": "State University",
                "studyType": "Bachelor of Science",
                "area": "Computer Science",
                "startDate": "2015-09-01",
                "endDate": "2019-05-31",
                "score": "3.8",
                "courses": ["Data Structures", "Algorithms", "Database Design"],
            }
        ],
        "skills": [
            {
                "name": "Programming Languages",
                "level": "Advanced",
                "keywords": ["Python", "JavaScript", "Go", "Java"],
            },
            {
                "name": "Web Frameworks",
                "level": "Advanced",
                "keywords": ["FastAPI", "React", "Django"],
            },
        ],
        "projects": [
            {
                "name": "Open Source CLI Tool",
                "startDate": "2020-01-01",
                "endDate": "2023-12-31",
                "summary": "Popular open source command-line tool.",
                "highlights": ["1000+ GitHub stars", "50+ contributors"],
                "url": "https://github.com/user/project",
            }
        ],
        "languages": [
            {"language": "English", "fluency": "Native speaker"},
            {"language": "Spanish", "fluency": "Fluent"},
        ],
        "certifications": [
            {
                "name": "Kubernetes Administrator",
                "date": "2022-06-15",
                "issuer": "Linux Foundation",
            }
        ],
    }


@pytest.fixture
def invalid_resume_no_email():
    """Invalid resume missing required email."""
    return {
        "basics": {
            "name": "Invalid User",
            # Missing email
        }
    }


@pytest.fixture
def invalid_resume_bad_email():
    """Invalid resume with malformed email."""
    return {
        "basics": {
            "name": "Bad Email User",
            "email": "not-an-email",  # Invalid format
        }
    }


@pytest.fixture
def invalid_resume_bad_url():
    """Invalid resume with malformed URL."""
    return {
        "basics": {
            "name": "Bad URL User",
            "email": "user@example.com",
            "url": "not a valid url",  # Invalid format
        }
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


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up the test environment before running tests."""
    # Disable any real external API calls
    os.environ["AI_PROVIDER"] = "mock"
    os.environ["DEBUG"] = "False"
    
    yield
    
    # Cleanup after tests
    pass
