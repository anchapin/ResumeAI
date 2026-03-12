"""
Utilities for handling ecryptfs filesystem limitations.

The home directory (/home/alex) uses ecryptfs which has a 140-character
filename path limit. This module provides utilities to work around this
limitation by using alternative paths when necessary.
"""

import os
import subprocess
import tempfile
from pathlib import Path

# Ecryptfs path limit (140 characters as per kernel documentation)
ECRYPTFS_MAX_FILENAME_LEN = 140


def is_ecryptfs_path(path: str) -> bool:
    """
    Check if a path is on an ecryptfs filesystem.

    Args:
        path: Path to check

    Returns:
        True if path is on ecryptfs, False otherwise
    """
    try:
        # Get the filesystem type for the path securely without shell execution
        result = subprocess.run(
            ["df", "-Th", path],
            capture_output=True,
            text=True,
            check=False,
        ).stdout
        return "ecryptfs" in result.lower()
    except Exception:
        return False


def get_project_base_path() -> Path:
    """
    Get the project base path, using the ecryptfs-safe symlink if needed.

    Returns:
        Path to the project directory (ecryptfs-safe if applicable)
    """
    # Check if home directory uses ecryptfs
    home_path = Path.home()
    if is_ecryptfs_path(str(home_path)):
        # Use the symlink in /tmp which bypasses ecryptfs
        tmp_symlink = Path("/tmp/ResumeAI")
        if tmp_symlink.exists():
            return tmp_symlink

    return Path.cwd()


def get_temp_dir() -> str:
    """
    Get a temporary directory that is NOT on ecryptfs.

    Returns:
        Path to a safe temp directory
    """
    # Always use /tmp which is typically not on ecryptfs
    return "/tmp"


def safe_create_temp_file(suffix: str = "", prefix: str = "resume_") -> str:
    """
    Create a temporary file in a path that won't hit ecryptfs limits.

    Args:
        suffix: File suffix
        prefix: File prefix

    Returns:
        Path to the created temporary file
    """
    import tempfile

    # Create temp file in /tmp (not in home directory)
    fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix, dir="/tmp")
    os.close(fd)
    return path


def safe_create_temp_dir(prefix: str = "resume_") -> str:
    """
    Create a temporary directory in a path that won't hit ecryptfs limits.

    Args:
        prefix: Directory prefix

    Returns:
        Path to the created temporary directory
    """
    import tempfile

    # Create temp directory in /tmp (not in home directory)
    return tempfile.mkdtemp(prefix=prefix, dir="/tmp")


def is_path_too_long(path: str) -> bool:
    """
    Check if a path would exceed ecryptfs limits.

    Args:
        path: Full path to check

    Returns:
        True if path exceeds 140 character limit
    """
    return len(path) > ECRYPTFS_MAX_FILENAME_LEN


def get_max_safe_filename_length(directory: str) -> int:
    """
    Get the maximum safe filename length for a given directory.

    Args:
        directory: Directory path

    Returns:
        Maximum safe filename length
    """
    if is_ecryptfs_path(directory):
        # Calculate remaining space for filename given the directory path
        dir_len = len(os.path.abspath(directory))
        return max(0, ECRYPTFS_MAX_FILENAME_LEN - dir_len)

    # No limit for non-ecryptfs filesystems
    return 255  # Typical max


# Monkey-patch tempfile to use /tmp by default when in ecryptfs environment
def _patch_tempfile():
    """Patch tempfile to use /tmp by default in ecryptfs environments."""
    if is_ecryptfs_path(str(Path.home())):
        # Override tempfile tempdir to use /tmp
        tempfile.tempdir = "/tmp"


# Apply patch on module import
_patch_tempfile()
