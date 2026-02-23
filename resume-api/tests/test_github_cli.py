"""
Unit tests for GitHub CLI utilities.

Tests the lib.github_cli module for checking GitHub CLI
authentication status.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from lib.github_cli import (  # noqa: F401
    check_gh_cli_status,
    get_gh_cli_token,
    get_gh_cli_user_info,
    is_gh_cli_installed,
    GitHubCLIError,
)


@pytest.mark.asyncio
async def test_check_gh_cli_status_authenticated():
    """Test checking CLI status when user is authenticated."""
    mock_proc = AsyncMock()
    mock_proc.returncode = 0
    mock_proc.communicate = AsyncMock(
        return_value=(b"Logged in to github.com as testuser (key)\n", b"")
    )

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        status = await check_gh_cli_status()

        assert status["authenticated"] is True
        assert status["username"] == "testuser"
        assert status["error"] is None


@pytest.mark.asyncio
async def test_check_gh_cli_status_not_authenticated():
    """Test checking CLI status when user is not authenticated."""
    mock_proc = AsyncMock()
    mock_proc.returncode = 1
    mock_proc.communicate = AsyncMock(return_value=(b"", b"not logged in"))

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        status = await check_gh_cli_status()

        assert status["authenticated"] is False
        assert status["username"] is None
        assert status["error"] == "not logged in"


@pytest.mark.asyncio
async def test_check_gh_cli_status_not_installed():
    """Test checking CLI status when gh is not installed."""
    with patch(
        "lib.github_cli.asyncio.create_subprocess_exec", side_effect=FileNotFoundError
    ):
        status = await check_gh_cli_status()

        assert status["authenticated"] is False
        assert status["username"] is None
        assert "not installed" in status["error"]


@pytest.mark.asyncio
async def test_check_gh_cli_status_exception():
    """Test checking CLI status handles exceptions."""
    with patch(
        "lib.github_cli.asyncio.create_subprocess_exec",
        side_effect=Exception("Unexpected error"),
    ):
        status = await check_gh_cli_status()

        assert status["authenticated"] is False
        assert status["username"] is None
        assert status["error"] == "Unexpected error"


@pytest.mark.asyncio
async def test_get_gh_cli_token_success():
    """Test getting CLI token when authenticated."""
    mock_proc = AsyncMock()
    mock_proc.returncode = 0
    mock_proc.communicate = AsyncMock(return_value=(b"ghp_test_token_12345", b""))

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        token = await get_gh_cli_token()

        assert token == "ghp_test_token_12345"


@pytest.mark.asyncio
async def test_get_gh_cli_token_failure():
    """Test getting CLI token when not authenticated."""
    mock_proc = AsyncMock()
    mock_proc.returncode = 1
    mock_proc.communicate = AsyncMock(return_value=(b"", b"not authenticated"))

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        token = await get_gh_cli_token()

        assert token is None


@pytest.mark.asyncio
async def test_get_gh_cli_user_info_success():
    """Test getting CLI user info when authenticated."""
    import json

    mock_user_data = {
        "id": 123456,
        "login": "testuser",
        "name": "Test User",
        "email": "test@example.com",
        "avatar_url": "https://avatar.url",
        "html_url": "https://github.com/testuser",
    }

    mock_proc = AsyncMock()
    mock_proc.returncode = 0
    mock_proc.communicate = AsyncMock(
        return_value=(json.dumps(mock_user_data).encode(), b"")
    )

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        user_info = await get_gh_cli_user_info()

        assert user_info is not None
        assert user_info["id"] == 123456
        assert user_info["login"] == "testuser"
        assert user_info["name"] == "Test User"
        assert user_info["email"] == "test@example.com"
        assert user_info["avatar_url"] == "https://avatar.url"
        assert user_info["html_url"] == "https://github.com/testuser"


@pytest.mark.asyncio
async def test_get_gh_cli_user_info_failure():
    """Test getting CLI user info when not authenticated."""
    mock_proc = AsyncMock()
    mock_proc.returncode = 1
    mock_proc.communicate = AsyncMock(return_value=(b"", b"not authenticated"))

    with patch("lib.github_cli.asyncio.create_subprocess_exec", return_value=mock_proc):
        user_info = await get_gh_cli_user_info()

        assert user_info is None


def test_is_gh_cli_installed_true():
    """Test checking if gh CLI is installed when it is."""
    with patch("lib.github_cli.subprocess.run") as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_run.return_value = mock_result

        installed = is_gh_cli_installed()

        assert installed is True
        mock_run.assert_called_once()


def test_is_gh_cli_installed_false():
    """Test checking if gh CLI is installed when it is not."""
    with patch("lib.github_cli.subprocess.run") as mock_run:
        mock_run.side_effect = FileNotFoundError()

        installed = is_gh_cli_installed()

        assert installed is False


def test_is_gh_cli_installed_timeout():
    """Test checking if gh CLI is installed when command times out."""
    with patch("lib.github_cli.subprocess.run") as mock_run:
        mock_run.side_effect = Exception("timeout")

        installed = is_gh_cli_installed()

        assert installed is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
