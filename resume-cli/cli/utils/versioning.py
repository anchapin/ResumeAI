"""
Resume Version History Utility.

Provides functionality to track and manage resume versions for resume-cli.
This enables users to view and restore previous versions of their resumes.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class ResumeVersionManager:
    """
    Manage resume version history.
    
    Stores versions in a .resume-versions directory alongside the resume.yaml file.
    """

    def __init__(self, yaml_path: Path):
        """
        Initialize the version manager.

        Args:
            yaml_path: Path to the resume.yaml file
        """
        self.yaml_path = Path(yaml_path)
        self.versions_dir = self.yaml_path.parent / ".resume-versions"
        self.versions_dir.mkdir(exist_ok=True)

    def create_version(
        self,
        change_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new version of the resume.

        Args:
            change_description: Optional description of changes

        Returns:
            Dictionary with version info
        """
        # Read current resume content
        with open(self.yaml_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Get version number
        version_number = self._get_next_version_number()

        # Create version filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_filename = f"v{version_number}_{timestamp}.yaml"
        version_path = self.versions_dir / version_filename

        # Copy current resume to version directory
        shutil.copy2(self.yaml_path, version_path)

        # Create version metadata
        version_info = {
            "version_number": version_number,
            "filename": version_filename,
            "created_at": datetime.now().isoformat(),
            "change_description": change_description or f"Version {version_number}",
        }

        # Update versions index
        self._update_index(version_info)

        return version_info

    def list_versions(self) -> List[Dict[str, Any]]:
        """
        List all available versions.

        Returns:
            List of version info dictionaries
        """
        index_path = self.versions_dir / "index.json"
        if not index_path.exists():
            return []

        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)

        return sorted(index.get("versions", []), key=lambda v: v["version_number"], reverse=True)

    def get_version(self, version_number: int) -> Optional[Dict[str, Any]]:
        """
        Get info about a specific version.

        Args:
            version_number: Version number to retrieve

        Returns:
            Version info dictionary or None if not found
        """
        versions = self.list_versions()
        for v in versions:
            if v["version_number"] == version_number:
                return v
        return None

    def restore_version(self, version_number: int) -> bool:
        """
        Restore a previous version of the resume.

        Args:
            version_number: Version number to restore

        Returns:
            True if successful, False otherwise
        """
        version_info = self.get_version(version_number)
        if not version_info:
            return False

        version_path = self.versions_dir / version_info["filename"]
        if not version_path.exists():
            return False

        # Create a backup of current version before restoring
        self.create_version(change_description=f"Before restoring to v{version_number}")

        # Restore the version
        shutil.copy2(version_path, self.yaml_path)
        return True

    def delete_version(self, version_number: int) -> bool:
        """
        Delete a specific version.

        Args:
            version_number: Version number to delete

        Returns:
            True if successful, False otherwise
        """
        version_info = self.get_version(version_number)
        if not version_info:
            return False

        version_path = self.versions_dir / version_info["filename"]
        if version_path.exists():
            version_path.unlink()

        # Update index
        index_path = self.versions_dir / "index.json"
        if index_path.exists():
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)

            index["versions"] = [v for v in index["versions"] if v["version_number"] != version_number]

            with open(index_path, "w", encoding="utf-8") as f:
                json.dump(index, f, indent=2)

        return True

    def get_version_content(self, version_number: int) -> Optional[str]:
        """
        Get the content of a specific version.

        Args:
            version_number: Version number to retrieve

        Returns:
            Version content as string or None if not found
        """
        version_info = self.get_version(version_number)
        if not version_info:
            return None

        version_path = self.versions_dir / version_info["filename"]
        if not version_path.exists():
            return None

        with open(version_path, "r", encoding="utf-8") as f:
            return f.read()

    def compare_versions(
        self,
        version1_number: int,
        version2_number: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Compare two versions of the resume.

        Args:
            version1_number: First version number
            version2_number: Second version number

        Returns:
            Dictionary with comparison results
        """
        content1 = self.get_version_content(version1_number)
        content2 = self.get_version_content(version2_number)

        if content1 is None or content2 is None:
            return None

        # Simple comparison - count lines and characters
        lines1 = content1.split("\n")
        lines2 = content2.split("\n")

        return {
            "version1": version1_number,
            "version2": version2_number,
            "version1_lines": len(lines1),
            "version2_lines": len(lines2),
            "version1_chars": len(content1),
            "version2_chars": len(content2),
            "line_diff": len(lines2) - len(lines1),
            "char_diff": len(content2) - len(content1),
        }

    def _get_next_version_number(self) -> int:
        """Get the next available version number."""
        versions = self.list_versions()
        if not versions:
            return 1
        return max(v["version_number"] for v in versions) + 1

    def _update_index(self, version_info: Dict[str, Any]):
        """Update the versions index file."""
        index_path = self.versions_dir / "index.json"

        if index_path.exists():
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)
        else:
            index = {"versions": []}

        index["versions"].append(version_info)

        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)


def format_version_number(version_number: int) -> str:
    """
    Format version number for display.

    Args:
        version_number: Version number

    Returns:
        Formatted version string (e.g., "v1.0")
    """
    return f"v{version_number}.0"


def get_version_time_ago(timestamp: str) -> str:
    """
    Get human-readable time since version was created.

    Args:
        timestamp: ISO format timestamp

    Returns:
        Human-readable time string
    """
    try:
        dt = datetime.fromisoformat(timestamp)
    except (ValueError, TypeError):
        return "unknown"

    now = datetime.now()
    delta = now - dt

    if delta.days > 365:
        years = delta.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif delta.days > 30:
        months = delta.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif delta.days > 0:
        return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
    elif delta.seconds > 3600:
        hours = delta.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif delta.seconds > 60:
        minutes = delta.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"
