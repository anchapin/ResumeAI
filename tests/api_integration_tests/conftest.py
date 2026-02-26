"""
Pytest configuration for API integration tests - Issue #389.

Sets up test environment and provides fixtures for testing FastAPI endpoints.
"""

import pytest
import sys
import os
from pathlib import Path

# Set environment variables for testing
os.environ.setdefault("TESTING", "True")
os.environ.setdefault("REQUIRE_API_KEY", "False")
os.environ.setdefault("ENABLE_RATE_LIMITING", "False")
os.environ.setdefault("DEBUG", "False")

# Add resume-api to path
resume_api_path = Path(__file__).parent.parent.parent / "resume-api"
sys.path.insert(0, str(resume_api_path))


@pytest.fixture
def client():
    """Create test client."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
def sample_resume_data():
    """Sample resume data."""
    return {
        "basics": {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+1-555-0123",
            "url": "https://example.com",
            "summary": "Test summary",
        },
        "work": [
            {
                "name": "Company",
                "position": "Engineer",
                "startDate": "2020-01-01",
                "endDate": "2023-01-01",
            }
        ],
    }


def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line("markers", "api: API endpoint tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "auth: Authentication tests")
    config.addinivalue_line("markers", "rate_limit: Rate limiting tests")
    config.addinivalue_line("markers", "performance: Performance tests")
