"""
Category-specific Scorers

Scorers for individual resume categories.
"""

import logging
from typing import Any

from .models import CategoryScore

logger = logging.getLogger(__name__)


class ContentQualityScorer:
    """
    Score resume content quality.

    Measures:
    - Writing style and clarity
    - Grammar and spelling
    - Action verb usage
    - Quantification
    """

    def __init__(self, writing_assistant=None):
        """
        Initialize ContentQualityScorer.

        Args:
            writing_assistant: Optional writing assistant for analysis
        """
        self.writing_assistant = writing_assistant

    async def score(self, resume_data: dict) -> CategoryScore:
        """
        Score content quality.

        Args:
            resume_data: Resume data dict

        Returns:
            CategoryScore for content quality
        """
        metrics = self._analyze_content(resume_data)

        # Calculate score from metrics
        score = self._calculate_score(metrics)

        # Generate feedback
        feedback = self._generate_feedback(metrics, score)

        return CategoryScore(
            name="content_quality",
            score=score,
            weight=0.35,
            metrics=metrics,
            feedback=feedback,
        )

    def _analyze_content(self, resume_data: dict) -> dict[str, Any]:
        """Analyze resume content."""
        # Extract text from resume
        text = self._extract_text(resume_data)

        # Count metrics
        bullet_count = self._count_bullets(resume_data)
        action_verb_count = self._count_action_verbs(text)
        quantification_count = self._count_quantification(text)
        avg_bullet_length = self._avg_bullet_length(resume_data)

        return {
            "bullet_count": bullet_count,
            "action_verb_count": action_verb_count,
            "action_verb_ratio": action_verb_count / max(bullet_count, 1),
            "quantification_count": quantification_count,
            "quantification_ratio": quantification_count / max(bullet_count, 1),
            "avg_bullet_length": avg_bullet_length,
            "total_words": len(text.split()),
        }

    def _calculate_score(self, metrics: dict) -> float:
        """Calculate score from metrics."""
        score = 0.0

        # Action verb ratio (40%)
        verb_ratio = metrics.get("action_verb_ratio", 0)
        score += min(verb_ratio * 100, 100) * 0.4

        # Quantification ratio (40%)
        quant_ratio = metrics.get("quantification_ratio", 0)
        score += min(quant_ratio * 100, 100) * 0.4

        # Bullet count (20%)
        bullet_count = metrics.get("bullet_count", 0)
        if bullet_count >= 15:
            score += 100 * 0.2
        elif bullet_count >= 10:
            score += 80 * 0.2
        elif bullet_count >= 5:
            score += 60 * 0.2
        else:
            score += 40 * 0.2

        return min(100, max(0, score))

    def _generate_feedback(self, metrics: dict, score: float) -> str:
        """Generate feedback based on metrics."""
        feedback = []

        if metrics.get("action_verb_ratio", 0) < 0.8:
            feedback.append("Use more action verbs to start bullet points")

        if metrics.get("quantification_ratio", 0) < 0.5:
            feedback.append("Add more quantifiable metrics to demonstrate impact")

        if metrics.get("bullet_count", 0) < 5:
            feedback.append("Add more bullet points to describe experience")

        if not feedback:
            feedback.append("Content quality is excellent")

        return "; ".join(feedback)

    def _extract_text(self, resume_data: dict) -> str:
        """Extract text from resume data."""
        # Would extract all text from resume structure
        return str(resume_data)

    def _count_bullets(self, resume_data: dict) -> int:
        """Count bullet points in resume."""
        # Would count actual bullet points
        return len(resume_data.get("experience", [])) * 3  # Estimate

    def _count_action_verbs(self, text: str) -> int:
        """Count action verbs in text."""
        action_verbs = {
            "led", "managed", "developed", "created", "implemented",
            "designed", "built", "optimized", "improved", "increased",
            "reduced", "achieved", "delivered", "launched", "spearheaded",
        }
        text_lower = text.lower()
        return sum(1 for verb in action_verbs if verb in text_lower)

    def _count_quantification(self, text: str) -> int:
        """Count quantified statements."""
        import re
        # Look for numbers, percentages, dollar amounts
        numbers = len(re.findall(r'\d+%', text))
        dollars = len(re.findall(r'\$[\d,]+', text))
        return numbers + dollars

    def _avg_bullet_length(self, resume_data: dict) -> float:
        """Calculate average bullet point length."""
        # Would calculate from actual bullets
        return 15.0  # Estimate


