"""
Test suite for authentication middleware in dependencies.py.

Tests cover:
1. Valid API key acceptance
2. Invalid API key rejection
3. Missing API key handling
4. Development mode bypass
5. Multiple API key formats
"""

from unittest.mock import patch
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends
from config.dependencies import (
    get_api_key,
    get_request_identifier,
    rate_limit_exceeded_handler,
)
from config import settings as config_settings


@pytest.fixture
def app():
    """Create a FastAPI app for testing authentication middleware."""
    app = FastAPI()

    # Add a test route that requires authentication
    @app.get("/test-auth")
    async def test_route(api_key: str = Depends(get_api_key)):
        # If execution reaches here, auth succeeded
        return {
            "authorized": True,
            "api_key": api_key,
        }

    return app


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return TestClient(app)


class TestAuthenticationMiddleware:
    """Test class for authentication middleware functionality."""

    def test_valid_api_key_acceptance(self, client):
        """Test that valid API keys are accepted."""
        # Mock settings to have a valid API key
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["valid-test-key"]
        ):

            response = client.get("/test-auth", headers={"X-API-KEY": "valid-test-key"})
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["api_key"] == "valid-test-key"

    def test_valid_master_api_key_acceptance(self, client):
        """Test that valid master API key is accepted."""
        # Mock settings to have a master API key
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "master_api_key", "master-test-key"
        ):

            response = client.get(
                "/test-auth", headers={"X-API-KEY": "master-test-key"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["api_key"] == "master-test-key"

    def test_invalid_api_key_rejection(self, client):
        """Test that invalid API keys are rejected."""
        # Mock settings with valid keys but test with invalid one
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["valid-test-key"]
        ):

            response = client.get(
                "/test-auth", headers={"X-API-KEY": "invalid-test-key"}
            )
            assert response.status_code == 403
            assert "Invalid API key" in response.json()["detail"]

    def test_missing_api_key_handling(self, client):
        """Test that missing API keys are handled properly."""
        # Mock settings to require API key
        with patch.object(config_settings, "require_api_key", True):

            response = client.get("/test-auth")  # No X-API-KEY header
            assert response.status_code == 401
            assert "API key is required" in response.json()["detail"]

    def test_development_mode_bypass(self, client):
        """Test that authentication is bypassed when disabled."""
        # Mock settings to disable API key requirement
        with patch.object(config_settings, "require_api_key", False):

            response = client.get("/test-auth")  # No X-API-KEY header
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["api_key"] == "anonymous"

    def test_multiple_api_key_formats(self, client):
        """Test various API key formats."""
        valid_keys = [
            "test-key-123",
            "TEST-KEY-456",
            "test_key_789",
            "test.key.012",
            "testkeywithnoseparators345",
            "a" * 32,  # Long key
            "test-key-with-many-hyphens-67890",
        ]

        for key in valid_keys:
            with patch.object(config_settings, "require_api_key", True), patch.object(
                config_settings, "api_keys", [key]
            ):

                response = client.get("/test-auth", headers={"X-API-KEY": key})
                assert response.status_code == 200, f"Failed for key: {key}"
                data = response.json()
                assert data["authorized"] is True
                assert data["api_key"] == key

    def test_empty_api_key_handling(self, client):
        """Test handling of empty API key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["valid-key"]
        ):

            response = client.get("/test-auth", headers={"X-API-KEY": ""})
            assert (
                response.status_code == 401
            )  # Empty string is treated as missing API key

    def test_whitespace_only_api_key_handling(self, client):
        """Test handling of whitespace-only API key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["valid-key"]
        ):

            response = client.get("/test-auth", headers={"X-API-KEY": "   "})
            assert (
                response.status_code == 403
            )  # Whitespace-only should be treated as invalid

    @pytest.mark.asyncio
    async def test_get_api_key_direct_call_valid_key(self):
        """Test direct call to get_api_key with valid key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["direct-test-key"]
        ):

            result = await get_api_key("direct-test-key")
            assert result == "direct-test-key"

    @pytest.mark.asyncio
    async def test_get_api_key_direct_call_master_key(self):
        """Test direct call to get_api_key with master key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "master_api_key", "master-direct-key"
        ):

            result = await get_api_key("master-direct-key")
            assert result == "master-direct-key"

    @pytest.mark.asyncio
    async def test_get_api_key_direct_call_invalid_key(self):
        """Test direct call to get_api_key with invalid key raises exception."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["some-valid-key"]
        ):

            with pytest.raises(Exception) as exc_info:
                await get_api_key("invalid-direct-key")

            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "Invalid API key" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_api_key_direct_call_missing_key(self):
        """Test direct call to get_api_key with missing key raises exception."""
        with patch.object(config_settings, "require_api_key", True):

            with pytest.raises(Exception) as exc_info:
                await get_api_key(None)

            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "API key is required" in exc_info.value.detail

    def test_get_api_key_with_none_header(self, client):
        """Test behavior when X-API-KEY header is explicitly set to None."""
        with patch.object(config_settings, "require_api_key", True):
            # Using TestClient, passing None as header value removes the header
            response = client.get("/test-auth")
            assert response.status_code == 401
            assert "API key is required" in response.json()["detail"]

    def test_get_api_key_empty_string_header(self, client):
        """Test behavior when X-API-KEY header is an empty string."""
        with patch.object(config_settings, "require_api_key", True):
            response = client.get("/test-auth", headers={"X-API-KEY": ""})
            assert response.status_code == 401
            assert "API key is required" in response.json()["detail"]

    def test_master_key_takes_precedence_over_regular_keys(self, client):
        """Test that master key takes precedence over regular keys."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "master_api_key", "master-key"
        ), patch.object(config_settings, "api_keys", ["regular-key"]):

            # Test master key
            response = client.get("/test-auth", headers={"X-API-KEY": "master-key"})
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["api_key"] == "master-key"

    def test_regular_key_works_when_master_key_present(self, client):
        """Test that regular keys still work when master key is defined."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "master_api_key", "master-key"
        ), patch.object(config_settings, "api_keys", ["regular-key"]):

            # Test regular key
            response = client.get("/test-auth", headers={"X-API-KEY": "regular-key"})
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["api_key"] == "regular-key"

    def test_case_sensitivity_of_api_keys(self, client):
        """Test that API key comparison is case-sensitive."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["ValidKey"]
        ):

            # Test with correct case - should work
            response = client.get("/test-auth", headers={"X-API-KEY": "ValidKey"})
            assert response.status_code == 200

            # Test with wrong case - should fail
            response = client.get("/test-auth", headers={"X-API-KEY": "validkey"})
            assert response.status_code == 403
            response = client.get("/test-auth", headers={"X-API-KEY": "VALIDKEY"})
            assert response.status_code == 403


