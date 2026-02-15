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
from fastapi import FastAPI, Depends, Request
from config.dependencies import (
    verify_api_key,
    APIKeyAuthInfo,
    settings,
    get_api_key_identifier,
    require_master_key,
    rate_limit_exceeded_handler,
)
from config import settings as config_settings


@pytest.fixture
def app():
    """Create a FastAPI app for testing authentication middleware."""
    app = FastAPI()

    # Add a test route that requires authentication
    @app.get("/test-auth")
    async def test_route(auth_info: APIKeyAuthInfo = Depends(verify_api_key)):
        if auth_info and auth_info.is_authorized:
            return {
                "authorized": True,
                "master": auth_info.is_master,
                "api_key": auth_info.api_key,
            }
        return {"authorized": False}

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
            assert data["master"] is False
            assert data["api_key"] == "valid-test-key"

    def test_valid_master_api_key_acceptance(self, client):
        """Test that valid master API key is accepted and marked as master."""
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
            assert data["master"] is True
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
            assert "API key missing" in response.json()["detail"]

    def test_development_mode_bypass(self, client):
        """Test that authentication is bypassed when disabled."""
        # Mock settings to disable API key requirement
        with patch.object(config_settings, "require_api_key", False):

            response = client.get("/test-auth")  # No X-API-KEY header
            assert response.status_code == 200
            data = response.json()
            assert data["authorized"] is True
            assert data["master"] is False
            assert data["api_key"] is None

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
    async def test_verify_api_key_direct_call_valid_key(self):
        """Test direct call to verify_api_key with valid key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["direct-test-key"]
        ):

            auth_info = await verify_api_key("direct-test-key")
            assert auth_info.is_authorized is True
            assert auth_info.is_master is False
            assert auth_info.api_key == "direct-test-key"

    @pytest.mark.asyncio
    async def test_verify_api_key_direct_call_master_key(self):
        """Test direct call to verify_api_key with master key."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "master_api_key", "master-direct-key"
        ):

            auth_info = await verify_api_key("master-direct-key")
            assert auth_info.is_authorized is True
            assert auth_info.is_master is True
            assert auth_info.api_key == "master-direct-key"

    @pytest.mark.asyncio
    async def test_verify_api_key_direct_call_invalid_key(self):
        """Test direct call to verify_api_key with invalid key raises exception."""
        with patch.object(config_settings, "require_api_key", True), patch.object(
            config_settings, "api_keys", ["some-valid-key"]
        ):

            with pytest.raises(Exception) as exc_info:
                await verify_api_key("invalid-direct-key")

            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert "Invalid API key" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_verify_api_key_direct_call_missing_key(self):
        """Test direct call to verify_api_key with missing key raises exception."""
        with patch.object(config_settings, "require_api_key", True):

            with pytest.raises(Exception) as exc_info:
                await verify_api_key(None)

            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "API key missing" in exc_info.value.detail

    def test_verify_api_key_with_none_header(self, client):
        """Test behavior when X-API-KEY header is explicitly set to None."""
        with patch.object(config_settings, "require_api_key", True):
            # Using TestClient, passing None as header value removes the header
            response = client.get("/test-auth")
            assert response.status_code == 401
            assert "API key missing" in response.json()["detail"]

    def test_verify_api_key_empty_string_header(self, client):
        """Test behavior when X-API-KEY header is an empty string."""
        with patch.object(config_settings, "require_api_key", True):
            response = client.get("/test-auth", headers={"X-API-KEY": ""})
            assert response.status_code == 401
            assert "API key missing" in response.json()["detail"]

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
            assert data["master"] is True
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
            assert data["master"] is False
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


