"""
Load Testing Script for ResumeAI API

Usage:
    # Interactive UI
    locust -f scripts/locustfile.py --host=http://localhost:8000

    # Headless (100 users, 10 ramp-up, 5 minutes)
    locust -f scripts/locustfile.py --host=https://api.resumeai.com \\
      --headless -u 100 -r 10 -t 5m --csv=results
"""

from locust import HttpUser, task, between
import json


class ResumeAIUser(HttpUser):
    """Simulates a ResumeAI user performing various operations"""

    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    def on_start(self):
        """Called when a user starts"""
        self.api_key = "test-api-key-123"
        self.headers = {"X-API-KEY": self.api_key}

    @task(1)
    def health_check(self):
        """Health check endpoint (10% of traffic)"""
        self.client.get("/health", headers=self.headers, name="/health")

    @task(4)
    def resume_tailor(self):
        """Tailor resume to job description (40% of traffic)"""
        payload = {
            "resume": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-0123",
                "summary": "Senior Software Engineer with 10+ years experience",
                "skills": ["Python", "JavaScript", "React", "AWS"],
                "experience": [
                    {
                        "company": "Tech Corp",
                        "role": "Senior Engineer",
                        "duration": "5 years",
                        "description": "Led architecture and team",
                    }
                ],
            },
            "job_description": """
                Senior Full Stack Engineer
                - 10+ years experience required
                - Python, JavaScript, React proficiency
                - AWS/Cloud experience
                - Team lead capability
            """,
        }

        self.client.post(
            "/api/v1/tailor",
            json=payload,
            headers=self.headers,
            name="/api/v1/tailor",
            timeout=10,
        )

    @task(3)
    def render_pdf(self):
        """Render resume to PDF (30% of traffic)"""
        payload = {
            "resume": {
                "name": "Jane Smith",
                "email": "jane@example.com",
                "phone": "+1-555-0456",
                "location": "San Francisco, CA",
                "summary": "Product Manager with 8+ years experience",
                "skills": ["Product Strategy", "Analytics", "Leadership"],
                "experience": [
                    {
                        "company": "StartupXYZ",
                        "role": "Senior PM",
                        "duration": "3 years",
                        "description": "Managed product roadmap for 50M+ users",
                    },
                    {
                        "company": "Tech Giants",
                        "role": "PM",
                        "duration": "5 years",
                        "description": "Launched mobile app generating $10M revenue",
                    },
                ],
                "education": [
                    {
                        "institution": "Stanford University",
                        "degree": "MBA",
                        "field": "Business Administration",
                    }
                ],
            }
        }

        self.client.post(
            "/api/v1/render/pdf",
            json=payload,
            headers=self.headers,
            name="/api/v1/render/pdf",
            timeout=15,
        )

    @task(2)
    def generate_variants(self):
        """Generate resume variants (20% of traffic)"""
        payload = {
            "resume": {
                "name": "Alex Johnson",
                "email": "alex@example.com",
                "phone": "+1-555-0789",
                "summary": "Data Scientist specializing in ML/AI",
                "skills": ["Machine Learning", "Python", "TensorFlow", "SQL"],
                "experience": [
                    {
                        "company": "AI Startup",
                        "role": "ML Engineer",
                        "duration": "2 years",
                        "description": "Built recommendation system",
                    }
                ],
            },
            "variants": 3,  # Generate 3 variants
        }

        self.client.post(
            "/api/v1/variants",
            json=payload,
            headers=self.headers,
            name="/api/v1/variants",
            timeout=10,
        )


class WebsiteUser(HttpUser):
    """Simulates a website visitor (less intense load)"""

    wait_time = between(2, 5)

    @task
    def index(self):
        """Visit homepage"""
        self.client.get("/", name="/")

    @task(2)
    def health_check(self):
        """Periodic health check"""
        self.client.get("/health", name="/health")
