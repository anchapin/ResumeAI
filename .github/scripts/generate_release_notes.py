#!/usr/bin/env python3
"""
Release Notes Generator

This script generates release notes from git commit history using conventional commits.
It supports parsing commits with conventional commit format and grouping them by type.

Supported commit types:
- feat: New features
- fix: Bug fixes
- docs: Documentation changes
- style: Code style changes (formatting, semicolons, etc.)
- refactor: Code refactoring
- perf: Performance improvements
- test: Test updates
- build: Build system or dependency updates
- ci: CI/CD changes
- chore: Maintenance tasks
- revert: Reverted commits
"""

import argparse
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from typing import Optional


# Conventional commit types with descriptions
COMMIT_TYPES = {
    "feat": ("Features", "A new feature"),
    "fix": ("Bug Fixes", "A bug fix"),
    "docs": ("Documentation", "Documentation only changes"),
    "style": ("Styles", "Changes that do not affect the meaning of the code"),
    "refactor": ("Code Refactoring", "A code change that neither fixes a bug nor adds a feature"),
    "perf": ("Performance Improvements", "A code change that improves performance"),
    "test": ("Tests", "Adding missing tests or correcting existing tests"),
    "build": ("Builds", "Changes that affect the build system or external dependencies"),
    "ci": ("CI/CD", "Changes to CI configuration files and scripts"),
    "chore": ("Maintenance", "Other changes that don't modify src or test files"),
    "revert": ("Reverts", "Reverts a previous commit"),
}


