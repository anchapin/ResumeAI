"""
Load Testing Suite for ResumeAI API

This module contains Locust tasks for load testing the ResumeAI backend.
Run with: locust -f benchmarks/locustfile.py -u 100 -r 10 -t 60s
"""

from locust import HttpUser, task, between
from typing import Any


class ResumeAPIUser(HttpUser):
    """Simulates a user interacting with the ResumeAI API."""

    wait_time = between(1, 3)
    host = "http://localhost:8000"

    def on_start(self) -> None:
        """Called when a user starts."""
        self.auth_token: str | None = None

    @task(1)
    def health_check(self) -> None:
        """Check API health."""
        self.client.get("/api/health", name="GET /api/health")

    @task(3)
    def list_resumes(self) -> None:
        """List user's resumes."""
        headers = self._get_auth_header()
        self.client.get(
            "/api/resumes",
            headers=headers,
            name="GET /api/resumes",
        )

    @task(2)
    def get_resume_detail(self) -> None:
        """Get a specific resume."""
        headers = self._get_auth_header()
        self.client.get(
            "/api/resumes/1",
            headers=headers,
            name="GET /api/resumes/{id}",
        )

    @task(2)
    def analyze_resume(self) -> None:
        """Analyze a resume."""
        headers = self._get_auth_header()
        payload = {
            "content": "Senior Software Engineer with 5 years experience",
            "job_description": "Looking for experienced backend engineer",
        }
        self.client.post(
            "/api/analyze",
            json=payload,
            headers=headers,
            name="POST /api/analyze",
        )

    @task(1)
    def generate_cover_letter(self) -> None:
        """Generate a cover letter."""
        headers = self._get_auth_header()
        payload = {
            "resume_id": "1",
            "job_description": "Looking for experienced backend engineer",
        }
        self.client.post(
            "/api/generate/cover-letter",
            json=payload,
            headers=headers,
            name="POST /api/generate/cover-letter",
        )

    def _get_auth_header(self) -> dict[str, str]:
        """Get authorization header. Returns empty dict if no token."""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}


class AdminUser(HttpUser):
    """Simulates an admin user."""

    wait_time = between(5, 10)
    host = "http://localhost:8000"

    @task
    def check_metrics(self) -> None:
        """Check system metrics."""
        self.client.get("/api/admin/metrics", name="GET /api/admin/metrics")

    @task
    def view_analytics(self) -> None:
        """View analytics."""
        self.client.get("/api/admin/analytics", name="GET /api/admin/analytics")