class SkillsCoverageScorer:
    """
    Score skills coverage.

    Measures:
    - Skills density
    - Skills relevance
    - Skills diversity
    """

    def __init__(self, skills_ontology=None):
        """
        Initialize SkillsCoverageScorer.

        Args:
            skills_ontology: Skills ontology for matching
        """
        self.skills_ontology = skills_ontology

    async def score(self, resume_data: dict, jd_skills: list | None = None) -> CategoryScore:
        """
        Score skills coverage.

        Args:
            resume_data: Resume data dict
            jd_skills: Skills from job description

        Returns:
            CategoryScore for skills coverage
        """
        metrics = self._analyze_skills(resume_data, jd_skills)
        score = self._calculate_score(metrics, jd_skills)
        feedback = self._generate_feedback(metrics, score)

        return CategoryScore(
            name="skills_coverage",
            score=score,
            weight=0.30,
            metrics=metrics,
            feedback=feedback,
        )

    def _analyze_skills(self, resume_data: dict, jd_skills: list | None) -> dict:
        """Analyze skills in resume."""
        resume_skills = self._extract_skills(resume_data)

        metrics = {
            "resume_skills_count": len(resume_skills),
            "skills_categories": self._categorize_skills(resume_skills),
        }

        if jd_skills:
            matched = self._match_skills(resume_skills, jd_skills)
            metrics["jd_skills_matched"] = len(matched)
            metrics["jd_skills_coverage"] = len(matched) / max(len(jd_skills), 1)

        return metrics

    def _calculate_score(self, metrics: dict, jd_skills: list | None) -> float:
        """Calculate skills score."""
        score = 0.0

        # Skills count (30%)
        skills_count = metrics.get("resume_skills_count", 0)
        if skills_count >= 20:
            score += 100 * 0.3
        elif skills_count >= 15:
            score += 80 * 0.3
        elif skills_count >= 10:
            score += 60 * 0.3
        else:
            score += 40 * 0.3

        # Skills diversity (30%)
        categories = metrics.get("skills_categories", {})
        category_count = len(categories)
        score += min(category_count * 25, 100) * 0.3

        # JD coverage (40%)
        if jd_skills:
            coverage = metrics.get("jd_skills_coverage", 0)
            score += coverage * 100 * 0.4
        else:
            score += 50 * 0.4  # Default if no JD

        return min(100, max(0, score))

    def _generate_feedback(self, metrics: dict, score: float) -> str:
        """Generate feedback."""
        feedback = []

        if metrics.get("resume_skills_count", 0) < 10:
            feedback.append("Add more skills to your resume")

        if metrics.get("jd_skills_coverage", 1) < 0.7:
            feedback.append("Include more skills from the job description")

        categories = metrics.get("skills_categories", {})
        if len(categories) < 3:
            feedback.append("Diversify your skills across different categories")

        if not feedback:
            feedback.append("Skills coverage is excellent")

        return "; ".join(feedback)

    def _extract_skills(self, resume_data: dict) -> list[str]:
        """Extract skills from resume."""
        # Would extract actual skills
        return resume_data.get("skills", [])

    def _categorize_skills(self, skills: list) -> dict[str, list]:
        """Categorize skills."""
        # Would use ontology for categorization
        return {"technical": skills[:5], "tools": skills[5:10]}

    def _match_skills(self, resume_skills: list, jd_skills: list) -> list:
        """Match resume skills to JD skills."""
        resume_lower = {s.lower() for s in resume_skills}
        jd_lower = {s.lower() for s in jd_skills}
        return list(resume_lower & jd_lower)