def run_git_command(args: list[str]) -> str:
    """Run a git command and return the output."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {e.stderr}", file=sys.stderr)
        return ""


def get_commits(previous_tag: str, current_tag: str) -> list[dict]:
    """
    Get commits between two tags or from a starting point.
    
    Args:
        previous_tag: The previous release tag (can be empty for initial release)
        current_tag: The current release tag
        
    Returns:
        List of commit dictionaries with hash, message, type, scope, and description
    """
    commits = []
    
    # Determine the commit range
    if previous_tag:
        commit_range = f"{previous_tag}..{current_tag}"
    else:
        # For initial release, get all commits
        commit_range = current_tag
    
    # Get commit log
    log_output = run_git_command([
        "log",
        commit_range,
        "--format=%H|||%s|||%b",
        "--reverse"
    ])
    
    if not log_output:
        # Try with just the current tag if range doesn't work
        log_output = run_git_command([
            "log",
            current_tag,
            "--format=%H|||%s|||%b",
            "--reverse"
        ])
    
    # Parse commit log
    for line in log_output.split("\n"):
        if not line.strip():
            continue
            
        parts = line.split("|||")
        if len(parts) < 2:
            continue
            
        commit_hash = parts[0]
        commit_message = parts[1]
        commit_body = parts[2] if len(parts) > 2 else ""
        
        # Parse conventional commit format
        # Format: <type>(<scope>): <description> or <type>: <description>
        commit_pattern = r'^(\w+)(?:\(([^)]+)\))?:\s+(.+)$'
        match = re.match(commit_pattern, commit_message)
        
        if match:
            commit_type = match.group(1)
            commit_scope = match.group(2)
            commit_description = match.group(3)
        else:
            # Non-conventional commit, classify as chore
            commit_type = "chore"
            commit_scope = None
            commit_description = commit_message
        
        # Skip merge commits
        if commit_message.startswith("Merge "):
            continue
            
        commits.append({
            "hash": commit_hash[:7],
            "full_hash": commit_hash,
            "message": commit_message,
            "type": commit_type,
            "scope": commit_scope,
            "description": commit_description,
            "body": commit_body,
        })
    
    return commits


def get_pr_number_from_commit(commit_message: str) -> Optional[str]:
    """Extract PR number from commit message."""
    # Common patterns: (#123), PR #123, closes #123, etc.
    patterns = [
        r'\(#(\d+)\)',
        r'PR\s+#(\d+)',
        r'closes\s+#(\d+)',
        r'fixes\s+#(\d+)',
        r'resolves\s+#(\d+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, commit_message)
        if match:
            return match.group(1)
    return None


def group_commits_by_type(commits: list[dict]) -> dict[str, list[dict]]:
    """Group commits by their type."""
    grouped = defaultdict(list)
    
    for commit in commits:
        commit_type = commit.get("type", "chore")
        if commit_type not in grouped:
            grouped[commit_type] = []
        grouped[commit_type].append(commit)
    
    return dict(grouped)


def generate_release_notes(
    previous_tag: str,
    current_tag: str,
    repo: str,
    commits: Optional[list[dict]] = None,
) -> str:
    """
    Generate release notes from commits.
    
    Args:
        previous_tag: The previous release tag
        current_tag: The current release tag
        repo: Repository name (e.g., "owner/repo")
        commits: Optional pre-fetched commits
        
    Returns:
        Formatted release notes as markdown
    """
    if commits is None:
        commits = get_commits(previous_tag, current_tag)
    
    if not commits:
        return f"# Release {current_tag}\n\nNo changes since previous release."
    
    # Group commits by type
    grouped = group_commits_by_type(commits)
    
    # Get release date
    release_date = datetime.now().strftime("%Y-%m-%d")
    
    # Build release notes
    notes = [f"# Release {current_tag}"]
    notes.append(f"\n**Release Date:** {release_date}")
    notes.append(f"\n**Compare Changes:** https://github.com/{repo}/compare/{previous_tag}...{current_tag}")
    notes.append("\n---\n")
    
    # Add contribution summary
    total_commits = len(commits)
    contributors = set()
    for commit in commits:
        # Try to get author from git
        author = run_git_command(["log", "-1", "--format=%ae", commit["full_hash"]])
        if author:
            contributors.add(author.split("@")[0])
    
    notes.append(f"\n**Total Commits:** {total_commits}")
    if contributors:
        notes.append(f"**Contributors:** {', '.join(sorted(contributors))}")
    notes.append("\n---\n")
    
    # Order types by importance
    type_order = [
        "feat", "fix", "perf", "refactor",
        "docs", "style", "test", "build", "ci", "chore", "revert"
    ]
    
    # Add sections for each commit type
    has_changes = False
    for commit_type in type_order:
        if commit_type not in grouped:
            continue
            
        type_commits = grouped[commit_type]
        if not type_commits:
            continue
            
        has_changes = True
        type_info = COMMIT_TYPES.get(commit_type, (commit_type.title(), ""))
        section_title = type_info[0]
        
        notes.append(f"\n## {section_title}\n")
        
        for commit in type_commits:
            pr_num = get_pr_number_from_commit(commit["message"])
            scope = f"**{commit['scope']}:** " if commit["scope"] else ""
            
            # Format the entry
            entry = f"- {scope}{commit['description']}"
            
            if pr_num:
                entry += f" (#[{pr_num}](https://github.com/{repo}/pull/{pr_num}))"
            
            # Add hash reference
            entry += f" - [{commit['hash']}](https://github.com/{repo}/commit/{commit['full_hash']})"
            
            notes.append(entry)
    
    if not has_changes:
        notes.append("\nNo significant changes in this release.")
    
    # Add upgrade notes section
    notes.append("\n---\n")
    notes.append("\n## ⚠️ Upgrade Notes\n")
    notes.append("Please review the following before upgrading:\n")
    notes.append("- Review breaking changes in the Changelog")
    notes.append("- Update dependencies if required")
    notes.append("- Backup your data before upgrading production instances")
    
    return "\n".join(notes)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate release notes from git commit history"
    )
    parser.add_argument(
        "--previous-tag",
        help="Previous release tag (e.g., v1.0.0)",
        default="",
    )
    parser.add_argument(
        "--current-tag",
        help="Current release tag (e.g., v1.1.0)",
        required=True,
    )
    parser.add_argument(
        "--repo",
        help="Repository name (e.g., owner/repo)",
        default="anchapin/ResumeAI",
    )
    parser.add_argument(
        "--output",
        help="Output file path (default: stdout)",
        default=None,
    )
    
    args = parser.parse_args()
    
    # Generate release notes
    release_notes = generate_release_notes(
        args.previous_tag,
        args.current_tag,
        args.repo,
    )
    
    # Output
    if args.output:
        with open(args.output, "w") as f:
            f.write(release_notes)
        print(f"Release notes written to {args.output}")
    else:
        print(release_notes)
        
    # Also output for GitHub Actions
    print(f"::set-output name=release_notes::{release_notes}")


if __name__ == "__main__":
    main()
