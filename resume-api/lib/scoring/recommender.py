"""
Recommendation Engine

Generates actionable recommendations based on resume scores.
"""

import logging
import uuid
from typing import Any

from .models import Recommendation, ResumeScore

logger = logging.getLogger(__name__)


# Recommendation templates by category
RECOMMENDATION_TEMPLATES = {
    "content_quality": [
        {
            "priority": "high",
            "title": "Start bullets with action verbs",
            "description": "Use strong action verbs to begin each bullet point",
            "action": "Replace passive language with verbs like 'Led', 'Developed', 'Implemented'",
            "impact": "+5-10 points to content quality score",
            "effort": "medium",
        },
        {
            "priority": "high",
            "title": "Add quantifiable metrics",
            "description": "Include numbers, percentages, or dollar amounts to show impact",
            "action": "Add metrics to at least 50% of bullet points",
            "impact": "+10-15 points to content quality score",
            "effort": "medium",
        },
        {
            "priority": "medium",
            "title": "Improve bullet point length",
            "description": "Ensure bullet points are concise but informative",
            "action": "Keep bullets between 1-2 lines, 10-25 words each",
            "impact": "+3-5 points to content quality score",
            "effort": "low",
        },
    ],
    "skills_coverage": [
        {
            "priority": "high",
            "title": "Add missing key skills",
            "description": "Include skills mentioned in the job description",
            "action": "Review JD and add relevant skills to your skills section",
            "impact": "+10-20 points to skills coverage score",
            "effort": "low",
        },
        {
            "priority": "medium",
            "title": "Diversify skill categories",
            "description": "Include skills across multiple categories",
            "action": "Add technical, tools, and soft skills",
            "impact": "+5-10 points to skills coverage score",
            "effort": "medium",
        },
        {
            "priority": "low",
            "title": "Add skill proficiency levels",
            "description": "Indicate proficiency level for key skills",
            "action": "Add (Expert), (Advanced), or (Intermediate) to skills",
            "impact": "+2-5 points to skills coverage score",
            "effort": "low",
        },
    ],
    "experience_relevance": [
        {
            "priority": "high",
            "title": "Highlight relevant achievements",
            "description": "Emphasize achievements most relevant to target role",
            "action": "Move most relevant achievements to top of each position",
            "impact": "+10-15 points to experience score",
            "effort": "medium",
        },
        {
            "priority": "medium",
            "title": "Show career progression",
            "description": "Clearly demonstrate increasing responsibilities",
            "action": "Highlight promotions and expanded scope",
            "impact": "+5-10 points to experience score",
            "effort": "low",
        },
        {
            "priority": "medium",
            "title": "Add more experience details",
            "description": "Provide more context about your roles",
            "action": "Add 3-5 bullet points per position",
            "impact": "+5-8 points to experience score",
            "effort": "medium",
        },
    ],
    "formatting": [
        {
            "priority": "high",
            "title": "Add professional summary",
            "description": "Include a 2-3 sentence summary at the top",
            "action": "Write a concise summary highlighting key qualifications",
            "impact": "+10-15 points to formatting score",
            "effort": "medium",
        },
        {
            "priority": "medium",
            "title": "Optimize resume length",
            "description": "Keep resume to 1-2 pages",
            "action": "Remove outdated or irrelevant content",
            "impact": "+5-10 points to formatting score",
            "effort": "medium",
        },
        {
            "priority": "low",
            "title": "Improve section organization",
            "description": "Ensure clear section headings and spacing",
            "action": "Use consistent formatting for all sections",
            "impact": "+3-5 points to formatting score",
            "effort": "low",
        },
    ],
}


