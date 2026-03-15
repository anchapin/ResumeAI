"""
Skills Matcher Service

Matches extracted skills against resume skills.
"""

import logging
from typing import Any

from .models import (
    ExtractedSkill,
    MissingSkill,
    PartialMatch,
    SkillMatch,
    SkillsMatchResult,
)
from .ontology import SkillsOntology, get_ontology

logger = logging.getLogger(__name__)


class SkillsMatcher:
    """
    Match skills between job description and resume.

    Uses multiple matching strategies:
    1. Exact matching (string comparison)
    2. Semantic matching (similarity)
    3. Synonym matching (ontology-based)

    Example:
        matcher = SkillsMatcher()
        result = matcher.match(jd_skills, resume_skills)
    """

    def __init__(self, ontology: SkillsOntology | None = None):
        """
        Initialize SkillsMatcher.

        Args:
            ontology: Skills ontology (uses singleton if not provided)
        """
        self.ontology = ontology or get_ontology()

    def match(
        self,
        jd_skills: list[ExtractedSkill],
        resume_skills: list[str],
        resume_text: str = "",
    ) -> SkillsMatchResult:
        """
        Match JD skills against resume skills.

        Args:
            jd_skills: Skills extracted from JD
            resume_skills: List of skills from resume
            resume_text: Full resume text for context

        Returns:
            SkillsMatchResult with matches and gaps
        """
        matched_skills: list[SkillMatch] = []
        missing_skills: list[MissingSkill] = []
        partial_matches: list[PartialMatch] = []

        # Normalize resume skills
        resume_skills_lower = {s.lower(): s for s in resume_skills}

        for jd_skill in jd_skills:
            match_result = self._match_skill(jd_skill, resume_skills_lower)

            if match_result["type"] == "exact":
                matched_skills.append(
                    SkillMatch(
                        skill=jd_skill.name,
                        category=jd_skill.category,
                        match_type="exact",
                        confidence=match_result["confidence"],
                        jd_context=jd_skill.original_text,
                        resume_context=match_result.get("resume_context", ""),
                    )
                )
            elif match_result["type"] == "semantic":
                matched_skills.append(
                    SkillMatch(
                        skill=jd_skill.name,
                        category=jd_skill.category,
                        match_type="semantic",
                        confidence=match_result["confidence"],
                        jd_context=jd_skill.original_text,
                        resume_context=match_result.get("resume_context", ""),
                    )
                )
            elif match_result["type"] == "synonym":
                matched_skills.append(
                    SkillMatch(
                        skill=jd_skill.name,
                        category=jd_skill.category,
                        match_type="synonym",
                        confidence=match_result["confidence"],
                        jd_context=jd_skill.original_text,
                        resume_context=match_result.get("resume_context", ""),
                    )
                )
            elif match_result["type"] == "partial":
                partial_matches.append(
                    PartialMatch(
                        jd_skill=jd_skill.name,
                        resume_skill=match_result["matched_skill"],
                        similarity=match_result["confidence"],
                        relationship=match_result.get("relationship", "related"),
                    )
                )
            elif match_result["type"] == "missing":
                missing_skills.append(
                    MissingSkill(
                        name=jd_skill.name,
                        category=jd_skill.category,
                        priority=self._determine_priority(
                            jd_skill.name, jd_skill.category
                        ),
                        frequency=1,  # Would count occurrences in JD
                        suggestions=self._get_add_suggestions(
                            jd_skill.name, jd_skill.category
                        ),
                    )
                )

        # Calculate coverage score
        coverage_score = self._calculate_coverage(
            len(matched_skills), len(jd_skills)
        )

        return SkillsMatchResult(
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            partial_matches=partial_matches,
            coverage_score=coverage_score,
            jd_skills_count=len(jd_skills),
            resume_skills_count=len(resume_skills),
        )

    def _match_skill(
        self, jd_skill: ExtractedSkill, resume_skills: dict[str, str]
    ) -> dict[str, Any]:
        """Match a single skill."""
        skill_name = jd_skill.name.lower()

        # 1. Exact match
        if skill_name in resume_skills:
            return {
                "type": "exact",
                "confidence": 1.0,
                "matched_skill": resume_skills[skill_name],
                "resume_context": resume_skills[skill_name],
            }

        # 2. Synonym match
        synonyms = self.ontology.get_synonyms(jd_skill.name)
        for synonym in synonyms:
            if synonym.lower() in resume_skills:
                return {
                    "type": "synonym",
                    "confidence": 0.9,
                    "matched_skill": resume_skills[synonym.lower()],
                    "resume_context": resume_skills[synonym.lower()],
                }

        # 3. Partial match (substring)
        for resume_skill_lower, resume_skill in resume_skills.items():
            if skill_name in resume_skill_lower or resume_skill_lower in skill_name:
                return {
                    "type": "partial",
                    "confidence": 0.7,
                    "matched_skill": resume_skill,
                    "relationship": "subset"
                    if len(skill_name) < len(resume_skill_lower)
                    else "superset",
                }

        # 4. Related skills (would use semantic similarity in production)
        related = self.ontology.get_related_skills(jd_skill.name)
        for related_skill in related:
            if related_skill.lower() in resume_skills:
                return {
                    "type": "semantic",
                    "confidence": 0.6,
                    "matched_skill": resume_skills[related_skill.lower()],
                    "resume_context": resume_skills[related_skill.lower()],
                }

        # 5. Missing
        return {"type": "missing", "confidence": 0.0}

    def _determine_priority(
        self, skill_name: str, category: str
    ) -> str:
        """Determine priority for a missing skill."""
        # Technical skills are typically higher priority
        if category == "technical":
            return "critical"
        elif category == "domain":
            return "preferred"
        elif category == "tools":
            return "preferred"
        else:
            return "nice_to_have"

    def _get_add_suggestions(
        self, skill_name: str, category: str
    ) -> list[str]:
        """Get suggestions for where to add a missing skill."""
        suggestions = []

        if category == "technical":
            suggestions.append("Add to Skills section under Technical Skills")
            suggestions.append("Mention in project descriptions")
        elif category == "tools":
            suggestions.append("Add to Skills section under Tools")
            suggestions.append("Include in work experience")
        elif category == "soft":
            suggestions.append("Include in summary or objective")
            suggestions.append("Demonstrate in bullet points")
        elif category == "domain":
            suggestions.append("Highlight in relevant experience")
            suggestions.append("Add to projects section")

        return suggestions

    def _calculate_coverage(
        self, matched_count: int, total_count: int
    ) -> float:
        """Calculate coverage score (0-100)."""
        if total_count == 0:
            return 100.0

        # Weight by match type would be applied here
        # For now, simple ratio
        return (matched_count / total_count) * 100

    def find_missing(
        self,
        jd_skills: list[ExtractedSkill],
        resume_skills: list[str],
    ) -> list[MissingSkill]:
        """
        Find skills in JD but not in resume.

        Args:
            jd_skills: Skills from JD
            resume_skills: Skills from resume

        Returns:
            List of missing skills
        """
        result = self.match(jd_skills, resume_skills)
        return result.missing_skills

    def get_match_summary(
        self,
        jd_skills: list[ExtractedSkill],
        resume_skills: list[str],
    ) -> dict[str, Any]:
        """
        Get a summary of skill matching.

        Args:
            jd_skills: Skills from JD
            resume_skills: Skills from resume

        Returns:
            Summary dict
        """
        result = self.match(jd_skills, resume_skills)

        # Group by category
        by_category: dict[str, dict] = {}
        for match in result.matched_skills:
            if match.category not in by_category:
                by_category[match.category] = {
                    "matched": 0,
                    "missing": 0,
                    "coverage": 0.0,
                }

        for match in result.matched_skills:
            by_category[match.category]["matched"] += 1

        for missing in result.missing_skills:
            if missing.category not in by_category:
                by_category[missing.category] = {
                    "matched": 0,
                    "missing": 0,
                    "coverage": 0.0,
                }
            by_category[missing.category]["missing"] += 1

        # Calculate coverage per category
        for category, counts in by_category.items():
            total = counts["matched"] + counts["missing"]
            if total > 0:
                counts["coverage"] = (counts["matched"] / total) * 100

        return {
            "coverage_score": result.coverage_score,
            "matched_count": len(result.matched_skills),
            "missing_count": len(result.missing_skills),
            "by_category": by_category,
        }
