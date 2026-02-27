"""
Tests for request timeout middleware.
"""

import asyncio
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from middleware.timeout import TimeoutMiddleware, DEFAULT_REQUEST_TIMEOUT


@pytest.fixture
def app_with_timeout():
    """Create a test app with timeout middleware."""
    app = FastAPI()

    # Add timeout middleware with 2 second timeout for testing
    app.add_middleware(TimeoutMiddleware, timeout_seconds=2)

    @app.get("/fast")
    async def fast_endpoint():
        """Endpoint that responds quickly."""
        return {"status": "ok"}

    @app.get("/slow")
    async def slow_endpoint():
        """Endpoint that times out."""
        await asyncio.sleep(5)  # Sleep longer than timeout
        return {"status": "ok"}

    @app.get("/medium")
    async def medium_endpoint():
        """Endpoint that completes before timeout."""
        await asyncio.sleep(0.5)
        return {"status": "ok"}

    return app


def test_timeout_middleware_fast_request(app_with_timeout):
    """Test that fast requests complete successfully."""
    client = TestClient(app_with_timeout)
    response = client.get("/fast")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_timeout_middleware_timeout_request(app_with_timeout):
    """Test that slow requests timeout with 504 status."""
    client = TestClient(app_with_timeout)
    response = client.get("/slow")

    assert response.status_code == 504
    data = response.json()
    assert "timeout" in data["detail"].lower()
    assert data["error_code"] == "REQUEST_TIMEOUT"
    assert data["timeout_seconds"] == 2


def test_timeout_middleware_medium_request(app_with_timeout):
    """Test that requests completing before timeout succeed."""
    client = TestClient(app_with_timeout)
    response = client.get("/medium")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_timeout_middleware_with_extended_timeout():
    """Test endpoints with extended timeouts."""
    app = FastAPI()

    # Add timeout middleware with default 1 second timeout
    app.add_middleware(TimeoutMiddleware, timeout_seconds=1)

    @app.post("/v1/render/pdf")
    async def render_pdf():
        """PDF endpoint with extended timeout."""
        # Sleep for 2 seconds, should complete because PDF endpoint has 60s timeout
        await asyncio.sleep(2)
        return {"status": "ok"}

    client = TestClient(app)
    response = client.post("/v1/render/pdf")

    # Should succeed due to extended timeout for PDF endpoint
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_timeout_default_is_30_seconds():
    """Test that default timeout is 30 seconds."""
    assert DEFAULT_REQUEST_TIMEOUT == 30


@pytest.mark.asyncio
async def test_timeout_response_headers():
    """Test that timeout response includes proper headers."""
    app = FastAPI()
    app.add_middleware(TimeoutMiddleware, timeout_seconds=1)

    @app.get("/slow")
    async def slow_endpoint():
        await asyncio.sleep(5)
        return {"status": "ok"}

    client = TestClient(app)
    response = client.get("/slow")

    assert response.status_code == 504
    # Check that response is JSON
    assert response.headers.get("content-type") == "application/json"


def test_timeout_multiple_requests(app_with_timeout):
    """Test that timeout works correctly for multiple sequential requests."""
    client = TestClient(app_with_timeout)

    # First request should succeed
    response1 = client.get("/fast")
    assert response1.status_code == 200

    # Second request should timeout
    response2 = client.get("/slow")
    assert response2.status_code == 504

    # Third request should succeed again
    response3 = client.get("/fast")
    assert response3.status_code == 200
