"""
Skills Categorizer Service

Categorizes skills into technical, soft, tools, and domain categories.
"""

import logging
from typing import Any

from .models import ExtractedSkill
from .ontology import SkillsOntology, get_ontology

logger = logging.getLogger(__name__)


class SkillsCategorizer:
    """
    Categorize skills into predefined categories.

    Categories:
    - technical: Programming languages, frameworks, libraries
    - tools: Cloud platforms, DevOps tools, databases, IDEs
    - soft: Communication, leadership, problem-solving
    - domain: Industry-specific knowledge

    Example:
        categorizer = SkillsCategorizer()
        categories = categorizer.categorize(["Python", "AWS", "Communication"])
    """

    def __init__(self, ontology: SkillsOntology | None = None):
        """
        Initialize SkillsCategorizer.

        Args:
            ontology: Skills ontology (uses singleton if not provided)
        """
        self.ontology = ontology or get_ontology()

    def categorize(
        self, skills: list[str]
    ) -> dict[str, list[str]]:
        """
        Categorize a list of skills.

        Args:
            skills: List of skill names

        Returns:
            Dict mapping category to list of skills
        """
        result: dict[str, list[str]] = {
            "technical": [],
            "tools": [],
            "soft": [],
            "domain": [],
            "unknown": [],
        }

        for skill in skills:
            category = self.get_category(skill)
            if category:
                result[category].append(skill)
            else:
                result["unknown"].append(skill)

        # Remove empty categories
        return {k: v for k, v in result.items() if v}

    def get_category(self, skill: str) -> str | None:
        """
        Get category for a single skill.

        Args:
            skill: Skill name

        Returns:
            Category or None if unknown
        """
        # Try direct lookup
        category = self.ontology.get_category(skill)
        if category:
            return category

        # Try synonym lookup
        skill_data = self.ontology.lookup(skill)
        if skill_data:
            return skill_data.get("category")

        # Heuristic categorization
        return self._heuristic_category(skill)

    def _heuristic_category(self, skill: str) -> str | None:
        """Categorize skill using heuristics."""
        skill_lower = skill.lower()

        # Technical indicators
        technical_keywords = [
            "programming",
            "development",
            "framework",
            "library",
            "api",
            "sdk",
        ]
        if any(kw in skill_lower for kw in technical_keywords):
            return "technical"

        # Tools indicators
        tools_keywords = [
            "cloud",
            "platform",
            "database",
            "ide",
            "editor",
            "ci/cd",
            "docker",
            "kubernetes",
        ]
        if any(kw in skill_lower for kw in tools_keywords):
            return "tools"

        # Soft skills indicators
        soft_keywords = [
            "communication",
            "leadership",
            "management",
            "team",
            "collaboration",
            "problem solving",
        ]
        if any(kw in skill_lower for kw in soft_keywords):
            return "soft"

        return None

    def get_subcategory(self, skill: str) -> str | None:
        """
        Get subcategory for a skill.

        Args:
            skill: Skill name

        Returns:
            Subcategory or None
        """
        skill_data = self.ontology.get_skill(skill)
        if skill_data:
            return skill_data.get("subcategory")
        return None

    def categorize_with_confidence(
        self, skills: list[str]
    ) -> list[dict[str, Any]]:
        """
        Categorize skills with confidence scores.

        Args:
            skills: List of skill names

        Returns:
            List of dicts with skill, category, and confidence
        """
        result = []

        for skill in skills:
            skill_data = self.ontology.get_skill(skill)

            if skill_data:
                # High confidence for ontology matches
                confidence = 1.0
                category = skill_data["category"]
            else:
                # Lower confidence for heuristic categorization
                confidence = 0.6
                category = self._heuristic_category(skill) or "unknown"

            result.append(
                {
                    "skill": skill,
                    "category": category,
                    "subcategory": self.get_subcategory(skill),
                    "confidence": confidence,
                }
            )

        return result

    def get_category_statistics(
        self, skills: list[str]
    ) -> dict[str, Any]:
        """
        Get statistics about skill categories.

        Args:
            skills: List of skill names

        Returns:
            Statistics dict
        """
        categorized = self.categorize(skills)

        total = len(skills)
        stats = {
            "total": total,
            "by_category": {},
        }

        for category, category_skills in categorized.items():
            stats["by_category"][category] = {
                "count": len(category_skills),
                "percentage": (len(category_skills) / total * 100)
                if total > 0
                else 0,
                "skills": category_skills,
            }

        return stats
