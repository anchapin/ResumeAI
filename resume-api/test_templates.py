"""
Test script for LaTeX templates.
Verifies templates work with various content lengths and configurations.
"""

import sys
from pathlib import Path
import json

# Add lib directory to path
lib_path = Path(__file__).parent
sys.path.insert(0, str(lib_path))

from lib.cli import ResumeGenerator

# Test data for different content lengths
SAMPLE_RESUME_SHORT = {
    "basics": {
        "name": "John Doe",
        "label": "Software Engineer",
        "email": "john@example.com",
        "phone": "555-123-4567",
        "url": "https://johndoe.dev",
        "summary": "Passionate software engineer with experience in Python and JavaScript.",
    },
    "work": [
        {
            "company": "Tech Corp",
            "position": "Junior Developer",
            "startDate": "2022-01",
            "endDate": "2024-01",
            "summary": "Developed web applications using React and Python.",
            "highlights": ["Built RESTful APIs", "Improved page load times by 30%"],
        }
    ],
    "education": [
        {
            "institution": "State University",
            "area": "Computer Science",
            "studyType": "Bachelor",
            "startDate": "2018-09",
            "endDate": "2022-05",
        }
    ],
    "skills": [
        {"name": "Programming", "keywords": ["Python", "JavaScript", "SQL"]},
        {"name": "Tools", "keywords": ["Git", "Docker", "Linux"]},
    ],
}

SAMPLE_RESUME_MEDIUM = {
    "basics": {
        "name": "Jane Smith",
        "label": "Senior Software Engineer",
        "email": "jane@example.com",
        "phone": "555-987-6543",
        "url": "https://janesmith.dev",
        "summary": "Senior software engineer with 7 years of experience building scalable web applications and leading development teams. Passionate about clean code, testing, and developer experience.",
    },
    "location": {"city": "San Francisco", "region": "CA", "countryCode": "US"},
    "work": [
        {
            "company": "Tech Innovations Inc.",
            "position": "Senior Software Engineer",
            "startDate": "2020-06",
            "endDate": "Present",
            "summary": "Leading development of microservices architecture serving millions of users.",
            "highlights": [
                "Designed and implemented a microservices architecture reducing deployment time by 60%",
                "Mentored team of 5 junior developers",
                "Improved system reliability from 99.5% to 99.9% uptime",
                "Implemented CI/CD pipeline for automated testing and deployment",
            ],
        },
        {
            "company": "Digital Solutions LLC",
            "position": "Software Engineer",
            "startDate": "2017-03",
            "endDate": "2020-05",
            "summary": "Developed customer-facing web applications and internal tools.",
            "highlights": [
                "Built responsive web applications using React and Node.js",
                "Developed RESTful APIs serving 100k+ daily requests",
                "Integrated third-party payment processing systems",
                "Participated in code reviews and technical design discussions",
            ],
        },
        {
            "company": "StartupXYZ",
            "position": "Junior Developer",
            "startDate": "2016-06",
            "endDate": "2017-02",
            "summary": "Full-stack development for early-stage startup.",
            "highlights": [
                "Developed MVP web application",
                "Implemented user authentication system",
                "Deployed applications to AWS cloud infrastructure",
            ],
        },
    ],
    "education": [
        {
            "institution": "University of Technology",
            "area": "Computer Science",
            "studyType": "Master",
            "startDate": "2015-09",
            "endDate": "2017-05",
            "courses": [
                "Distributed Systems",
                "Advanced Algorithms",
                "Machine Learning",
            ],
        },
        {
            "institution": "State College",
            "area": "Computer Science",
            "studyType": "Bachelor",
            "startDate": "2011-09",
            "endDate": "2015-05",
        },
    ],
    "skills": [
        {
            "name": "Programming Languages",
            "keywords": ["Python", "JavaScript", "TypeScript", "Go", "Java"],
        },
        {
            "name": "Frameworks",
            "keywords": ["React", "Node.js", "Django", "Flask", "FastAPI"],
        },
        {
            "name": "Databases",
            "keywords": ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch"],
        },
        {
            "name": "DevOps",
            "keywords": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
        },
        {"name": "Tools", "keywords": ["Git", "Jira", "Confluence", "Linux", "Nginx"]},
    ],
    "projects": [
        {
            "name": "Open Source Project",
            "description": "Contributed to popular open-source projects with 500+ GitHub stars.",
            "url": "https://github.com/example/project",
            "highlights": [
                "Implemented core features",
                "Wrote comprehensive documentation",
                "Reviewed pull requests from community",
            ],
        }
    ],
    "awards": [
        {
            "title": "Employee of the Year",
            "date": "2022",
            "awarder": "Tech Innovations Inc.",
        }
    ],
}

