"""
Job Description Parser.

This module provides functionality to parse and analyze job descriptions,
extracting requirements, qualifications, responsibilities, skills, salary
ranges, and location information.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ParsedJobDescription:
    """Structured representation of a parsed job description."""

    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None  # "remote", "hybrid", "onsite"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    salary_period: str = "yearly"  # "yearly", "hourly"
    requirements: List[str] = field(default_factory=list)
    qualifications: List[str] = field(default_factory=list)
    responsibilities: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    experience_level: Optional[str] = (
        None  # "entry", "mid", "senior", "lead", "executive"
    )
    experience_years: Optional[Tuple[int, int]] = None  # (min, max) years
    education_requirements: List[str] = field(default_factory=list)
    benefits: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    raw_text: str = ""


class JobDescriptionParser:
    """
    Parse and analyze job descriptions.

    Extracts structured information from unstructured job description text.
    """

    # Section headers that indicate different parts of a JD
    SECTION_HEADERS = {
        "requirements": [
            "requirements",
            "required",
            "must have",
            "you must",
            "what you need",
            "qualifications",
            "prerequisites",
        ],
        "qualifications": [
            "qualifications",
            "preferred",
            "nice to have",
            "bonus",
            "plus",
            "additional",
            "desired",
        ],
        "responsibilities": [
            "responsibilities",
            "duties",
            "what you'll do",
            "you will",
            "your role",
            "key responsibilities",
            "what you'll be doing",
            "day-to-day",
            "tasks",
            "accountabilities",
        ],
        "skills": [
            "skills",
            "technologies",
            "tools",
            "tech stack",
            "technical skills",
            "competencies",
            "expertise",
        ],
        "benefits": [
            "benefits",
            "perks",
            "what we offer",
            "compensation",
            "what you get",
            "employee benefits",
            "why join us",
        ],
        "education": [
            "education",
            "degree",
            "academic",
            "bachelor",
            "master",
            "phd",
            "university",
            "college",
        ],
    }

    # Experience level indicators - ordered from highest to lowest priority
    EXPERIENCE_LEVELS = {
        "executive": [
            "executive",
            "director",
            "vp",
            "head of",
            "chief",
            "cto",
            "ceo",
            "10+ years",
        ],
        "lead": ["lead", "principal", "staff", "8-12 years", "8+ years"],
        "senior": ["senior", "sr ", "sr.", "5-8 years", "5+ years", "experienced"],
        "mid": ["mid", "middle", "intermediate", "2-5 years", "3+ years", "mid-level"],
        "entry": [
            "entry",
            "junior",
            "associate",
            "graduate",
            "trainee",
            "0-2 years",
            "entry-level",
        ],
    }

    # Remote work indicators
    REMOTE_INDICATORS = {
        "remote": [
            "remote",
            "work from home",
            "wfh",
            "distributed",
            "virtual",
            "telecommute",
        ],
        "hybrid": ["hybrid", "flexible", "partially remote", "2-3 days"],
        "onsite": ["onsite", "on-site", "in office", "in-person", "at our office"],
    }

    # Salary patterns
    SALARY_PATTERNS = [
        r"\$?(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per|a)?\s*(year|yr|annum|hour|hr|month)?",
        r"\$?(\d{2,3}(?:,\d{3})?)k?\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)k?\s*(per|a)?\s*(year|yr|annum|hour|hr|month)?",
        r"salary\s*(?:range)?\s*[:\$]?\s*\$?(\d{2,3}(?:,\d{3})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)",
        r"compensation\s*[:\$]?\s*\$?(\d{2,3}(?:,\d{3})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)",
        r"\$?(\d{2,3}(?:,\d{3})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)\s*k",
    ]

    # Location patterns
    LOCATION_PATTERNS = [
        r"(?:location|based|in|at)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z]{2})?(?:\s*,\s*USA)?)",
        r"([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z]{2})?)\s*(?:,?\s*USA)?\s*(?:remote|hybrid|onsite)?",
    ]

    # Years of experience patterns
    EXPERIENCE_YEARS_PATTERNS = [
        r"(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*years?",
        r"(\d{1,2})\s*\+\s*years?",
        r"minimum\s*(\d{1,2})\s*years?",
        r"at\s*least\s*(\d{1,2})\s*years?",
        r"(\d{1,2})\s*years?\s*of\s*experience",
    ]

    def __init__(self):
        """Initialize the job description parser."""
        pass

    def parse(self, job_description: str) -> ParsedJobDescription:
        """
        Parse a job description into structured data.

        Args:
            job_description: Raw job description text

        Returns:
            ParsedJobDescription with extracted information
        """
        result = ParsedJobDescription(raw_text=job_description)

        # Clean and normalize text
        text = self._normalize_text(job_description)

        # Extract sections
        sections = self._extract_sections(text)

        # Extract various fields
        result.title = self._extract_title(text)
        result.company = self._extract_company(text)
        result.location = self._extract_location(text)
        result.remote_type = self._extract_remote_type(text)

        salary_info = self._extract_salary(text)
        result.salary_min = salary_info.get("min")
        result.salary_max = salary_info.get("max")
        result.salary_currency = salary_info.get("currency", "USD")
        result.salary_period = salary_info.get("period", "yearly")

        result.experience_level = self._extract_experience_level(text)
        result.experience_years = self._extract_experience_years(text)

        # Extract section content
        result.requirements = self._extract_section_content(
            sections.get("requirements", ""), "requirements"
        )
        result.qualifications = self._extract_section_content(
            sections.get("qualifications", ""), "qualifications"
        )
        result.responsibilities = self._extract_section_content(
            sections.get("responsibilities", ""), "responsibilities"
        )
        result.benefits = self._extract_section_content(
            sections.get("benefits", ""), "benefits"
        )
        result.education_requirements = self._extract_education_requirements(
            sections.get("education", ""), sections.get("requirements", "")
        )

        # Extract skills
        result.skills = self._extract_skills(
            sections.get("skills", ""),
            sections.get("requirements", ""),
            sections.get("qualifications", ""),
            text,  # Also search full text for skills
        )

        # Extract keywords
        result.keywords = self._extract_keywords(text)

        return result

    def _normalize_text(self, text: str) -> str:
        """Normalize text for easier parsing."""
        # Replace various dash types
        text = re.sub(r"[–—]", "-", text)
        # Normalize whitespace but preserve newlines
        # Replace multiple spaces/tabs with single space, but keep newlines
        text = re.sub(r"[^\S\n]+", " ", text)
        return text.strip()

    def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extract sections from job description."""
        sections = {}
        text_lower = text.lower()

        # Find section boundaries - improved pattern to handle various formats
        section_positions = []
        for section_name, headers in self.SECTION_HEADERS.items():
            for header in headers:
                # Look for header followed by colon, newline, or bullet points
                patterns = [
                    rf"(?:^|\n)\s*{re.escape(header)}\s*[:\-]?\s*\n",  # Header with newline
                    rf"(?:^|\n)\s*{re.escape(header)}\s*[:\-]?\s*",  # Header without newline
                ]
                for pattern in patterns:
                    match = re.search(pattern, text_lower)
                    if (
                        match
                        and (match.start(), section_name, header)
                        not in section_positions
                    ):
                        section_positions.append((match.start(), section_name, header))
                        break

        # Sort by position
        section_positions.sort(key=lambda x: x[0])

        # Extract content between sections
        for i, (pos, section_name, header) in enumerate(section_positions):
            # Find the end of this section (start of next section or end of text)
            if i + 1 < len(section_positions):
                end_pos = section_positions[i + 1][0]
            else:
                end_pos = len(text)

            # Find the actual start of content (after the header)
            header_end = pos + len(header) + 10  # Add buffer for header + colon/newline
            content = text[header_end:end_pos].strip()

            if section_name not in sections:
                sections[section_name] = content
            else:
                sections[section_name] += "\n" + content

        return sections

    def _extract_title(self, text: str) -> Optional[str]:
        """Extract job title from the beginning of the JD."""
        lines = text.split("\n")

        # First non-empty line is often the title
        for line in lines[:5]:
            line = line.strip()
            if not line:
                continue

            # Common title patterns
            patterns = [
                r"^(?:we'?re|we are)\s*(?:hiring|looking for)\s*(?:a|an)?\s*(.+)",
                r"^(?:position|title)\s*[:\-]\s*(.+)",
                r"^(?:job\s*title)\s*[:\-]\s*(.+)",
            ]

            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    title = match.group(1).strip()
                    title = re.sub(r"\s*[-|]\s*.*$", "", title)
                    return title

        # Use first substantial line as title (most common case)
        for line in lines[:10]:
            line = line.strip()
            if not line:
                continue
            if len(line) < 3 or len(line) > 100:
                continue
            # Skip lines that look like contact info or locations
            if re.search(
                r"^\d+|\s+(Street|Ave|Road|Blvd|CA|NY|TX|USA)|@|\d{3}[-.]\d{3}", line
            ):
                continue
            # Skip section headers
            if line.lower() in [
                "requirements",
                "responsibilities",
                "qualifications",
                "benefits",
                "skills",
                "location",
                "salary",
            ]:
                continue
            # Skip full sentences
            if line.endswith(".") and len(line) > 40:
                continue
            return line

        return None

    def _extract_company(self, text: str) -> Optional[str]:
        """Extract company name from JD."""
        patterns = [
            r"(?:company|employer)\s*[:\-]\s*([^\n]+)",
            r"^([A-Z][a-zA-Z]+)\s+is\s+(?:looking|hiring)",  # "TechCorp is looking"
            r"join\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:as|in|for)",
            r"at\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:we|our)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location from JD."""
        # Look for explicit location mentions
        patterns = [
            r"(?:location|based|office)\s*[:\-]?\s*([^\n]+)",
            r"(?:located|location)\s+(?:in|at)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z]{2})?)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                # Clean up location
                location = re.sub(
                    r"\s*\([^)]*\)", "", location
                )  # Remove parentheticals
                return location[:100]  # Limit length

        return None

    def _extract_remote_type(self, text: str) -> Optional[str]:
        """Determine remote work type."""
        text_lower = text.lower()

        for remote_type, indicators in self.REMOTE_INDICATORS.items():
            for indicator in indicators:
                if indicator in text_lower:
                    return remote_type

        return None

    def _extract_salary(self, text: str) -> Dict[str, Any]:
        """Extract salary information from JD."""
        result = {"min": None, "max": None, "currency": "USD", "period": "yearly"}

        for pattern in self.SALARY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()

                # Parse min and max
                try:
                    min_val = self._parse_salary_value(groups[0])
                    max_val = self._parse_salary_value(groups[1])
                    result["min"] = min_val
                    result["max"] = max_val
                except (ValueError, IndexError):
                    continue

                # Parse period if present
                if len(groups) > 3 and groups[3]:
                    period = groups[3].lower()
                    if period in ["hour", "hr"]:
                        result["period"] = "hourly"
                    elif period in ["month"]:
                        result["period"] = "monthly"
                    else:
                        result["period"] = "yearly"

                # Check for 'k' suffix (already handled in parsing)
                if len(groups) > 4 and groups[4] and "k" in groups[4].lower():
                    result["min"] = result["min"] * 1000 if result["min"] else None
                    result["max"] = result["max"] * 1000 if result["max"] else None

                break

        return result

    def _parse_salary_value(self, value: str) -> int:
        """Parse a salary value string to integer."""
        if not value:
            return 0

        # Remove commas and 'k' suffix
        value = value.replace(",", "").lower()

        multiplier = 1
        if value.endswith("k"):
            value = value[:-1]
            multiplier = 1000

        return int(float(value) * multiplier)

    def _extract_experience_level(self, text: str) -> Optional[str]:
        """Determine experience level from JD."""
        text_lower = text.lower()

        # Check for explicit level mentions in priority order (highest to lowest)
        # This ensures "Senior" is detected before "Associate" etc.
        priority_order = ["executive", "lead", "senior", "mid", "entry"]

        for level in priority_order:
            indicators = self.EXPERIENCE_LEVELS.get(level, [])
            for indicator in indicators:
                # Use word boundary to avoid false matches
                pattern = rf"\b{re.escape(indicator)}\b"
                if re.search(pattern, text_lower):
                    return level

        return None

    def _extract_experience_years(self, text: str) -> Optional[Tuple[int, int]]:
        """Extract years of experience requirement."""
        for pattern in self.EXPERIENCE_YEARS_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                try:
                    if len(groups) == 2:
                        # Range pattern (e.g., "3-5 years")
                        return (int(groups[0]), int(groups[1]))
                    else:
                        # Single value pattern (e.g., "5+ years")
                        years = int(groups[0])
                        return (years, years + 5)  # Assume 5 year range
                except ValueError:
                    continue

        return None

    def _extract_section_content(
        self, section_text: str, section_type: str
    ) -> List[str]:
        """Extract bullet points or items from a section."""
        if not section_text:
            return []

        items = []

        # Split by common bullet point markers
        patterns = [
            r"^[•\-\*]\s*(.+)$",  # Bullet points
            r"^\d+[\.\)]\s*(.+)$",  # Numbered lists
            r"^(?:[A-Z][a-zA-Z]+)\s*[:\-]\s*(.+)$",  # Key: value pairs
        ]

        lines = section_text.split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue

            for pattern in patterns:
                match = re.match(pattern, line)
                if match:
                    item = match.group(1).strip()
                    if item and len(item) > 5:
                        items.append(item)
                    break
            else:
                # If no pattern matched but line is substantial, include it
                if len(line) > 10 and len(line) < 500:
                    items.append(line)

        return items[:20]  # Limit to 20 items per section

    def _extract_skills(
        self,
        skills_section: str,
        requirements_section: str,
        qualifications_section: str,
        full_text: str = "",
    ) -> List[str]:
        """Extract skills from relevant sections."""
        # Common tech skills to look for
        tech_skills = [
            "python",
            "javascript",
            "typescript",
            "java",
            "go",
            "rust",
            "c++",
            "c#",
            "ruby",
            "php",
            "swift",
            "kotlin",
            "scala",
            "sql",
            "html",
            "css",
            "react",
            "vue",
            "angular",
            "node.js",
            "nodejs",
            "django",
            "flask",
            "fastapi",
            "spring",
            "rails",
            "next.js",
            "express",
            "tensorflow",
            "pytorch",
            "keras",
            "pandas",
            "numpy",
            "scikit-learn",
            "kubernetes",
            "docker",
            "aws",
            "azure",
            "gcp",
            "google cloud",
            "postgres",
            "postgresql",
            "mysql",
            "mongodb",
            "redis",
            "elasticsearch",
            "graphql",
            "rest",
            "api",
            "microservices",
            "devops",
            "ci/cd",
            "git",
            "github",
            "gitlab",
            "jenkins",
            "terraform",
            "ansible",
            "machine learning",
            "ml",
            "ai",
            "llm",
            "nlp",
            "data science",
            "agile",
            "scrum",
            "leadership",
            "communication",
            "teamwork",
        ]

        skills = []
        all_text = f"{skills_section} {requirements_section} {qualifications_section} {full_text}".lower()

        for skill in tech_skills:
            if skill in all_text:
                skills.append(skill)

        # Also extract capitalized words that might be skills
        capitalized = re.findall(
            r"\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\b",
            skills_section + " " + requirements_section + " " + full_text,
        )
        for word in capitalized:
            word_lower = word.lower()
            if (
                word_lower not in skills
                and len(word) > 2
                and word_lower
                not in [
                    "the",
                    "and",
                    "for",
                    "with",
                    "from",
                    "this",
                    "that",
                    "will",
                    "have",
                    "has",
                    "are",
                    "been",
                    "being",
                    "more",
                    "some",
                    "other",
                    "all",
                    "new",
                    "use",
                    "using",
                    "work",
                    "years",
                    "experience",
                    "knowledge",
                    "skills",
                    "ability",
                    "strong",
                    "excellent",
                    "plus",
                    "must",
                    "required",
                    "preferred",
                    "responsibilities",
                    "duties",
                ]
            ):
                skills.append(word_lower)

        return list(dict.fromkeys(skills))[:50]  # Remove duplicates, limit to 50

    def _extract_education_requirements(
        self, education_section: str, requirements_section: str
    ) -> List[str]:
        """Extract education requirements."""
        requirements = []

        # Common education patterns
        patterns = [
            r"(bachelor['']?s?|master['']?s?|phd|doctorate|mba)\s+(?:degree)?\s*(?:in\s+)?([^\n,.]+)",
            r"(?:degree|education)\s*(?:required|preferred)?\s*(?:in)?\s*([^\n,.]+)",
        ]

        all_text = f"{education_section} {requirements_section}"

        for pattern in patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    requirement = (
                        f"{match[0].title()} in {match[1].strip()}"
                        if len(match) > 1
                        else match[0]
                    )
                else:
                    requirement = match
                requirements.append(requirement.strip())

        # Check for explicit education mentions
        education_keywords = [
            "bachelor's degree",
            "master's degree",
            "phd",
            "doctorate",
            "mba",
            "computer science",
            "engineering degree",
            "related field",
        ]

        for keyword in education_keywords:
            if keyword in all_text.lower() and keyword not in [
                r.lower() for r in requirements
            ]:
                requirements.append(keyword.title())

        return list(dict.fromkeys(requirements))[:10]

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from the JD."""
        # Remove common stop words
        stop_words = {
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
            "my",
            "me",
            "us",
            "them",
        }

        # Extract words
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

        # Filter and count
        word_count = {}
        for word in words:
            if word not in stop_words:
                word_count[word] = word_count.get(word, 0) + 1

        # Return top keywords by frequency
        sorted_keywords = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        return [kw for kw, count in sorted_keywords[:30]]


def parse_job_description(job_description: str) -> Dict[str, Any]:
    """
    Convenience function to parse a job description.

    Args:
        job_description: Raw job description text

    Returns:
        Dictionary with parsed job description data
    """
    parser = JobDescriptionParser()
    parsed = parser.parse(job_description)

    # Convert to dictionary
    return {
        "title": parsed.title,
        "company": parsed.company,
        "location": parsed.location,
        "remote_type": parsed.remote_type,
        "salary": {
            "min": parsed.salary_min,
            "max": parsed.salary_max,
            "currency": parsed.salary_currency,
            "period": parsed.salary_period,
        },
        "requirements": parsed.requirements,
        "qualifications": parsed.qualifications,
        "responsibilities": parsed.responsibilities,
        "skills": parsed.skills,
        "experience_level": parsed.experience_level,
        "experience_years": parsed.experience_years,
        "education_requirements": parsed.education_requirements,
        "benefits": parsed.benefits,
        "keywords": parsed.keywords,
    }
