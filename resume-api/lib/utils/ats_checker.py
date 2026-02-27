"""
ATS (Applicant Tracking System) Compatibility Checker.

This module provides functionality to check resume compatibility with
Applicant Tracking Systems and provide recommendations for improvement.
"""

import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class ATSCompatibilityReport:
    """Report on ATS compatibility of a resume."""

    overall_score: int = 0  # 0-100
    passed: bool = False
    issues: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    keyword_match_rate: float = 0.0
    formatting_score: int = 0
    content_score: int = 0
    skills_match: Dict[str, Any] = field(default_factory=dict)
    sections_found: List[str] = field(default_factory=list)
    sections_missing: List[str] = field(default_factory=list)


class ATSCompatibilityChecker:
    """
    Check resume compatibility with Applicant Tracking Systems.

    ATS systems parse resumes automatically, and certain formatting or
    content choices can cause parsing failures or low rankings.
    """

    # Required sections for ATS compatibility
    REQUIRED_SECTIONS = ["contact", "experience", "education", "skills"]

    # Recommended sections
    RECOMMENDED_SECTIONS = ["summary", "projects", "certifications"]

    # ATS-friendly file formats
    ATS_FRIENDLY_FORMATS = ["pdf", "docx", "txt"]

    # Problematic formatting patterns
    PROBLEMATIC_PATTERNS = {
        "tables": r"<table|<div[^>]*style[^>]*table",
        "images": r"<img|<image|src\s*=",
        "headers_footers": r"<header|<footer",
        "text_boxes": r"<textbox|position\s*:\s*absolute",
        "columns": r"column-count|multi-column|columns\s*:",
    }

    # Common ATS keywords by industry
    INDUSTRY_KEYWORDS = {
        "technology": [
            "software",
            "engineer",
            "developer",
            "programming",
            "code",
            "architecture",
            "design",
            "implementation",
            "testing",
            "debugging",
            "agile",
            "scrum",
            "sprint",
            "deployment",
            "ci/cd",
            "devops",
        ],
        "finance": [
            "financial",
            "analysis",
            "modeling",
            "forecasting",
            "budget",
            "reporting",
            "compliance",
            "risk",
            "audit",
            "accounting",
        ],
        "healthcare": [
            "patient",
            "care",
            "clinical",
            "medical",
            "treatment",
            "diagnosis",
            "healthcare",
            "nursing",
            "therapy",
            "pharmacy",
        ],
        "marketing": [
            "campaign",
            "digital",
            "social media",
            "seo",
            "sem",
            "analytics",
            "conversion",
            "brand",
            "content",
            "engagement",
            "roi",
        ],
        "sales": [
            "revenue",
            "quota",
            "pipeline",
            "prospecting",
            "closing",
            "account",
            "territory",
            "commission",
            "crm",
            "lead generation",
        ],
    }

    # Action verbs that ATS systems look for
    ACTION_VERBS = [
        "achieved",
        "accomplished",
        "created",
        "developed",
        "designed",
        "implemented",
        "improved",
        "increased",
        "led",
        "managed",
        "optimized",
        "reduced",
        "streamlined",
        "transformed",
        "built",
        "engineered",
        "architected",
        "deployed",
        "launched",
        "delivered",
    ]

    # Formatting best practices
    FORMATTING_CHECKS = {
        "font_standard": [
            "Arial",
            "Calibri",
            "Helvetica",
            "Times New Roman",
            "Georgia",
            "Verdana",
        ],
        "font_size_min": 10,
        "font_size_max": 14,
        "margin_min": 0.5,  # inches
        "margin_max": 1.5,
    }

    # Map JSON Resume fields to standard section names
    SECTION_MAPPING = {
        "contact": ["basics"],
        "experience": ["work", "experience"],
        "education": ["education"],
        "skills": ["skills"],
        "summary": ["basics.summary", "summary", "professional_summary"],
        "projects": ["projects"],
        "certifications": ["certificates", "certifications"],
    }

    # Check for consistent date formats
    DATE_PATTERNS = [
        r"\d{4}\s*[-–]\s*\d{4}",
        r"\d{2}/\d{2}/\d{4}",
        r"[A-Z][a-z]+\s+\d{4}",
        r"\d{4}\s*-\s*present",
    ]

    # Pre-compiled regex patterns for performance
    PROBLEMATIC_PATTERNS_RE = {
        name: re.compile(pattern, re.IGNORECASE)
        for name, pattern in PROBLEMATIC_PATTERNS.items()
    }

    DATE_PATTERNS_RE = [re.compile(pattern, re.IGNORECASE) for pattern in DATE_PATTERNS]

    METRIC_PATTERN = re.compile(r"\d+%|\$\d+|\d+\s*[kKmMbB]|\d+x|\d{4}")

    WORD_PATTERN = re.compile(r"\b[a-zA-Z]{3,}\b")

    # Common stop words to exclude
    STOP_WORDS = {
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "from",
        "as",
        "is",
        "was",
        "are",
        "were",
        "been",
        "be",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "must",
        "shall",
        "can",
        "need",
        "this",
        "that",
        "these",
        "those",
        "i",
        "you",
        "he",
        "she",
        "it",
        "we",
        "they",
        "what",
        "which",
        "who",
        "whom",
        "whose",
        "where",
        "when",
        "why",
        "how",
        "all",
        "each",
        "every",
        "both",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very",
        "just",
        "also",
        "now",
        "our",
        "your",
        "their",
        "its",
        "his",
        "her",
        "me",
        "us",
        "them",
        # Job description specific
        "responsibilities",
        "requirements",
        "qualifications",
        "skills",
        "experience",
        "years",
        "work",
        "team",
        "company",
        "role",
        "position",
    }

    def __init__(self):
        """Initialize the ATS compatibility checker."""
        pass

    def check_compatibility(
        self,
        resume_data: Dict[str, Any],
        job_description: Optional[str] = None,
        resume_text: Optional[str] = None,
    ) -> ATSCompatibilityReport:
        """
        Check ATS compatibility of a resume.

        Args:
            resume_data: Resume data in JSON Resume format
            job_description: Optional job description for keyword matching
            resume_text: Optional raw resume text for formatting checks

        Returns:
            ATSCompatibilityReport with compatibility analysis
        """
        report = ATSCompatibilityReport()

        # ⚡ Bolt Optimization: Extract resume text once
        # This prevents redundant calls to _extract_resume_text in subsequent checks
        extracted_text = self._extract_resume_text(resume_data)

        # Check sections
        self._check_sections(resume_data, report)

        # Check content quality
        self._check_content(resume_data, report, extracted_text)

        # Check formatting (if raw text provided)
        if resume_text:
            self._check_formatting(resume_text, report)

        # Check keyword matching (if job description provided)
        if job_description:
            self._check_keyword_matching(
                resume_data, job_description, report, extracted_text
            )

        # Calculate overall score
        self._calculate_overall_score(report)

        # Generate recommendations
        self._generate_recommendations(report)

        return report

    def _check_sections(
        self, resume_data: Dict[str, Any], report: ATSCompatibilityReport
    ) -> None:
        """Check for required and recommended sections."""
        sections_found = []
        sections_missing = []

        # Map JSON Resume fields to standard section names
        section_mapping = self.SECTION_MAPPING

        for section_name, field_paths in section_mapping.items():
            found = False
            for field_path in field_paths:
                if self._has_field(resume_data, field_path):
                    found = True
                    break

            if found:
                sections_found.append(section_name)
            elif section_name in self.REQUIRED_SECTIONS:
                sections_missing.append(section_name)

        report.sections_found = sections_found
        report.sections_missing = sections_missing

        # Add issues for missing required sections
        for section in sections_missing:
            report.issues.append(
                {
                    "type": "missing_section",
                    "severity": "high",
                    "message": f"Missing required section: {section.title()}",
                    "section": section,
                }
            )

        # Calculate section score
        found_reqs = [s for s in sections_found if s in self.REQUIRED_SECTIONS]
        required_found = len(found_reqs)
        required_total = len(self.REQUIRED_SECTIONS)

        if required_total > 0:
            score = (required_found / required_total) * 100
            report.formatting_score = int(score)
        else:
            report.formatting_score = 0

    def _has_field(self, data: Dict[str, Any], field_path: str) -> bool:
        """Check if a field exists in nested dictionary."""
        parts = field_path.split(".")
        current = data

        for part in parts:
            if isinstance(current, dict):
                if part not in current:
                    return False
                current = current[part]
            else:
                return False

        # Check if the value is non-empty
        if current is None:
            return False
        if isinstance(current, (list, str)) and len(current) == 0:
            return False

        return True

    def _check_content(
        self,
        resume_data: Dict[str, Any],
        report: ATSCompatibilityReport,
        extracted_text: Optional[str] = None,
    ) -> None:
        """Check content quality for ATS compatibility."""
        issues = []

        # Check for contact information
        basics = resume_data.get("basics", {})
        if basics:
            if not basics.get("email"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "high",
                        "message": "Missing email address",
                    }
                )
            if not basics.get("phone"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "medium",
                        "message": "Missing phone number (recommended)",
                    }
                )
            if not basics.get("name"):
                issues.append(
                    {
                        "type": "missing_contact",
                        "severity": "high",
                        "message": "Missing name",
                    }
                )

        # Check work experience for metrics and action verbs
        work = resume_data.get("work", []) or resume_data.get("experience", [])
        if work:
            has_metrics = False
            has_action_verbs = False

            for job in work:
                if has_metrics and has_action_verbs:
                    break

                bullets = job.get("bullets", []) or job.get("highlights", [])
                description = job.get("summary", "")
                if not description:
                    description = job.get("description", "")

                bullet_texts = []
                for b in bullets:
                    if isinstance(b, dict):
                        bullet_texts.append(b.get("text", str(b)))
                    else:
                        bullet_texts.append(str(b))

                all_text = " ".join(
                    [
                        description,
                        " ".join(bullet_texts),
                    ]
                ).lower()

                # Check for metrics
                if not has_metrics and self.METRIC_PATTERN.search(all_text):
                    has_metrics = True

                # Check for action verbs
                if not has_action_verbs:
                    for verb in self.ACTION_VERBS:
                        if verb in all_text:
                            has_action_verbs = True
                            break

            if not has_metrics:
                msg = "Consider adding quantifiable metrics to your "
                msg += "experience"
                issues.append(
                    {
                        "type": "content_quality",
                        "severity": "medium",
                        "message": msg,
                    }
                )

            if not has_action_verbs:
                msg = "Use strong action verbs to describe your "
                msg += "achievements"
                issues.append(
                    {
                        "type": "content_quality",
                        "severity": "medium",
                        "message": msg,
                    }
                )

        # Check skills section
        skills = resume_data.get("skills", [])
        if not skills:
            issues.append(
                {
                    "type": "missing_section",
                    "severity": "high",
                    "message": "Missing skills section",
                }
            )
        elif len(skills) < 5:
            issues.append(
                {
                    "type": "content_quality",
                    "severity": "low",
                    "message": "Consider adding more skills to your resume",
                }
            )

        # Check for keywords
        # Use provided text or extract it if not available
        resume_text = (
            extracted_text
            if extracted_text is not None
            else self._extract_resume_text(resume_data)
        )
        word_count = len(resume_text.split())

        if word_count < 300:
            issues.append(
                {
                    "type": "content_length",
                    "severity": "medium",
                    "message": "Resume may be too short (less than 300 words)",
                }
            )
        elif word_count > 2000:
            issues.append(
                {
                    "type": "content_length",
                    "severity": "low",
                    "message": "Resume may be too long (more than 2000 words)",
                }
            )

        report.issues.extend(issues)

    def _check_formatting(
        self, resume_text: str, report: ATSCompatibilityReport
    ) -> None:
        """Check formatting for ATS compatibility."""
        issues = []

        # Check for problematic patterns
        for pattern_name, pattern_re in self.PROBLEMATIC_PATTERNS_RE.items():
            if pattern_re.search(resume_text):
                readable_pattern = pattern_name.replace("_", " ")
                msg = (
                    f"Detected {readable_pattern} which may not parse "
                    + "correctly in ATS systems"
                )
                issues.append(
                    {
                        "type": "formatting",
                        "severity": "high",
                        "message": msg,
                    }
                )

        # Check for special characters that might cause issues
        special_chars = re.findall(r"[^\w\s.,;:!?()'\-]", resume_text)
        if len(special_chars) > len(resume_text) * 0.05:
            msg = (
                "Resume contains many special characters that may not "
                + "parse correctly"
            )
            issues.append(
                {
                    "type": "formatting",
                    "severity": "medium",
                    "message": msg,
                }
            )

        # Check for consistent date formats
        found_formats = []
        for pattern_re in self.DATE_PATTERNS_RE:
            if pattern_re.search(resume_text):
                found_formats.append(pattern_re.pattern)

        if len(found_formats) > 1:
            msg = (
                "Inconsistent date formats detected. Use a consistent "
                + "format throughout"
            )
            issues.append(
                {
                    "type": "formatting",
                    "severity": "low",
                    "message": msg,
                }
            )

        report.issues.extend(issues)

    def _check_keyword_matching(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        report: ATSCompatibilityReport,
        extracted_text: Optional[str] = None,
    ) -> None:
        """Check keyword matching between resume and job description."""
        # Extract keywords from job description
        jd_keywords = self._extract_keywords(job_description)

        # Extract resume text
        # Use provided text or extract it if not available
        resume_text = (
            extracted_text
            if extracted_text is not None
            else self._extract_resume_text(resume_data)
        )
        resume_text_lower = resume_text.lower()

        # Calculate match rate
        matched_keywords = []
        missing_keywords = []

        for keyword in jd_keywords:
            if keyword.lower() in resume_text_lower:
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        if jd_keywords:
            match_rate = len(matched_keywords) / len(jd_keywords)
        else:
            match_rate = 0
        report.keyword_match_rate = match_rate

        report.skills_match = {
            "matched": matched_keywords,
            "missing": missing_keywords,
            "match_count": len(matched_keywords),
            "total_keywords": len(jd_keywords),
        }

        # Add issue if match rate is low
        if match_rate < 0.5 and jd_keywords:
            msg = (
                f"Low keyword match rate ({match_rate:.0%}). "
                + "Consider incorporating more keywords from the job description."
            )
            issues = {
                "type": "keyword_match",
                "severity": "high",
                "message": msg,
                "missing_keywords": missing_keywords[:10],
            }
            report.issues.append(issues)

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text."""
        # Common stop words to exclude
        stop_words = self.STOP_WORDS

        # Extract words
        words = self.WORD_PATTERN.findall(text.lower())

        # Filter and count
        word_count = {}
        for word in words:
            if word not in stop_words:
                word_count[word] = word_count.get(word, 0) + 1

        # Return top keywords by frequency
        sorted_keywords = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, count in sorted_keywords[:30]]

    def _extract_resume_text(self, resume_data: Dict[str, Any]) -> str:
        """Extract all text content from resume data."""
        text_parts = []

        # Extract from basics
        basics = resume_data.get("basics", {})
        for key_name in ["name", "summary", "headline"]:
            if basics.get(key_name):
                text_parts.append(str(basics[key_name]))

        # Extract from work experience
        for exp_key in ["work", "experience"]:
            if exp_key in resume_data and isinstance(resume_data[exp_key], list):
                for exp in resume_data[exp_key]:
                    if isinstance(exp, dict):
                        for key in [
                            "position",
                            "title",
                            "company",
                            "summary",
                            "description",
                        ]:
                            if exp.get(key):
                                text_parts.append(str(exp[key]))
                        # Extract from bullets
                        for bullet_key in ["bullets", "highlights"]:
                            if bullet_key in exp and isinstance(exp[bullet_key], list):
                                for bullet in exp[bullet_key]:
                                    if isinstance(bullet, dict):
                                        if "text" in bullet:
                                            text_parts.append(str(bullet["text"]))
                                    elif isinstance(bullet, str):
                                        text_parts.append(bullet)

        # Extract from skills
        if "skills" in resume_data:
            skills = resume_data["skills"]
            if isinstance(skills, list):
                for skill in skills:
                    if isinstance(skill, dict):
                        if skill.get("name"):
                            text_parts.append(str(skill["name"]))
                        if skill.get("keywords"):
                            text_parts.extend([str(k) for k in skill["keywords"]])
                    elif isinstance(skill, str):
                        text_parts.append(skill)

        # Extract from education
        if "education" in resume_data and isinstance(resume_data["education"], list):
            for edu in resume_data["education"]:
                if isinstance(edu, dict):
                    for key in ["institution", "degree", "studyType", "area"]:
                        if edu.get(key):
                            text_parts.append(str(edu[key]))

        # Extract from projects
        if "projects" in resume_data and isinstance(resume_data["projects"], list):
            for proj in resume_data["projects"]:
                if isinstance(proj, dict):
                    for key in ["name", "description"]:
                        if proj.get(key):
                            text_parts.append(str(proj[key]))

        return " ".join(text_parts)

    def _calculate_overall_score(self, report: ATSCompatibilityReport) -> None:
        """Calculate overall ATS compatibility score."""
        scores = []

        # Section score (40% weight)
        section_score = report.formatting_score
        scores.append(section_score * 0.4)

        # Content score (40% weight)
        high_severity_issues = [i for i in report.issues if i.get("severity") == "high"]
        content_issues = len(high_severity_issues)
        content_score = max(0, 100 - (content_issues * 20))
        scores.append(content_score * 0.4)

        # Keyword match score (20% weight)
        keyword_score = int(report.keyword_match_rate * 100)
        scores.append(keyword_score * 0.2)

        # Calculate overall score
        report.overall_score = int(sum(scores))
        report.passed = report.overall_score >= 70
        report.content_score = content_score

    def _generate_recommendations(self, report: ATSCompatibilityReport) -> None:
        """Generate recommendations based on issues found."""
        recommendations = []

        # Section recommendations
        for section in report.sections_missing:
            recommendations.append(f"Add a '{section.title()}' section to your resume")

        # Issue-based recommendations
        for issue in report.issues:
            issue_type = issue.get("type")
            msg = issue.get("message", "").lower()

            if issue_type == "missing_contact":
                if "email" in msg:
                    recommendations.append(
                        "Add your email address to the contact section"
                    )
                elif "phone" in msg:
                    recommendations.append("Add your phone number for easier contact")
                elif "name" in msg:
                    recommendations.append(
                        "Add your full name at the top of the resume"
                    )

            elif issue_type == "content_quality":
                if "metrics" in msg:
                    recommendations.append(
                        "Add quantifiable achievements (e.g., 'Increased "
                        + "revenue by 25%', 'Reduced processing time by 40%')"
                    )
                elif "action verbs" in msg:
                    recommendations.append(
                        "Start bullet points with strong action verbs like "
                        + "'Achieved', 'Developed', 'Implemented', 'Led'"
                    )
                elif "skills" in msg:
                    recommendations.append(
                        "Expand your skills section with relevant "
                        + "technologies and tools"
                    )

            elif issue_type == "formatting":
                if "table" in msg:
                    recommendations.append(
                        "Avoid using tables as they may not parse correctly "
                        + "in ATS systems"
                    )
                elif "date" in msg:
                    recommendations.append(
                        "Use consistent date formats throughout (e.g., "
                        + "'Jan 2020 - Present')"
                    )

            elif issue_type == "keyword_match":
                missing = issue.get("missing_keywords", [])
                if missing:
                    recommendations.append(
                        "Incorporate these keywords from the job description: "
                        + f"{', '.join(missing[:5])}"
                    )

        # Add general recommendations if score is low
        if report.overall_score < 50:
            recommendations.append(
                "Consider using a simple, clean resume template with standard "
                + "section headings"
            )

        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)

        report.recommendations = unique_recommendations[
            :10
        ]  # Limit to 10 recommendations


def check_ats_compatibility(
    resume_data: Dict[str, Any],
    job_description: Optional[str] = None,
    resume_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convenience function to check ATS compatibility.

    Args:
        resume_data: Resume data in JSON Resume format
        job_description: Optional job description for keyword matching
        resume_text: Optional raw resume text for formatting checks

    Returns:
        Dictionary with ATS compatibility report
    """
    checker = ATSCompatibilityChecker()
    report = checker.check_compatibility(
        resume_data,
        job_description,
        resume_text,
    )

    # Convert to dictionary
    return {
        "overall_score": report.overall_score,
        "passed": report.passed,
        "issues": report.issues,
        "recommendations": report.recommendations,
        "keyword_match_rate": report.keyword_match_rate,
        "formatting_score": report.formatting_score,
        "content_score": report.content_score,
        "skills_match": report.skills_match,
        "sections_found": report.sections_found,
        "sections_missing": report.sections_missing,
    }