class TestAPIKeyIdentifierFunction:
    """Test the get_request_identifier function."""

    def test_get_request_identifier_with_api_key_and_auth_required(self):
        """Test get_request_identifier when API key is present and auth is required."""
        from starlette.datastructures import Headers

        # Create a mock request with headers
        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({"X-API-KEY": "test-key"})

        with patch.object(config_settings, "require_api_key", True):
            identifier = get_request_identifier(request)
            assert identifier == "test-key"

    def test_get_request_identifier_with_api_key_but_auth_not_required(self):
        """Test get_request_identifier when API key is present but auth is not required."""
        # Logic in dependencies.py:
        # def get_request_identifier(request):
        #     api_key = request.headers.get("X-API-KEY")
        #     if api_key:
        #         return api_key
        #     return get_remote_address(request)
        # It doesn't check settings.require_api_key. It just checks presence of header.

        from starlette.datastructures import Headers

        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({"X-API-KEY": "test-key"})

        identifier = get_request_identifier(request)
        assert identifier == "test-key"

    def test_get_request_identifier_without_api_key(self):
        """Test get_request_identifier when no API key is present."""
        from starlette.datastructures import Headers

        # Create a mock request without API key header
        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({})  # No X-API-KEY header

        # Mock get_remote_address to return a fixed IP
        with patch(
            "config.dependencies.get_remote_address", return_value="192.168.1.1"
        ):
            identifier = get_request_identifier(request)
            assert identifier == "192.168.1.1"


class TestRateLimitExceededHandler:
    """Test the rate_limit_exceeded_handler function."""

    def test_rate_limit_exceeded_handler_signature(self):
        """Test that rate_limit_exceeded_handler function exists and has correct signature."""
        # Just verify the function exists and is callable
        assert callable(rate_limit_exceeded_handler)

        # Verify it's an async function
        import asyncio

        assert asyncio.iscoroutinefunction(rate_limit_exceeded_handler)
