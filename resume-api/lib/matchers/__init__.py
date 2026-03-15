"""Job matching module for resume-JD compatibility analysis."""

from .skill_ontology import SKILL_ONTOLOGY, ALL_SKILLS, get_canonical_skill, get_synonyms
from .job_matcher import JobMatcher, get_matcher, MatchResult
from .ats_analyzer import ATSAnalyzer, get_analyzer, ATSAnalysisResult, ATSIssue

__all__ = [
    "SKILL_ONTOLOGY",
    "ALL_SKILLS",
    "get_canonical_skill",
    "get_synonyms",
    "JobMatcher",
    "get_matcher",
    "MatchResult",
    "ATSAnalyzer",
    "get_analyzer",
    "ATSAnalysisResult",
    "ATSIssue",
]
