"""
Load Testing Suite for ResumeAI Backend using Locust

This module provides a comprehensive load testing framework for the ResumeAI API.
It simulates realistic user behavior and tests key endpoints under high load.

Endpoints tested:
- /health (health check)
- /v1/render/pdf (PDF generation)
- /v1/tailor (resume tailoring with AI)
- /v1/variants (generate resume variants)

Usage:
    locust -f locustfile.py --host=http://localhost:8000
    locust -f locustfile.py --host=http://localhost:8000 -u 100 -r 10 -t 5m --headless
"""

import random
from locust import HttpUser, TaskSet, task, between


class ResumeData:
    """Sample resume data for testing."""

    SAMPLE_RESUME = {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-0100",
        "summary": "Experienced software engineer with 5+ years in full-stack development",
        "location": "San Francisco, CA",
        "skills": [
            "Python",
            "JavaScript",
            "React",
            "FastAPI",
            "PostgreSQL",
            "Docker",
            "AWS",
            "System Design",
        ],
        "experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Software Engineer",
                "duration": "2021-Present",
                "description": "Led development of microservices architecture",
                "achievements": [
                    "Improved API response time by 40%",
                    "Mentored 3 junior engineers",
                    "Architected real-time data pipeline processing 1M+ events/day",
                ],
            }
        ],
        "education": [
            {
                "school": "State University",
                "degree": "Bachelor of Science",
                "field": "Computer Science",
                "year": "2019",
            }
        ],
    }

    SAMPLE_JOB_POSTING = """Senior Software Engineer - Full Stack
Requirements: 5+ years experience, Python, JavaScript, React, AWS, microservices"""

    SAMPLE_VARIANTS_CONFIG = {
        "formats": ["ats-optimized", "creative", "minimalist"],
        "lengths": ["full", "condensed"],
        "styles": ["modern", "traditional"],
    }


class ResumeAITasks(TaskSet):
    """Task set for ResumeAI load testing."""

    @task(1)
    def health_check(self):
        """Test health check endpoint."""
        self.client.get("/health", name="/health")

    @task(3)
    def render_pdf(self):
        """Test PDF rendering with sample resume."""
        payload = {
            "resume": ResumeData.SAMPLE_RESUME,
            "template": random.choice(["modern", "classic", "minimal"]),
        }
        self.client.post(
            "/v1/render/pdf",
            json=payload,
            headers={"X-API-KEY": "test-key"},
            name="/v1/render/pdf",
        )

    @task(2)
    def tailor_resume(self):
        """Test resume tailoring with AI."""
        payload = {
            "resume": ResumeData.SAMPLE_RESUME,
            "job_posting": ResumeData.SAMPLE_JOB_POSTING,
            "provider": random.choice(["openai", "claude", "gemini"]),
        }
        self.client.post(
            "/v1/tailor",
            json=payload,
            headers={"X-API-KEY": "test-key"},
            name="/v1/tailor",
            timeout=30,
        )

    @task(2)
    def generate_variants(self):
        """Test variant generation."""
        payload = {
            "resume": ResumeData.SAMPLE_RESUME,
            "config": ResumeData.SAMPLE_VARIANTS_CONFIG,
        }
        self.client.post(
            "/v1/variants",
            json=payload,
            headers={"X-API-KEY": "test-key"},
            name="/v1/variants",
            timeout=30,
        )


class ResumeAIUser(HttpUser):
    """Simulated ResumeAI user performing typical interactions."""

    tasks = [ResumeAITasks]
    wait_time = between(2, 5)


class HeavyLoadUser(HttpUser):
    """User simulating heavy load with rapid requests."""

    class HeavyTasks(TaskSet):
        @task(5)
        def render_pdf(self):
            payload = {
                "resume": ResumeData.SAMPLE_RESUME,
                "template": random.choice(["modern", "classic", "minimal"]),
            }
            self.client.post(
                "/v1/render/pdf",
                json=payload,
                headers={"X-API-KEY": "test-key"},
                timeout=30,
                name="/v1/render/pdf",
            )

    tasks = [HeavyTasks]
    wait_time = between(0.5, 1.5)