class ExperienceScorer:
    """
    Score experience relevance.

    Measures:
    - Years of experience
    - Career progression
    - Achievement quality
    """

    async def score(self, resume_data: dict, role: str | None = None) -> CategoryScore:
        """
        Score experience relevance.

        Args:
            resume_data: Resume data dict
            role: Target role

        Returns:
            CategoryScore for experience
        """
        metrics = self._analyze_experience(resume_data, role)
        score = self._calculate_score(metrics)
        feedback = self._generate_feedback(metrics, score)

        return CategoryScore(
            name="experience_relevance",
            score=score,
            weight=0.20,
            metrics=metrics,
            feedback=feedback,
        )

    def _analyze_experience(self, resume_data: dict, role: str | None) -> dict:
        """Analyze experience."""
        experience = resume_data.get("experience", [])

        years = self._calculate_years(experience)
        progression = self._assess_progression(experience)
        achievements = self._count_achievements(experience)

        return {
            "years_experience": years,
            "progression_score": progression,
            "achievements_count": achievements,
            "companies_count": len(experience),
        }

    def _calculate_score(self, metrics: dict) -> float:
        """Calculate experience score."""
        score = 0.0

        # Years of experience (40%)
        years = metrics.get("years_experience", 0)
        if years >= 10:
            score += 100 * 0.4
        elif years >= 5:
            score += 80 * 0.4
        elif years >= 3:
            score += 60 * 0.4
        else:
            score += 40 * 0.4

        # Progression (30%)
        progression = metrics.get("progression_score", 0)
        score += progression * 0.3

        # Achievements (30%)
        achievements = metrics.get("achievements_count", 0)
        if achievements >= 10:
            score += 100 * 0.3
        elif achievements >= 5:
            score += 80 * 0.3
        else:
            score += 60 * 0.3

        return min(100, max(0, score))

    def _generate_feedback(self, metrics: dict, score: float) -> str:
        """Generate feedback."""
        feedback = []

        if metrics.get("years_experience", 0) < 3:
            feedback.append("Highlight relevant projects and internships")

        if metrics.get("progression_score", 0) < 50:
            feedback.append("Emphasize career growth and increased responsibilities")

        if metrics.get("achievements_count", 0) < 5:
            feedback.append("Add more quantifiable achievements")

        if not feedback:
            feedback.append("Experience section is strong")

        return "; ".join(feedback)

    def _calculate_years(self, experience: list) -> float:
        """Calculate total years of experience."""
        # Would calculate from actual dates
        return len(experience) * 2.5  # Estimate

    def _assess_progression(self, experience: list) -> float:
        """Assess career progression."""
        # Would analyze titles and responsibilities
        return 75.0  # Estimate

    def _count_achievements(self, experience: list) -> int:
        """Count achievements in experience."""
        # Would count actual achievements
        return len(experience) * 2  # Estimate


class FormattingScorer:
    """
    Score resume formatting.

    Measures:
    - Structure and organization
    - Length appropriateness
    - Readability
    """

    async def score(self, resume_data: dict) -> CategoryScore:
        """
        Score formatting.

        Args:
            resume_data: Resume data dict

        Returns:
            CategoryScore for formatting
        """
        metrics = self._analyze_formatting(resume_data)
        score = self._calculate_score(metrics)
        feedback = self._generate_feedback(metrics, score)

        return CategoryScore(
            name="formatting",
            score=score,
            weight=0.15,
            metrics=metrics,
            feedback=feedback,
        )

    def _analyze_formatting(self, resume_data: dict) -> dict:
        """Analyze formatting."""
        sections = self._count_sections(resume_data)
        length = self._estimate_length(resume_data)
        has_summary = "summary" in str(resume_data).lower()

        return {
            "sections_count": sections,
            "estimated_pages": length,
            "has_summary": has_summary,
            "has_skills_section": "skills" in str(resume_data).lower(),
        }

    def _calculate_score(self, metrics: dict) -> float:
        """Calculate formatting score."""
        score = 0.0

        # Sections (40%)
        sections = metrics.get("sections_count", 0)
        if sections >= 5:
            score += 100 * 0.4
        elif sections >= 4:
            score += 80 * 0.4
        else:
            score += 60 * 0.4

        # Length (30%)
        pages = metrics.get("estimated_pages", 1)
        if 1 <= pages <= 2:
            score += 100 * 0.3
        elif pages < 1:
            score += 60 * 0.3
        else:
            score += 70 * 0.3

        # Summary (30%)
        if metrics.get("has_summary", False):
            score += 100 * 0.3
        else:
            score += 50 * 0.3

        return min(100, max(0, score))

    def _generate_feedback(self, metrics: dict, score: float) -> str:
        """Generate feedback."""
        feedback = []

        if not metrics.get("has_summary", False):
            feedback.append("Add a professional summary section")

        if metrics.get("estimated_pages", 1) > 2:
            feedback.append("Consider condensing to 2 pages or less")

        if metrics.get("sections_count", 0) < 4:
            feedback.append("Add more sections (Experience, Skills, Education)")

        if not feedback:
            feedback.append("Formatting is excellent")

        return "; ".join(feedback)

    def _count_sections(self, resume_data: dict) -> int:
        """Count sections in resume."""
        return len(resume_data.keys())

    def _estimate_length(self, resume_data: dict) -> float:
        """Estimate resume length in pages."""
        # Would calculate from actual content
        return 1.5  # Estimate
