"""
Test suite for LinkedIn import functionality.

Tests:
1. LinkedInImporter class with various export formats
2. LinkedIn file import endpoint
3. Date normalization
4. Field mapping
"""

import pytest
import sys
from pathlib import Path

# Add the resume-api directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.linkedin import LinkedInImporter, LinkedInExporter


class TestLinkedInImporter:
    """Test the LinkedInImporter class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.importer = LinkedInImporter()

    def test_detect_standard_format(self):
        """Test detection of standard LinkedIn export format."""
        data = {
            "firstName": "John",
            "lastName": "Doe",
            "headline": "Software Engineer",
        }
        assert self.importer.detect_format(data) == "standard"

    def test_detect_scraper_format(self):
        """Test detection of scraper API format."""
        data = {
            "fullName": "John Doe",
            "profileUrl": "https://linkedin.com/in/johndoe",
        }
        assert self.importer.detect_format(data) == "scraper"

    def test_detect_minimal_format(self):
        """Test detection of minimal format."""
        data = {
            "name": "John Doe",
            "experience": [],
        }
        assert self.importer.detect_format(data) == "minimal"

    def test_parse_standard_format(self):
        """Test parsing standard LinkedIn export."""
        data = {
            "firstName": "John",
            "lastName": "Doe",
            "headline": "Software Engineer",
            "summary": "Experienced developer",
            "emailAddress": "john@example.com",
            "phoneNumbers": [{"phoneNumber": "+1-555-1234"}],
            "locationName": "San Francisco, CA",
            "positions": [
                {
                    "companyName": "Tech Corp",
                    "title": "Senior Developer",
                    "description": "Led development team",
                    "timePeriod": {
                        "startDate": {"month": 1, "year": 2020},
                        "endDate": {"month": 12, "year": 2023},
                    },
                }
            ],
            "educations": [
                {
                    "schoolName": "Stanford University",
                    "degreeName": "Bachelor of Science",
                    "fieldOfStudy": "Computer Science",
                    "timePeriod": {
                        "startDate": {"year": 2016},
                        "endDate": {"year": 2020},
                    },
                }
            ],
            "skills": [{"name": "Python"}, {"name": "JavaScript"}],
        }

        result = self.importer.parse_export(data)

        assert result["name"] == "John Doe"
        assert result["headline"] == "Software Engineer"
        assert result["summary"] == "Experienced developer"
        assert result["email"] == "john@example.com"
        assert result["phone"] == "+1-555-1234"
        assert result["location"] == "San Francisco, CA"
        assert len(result["experience"]) == 1
        assert result["experience"][0]["company"] == "Tech Corp"
        assert result["experience"][0]["role"] == "Senior Developer"
        assert len(result["education"]) == 1
        assert result["education"][0]["institution"] == "Stanford University"
        assert len(result["skills"]) == 2

    def test_parse_scraper_format(self):
        """Test parsing scraper API format."""
        data = {
            "fullName": "Jane Smith",
            "headline": "Product Manager",
            "about": "Passionate about building great products",
            "email": "jane@example.com",
            "location": {"city": "New York", "region": "NY"},
            "experience": [
                {
                    "companyName": "Startup Inc",
                    "title": "Senior PM",
                    "description": "Led product strategy",
                    "startDate": "Jan 2019",
                    "endDate": "Present",
                }
            ],
            "education": [
                {
                    "schoolName": "Harvard Business School",
                    "degreeName": "MBA",
                    "startDate": "2017",
                    "endDate": "2019",
                }
            ],
            "skills": ["Product Management", "Strategy", "Leadership"],
        }

        result = self.importer.parse_export(data)

        assert result["name"] == "Jane Smith"
        assert result["headline"] == "Product Manager"
        assert result["summary"] == "Passionate about building great products"
        assert result["email"] == "jane@example.com"
        assert result["location"] == "New York"
        assert len(result["experience"]) == 1
        assert result["experience"][0]["company"] == "Startup Inc"
        assert result["experience"][0]["current"] is True

    def test_parse_minimal_format(self):
        """Test parsing minimal format."""
        data = {
            "name": "Bob Johnson",
            "title": "Data Scientist",
            "bio": "ML enthusiast",
            "email": "bob@example.com",
            "city": "Seattle",
            "experience": [
                {
                    "company": "Data Corp",
                    "role": "ML Engineer",
                    "from": "2020-01",
                    "to": "current",
                    "details": "Building ML models",
                }
            ],
            "education": [
                {
                    "university": "MIT",
                    "degree": "PhD",
                    "major": "Machine Learning",
                    "from": "2016",
                    "to": "2020",
                }
            ],
            "skills": ["Python", "TensorFlow", "PyTorch"],
        }

        result = self.importer.parse_export(data)

        assert result["name"] == "Bob Johnson"
        assert result["headline"] == "Data Scientist"
        assert result["summary"] == "ML enthusiast"
        assert len(result["experience"]) == 1
        assert result["experience"][0]["company"] == "Data Corp"
        assert result["experience"][0]["current"] is True

    def test_normalize_date_various_formats(self):
        """Test date normalization with various formats."""
        assert self.importer._normalize_date("2020-01") == "2020-01"
        assert self.importer._normalize_date("2020") == "2020"
        assert self.importer._normalize_date("Jan 2020") == "2020-01"
        assert self.importer._normalize_date("January 2020") == "2020-01"
        assert self.importer._normalize_date("01/2020") == "2020-01"
        assert self.importer._normalize_date("1/2020") == "2020-01"
        assert self.importer._normalize_date("2020-01-15") == "2020-01"
        assert self.importer._normalize_date("") == ""
        assert self.importer._normalize_date(None) == ""

    def test_parse_certifications(self):
        """Test parsing certifications."""
        data = {
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect",
                    "authority": "Amazon Web Services",
                    "timePeriod": {
                        "startDate": {"month": 6, "year": 2022},
                    },
                    "displaySource": "https://aws.amazon.com/verification",
                }
            ]
        }

        result = self.importer._parse_standard_format(data)

        assert len(result["certifications"]) == 1
        assert (
            result["certifications"][0]["name"] == "AWS Certified Solutions Architect"
        )
        assert result["certifications"][0]["issuer"] == "Amazon Web Services"

    def test_parse_volunteer(self):
        """Test parsing volunteer experience."""
        data = {
            "volunteer": [
                {
                    "organizationName": "Code for America",
                    "role": "Volunteer Developer",
                    "description": "Building civic tech",
                    "timePeriod": {
                        "startDate": {"month": 1, "year": 2021},
                    },
                }
            ]
        }

        result = self.importer._parse_standard_format(data)

        assert len(result["volunteer"]) == 1
        assert result["volunteer"][0]["organization"] == "Code for America"
        assert result["volunteer"][0]["current"] is True


class TestLinkedInExporter:
    """Test the LinkedInExporter class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.exporter = LinkedInExporter()

    def test_to_linkedin_profile(self):
        """Test exporting to LinkedIn profile format."""
        resume_data = {
            "name": "John Doe",
            "role": "Software Engineer",
            "summary": "Experienced developer",
            "location": "San Francisco, CA",
            "email": "john@example.com",
            "phone": "+1-555-1234",
            "experience": [
                {
                    "company": "Tech Corp",
                    "role": "Senior Developer",
                    "description": "Led development team",
                    "startDate": "01/2020",
                    "endDate": "12/2023",
                }
            ],
            "education": [
                {
                    "institution": "Stanford University",
                    "studyType": "Bachelor of Science",
                    "area": "Computer Science",
                    "startDate": "2016",
                    "endDate": "2020",
                }
            ],
            "skills": ["Python", "JavaScript"],
        }

        profile = self.exporter.to_linkedin_profile(resume_data)

        assert profile["firstName"] == "John"
        assert profile["lastName"] == "Doe"
        assert profile["headline"] == "Software Engineer"
        assert profile["summary"] == "Experienced developer"
        assert profile["emailAddress"] == "john@example.com"
        assert len(profile["positions"]) == 1
        assert len(profile["educations"]) == 1
        assert len(profile["skills"]) == 2


class TestLinkedInImportEndpoint:
    """Test the LinkedIn file import endpoint."""

    def test_import_endpoint_exists(self):
        """Test that the import endpoint is registered."""
        from main import app

        routes = [route.path for route in app.routes]
        assert "/api/v1/import/linkedin-file" in routes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
