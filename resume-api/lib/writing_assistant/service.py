"""
Writing Assistant Service.

Orchestrates all writing assistant components:
- Grammar checking (LanguageTool)
- Style analysis (spaCy, textstat)
- AI enhancements (Claude, GPT-4o)
- Suggestion management

Provides a unified interface for getting writing suggestions.
"""

import logging
import time
from dataclasses import dataclass
from typing import Any

from .ai_enhancer import AIEnhancer, AIEnhancerConfig
from .grammar_checker import GrammarChecker, GrammarCheckerConfig
from .models import Suggestion, SuggestionRequest, SuggestionResponse
from .style_analyzer import StyleAnalyzer, StyleAnalyzerConfig
from .suggestion_manager import SuggestionManager

logger = logging.getLogger(__name__)


@dataclass
class WritingAssistantConfig:
    """Configuration for WritingAssistantService."""

    # Grammar checker
    grammar_checker: GrammarCheckerConfig | None = None

    # Style analyzer
    style_analyzer: StyleAnalyzerConfig | None = None

    # AI enhancer
    ai_enhancer: AIEnhancerConfig | None = None

    # Feature flags
    enabled: bool = True
    max_suggestions: int = 50  # Maximum suggestions per request


class WritingAssistantService:
    """
    Main orchestrator for the Writing Assistant.

    Combines grammar checking, style analysis, and AI enhancements
    into a unified suggestion service.

    Features:
    - Multi-layer analysis (grammar → style → AI)
    - Priority ranking (errors > warnings > enhancements)
    - Deduplication of similar suggestions
    - Confidence scoring
    - Suggestion persistence

    Example:
        service = WritingAssistantService(config)
        response = await service.get_suggestions(
            text="He go to school",
            context={"section_type": "experience"}
        )
    """

    def __init__(
        self,
        config: WritingAssistantConfig | None = None,
        suggestion_manager: SuggestionManager | None = None,
    ):
        """
        Initialize WritingAssistantService.

        Args:
            config: Configuration object
            suggestion_manager: Optional SuggestionManager for persistence
        """
        self.config = config or WritingAssistantConfig()

        # Initialize components
        self.grammar_checker = GrammarChecker(
            config=self.config.grammar_checker
        )
        self.style_analyzer = StyleAnalyzer(
            config=self.config.style_analyzer
        )
        self.ai_enhancer = AIEnhancer(config=self.config.ai_enhancer)
        self.suggestion_manager = suggestion_manager

    async def close(self):
        """Close all service connections."""
        await self.grammar_checker.close()
        await self.ai_enhancer.close()

    async def get_suggestions(
        self,
        text: str,
        context: dict[str, Any] | None = None,
        user_id: str | None = None,
        resume_id: int | None = None,
        section: str | None = None,
    ) -> SuggestionResponse:
        """
        Get comprehensive writing suggestions for text.

        Args:
            text: The text to analyze
            context: Additional context (section_type, role, industry, etc.)
            user_id: Optional user ID for persistence
            resume_id: Optional resume ID
            section: Optional section name

        Returns:
            SuggestionResponse with ranked suggestions

        Example:
            >>> response = await service.get_suggestions(
            ...     "Responsible for managing team",
            ...     {"section_type": "experience", "role": "Engineer"}
            ... )
            >>> for s in response.suggestions:
            ...     print(f"{s.type}: {s.message}")
        """
        start_time = time.time()
        context = context or {}
        all_suggestions: list[Suggestion] = []

        if not self.config.enabled:
            return SuggestionResponse(
                suggestions=[],
                processing_time_ms=0,
                cache_hit=False,
            )

        # 1. Grammar checking (highest priority)
        try:
            grammar_suggestions = await self.grammar_checker.get_suggestions(
                text
            )
            all_suggestions.extend(grammar_suggestions)
            logger.debug(
                f"Found {len(grammar_suggestions)} grammar suggestions"
            )
        except Exception as e:
            logger.error(f"Grammar check failed: {e}")

        # 2. Style analysis (medium priority)
        try:
            style_analysis = self.style_analyzer.analyze(text)
            all_suggestions.extend(style_analysis.suggestions)
            logger.debug(
                f"Found {len(style_analysis.suggestions)} style suggestions"
            )
        except Exception as e:
            logger.error(f"Style analysis failed: {e}")

        # 3. AI enhancements (lower priority, more expensive)
        try:
            ai_suggestions = await self.ai_enhancer.get_enhancement_suggestions(
                text, context
            )
            all_suggestions.extend(ai_suggestions)
            logger.debug(
                f"Found {len(ai_suggestions)} AI suggestions"
            )
        except Exception as e:
            logger.error(f"AI enhancement failed: {e}")

        # 4. Deduplicate and rank suggestions
        ranked_suggestions = self._rank_and_deduplicate(
            all_suggestions, max_suggestions=self.config.max_suggestions
        )

        # 5. Save to database if user_id provided
        if user_id and self.suggestion_manager:
            try:
                for suggestion in ranked_suggestions:
                    await self.suggestion_manager.save_suggestion(
                        user_id=user_id,
                        suggestion=suggestion,
                        resume_id=resume_id,
                        section=section,
                        context=text[:500],  # Store first 500 chars as context
                    )
            except Exception as e:
                logger.error(f"Failed to save suggestions: {e}")

        processing_time = (time.time() - start_time) * 1000

        return SuggestionResponse(
            suggestions=ranked_suggestions,
            processing_time_ms=processing_time,
            cache_hit=False,  # Would be set by caching layer
        )

    def _rank_and_deduplicate(
        self,
        suggestions: list[Suggestion],
        max_suggestions: int = 50,
    ) -> list[Suggestion]:
        """
        Rank suggestions by priority and remove duplicates.

        Priority order:
        1. Errors (spelling, grammar)
        2. Warnings (punctuation, style issues)
        3. Info (enhancements, suggestions)

        Args:
            suggestions: List of suggestions to rank
            max_suggestions: Maximum number to return

        Returns:
            Ranked and deduplicated list
        """
        # Remove duplicates (same offset and type)
        seen = set()
        unique = []
        for s in suggestions:
            key = (s.offset, s.length, s.type, s.rule_id)
            if key not in seen:
                seen.add(key)
                unique.append(s)

        # Priority mapping
        priority_map = {
            ("spelling", "error"): 0,
            ("grammar", "error"): 1,
            ("grammar", "warning"): 2,
            ("punctuation", "warning"): 3,
            ("style", "warning"): 4,
            ("style", "info"): 5,
            ("enhancement", "info"): 6,
        }

        def get_priority(s: Suggestion) -> int:
            """Get priority for a suggestion."""
            key = (s.type, s.severity)
            base_priority = priority_map.get(key, 10)

            # Adjust by confidence (higher confidence = higher priority)
            confidence_boost = int((1.0 - s.confidence) * 3)

            return base_priority + confidence_boost

        # Sort by priority
        unique.sort(key=get_priority)

        # Limit to max suggestions
        return unique[:max_suggestions]

    async def enhance_section(
        self,
        section_text: str,
        section_type: str,
        context: dict[str, Any],
        user_id: str | None = None,
        resume_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Get comprehensive enhancement suggestions for a resume section.

        Args:
            section_text: The section text to enhance
            section_type: Type of section (experience, education, etc.)
            context: Additional context (role, industry, job description)
            user_id: Optional user ID for persistence
            resume_id: Optional resume ID

        Returns:
            Dictionary with enhancement results
        """
        # Get basic suggestions
        suggestions_response = await self.get_suggestions(
            text=section_text,
            context={**context, "section_type": section_type},
            user_id=user_id,
            resume_id=resume_id,
            section=section_type,
        )

        # Get AI-powered enhancements based on section type
        enhancements = {}

        if section_type == "experience":
            # Get bullet point enhancements
            bullets = [
                line.strip()
                for line in section_text.split("\n")
                if line.strip() and len(line.strip()) > 20
            ]

            for i, bullet in enumerate(bullets[:5]):  # Limit to 5 bullets
                enhancement = await self.ai_enhancer.enhance_bullet(
                    bullet, context
                )
                if enhancement.changes:
                    enhancements[f"bullet_{i}"] = enhancement

        # Calculate overall quality score
        quality_score = self._calculate_quality_score(
            section_text, suggestions_response.suggestions
        )

        return {
            "suggestions": [s.to_dict() for s in suggestions_response.suggestions],
            "enhancements": {
                k: v.__dict__ for k, v in enhancements.items()
            },
            "quality_score": quality_score,
            "processing_time_ms": suggestions_response.processing_time_ms,
        }

    def _calculate_quality_score(
        self, text: str, suggestions: list[Suggestion]
    ) -> float:
        """
        Calculate overall quality score for text.

        Args:
            text: The analyzed text
            suggestions: List of suggestions found

        Returns:
            Quality score from 0-100
        """
        if not text or not text.strip():
            return 0.0

        # Start with base score
        score = 100.0

        # Deduct for errors
        error_count = sum(
            1 for s in suggestions if s.severity == "error"
        )
        warning_count = sum(
            1 for s in suggestions if s.severity == "warning"
        )
        info_count = sum(
            1 for s in suggestions if s.severity == "info"
        )

        # Deductions
        score -= error_count * 10  # -10 per error
        score -= warning_count * 5  # -5 per warning
        score -= info_count * 1  # -1 per info

        # Bonus for length (reasonable content)
        word_count = len(text.split())
        if 50 <= word_count <= 200:
            score += 5
        elif word_count < 20:
            score -= 10  # Too short

        # Ensure score is in valid range
        return max(0, min(100, score))

    async def get_section_quality(
        self,
        section_text: str,
        section_type: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Get quality assessment for a resume section.

        Args:
            section_text: The section text
            section_type: Type of section
            context: Optional context

        Returns:
            Quality assessment with score and recommendations
        """
        suggestions_response = await self.get_suggestions(
            text=section_text,
            context=context or {},
        )

        quality_score = self._calculate_quality_score(
            section_text, suggestions_response.suggestions
        )

        # Generate recommendations
        recommendations = []

        error_count = sum(
            1 for s in suggestions_response.suggestions if s.severity == "error"
        )
        if error_count > 0:
            recommendations.append(
                f"Fix {error_count} grammar/spelling error(s) first"
            )

        # Check for weak verbs
        weak_verb_suggestions = [
            s
            for s in suggestions_response.suggestions
            if s.metadata.get("category") == "weak_verb"
        ]
        if weak_verb_suggestions:
            recommendations.append(
                f"Replace {len(weak_verb_suggestions)} weak verb(s) with stronger action words"
            )

        # Check readability
        style_analysis = self.style_analyzer.analyze(section_text)
        if style_analysis.readability_score < 40:
            recommendations.append(
                "Improve readability by shortening sentences"
            )

        return {
            "quality_score": quality_score,
            "grade": self._score_to_grade(quality_score),
            "suggestion_count": len(suggestions_response.suggestions),
            "error_count": error_count,
            "recommendations": recommendations,
        }

    def _score_to_grade(self, score: float) -> str:
        """Convert quality score to letter grade."""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