class TestAPIKeyAuthInfoModel:
    """Test the APIKeyAuthInfo Pydantic model."""

    def test_api_key_auth_info_creation(self):
        """Test creation of APIKeyAuthInfo model instances."""
        # Test authorized, non-master
        auth_info = APIKeyAuthInfo(
            is_authorized=True, is_master=False, api_key="test-key"
        )
        assert auth_info.is_authorized is True
        assert auth_info.is_master is False
        assert auth_info.api_key == "test-key"

        # Test authorized, master
        auth_info = APIKeyAuthInfo(
            is_authorized=True, is_master=True, api_key="master-key"
        )
        assert auth_info.is_authorized is True
        assert auth_info.is_master is True
        assert auth_info.api_key == "master-key"

        # Test unauthorized
        auth_info = APIKeyAuthInfo(is_authorized=False, is_master=False, api_key=None)
        assert auth_info.is_authorized is False
        assert auth_info.is_master is False
        assert auth_info.api_key is None

        # Test defaults
        auth_info = APIKeyAuthInfo(is_authorized=True)
        assert auth_info.is_authorized is True
        assert auth_info.is_master is False  # Default value
        assert auth_info.api_key is None  # Default value


class TestAPIKeyIdentifierFunction:
    """Test the get_api_key_identifier function."""

    def test_get_api_key_identifier_with_api_key_and_auth_required(self):
        """Test get_api_key_identifier when API key is present and auth is required."""
        from starlette.datastructures import Headers

        # Create a mock request with headers
        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({"X-API-KEY": "test-key"})

        with patch.object(config_settings, "require_api_key", True):
            identifier = get_api_key_identifier(request)
            assert identifier == "apikey:test-key"

    def test_get_api_key_identifier_with_api_key_but_auth_not_required(self):
        """Test get_api_key_identifier when API key is present but auth is not required."""
        from starlette.datastructures import Headers
        from unittest.mock import MagicMock

        # Create a mock request with headers
        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({"X-API-KEY": "test-key"})

        # Mock get_remote_address to return a fixed IP
        with patch.object(config_settings, "require_api_key", False), patch(
            "config.dependencies.get_remote_address", return_value="192.168.1.1"
        ):
            identifier = get_api_key_identifier(request)
            assert identifier == "ip:192.168.1.1"

    def test_get_api_key_identifier_without_api_key(self):
        """Test get_api_key_identifier when no API key is present."""
        from starlette.datastructures import Headers
        from unittest.mock import MagicMock

        # Create a mock request without API key header
        class MockRequest:
            def __init__(self, headers):
                self.headers = Headers(headers)

        request = MockRequest({})  # No X-API-KEY header

        # Mock get_remote_address to return a fixed IP
        with patch(
            "config.dependencies.get_remote_address", return_value="192.168.1.1"
        ):
            identifier = get_api_key_identifier(request)
            assert identifier == "ip:192.168.1.1"


class TestRequireMasterKeyFunction:
    """Test the require_master_key function."""

    @pytest.mark.asyncio
    async def test_require_master_key_with_master_key(self):
        """Test require_master_key when the authenticated user has master key."""
        from config.dependencies import APIKeyAuthInfo

        # Create an auth info object representing a master key
        master_auth = APIKeyAuthInfo(
            is_authorized=True, is_master=True, api_key="master-key"
        )

        # Call the function directly
        result = await require_master_key(master_auth)

        # Should return the same auth info since it's a master key
        assert result.is_authorized is True
        assert result.is_master is True
        assert result.api_key == "master-key"

    @pytest.mark.asyncio
    async def test_require_master_key_with_non_master_key_raises_error(self):
        """Test require_master_key raises error when user doesn't have master key."""
        from config.dependencies import APIKeyAuthInfo
        from fastapi import status

        # Create an auth info object representing a regular key
        regular_auth = APIKeyAuthInfo(
            is_authorized=True, is_master=False, api_key="regular-key"
        )

        # Call the function and expect an exception
        with pytest.raises(Exception) as exc_info:
            await require_master_key(regular_auth)

        # Check that the right exception was raised
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Master API key required for this operation" in exc_info.value.detail


class TestRateLimitExceededHandler:
    """Test the rate_limit_exceeded_handler function."""

    def test_rate_limit_exceeded_handler_signature(self):
        """Test that rate_limit_exceeded_handler function exists and has correct signature."""
        # Just verify the function exists and is callable
        assert callable(rate_limit_exceeded_handler)

        # Verify it's an async function
        import asyncio
        import inspect

        assert asyncio.iscoroutinefunction(rate_limit_exceeded_handler)
