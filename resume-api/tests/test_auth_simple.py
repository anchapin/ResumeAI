import sys
from pathlib import Path
import pytest
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.testclient import TestClient

# Add resume-api to python path
sys.path.insert(0, str(Path("resume-api").absolute()))

# Import the get_api_key function to test
# We need to import it AFTER setting up sys.path
from config.dependencies import get_api_key, settings

# Mock settings
from unittest.mock import patch

@pytest.fixture
def client():
    app = FastAPI()

    @app.get("/secure")
    async def secure_endpoint(api_key: str = Depends(get_api_key)):
        return {"message": "secure", "key": api_key}

    return TestClient(app)

def test_get_api_key_valid(client):
    """Test valid API key is accepted."""
    # Mock settings.require_api_key = True and valid key in settings.api_keys
    with patch.object(settings, "require_api_key", True):
        with patch.object(settings, "api_keys", ["valid-key"]):
            response = client.get("/secure", headers={"X-API-KEY": "valid-key"})
            assert response.status_code == 200
            assert response.json()["key"] == "valid-key"

def test_get_api_key_invalid(client):
    """Test invalid API key is rejected."""
    with patch.object(settings, "require_api_key", True):
        with patch.object(settings, "api_keys", ["valid-key"]):
            response = client.get("/secure", headers={"X-API-KEY": "invalid-key"})
            assert response.status_code == 403
            assert "Invalid API key" in response.json()["detail"]

def test_get_api_key_missing(client):
    """Test missing API key is rejected."""
    with patch.object(settings, "require_api_key", True):
        response = client.get("/secure")
        assert response.status_code == 401
        assert "API key is required" in response.json()["detail"]

def test_get_api_key_not_required(client):
    """Test auth bypass when require_api_key is False."""
    with patch.object(settings, "require_api_key", False):
        response = client.get("/secure")
        assert response.status_code == 200
        assert response.json()["key"] == "anonymous"