SAMPLE_RESUME_LONG = {
    "basics": {
        "name": "Dr. Michael Johnson",
        "label": "Principal Software Architect & Engineering Manager",
        "email": "michael.johnson@example.com",
        "phone": "555-555-5555",
        "url": "https://michaeljohnson.dev",
        "summary": "Principal Software Architect with 15+ years of experience leading engineering teams and designing large-scale distributed systems. Expertise in cloud architecture, microservices, and building high-performance teams. Strong track record of delivering complex projects on time and under budget.",
    },
    "location": {"city": "Seattle", "region": "WA", "countryCode": "US"},
    "work": [
        {
            "company": "Global Technology Corporation",
            "position": "Principal Software Architect",
            "startDate": "2019-01",
            "endDate": "Present",
            "summary": "Leading architectural decisions for enterprise software platform serving 50M+ users across 30 countries.",
            "highlights": [
                "Designed cloud-native architecture reducing infrastructure costs by 40%",
                "Led migration from monolith to microservices, improving deployment frequency by 10x",
                "Managed team of 25 engineers across 5 time zones",
                "Established engineering standards and best practices adopted company-wide",
                "Technical advisor to CTO on strategic technology initiatives",
                "Reduced time-to-market for new features by 60% through improved processes",
            ],
        },
        {
            "company": "CloudScale Solutions",
            "position": "Engineering Manager & Architect",
            "startDate": "2015-06",
            "endDate": "2018-12",
            "summary": "Managed engineering team while contributing to architectural design for SaaS platform.",
            "highlights": [
                "Grew engineering team from 5 to 15 developers",
                "Designed scalable data pipeline processing 1TB+ daily",
                "Implemented zero-downtime deployment strategy",
                "Reduced customer support tickets by 50% through quality improvements",
                "Mentored junior developers into leadership roles",
                "Established agile development processes improving team velocity",
            ],
        },
        {
            "company": "DataDriven Inc.",
            "position": "Senior Software Engineer",
            "startDate": "2012-03",
            "endDate": "2015-05",
            "summary": "Developed big data processing and analytics platform.",
            "highlights": [
                "Built real-time data streaming system processing 10M+ events per day",
                "Implemented machine learning models for predictive analytics",
                "Optimized database queries reducing response times by 70%",
                "Developed API integrations with 50+ external systems",
                "Led technical initiatives for database performance optimization",
                "Received multiple internal awards for innovation and excellence",
            ],
        },
        {
            "company": "InnovateTech Startup",
            "position": "Software Engineer",
            "startDate": "2009-06",
            "endDate": "2012-02",
            "summary": "Full-stack development for early-stage startup in the IoT space.",
            "highlights": [
                "Developed end-to-end web applications and mobile APIs",
                "Implemented secure authentication and authorization systems",
                "Built scalable backend services handling millions of requests",
                "Participated in product design and user experience discussions",
                "Contributed to company's Series A funding through technical excellence",
            ],
        },
    ],
    "education": [
        {
            "institution": "Stanford University",
            "area": "Computer Science",
            "studyType": "PhD",
            "startDate": "2006-09",
            "endDate": "2009-06",
            "courses": [
                "Distributed Systems",
                "Advanced Algorithms",
                "Cloud Computing",
                "Machine Learning",
            ],
        },
        {
            "institution": "MIT",
            "area": "Computer Science",
            "studyType": "Master",
            "startDate": "2004-09",
            "endDate": "2006-05",
            "courses": ["Software Engineering", "Database Systems", "Network Security"],
        },
        {
            "institution": "University of California, Berkeley",
            "area": "Computer Science",
            "studyType": "Bachelor",
            "startDate": "2000-09",
            "endDate": "2004-05",
            "courses": [
                "Data Structures",
                "Algorithms",
                "Operating Systems",
                "Computer Networks",
            ],
        },
    ],
    "skills": [
        {
            "name": "Programming Languages",
            "keywords": ["Python", "Java", "Go", "TypeScript", "C++", "Rust", "Scala"],
        },
        {
            "name": "Architecture",
            "keywords": [
                "Microservices",
                "Event-Driven",
                "Cloud-Native",
                "Serverless",
                "Distributed Systems",
            ],
        },
        {
            "name": "Cloud Platforms",
            "keywords": ["AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform"],
        },
        {
            "name": "Databases",
            "keywords": [
                "PostgreSQL",
                "MongoDB",
                "Cassandra",
                "Redis",
                "Elasticsearch",
                "BigQuery",
            ],
        },
        {
            "name": "Leadership",
            "keywords": [
                "Team Management",
                "Technical Leadership",
                "Strategic Planning",
                "Mentoring",
                "Agile/Scrum",
            ],
        },
        {
            "name": "DevOps",
            "keywords": [
                "CI/CD",
                "Infrastructure as Code",
                "Monitoring",
                "Observability",
                "Security",
            ],
        },
        {
            "name": "Data",
            "keywords": [
                "Big Data",
                "Machine Learning",
                "Data Engineering",
                "Analytics",
                "Stream Processing",
            ],
        },
    ],
    "projects": [
        {
            "name": "Enterprise Cloud Platform",
            "description": "Designed and implemented company-wide cloud platform enabling rapid application development and deployment.",
            "highlights": [
                "Reduced developer onboarding time from weeks to days",
                "Enabled 100+ teams to deploy independently",
                "Achieved 99.99% platform uptime",
                "Recognized as company-wide innovation initiative",
            ],
        },
        {
            "name": "Real-Time Analytics System",
            "description": "Built real-time analytics pipeline processing billions of events daily.",
            "highlights": [
                "Reduced data latency from hours to seconds",
                "Enabled business users to make real-time decisions",
                "Scaled to handle 10x growth in data volume",
                "Published conference paper on architecture",
            ],
        },
        {
            "name": "Open Source Contributions",
            "description": "Active contributor to major open source projects.",
            "url": "https://github.com/michaeljohnson",
            "highlights": [
                "500+ contributions to major projects",
                "Maintainer of popular Kubernetes operator",
                "Speaker at 10+ industry conferences",
                "Technical blog with 50k+ monthly readers",
            ],
        },
    ],
    "awards": [
        {
            "title": "Technical Excellence Award",
            "date": "2023",
            "awarder": "Global Technology Corporation",
        },
        {
            "title": "Best Technical Architecture",
            "date": "2021",
            "awarder": "Cloud Solutions Awards",
        },
        {
            "title": "Engineering Leader of the Year",
            "date": "2017",
            "awarder": "CloudScale Solutions",
        },
        {
            "title": "Outstanding Contributor",
            "date": "2016",
            "awarder": "Open Source Foundation",
        },
        {"title": "PhD Thesis Award", "date": "2009", "awarder": "Stanford University"},
    ],
    "certificates": [
        {
            "name": "AWS Solutions Architect Professional",
            "date": "2023",
            "issuer": "Amazon Web Services",
        },
        {
            "name": "Kubernetes Administrator (CKA)",
            "date": "2022",
            "issuer": "Cloud Native Computing Foundation",
        },
        {
            "name": "Google Cloud Professional Architect",
            "date": "2021",
            "issuer": "Google",
        },
    ],
    "publications": [
        {
            "name": "Scalable Microservices Architecture",
            "publisher": "IEEE Software Magazine",
            "releaseDate": "2022-03",
        },
        {
            "name": "Building Resilient Cloud Applications",
            "publisher": "ACM Computing Surveys",
            "releaseDate": "2020-11",
        },
    ],
}


