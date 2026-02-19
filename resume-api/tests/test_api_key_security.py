import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from config.dependencies import get_api_key
from config import settings


@pytest.mark.asyncio
async def test_get_api_key_valid_master_key():
    """Test get_api_key with valid master key."""
    with patch.object(settings, "require_api_key", True), patch.object(
        settings, "master_api_key", "master-secret"
    ), patch.object(settings, "api_keys", ["user-key"]):

        result = await get_api_key("master-secret")
        assert result == "master-secret"


@pytest.mark.asyncio
async def test_get_api_key_valid_user_key():
    """Test get_api_key with valid user key."""
    with patch.object(settings, "require_api_key", True), patch.object(
        settings, "master_api_key", "master-secret"
    ), patch.object(settings, "api_keys", ["user-key", "another-key"]):

        result = await get_api_key("user-key")
        assert result == "user-key"


@pytest.mark.asyncio
async def test_get_api_key_invalid_key():
    """Test get_api_key with invalid key."""
    with patch.object(settings, "require_api_key", True), patch.object(
        settings, "master_api_key", "master-secret"
    ), patch.object(settings, "api_keys", ["user-key"]):

        with pytest.raises(HTTPException) as exc_info:
            await get_api_key("wrong-key")
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Invalid API key"


@pytest.mark.asyncio
async def test_get_api_key_missing_key():
    """Test get_api_key with missing key (None)."""
    with patch.object(settings, "require_api_key", True):
        with pytest.raises(HTTPException) as exc_info:
            await get_api_key(None)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "API key is required"


@pytest.mark.asyncio
async def test_get_api_key_disabled():
    """Test get_api_key when authentication is disabled."""
    with patch.object(settings, "require_api_key", False):
        result = await get_api_key("any-key")
        assert result == "anonymous"
