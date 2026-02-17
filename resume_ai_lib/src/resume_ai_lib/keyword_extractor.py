"""
Keyword Extraction Utilities.

This module provides functionality to extract keywords from job descriptions
and match them against resume content.
"""

import re
from typing import Any, Dict, List, Set


class KeywordExtractor:
    """
    Extract and match keywords between job descriptions and resumes.
    """

    # Common tech keywords organized by category
    TECH_KEYWORDS = {
        "languages": [
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
            "haskell",
            "elixir",
            "r",
            "matlab",
            "perl",
            "shell",
            "bash",
        ],
        "frameworks": [
            "react",
            "vue",
            "angular",
            "node.js",
            "django",
            "flask",
            "fastapi",
            "spring",
            "rails",
            "laravel",
            "next.js",
            "nuxt",
            "express",
            "asp.net",
            ".net",
            "gatsby",
            "svelte",
        ],
        "ml_ai": [
            "tensorflow",
            "pytorch",
            "keras",
            "pandas",
            "numpy",
            "scikit",
            "machine learning",
            "deep learning",
            "ai",
            "llm",
            "nlp",
            "computer vision",
            "reinforcement learning",
            "xgboost",
        ],
        "cloud_platforms": [
            "aws",
            "azure",
            "gcp",
            "google cloud",
            "heroku",
            "vercel",
            "netlify",
            "digitalocean",
            "linode",
            "cloudflare",
        ],
        "databases": [
            "postgres",
            "postgresql",
            "mysql",
            "mongodb",
            "redis",
            "sqlite",
            "elasticsearch",
            "dynamodb",
            "cassandra",
            "oracle",
            "sql server",
            "firebase",
            "supabase",
            "prisma",
            "graphql",
        ],
        "devops": [
            "kubernetes",
            "docker",
            "terraform",
            "ansible",
            "jenkins",
            "circleci",
            "github actions",
            "gitlab ci",
            "ci/cd",
            "devops",
            "nginx",
            "apache",
            "load balancer",
            "microservices",
        ],
        "tools": [
            "git",
            "github",
            "gitlab",
            "jira",
            "confluence",
            "slack",
            "datadog",
            "grafana",
            "prometheus",
            "nagios",
            "splunk",
        ],
    }

    def __init__(self):
        """Initialize the keyword extractor."""
        # Flatten all keywords into a single set for quick lookup
        self._all_keywords: Set[str] = set()
        for category, keywords in self.TECH_KEYWORDS.items():
            self._all_keywords.update(keywords)

    def extract_from_text(self, text: str) -> List[str]:
        """
        Extract keywords from text.

        Args:
            text: Input text (job description or resume content)

        Returns:
            List of extracted keywords
        """
        text_lower = text.lower()
        found_keywords = []

        # Check for known keywords
        for keyword in self._all_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)

        # Also extract capitalized words that might be technologies
        capitalized = re.findall(r"\b[A-Z][a-zA-Z]{2,}\b", text)
        for word in capitalized:
            word_lower = word.lower()
            if word_lower not in found_keywords and len(word) > 3:
                # Skip common words
                if word_lower not in [
                    "and",
                    "the",
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
                ]:
                    found_keywords.append(word_lower)

        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for kw in found_keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)

        return unique_keywords[:50]

    def categorize_keywords(self, keywords: List[str]) -> Dict[str, List[str]]:
        """
        Categorize keywords by type.

        Args:
            keywords: List of keywords

        Returns:
            Dictionary mapping categories to keyword lists
        """
        categorized: Dict[str, List[str]] = {
            "languages": [],
            "frameworks": [],
            "ml_ai": [],
            "cloud_platforms": [],
            "databases": [],
            "devops": [],
            "tools": [],
            "other": [],
        }

        for keyword in keywords:
            categorized_found = False
            for category, category_keywords in self.TECH_KEYWORDS.items():
                if keyword in category_keywords:
                    categorized[category].append(keyword)
                    categorized_found = True
                    break

            if not categorized_found:
                categorized["other"].append(keyword)

        # Remove empty categories
        return {k: v for k, v in categorized.items() if v}

    def match_resume_to_job(
        self,
        resume_data: Dict[str, Any],
        job_keywords: List[str],
    ) -> Dict[str, Any]:
        """
        Match resume content against job keywords.

        Args:
            resume_data: Resume data dictionary
            job_keywords: List of keywords from job description

        Returns:
            Dictionary with match results
        """
        # Extract all text from resume
        resume_text = self._extract_resume_text(resume_data)
        resume_text_lower = resume_text.lower()

        matched = []
        missing = []

        for keyword in job_keywords:
            if keyword.lower() in resume_text_lower:
                matched.append(keyword)
            else:
                missing.append(keyword)

        match_rate = len(matched) / len(job_keywords) if job_keywords else 0

        return {
            "matched_keywords": matched,
            "missing_keywords": missing,
            "match_rate": match_rate,
            "score": int((1 - match_rate) * 100),
        }

    def _extract_resume_text(self, resume_data: Dict[str, Any]) -> str:
        """Extract all text content from resume data."""
        text_parts = []

        # Extract from common fields
        for field in ["summary", "professional_summary", "objective"]:
            if field in resume_data and resume_data[field]:
                text_parts.append(str(resume_data[field]))

        # Extract from experience/work
        for field in ["experience", "work"]:
            if field in resume_data and isinstance(resume_data[field], list):
                for exp in resume_data[field]:
                    if isinstance(exp, dict):
                        for key in ["title", "role", "company", "description"]:
                            if key in exp and exp[key]:
                                text_parts.append(str(exp[key]))
                        # Extract from bullets
                        if "bullets" in exp and isinstance(exp["bullets"], list):
                            for bullet in exp["bullets"]:
                                if isinstance(bullet, dict) and "text" in bullet:
                                    text_parts.append(str(bullet["text"]))

        # Extract from skills
        if "skills" in resume_data:
            skills = resume_data["skills"]
            if isinstance(skills, dict):
                for category, skill_list in skills.items():
                    if isinstance(skill_list, list):
                        text_parts.extend([str(s) for s in skill_list])
            elif isinstance(skills, list):
                text_parts.extend([str(s) for s in skills])

        # Extract from education
        for field in ["education", "education_entries"]:
            if field in resume_data and isinstance(resume_data[field], list):
                for edu in resume_data[field]:
                    if isinstance(edu, dict):
                        for key in ["institution", "degree", "field", "area"]:
                            if key in edu and edu[key]:
                                text_parts.append(str(edu[key]))

        # Extract from projects
        if "projects" in resume_data and isinstance(resume_data["projects"], list):
            for proj in resume_data["projects"]:
                if isinstance(proj, dict):
                    for key in ["name", "description"]:
                        if key in proj and proj[key]:
                            text_parts.append(str(proj[key]))

        return " ".join(text_parts)


def extract_keywords(text: str) -> List[str]:
    """
    Convenience function to extract keywords from text.

    Args:
        text: Input text

    Returns:
        List of extracted keywords
    """
    extractor = KeywordExtractor()
    return extractor.extract_from_text(text)


def match_resume_to_job(
    resume_data: Dict[str, Any],
    job_keywords: List[str],
) -> Dict[str, Any]:
    """
    Convenience function to match resume to job keywords.

    Args:
        resume_data: Resume data dictionary
        job_keywords: Keywords from job description

    Returns:
        Match results dictionary
    """
    extractor = KeywordExtractor()
    return extractor.match_resume_to_job(resume_data, job_keywords)