def test_template(template_name, resume_data, description):
    """Test a template with given resume data."""
    print(f"\n{'='*60}")
    print(f"Testing Template: {template_name}")
    print(f"Resume Length: {description}")
    print(f"{'='*60}")

    try:
        generator = ResumeGenerator(
            templates_dir=str(lib_path / "templates"), lib_dir=str(lib_path)
        )

        # Generate PDF
        pdf_bytes = generator.generate_pdf(
            resume_data=resume_data, variant=template_name
        )

        # Check PDF was generated
        if pdf_bytes and len(pdf_bytes) > 0:
            print(f"✅ SUCCESS: Generated PDF ({len(pdf_bytes)} bytes)")
            return True
        else:
            print(f"❌ FAILED: PDF generation returned empty data")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all template tests."""
    templates = ["base", "technical", "creative", "executive", "modern", "academic"]
    test_cases = [
        (SAMPLE_RESUME_SHORT, "Short (1 page)"),
        (SAMPLE_RESUME_MEDIUM, "Medium (1-2 pages)"),
        (SAMPLE_RESUME_LONG, "Long (2+ pages)"),
    ]

    results = []

    for template in templates:
        template_results = []
        for resume_data, description in test_cases:
            success = test_template(template, resume_data, description)
            template_results.append((description, success))
        results.append((template, template_results))

    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")

    for template, template_results in results:
        passed = sum(1 for _, success in template_results if success)
        total = len(template_results)
        status = (
            "✅ PASS" if passed == total else "⚠️  PARTIAL" if passed > 0 else "❌ FAIL"
        )
        print(f"{template:15} {status} ({passed}/{total})")

    overall_passed = sum(
        1 for _, results in results for _, success in results if success
    )
    overall_total = sum(len(results) for _, results in results)
    print(f"\nOverall: {overall_passed}/{overall_total} tests passed")

    return overall_passed == overall_total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
