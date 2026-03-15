"""
Pydantic models for GitHub repository API responses.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GitHubOwnerInfo(BaseModel):
    """GitHub repository owner information."""

    login: str = Field(..., description="GitHub username")
    avatar_url: str = Field(..., description="Avatar URL")
    html_url: str = Field(..., description="GitHub profile URL")
    id: int = Field(..., description="GitHub user ID")
    type: str = Field(default="User", description="User type (User/Organization)")


class GitHubRepositoryResponse(BaseModel):
    """GitHub repository information for API responses."""

    id: int = Field(..., description="Repository ID")
    node_id: Optional[str] = Field(None, description="GitHub node ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(..., description="Full repository name (owner/repo)")
    description: Optional[str] = Field(None, description="Repository description")
    html_url: str = Field(..., description="GitHub repository URL")
    language: Optional[str] = Field(None, description="Primary programming language")
    stargazers_count: int = Field(..., description="Number of stars")
    forks_count: int = Field(..., description="Number of forks")
    topics: List[str] = Field(default_factory=list, description="Repository topics/tags")
    updated_at: str = Field(..., description="Last update timestamp (ISO 8601)")
    created_at: str = Field(..., description="Creation timestamp (ISO 8601)")
    pushed_at: str = Field(..., description="Last push timestamp (ISO 8601)")
    private: bool = Field(..., description="Whether repository is private")
    fork: bool = Field(..., description="Whether repository is a fork")
    owner: GitHubOwnerInfo = Field(..., description="Repository owner")
    homepage: Optional[str] = Field(None, description="Project homepage URL")
    size: int = Field(..., description="Repository size in KB")
    open_issues_count: int = Field(..., description="Number of open issues")
    default_branch: str = Field(default="main", description="Default branch name")
    archived: bool = Field(..., description="Whether repository is archived")
    disabled: bool = Field(..., description="Whether repository is disabled")
    visibility: Optional[str] = Field(None, description="Repository visibility")
    license: Optional[Dict[str, Any]] = Field(None, description="License information")

    class Config:
        from_attributes = True


class GitHubRepoListResponse(BaseModel):
    """Paginated list of GitHub repositories."""

    repositories: List[GitHubRepositoryResponse] = Field(
        ..., description="List of repositories"
    )
    total_count: int = Field(..., description="Total number of repositories")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Results per page")
    has_more: bool = Field(..., description="Whether there are more pages")


class GitHubReadmeResponse(BaseModel):
    """GitHub README content response."""

    name: str = Field(..., description="README file name")
    path: str = Field(..., description="Path to README in repository")
    content: str = Field(..., description="README content (decoded from base64)")
    encoding: str = Field(default="utf-8", description="Content encoding")
    html_url: str = Field(..., description="GitHub URL for the README")
    download_url: str = Field(..., description="Direct download URL")


class GitHubImportRequest(BaseModel):
    """Request model for importing GitHub repositories to resume."""

    class RepositoryImport(BaseModel):
        """Single repository import request."""

        id: int = Field(..., description="Repository ID")
        owner: str = Field(..., description="Repository owner username")
        name: str = Field(..., description="Repository name")
        role: Optional[str] = Field(None, description="User's role in the project")
        description: Optional[str] = Field(None, description="Custom description")
        technologies: Optional[List[str]] = Field(
            None, description="Custom technologies list"
        )
        start_date: Optional[str] = Field(
            None, description="Start date (YYYY-MM format)"
        )
        end_date: Optional[str] = Field(None, description="End date (YYYY-MM format)")
        current: Optional[bool] = Field(
            True, description="Whether this is a current project"
        )
        highlights: Optional[List[str]] = Field(
            None, description="Custom highlights/achievements"
        )

    repositories: List[RepositoryImport] = Field(
        ..., description="List of repositories to import"
    )


class GitHubImportResponse(BaseModel):
    """Response model for GitHub import operation."""

    success: bool = Field(..., description="Whether import succeeded")
    imported_count: int = Field(..., description="Number of projects imported")
    projects: List[Dict[str, Any]] = Field(
        ..., description="List of imported project entries"
    )


class GeneratedProjectDetails(BaseModel):
    """AI-generated project details from repository."""

    role: str = Field(..., description="Suggested role/title")
    description: str = Field(..., description="Project description")
    technologies: List[str] = Field(..., description="Technologies used")
    highlights: List[str] = Field(..., description="Key achievements/features")


class GenerateProjectDetailsRequest(BaseModel):
    """Request model for generating project details."""

    repository: Dict[str, Any] = Field(
        ...,
        description="Repository information including name, description, language, topics, README, etc.",
    )
