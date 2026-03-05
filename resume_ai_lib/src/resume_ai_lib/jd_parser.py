"""
Job Description Parsing Module.

This module provides functionality to parse and analyze job descriptions,
extracting requirements, qualifications, responsibilities, skills, salary
ranges, and location information.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from collections import Counter
from dataclasses import dataclass, field


@dataclass
class ParsedJobDescription:
    """Structured representation of a parsed job description."""

    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    salary_period: str = "yearly"
    requirements: List[str] = field(default_factory=list)
    qualifications: List[str] = field(default_factory=list)
    responsibilities: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    experience_level: Optional[str] = None
    experience_years: Optional[Tuple[int, int]] = None
    education_requirements: List[str] = field(default_factory=list)
    benefits: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)


class JobDescriptionParser:
    """
    Parse and analyze job descriptions.
    """

    CAPITALIZED_PATTERN = re.compile(r"\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\b")
    WORD_PATTERN = re.compile(r"\b[a-z]{3,}\b")

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

    EXPERIENCE_LEVELS = {
        "entry": ["entry", "junior", "associate", "graduate", "trainee", "0-2 years"],
        "mid": ["mid", "middle", "intermediate", "2-5 years", "3+ years"],
        "senior": ["senior", "sr", "lead", "5-8 years", "5+ years", "experienced"],
        "lead": ["lead", "principal", "staff", "8-12 years", "8+ years"],
        "executive": ["executive", "director", "vp", "head of", "chief", "cto", "ceo"],
    }

    REMOTE_INDICATORS = {
        "remote": ["remote", "work from home", "wfh", "distributed", "virtual"],
        "hybrid": ["hybrid", "flexible", "partially remote", "2-3 days"],
        "onsite": ["onsite", "on-site", "in office", "in-person"],
    }

    SALARY_PATTERNS = [
        r"\$?(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per|a)?\s*(year|yr|annum|hour|hr|month)?",
        r"\$?(\d{2,3}(?:,\d{3})?)k?\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)k?\s*(per|a)?\s*(year|yr|annum|hour|hr|month)?",
        r"salary\s*(?:range)?\s*[:\$]?\s*\$?(\d{2,3}(?:,\d{3})?)\s*[-–to]+\s*\$?(\d{2,3}(?:,\d{3})?)",
    ]

    TECH_SKILLS = [
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
    ]

    STOP_WORDS = frozenset(
        {
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
    )

    SKILL_IGNORE_WORDS = frozenset(
        {
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
        }
    )

    # Pre-compile section headers pattern for O(N) extraction
    _HEADER_TO_SECTION = {}
    _ALL_HEADERS = []
    for _section_name, _headers in SECTION_HEADERS.items():
        for _header in _headers:
            _HEADER_TO_SECTION[_header] = _section_name
            _ALL_HEADERS.append(re.escape(_header))

    # Sort headers by length descending so longer headers match first (e.g. "nice to have" before "have")
    _ALL_HEADERS.sort(key=len, reverse=True)

    # Combine all headers into one regex: (?:^|\n)\s*(header1|header2)\s*[:\-]?\s*(?:\n|)
    COMBINED_SECTION_PATTERN = re.compile(
        rf"(?:^|\n)\s*({'|'.join(_ALL_HEADERS)})\s*[:\-]?\s*(?:\n|)", re.IGNORECASE
    )

    def parse(self, job_description: str) -> ParsedJobDescription:
        """Parse a job description into structured data."""
        result = ParsedJobDescription()
        text = self._normalize_text(job_description)
        sections = self._extract_sections(text)

        result.title = self._extract_title(text)
        result.company = self._extract_company(text)
        result.location = self._extract_location(text)
        result.remote_type = self._extract_remote_type(text)

        salary_info = self._extract_salary(text)
        result.salary_min = salary_info.get("min")
        result.salary_max = salary_info.get("max")

        result.experience_level = self._extract_experience_level(text)
        result.experience_years = self._extract_experience_years(text)

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
        result.skills = self._extract_skills(
            sections.get("skills", ""),
            sections.get("requirements", ""),
            sections.get("qualifications", ""),
        )
        result.keywords = self._extract_keywords(text)

        return result

    def _normalize_text(self, text: str) -> str:
        text = re.sub(r"[–—]", "-", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _extract_sections(self, text: str) -> Dict[str, str]:
        sections = {}
        text_lower = text.lower()

        # Find section boundaries using pre-compiled O(N) regex
        section_positions = []
        found_headers = set()

        for match in self.COMBINED_SECTION_PATTERN.finditer(text_lower):
            header = match.group(1).lower()
            section_name = self._HEADER_TO_SECTION.get(header)

            if section_name and header not in found_headers:
                section_positions.append((match.start(), section_name, header))
                found_headers.add(header)

        section_positions.sort(key=lambda x: x[0])

        for i, (pos, section_name, header) in enumerate(section_positions):
            if i + 1 < len(section_positions):
                end_pos = section_positions[i + 1][0]
            else:
                end_pos = len(text)

            header_end = pos + len(header) + 10
            content = text[header_end:end_pos].strip()

            if section_name not in sections:
                sections[section_name] = content
            else:
                sections[section_name] += "\n" + content

        return sections

    def _extract_title(self, text: str) -> Optional[str]:
        lines = text.split("\n")
        for line in lines[:5]:
            line = line.strip()
            if not line:
                continue

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

        for line in lines[:10]:
            line = line.strip()
            if line and len(line) > 5 and len(line) < 100:
                if not re.search(r"^\d+|\s+(Street|Ave|Road|Blvd|CA|NY|TX|USA)$", line):
                    return line

        return None

    def _extract_company(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:company|employer)\s*[:\-]\s*([^\n]+)",
            r"join\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:as|in|for)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_location(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:location|based|office)\s*[:\-]?\s*([^\n]+)",
            r"(?:located|location)\s+(?:in|at)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z]{2})?)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                location = re.sub(r"\s*\([^)]*\)", "", location)
                return location[:100]

        return None

    def _extract_remote_type(self, text: str) -> Optional[str]:
        text_lower = text.lower()
        for remote_type, indicators in self.REMOTE_INDICATORS.items():
            for indicator in indicators:
                if indicator in text_lower:
                    return remote_type
        return None

    def _extract_salary(self, text: str) -> Dict[str, Any]:
        result = {"min": None, "max": None}

        for pattern in self.SALARY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                try:
                    min_val = self._parse_salary_value(groups[0])
                    max_val = self._parse_salary_value(groups[1])
                    result["min"] = min_val
                    result["max"] = max_val
                except (ValueError, IndexError):
                    continue
                break

        return result

    def _parse_salary_value(self, value: str) -> int:
        if not value:
            return 0
        value = value.replace(",", "").lower()
        multiplier = 1
        if value.endswith("k"):
            value = value[:-1]
            multiplier = 1000
        return int(float(value) * multiplier)

    def _extract_experience_level(self, text: str) -> Optional[str]:
        text_lower = text.lower()
        for level, indicators in self.EXPERIENCE_LEVELS.items():
            for indicator in indicators:
                if indicator in text_lower:
                    return level
        return None

    def _extract_experience_years(self, text: str) -> Optional[Tuple[int, int]]:
        patterns = [
            r"(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*years?",
            r"(\d{1,2})\s*\+\s*years?",
            r"minimum\s*(\d{1,2})\s*years?",
            r"(\d{1,2})\s*years?\s*of\s*experience",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                groups = match.groups()
                try:
                    if len(groups) == 2:
                        return (int(groups[0]), int(groups[1]))
                    else:
                        years = int(groups[0])
                        return (years, years + 5)
                except ValueError:
                    continue
        return None

    def _extract_section_content(
        self, section_text: str, section_type: str
    ) -> List[str]:
        if not section_text:
            return []

        items = []
        patterns = [
            r"^[•\-\*]\s*(.+)$",
            r"^\d+[\.\)]\s*(.+)$",
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
                if len(line) > 10 and len(line) < 500:
                    items.append(line)

        return items[:20]

    def _extract_skills(
        self,
        skills_section: str,
        requirements_section: str,
        qualifications_section: str,
    ) -> List[str]:
        all_text_lower = (
            f"{skills_section} {requirements_section} {qualifications_section}".lower()
        )

        skills_dict = {}
        for skill in self.TECH_SKILLS:
            if skill in all_text_lower:
                skills_dict[skill] = None

        if len(skills_dict) >= 50:
            return list(skills_dict.keys())[:50]

        section_text = f"{skills_section} {requirements_section}"

        for word in self.CAPITALIZED_PATTERN.findall(section_text):
            if len(word) > 2:
                word_lower = word.lower()
                if (
                    word_lower not in skills_dict
                    and word_lower not in self.SKILL_IGNORE_WORDS
                ):
                    skills_dict[word_lower] = None
                    if len(skills_dict) >= 50:
                        break

        return list(skills_dict.keys())[:50]

    def _extract_education_requirements(
        self, education_section: str, requirements_section: str
    ) -> List[str]:
        requirements = []
        all_text = f"{education_section} {requirements_section}"

        patterns = [
            r"(bachelor['']?s?|master['']?s?|phd|doctorate|mba)\s+(?:degree)?\s*(?:in\s+)?([^\n,.]+)",
        ]

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
        words = self.WORD_PATTERN.findall(text.lower())
        word_count = Counter(word for word in words if word not in self.STOP_WORDS)
        return [kw for kw, _ in word_count.most_common(30)]


def parse_job_description(job_description: str) -> Dict[str, Any]:
    """Convenience function to parse a job description."""
    parser = JobDescriptionParser()
    parsed = parser.parse(job_description)

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