class RecommendationEngine:
    """
    Generate actionable recommendations.

    Creates personalized recommendations based on resume scores.

    Example:
        engine = RecommendationEngine()
        recommendations = engine.generate_recommendations(score, role="Engineer")
    """

    def __init__(self, custom_templates: dict | None = None):
        """
        Initialize RecommendationEngine.

        Args:
            custom_templates: Optional custom recommendation templates
        """
        self.templates = custom_templates or RECOMMENDATION_TEMPLATES

    def generate_recommendations(
        self,
        resume_score: ResumeScore,
        role: str | None = None,
        min_priority: str = "low",
        limit: int = 10,
    ) -> list[Recommendation]:
        """
        Generate recommendations based on score.

        Args:
            resume_score: Resume score object
            role: Target role for customization
            min_priority: Minimum priority to include
            limit: Maximum recommendations to return

        Returns:
            List of Recommendation objects
        """
        recommendations = []

        # Generate recommendations for each weak category
        for category_name, category_score in resume_score.categories.items():
            if category_score.score < 80:  # Only for scores below 80
                category_recs = self._get_category_recommendations(
                    category_name, category_score, role
                )
                recommendations.extend(category_recs)

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: priority_order.get(r.priority, 3))

        # Filter by minimum priority
        min_priority_order = priority_order.get(min_priority, 3)
        recommendations = [
            r for r in recommendations
            if priority_order.get(r.priority, 3) <= min_priority_order
        ]

        return recommendations[:limit]

    def _get_category_recommendations(
        self,
        category_name: str,
        category_score: Any,
        role: str | None = None,
    ) -> list[Recommendation]:
        """Get recommendations for a category."""
        templates = self.templates.get(category_name, [])
        recommendations = []

        for template in templates:
            # Customize based on role if provided
            title = self._customize_for_role(template["title"], role)
            description = self._customize_for_role(template["description"], role)
            action = self._customize_for_role(template["action"], role)

            rec = Recommendation(
                id=f"rec_{uuid.uuid4().hex[:8]}",
                category=category_name,
                priority=template["priority"],  # type: ignore
                title=title,
                description=description,
                action=action,
                impact=template["impact"],
                effort=template["effort"],  # type: ignore
                metadata={
                    "current_score": category_score.score,
                    "metrics": category_score.metrics,
                },
            )
            recommendations.append(rec)

        return recommendations

    def _customize_for_role(self, text: str, role: str | None) -> str:
        """Customize recommendation text for role."""
        if not role:
            return text

        # Simple customization - would be more sophisticated in production
        if "Engineer" in role:
            text = text.replace("skills", "technical skills")
        elif "Manager" in role:
            text = text.replace("skills", "leadership and management skills")

        return text

    def get_personalized_recommendations(
        self,
        resume_score: ResumeScore,
        user_history: dict | None = None,
    ) -> list[Recommendation]:
        """
        Get personalized recommendations based on user history.

        Args:
            resume_score: Resume score object
            user_history: User's previous actions and preferences

        Returns:
            Personalized recommendations
        """
        recommendations = self.generate_recommendations(resume_score)

        if not user_history:
            return recommendations

        # Boost recommendations based on user history
        accepted_categories = user_history.get("accepted_categories", [])
        for rec in recommendations:
            if rec.category in accepted_categories:
                # Boost priority
                if rec.priority == "medium":
                    rec.priority = "high"  # type: ignore

        return recommendations

    def get_quick_wins(
        self,
        resume_score: ResumeScore,
        limit: int = 3,
    ) -> list[Recommendation]:
        """
        Get quick win recommendations (low effort, high impact).

        Args:
            resume_score: Resume score object
            limit: Maximum recommendations

        Returns:
            Quick win recommendations
        """
        all_recs = self.generate_recommendations(resume_score)

        # Filter for low effort, high impact
        quick_wins = [
            r for r in all_recs
            if r.effort == "low" and "high" in r.impact.lower()
        ]

        # If not enough quick wins, add medium effort
        if len(quick_wins) < limit:
            medium = [
                r for r in all_recs
                if r.effort == "medium" and r.priority == "high"
            ]
            quick_wins.extend(medium)

        return quick_wins[:limit]
