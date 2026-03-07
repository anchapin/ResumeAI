"""
Tests for Job Description Parsing functionality.
"""

import pytest
from lib.utils import JobDescriptionParser, parse_job_description
from lib.utils import ATSCompatibilityChecker, check_ats_compatibility


class TestJobDescriptionParser:
    """Tests for JobDescriptionParser class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.parser = JobDescriptionParser()
        self.sample_jd = """Senior Software Engineer

TechCorp is looking for a Senior Software Engineer to join our team.

Location: San Francisco, CA (Hybrid)
Salary: $150,000 - $200,000 per year

Requirements:
- 5+ years of experience in software development
- Strong proficiency in Python and JavaScript
- Experience with React and Node.js
- Knowledge of AWS cloud services
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Design and implement scalable backend services
- Collaborate with cross-functional teams
- Mentor junior engineers
- Participate in code reviews

Preferred Qualifications:
- Experience with Kubernetes
- Knowledge of machine learning
- Master's degree in Computer Science

Benefits:
- Health insurance
- 401(k) matching
- Unlimited PTO
- Stock options
"""

    def test_parse_title(self):
        """Test job title extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.title is not None
        assert "Senior" in parsed.title or "Engineer" in parsed.title

    def test_parse_company(self):
        """Test company name extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.company == "TechCorp"

    def test_parse_location(self):
        """Test location extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.location is not None
        assert "San Francisco" in parsed.location

    def test_parse_remote_type(self):
        """Test remote work type detection."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.remote_type == "hybrid"

    def test_parse_salary(self):
        """Test salary extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.salary_min == 150000
        assert parsed.salary_max == 200000

    def test_parse_experience_level(self):
        """Test experience level detection."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.experience_level == "senior"

    def test_parse_experience_years(self):
        """Test years of experience extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert parsed.experience_years is not None
        assert parsed.experience_years[0] >= 5

    def test_parse_requirements(self):
        """Test requirements extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert len(parsed.requirements) > 0
        assert any("Python" in req or "python" in req for req in parsed.requirements)

    def test_parse_responsibilities(self):
        """Test responsibilities extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert len(parsed.responsibilities) > 0

    def test_parse_skills(self):
        """Test skills extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert "python" in parsed.skills
        assert "javascript" in parsed.skills
        assert "react" in parsed.skills
        assert "aws" in parsed.skills

    def test_parse_education_requirements(self):
        """Test education requirements extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert len(parsed.education_requirements) > 0
        assert any("bachelor" in edu.lower() for edu in parsed.education_requirements)

    def test_parse_benefits(self):
        """Test benefits extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert len(parsed.benefits) > 0

    def test_parse_keywords(self):
        """Test keyword extraction."""
        parsed = self.parser.parse(self.sample_jd)
        assert len(parsed.keywords) > 0

    def test_parse_empty_jd(self):
        """Test parsing empty job description."""
        parsed = self.parser.parse("")
        assert parsed.title is None
        assert parsed.skills == []

    def test_parse_remote_jd(self):
        """Test remote job detection."""
        remote_jd = """
        Remote Software Developer
        
        We are hiring a developer to work from home.
        This is a fully remote position.
        
        Requirements:
        - Python
        - JavaScript
        """
        parsed = self.parser.parse(remote_jd)
        assert parsed.remote_type == "remote"

    def test_parse_onsite_jd(self):
        """Test onsite job detection."""
        onsite_jd = """
        On-site Engineer
        
        Work at our office in New York.
        In-person collaboration required.
        """
        parsed = self.parser.parse(onsite_jd)
        assert parsed.remote_type == "onsite"

    def test_convenience_function(self):
        """Test parse_job_description convenience function."""
        result = parse_job_description(self.sample_jd)
        assert isinstance(result, dict)
        assert "title" in result
        assert "skills" in result


class TestATSCompatibilityChecker:
    """Tests for ATSCompatibilityChecker class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.checker = ATSCompatibilityChecker()
        self.sample_resume = {
            "basics": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1-555-123-4567",
                "summary": "Experienced software engineer with 5+ years of experience.",
            },
            "work": [
                {
                    "company": "TechCorp",
                    "position": "Software Engineer",
                    "summary": "Developed scalable web applications.",
                    "highlights": [
                        "Increased performance by 40%",
                        "Led a team of 5 developers",
                        "Implemented CI/CD pipeline",
                    ],
                }
            ],
            "education": [
                {
                    "institution": "University of California",
                    "studyType": "Bachelor",
                    "area": "Computer Science",
                }
            ],
            "skills": [
                {"name": "Python", "keywords": ["Django", "Flask"]},
                {"name": "JavaScript", "keywords": ["React", "Node.js"]},
                {"name": "AWS", "keywords": ["EC2", "S3", "Lambda"]},
            ],
        }

        self.sample_jd = """
        Senior Software Engineer
        
        Requirements:
        - 5+ years of experience
        - Python and JavaScript
        - React and Node.js
        - AWS cloud services
        - Bachelor's degree in Computer Science
        """

    def test_check_sections(self):
        """Test section detection."""
        report = self.checker.check_compatibility(self.sample_resume)
        assert "contact" in report.sections_found
        assert "experience" in report.sections_found
        assert "education" in report.sections_found
        assert "skills" in report.sections_found
        assert report.sections_missing == []

    def test_check_content(self):
        """Test content quality check."""
        report = self.checker.check_compatibility(self.sample_resume)
        assert report.content_score > 0

    def test_check_with_job_description(self):
        """Test keyword matching with job description."""
        report = self.checker.check_compatibility(
            self.sample_resume, job_description=self.sample_jd
        )
        assert report.keyword_match_rate >= 0
        assert report.keyword_match_rate <= 1

    def test_overall_score(self):
        """Test overall score calculation."""
        report = self.checker.check_compatibility(self.sample_resume)
        assert report.overall_score >= 0
        assert report.overall_score <= 100

    def test_passed_threshold(self):
        """Test pass/fail threshold."""
        report = self.checker.check_compatibility(self.sample_resume)
        assert report.passed == (report.overall_score >= 70)

    def test_recommendations(self):
        """Test recommendations generation."""
        report = self.checker.check_compatibility(self.sample_resume)
        assert isinstance(report.recommendations, list)

    def test_missing_sections(self):
        """Test detection of missing sections."""
        incomplete_resume = {
            "basics": {"name": "John Doe"},
            # Missing work, education, skills
        }
        report = self.checker.check_compatibility(incomplete_resume)
        assert "experience" in report.sections_missing
        assert "education" in report.sections_missing
        assert "skills" in report.sections_missing

    def test_missing_contact_info(self):
        """Test detection of missing contact info."""
        resume_no_email = {
            "basics": {"name": "John Doe"},
            "work": [],
            "education": [],
            "skills": [],
        }
        report = self.checker.check_compatibility(resume_no_email)
        high_issues = [i for i in report.issues if i.get("severity") == "high"]
        assert len(high_issues) > 0

    def test_action_verbs_detection(self):
        """Test action verbs detection in experience."""
        resume_with_verbs = {
            "basics": {"name": "John Doe", "email": "john@example.com"},
            "work": [
                {
                    "company": "TechCorp",
                    "position": "Engineer",
                    "highlights": [
                        "Developed new features",
                        "Implemented CI/CD",
                        "Led team meetings",
                    ],
                }
            ],
            "education": [],
            "skills": [{"name": "Python"}],
        }
        report = self.checker.check_compatibility(resume_with_verbs)
        # Should not have action verb issue
        action_verb_issues = [
            i for i in report.issues if "action verbs" in i.get("message", "").lower()
        ]
        assert len(action_verb_issues) == 0

    def test_metrics_detection(self):
        """Test metrics detection in experience."""
        resume_with_metrics = {
            "basics": {"name": "John Doe", "email": "john@example.com"},
            "work": [
                {
                    "company": "TechCorp",
                    "position": "Engineer",
                    "highlights": [
                        "Increased revenue by 25%",
                        "Reduced costs by $50,000",
                        "Improved performance 3x",
                    ],
                }
            ],
            "education": [],
            "skills": [{"name": "Python"}],
        }
        report = self.checker.check_compatibility(resume_with_metrics)
        # Should not have metrics issue
        metrics_issues = [i for i in report.issues if "metrics" in i.get("message", "").lower()]
        assert len(metrics_issues) == 0

    def test_convenience_function(self):
        """Test check_ats_compatibility convenience function."""
        result = check_ats_compatibility(self.sample_resume)
        assert isinstance(result, dict)
        assert "overall_score" in result
        assert "passed" in result
        assert "recommendations" in result


class TestSkillsMatching:
    """Tests for skills matching functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.parser = JobDescriptionParser()

    def test_skills_extraction_from_jd(self):
        """Test skills extraction from job description."""
        jd = """
        Software Engineer
        
        Required Skills:
        - Python
        - JavaScript
        - React
        - AWS
        - Docker
        """
        parsed = self.parser.parse(jd)
        assert "python" in parsed.skills
        assert "javascript" in parsed.skills
        assert "react" in parsed.skills
        assert "aws" in parsed.skills

    def test_skills_extraction_comprehensive(self):
        """Test comprehensive skills extraction."""
        jd = """Full Stack Developer

We need someone with:
- 5+ years experience with Python and Django
- Strong JavaScript skills including React and Node.js
- Experience with AWS services (EC2, S3, Lambda)
- Knowledge of Docker and Kubernetes
- Database experience with PostgreSQL and MongoDB
"""
        parsed = self.parser.parse(jd)
        assert len(parsed.skills) > 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
