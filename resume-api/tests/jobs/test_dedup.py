"""
Tests for Job Deduplication.
"""

import pytest
from unittest.mock import MagicMock

from lib.jobs.dedup import JobDeduplicator


class TestJobDeduplicator:
    """Test JobDeduplicator class."""

    @pytest.fixture
    def dedup(self):
        """Create deduplicator instance."""
        return JobDeduplicator(
            title_threshold=85.0,
            company_threshold=90.0,
            location_threshold=80.0,
        )

    @pytest.fixture
    def mock_jobs(self):
        """Create mock jobs."""
        jobs = []
        
        # Job 1
        job1 = MagicMock()
        job1.url = "https://example.com/job1"
        job1.title = "Software Engineer"
        job1.company = "Tech Corp"
        job1.location = "San Francisco"
        job1.description = "We are hiring..."
        job1.salary_min = 100000
        job1.salary_max = 150000
        job1.posted_date = None
        job1.is_active = True
        job1.skills = ["Python", "React"]
        jobs.append(job1)
        
        # Job 2 - Similar title/company (duplicate)
        job2 = MagicMock()
        job2.url = "https://other.com/job2"
        job2.title = "Senior Software Engineer"
        job2.company = "Tech Corp"
        job2.location = "San Francisco, CA"
        job2.description = "Join our team..."
        job2.salary_min = 120000
        job2.salary_max = 170000
        job2.posted_date = None
        job2.is_active = True
        job2.skills = ["Python"]
        jobs.append(job2)
        
        # Job 3 - Different company (not duplicate)
        job3 = MagicMock()
        job3.url = "https://example.com/job3"
        job3.title = "Software Engineer"
        job3.company = "Different Corp"
        job3.location = "San Francisco"
        jobs.append(job3)
        
        return jobs

    def test_deduplicate_empty(self, dedup):
        """Test deduplicating empty list."""
        result = dedup.deduplicate([])
        assert len(result) == 0

    def test_deduplicate_single(self, dedup):
        """Test deduplicating single job."""
        job = MagicMock()
        job.url = "https://example.com/job1"
        
        result = dedup.deduplicate([job])
        
        assert len(result) == 1
        assert result[0] == job

    def test_deduplicate_removes_duplicates(self, dedup, mock_jobs):
        """Test that duplicates are removed."""
        result = dedup.deduplicate(mock_jobs)
        
        # Should remove the duplicate (job2)
        assert len(result) < len(mock_jobs)

    def test_deduplicate_keeps_best_version(self, dedup):
        """Test that best version is kept."""
        # Job with more complete data
        job1 = MagicMock()
        job1.url = "https://example.com/job1"
        job1.title = "Engineer"
        job1.company = "Corp"
        job1.description = "Short"
        job1.salary_min = None
        job1.salary_max = None
        job1.posted_date = None
        job1.is_active = True
        job1.skills = []
        
        # Job with more complete data
        job2 = MagicMock()
        job2.url = "https://example.com/job1"  # Same URL
        job2.title = "Software Engineer"
        job2.company = "Corp"
        job2.description = "Very detailed description..."
        job2.salary_min = 100000
        job2.salary_max = 150000
        job2.posted_date = None
        job2.is_active = True
        job2.skills = ["Python", "React"]
        
        result = dedup.deduplicate([job1, job2])
        
        # Should keep job2 (more complete)
        assert len(result) == 1
        assert result[0] == job2

    def test_are_duplicates_exact_url(self, dedup):
        """Test exact URL match."""
        job1 = MagicMock()
        job1.url = "https://example.com/job1"
        
        job2 = MagicMock()
        job2.url = "https://example.com/job1"
        job2.title = "Different Title"
        job2.company = "Different Company"
        
        assert dedup.are_duplicates(job1, job2) == True

    def test_are_duplicates_similar(self, dedup):
        """Test similar title/company match."""
        job1 = MagicMock()
        job1.url = "https://example.com/job1"
        job1.title = "Software Engineer"
        job1.company = "Tech Corp"
        job1.location = "San Francisco"
        
        job2 = MagicMock()
        job2.url = "https://other.com/job2"
        job2.title = "Senior Software Engineer"
        job2.company = "Tech Corp"
        job2.location = "San Francisco, CA"
        
        assert dedup.are_duplicates(job1, job2) == True

    def test_are_duplicates_different_company(self, dedup):
        """Test different company is not duplicate."""
        job1 = MagicMock()
        job1.url = "https://example.com/job1"
        job1.title = "Software Engineer"
        job1.company = "Tech Corp"
        job1.location = "San Francisco"
        
        job2 = MagicMock()
        job2.url = "https://other.com/job2"
        job2.title = "Software Engineer"
        job2.company = "Different Corp"
        job2.location = "San Francisco"
        
        assert dedup.are_duplicates(job1, job2) == False

    def test_find_duplicates(self, dedup, mock_jobs):
        """Test finding duplicate pairs."""
        duplicates = dedup.find_duplicates(mock_jobs)
        
        # Should find at least one duplicate pair
        assert len(duplicates) > 0
        
        # Each duplicate should have indices and confidence
        for dup in duplicates:
            assert len(dup) == 3
            assert isinstance(dup[0], int)
            assert isinstance(dup[1], int)
            assert isinstance(dup[2], float)

    def test_get_duplicate_stats(self, dedup, mock_jobs):
        """Test getting duplicate statistics."""
        stats = dedup.get_duplicate_stats(mock_jobs)
        
        assert "total" in stats
        assert "unique" in stats
        assert "duplicates" in stats
        assert "duplicate_rate" in stats
        
        assert stats["total"] == len(mock_jobs)
        assert stats["unique"] <= stats["total"]
        assert stats["duplicates"] == stats["total"] - stats["unique"]

    def test_normalize_salary_hourly_to_yearly(self, dedup):
        """Test hourly to yearly salary conversion."""
        min_sal, max_sal, currency, period = dedup.normalize_salary(
            salary_min=50,
            salary_max=75,
            currency="USD",
            period="hourly",
        )
        
        assert min_sal == 50 * 2080
        assert max_sal == 75 * 2080
        assert period == "yearly"

    def test_normalize_salary_monthly_to_yearly(self, dedup):
        """Test monthly to yearly salary conversion."""
        min_sal, max_sal, currency, period = dedup.normalize_salary(
            salary_min=5000,
            salary_max=7500,
            currency="USD",
            period="monthly",
        )
        
        assert min_sal == 5000 * 12
        assert max_sal == 7500 * 12
        assert period == "yearly"

    def test_parse_date_various_formats(self, dedup):
        """Test parsing various date formats."""
        # ISO format
        date1 = dedup.parse_date("2026-03-13")
        assert date1 is not None
        
        # ISO with time
        date2 = dedup.parse_date("2026-03-13T10:00:00")
        assert date2 is not None
        
        # RFC 822
        date3 = dedup.parse_date("Fri, 13 Mar 2026 10:00:00 +0000")
        assert date3 is not None
        
        # Invalid
        date4 = dedup.parse_date("invalid")
        assert date4 is None

    def test_extract_skills(self, dedup):
        """Test skill extraction from description."""
        description = """
        We are looking for a Python developer with experience in React and AWS.
        Knowledge of Docker and Kubernetes is a plus.
        """
        
        skills = dedup.extract_skills(description)
        
        assert "Python" in skills
        assert "React" in skills
        assert "Aws" in skills or "AWS" in skills

    def test_extract_skills_empty(self, dedup):
        """Test skill extraction from empty description."""
        skills = dedup.extract_skills("")
        assert len(skills) == 0
