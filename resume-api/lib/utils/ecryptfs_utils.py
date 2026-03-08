"""
Utilities for handling ecryptfs filesystem limitations.

The home directory (/home/alex) uses ecryptfs which has a 140-character
filename path limit. This module provides utilities to work around this
limitation by using alternative paths when necessary.
"""

import os
import tempfile
from pathlib import Path


# Ecryptfs path limit (140 characters as per kernel documentation)
ECRYPTFS_MAX_FILENAME_LEN = 140


def is_ecryptfs_path(path: str) -> bool:
    """
    Check if a path is on an ecryptfs filesystem.
<<<<<<< HEAD

    Args:
        path: Path to check

=======
    
    Args:
        path: Path to check
        
>>>>>>> origin/main
    Returns:
        True if path is on ecryptfs, False otherwise
    """
    try:
        # Get the filesystem type for the path
        result = os.popen(f'df -Th "{path}" 2>/dev/null').read()
<<<<<<< HEAD
        return "ecryptfs" in result.lower()
=======
        return 'ecryptfs' in result.lower()
>>>>>>> origin/main
    except Exception:
        return False


def get_project_base_path() -> Path:
    """
    Get the project base path, using the ecryptfs-safe symlink if needed.
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
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
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
    return Path.cwd()


def get_temp_dir() -> str:
    """
    Get a temporary directory that is NOT on ecryptfs.
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
    Returns:
        Path to a safe temp directory
    """
    # Always use /tmp which is typically not on ecryptfs
    return "/tmp"


def safe_create_temp_file(suffix: str = "", prefix: str = "resume_") -> str:
    """
    Create a temporary file in a path that won't hit ecryptfs limits.
<<<<<<< HEAD

    Args:
        suffix: File suffix
        prefix: File prefix

=======
    
    Args:
        suffix: File suffix
        prefix: File prefix
        
>>>>>>> origin/main
    Returns:
        Path to the created temporary file
    """
    import tempfile
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
    # Create temp file in /tmp (not in home directory)
    fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix, dir="/tmp")
    os.close(fd)
    return path


def safe_create_temp_dir(prefix: str = "resume_") -> str:
    """
    Create a temporary directory in a path that won't hit ecryptfs limits.
<<<<<<< HEAD

    Args:
        prefix: Directory prefix

=======
    
    Args:
        prefix: Directory prefix
        
>>>>>>> origin/main
    Returns:
        Path to the created temporary directory
    """
    import tempfile
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
    # Create temp directory in /tmp (not in home directory)
    return tempfile.mkdtemp(prefix=prefix, dir="/tmp")


def is_path_too_long(path: str) -> bool:
    """
    Check if a path would exceed ecryptfs limits.
<<<<<<< HEAD

    Args:
        path: Full path to check

=======
    
    Args:
        path: Full path to check
        
>>>>>>> origin/main
    Returns:
        True if path exceeds 140 character limit
    """
    return len(path) > ECRYPTFS_MAX_FILENAME_LEN


def get_max_safe_filename_length(directory: str) -> int:
    """
    Get the maximum safe filename length for a given directory.
<<<<<<< HEAD

    Args:
        directory: Directory path

=======
    
    Args:
        directory: Directory path
        
>>>>>>> origin/main
    Returns:
        Maximum safe filename length
    """
    if is_ecryptfs_path(directory):
        # Calculate remaining space for filename given the directory path
        dir_len = len(os.path.abspath(directory))
        return max(0, ECRYPTFS_MAX_FILENAME_LEN - dir_len)
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
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
