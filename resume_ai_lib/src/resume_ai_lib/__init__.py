"""
Resume AI Library - Shared library for AI-powered resume tailoring.

This package provides a unified interface for AI resume tailoring that can be used
by both ResumeAI and resume-cli.

Features:
- Job description parsing
- Resume tailoring algorithms
- Keyword extraction
- ATS compatibility checking
- Support for multiple AI providers (OpenAI, Anthropic)
"""

__version__ = "1.0.0"
__author__ = "ResumeAI Team"

from .tailor import ResumeTailorer
from .keyword_extractor import KeywordExtractor
from .jd_parser import JobDescriptionParser, parse_job_description, ParsedJobDescription
from .ats_checker import (
    ATSCompatibilityChecker,
    check_ats_compatibility,
    ATSCompatibilityReport,
)

__all__ = [
    "ResumeTailorer",
    "KeywordExtractor",
    "JobDescriptionParser",
    "parse_job_description",
    "ParsedJobDescription",
    "ATSCompatibilityChecker",
    "check_ats_compatibility",
    "ATSCompatibilityReport",
]
