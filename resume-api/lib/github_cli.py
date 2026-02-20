"""
GitHub CLI utilities for local development mode.

Provides functionality to check GitHub CLI authentication status
and interact with the gh command-line tool.
"""

import asyncio
import subprocess
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class GitHubCLIError(Exception):
    """Exception raised when GitHub CLI operations fail."""

    pass


async def check_gh_cli_status() -> Dict[str, Any]:
    """
    Check if the user is authenticated with GitHub CLI.

    Returns a dictionary with:
    - authenticated: bool - Whether user is authenticated
    - username: Optional[str] - GitHub username if authenticated
    - error: Optional[str] - Error message if check failed
    """
    try:
        # Run gh auth status command
        proc = await asyncio.create_subprocess_exec(
            "gh",
            "auth",
            "status",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            # Parse output to extract username
            output = stdout.decode()
            username = None

            # Try to find username in output (format varies by gh version)
            # Typical output: "Logged in to github.com as username (key)"
            for line in output.split("\n"):
                if "as" in line and "github.com" in line:
                    # Extract username after "as"
                    parts = line.split(" as ")
                    if len(parts) > 1:
                        username = parts[1].split()[0].strip()
                        break

            return {
                "authenticated": True,
                "username": username,
                "error": None,
            }
        else:
            # Not authenticated or gh not installed
            error_msg = stderr.decode().strip() or "GitHub CLI not authenticated"
            return {
                "authenticated": False,
                "username": None,
                "error": error_msg,
            }
    except FileNotFoundError:
        return {
            "authenticated": False,
            "username": None,
            "error": "GitHub CLI (gh) is not installed",
        }
    except Exception as e:
        logger.error("gh_cli_status_check_failed", error=str(e))
        return {
            "authenticated": False,
            "username": None,
            "error": str(e),
        }


async def get_gh_cli_token() -> Optional[str]:
    """
    Get the GitHub CLI access token.

    Returns:
        OAuth token string or None if not available
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "gh",
            "auth",
            "token",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            token = stdout.decode().strip()
            return token if token else None
        else:
            logger.warning("gh_cli_token_failed", error=stderr.decode().strip())
            return None
    except Exception as e:
        logger.error("gh_cli_token_error", error=str(e))
        return None


async def get_gh_cli_user_info() -> Optional[Dict[str, Any]]:
    """
    Get the authenticated user's information from GitHub CLI.

    Returns:
        Dictionary with user info or None if not authenticated
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "gh",
            "api",
            "/user",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            import json

            user_data = json.loads(stdout.decode())
            return {
                "id": user_data.get("id"),
                "login": user_data.get("login"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "avatar_url": user_data.get("avatar_url"),
                "html_url": user_data.get("html_url"),
            }
        else:
            logger.warning("gh_cli_user_info_failed", error=stderr.decode().strip())
            return None
    except Exception as e:
        logger.error("gh_cli_user_info_error", error=str(e))
        return None


def is_gh_cli_installed() -> bool:
    """
    Check if GitHub CLI is installed on the system.

    Returns:
        True if gh command is available, False otherwise
    """
    try:
        result = subprocess.run(
            ["gh", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False
