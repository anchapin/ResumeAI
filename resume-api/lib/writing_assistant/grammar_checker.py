"""
Grammar Checker Service using LanguageTool.

Provides grammar, spelling, and punctuation checking for resume content.
"""

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from .models import GrammarMatch, Suggestion

logger = logging.getLogger(__name__)


@dataclass
class GrammarCheckerConfig:
    """Configuration for GrammarChecker."""

    api_url: str
    timeout: float = 30.0
    language: str = "en-US"
    enabled: bool = True


class GrammarChecker:
    """
    Grammar checking service using LanguageTool API.

    LanguageTool is an open-source grammar checker with support for 30+ languages.
    This implementation uses a self-hosted instance for better performance and privacy.

    Example:
        checker = GrammarChecker("http://localhost:8081")
        suggestions = checker.check("He go to school yesterday")
    """

    def __init__(self, config: GrammarCheckerConfig | None = None):
        """
        Initialize GrammarChecker.

        Args:
            config: Configuration object. Uses defaults if not provided.
        """
        self.config = config or GrammarCheckerConfig(
            api_url="http://localhost:8081"
        )
        self._client = httpx.AsyncClient(timeout=self.config.timeout)

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    async def check(self, text: str) -> list[GrammarMatch]:
        """
        Check text for grammar, spelling, and punctuation errors.

        Args:
            text: The text to check.

        Returns:
            List of GrammarMatch objects describing found issues.

        Example:
            >>> matches = await checker.check("He go to school")
            >>> for match in matches:
            ...     print(f"{match.offset}: {match.message}")
        """
        if not self.config.enabled:
            return []

        if not text or not text.strip():
            return []

        try:
            response = await self._client.post(
                f"{self.config.api_url}/v2/check",
                json={
                    "text": text,
                    "language": self.config.language,
                    "enabledOnly": False,
                    "level": "default",
                },
            )
            response.raise_for_status()
            data = response.json()
            return [self._parse_match(m) for m in data.get("matches", [])]

        except httpx.TimeoutException:
            logger.warning("LanguageTool request timed out")
            return []
        except httpx.HTTPError as e:
            logger.error(f"LanguageTool API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in grammar check: {e}")
            return []

    def _parse_match(self, match_data: dict[str, Any]) -> GrammarMatch:
        """Parse a LanguageTool match response into a GrammarMatch object."""
        return GrammarMatch(
            message=match_data.get("message", ""),
            short_message=match_data.get("shortMessage", ""),
            rule_id=match_data.get("rule", {}).get("id", ""),
            rule_issue_type=match_data.get("rule", {}).get("issueType", ""),
            category=match_data.get("category", {}).get("id", ""),
            offset=match_data.get("offset", 0),
            length=match_data.get("length", 0),
            context=match_data.get("context", ""),
            context_offset=match_data.get("contextOffset", 0),
            sentence=match_data.get("sentence", ""),
            replacements=[
                r.get("value", "") for r in match_data.get("replacements", [])
            ],
            ignore_for_incomplete_sentence=match_data.get(
                "ignoreForIncompleteSentence", False
            ),
        )

    async def get_suggestions(self, text: str) -> list[Suggestion]:
        """
        Get grammar suggestions for text.

        Args:
            text: The text to check.

        Returns:
            List of Suggestion objects ready for display to the user.
        """
        matches = await self.check(text)
        suggestions = []

        for i, match in enumerate(matches):
            suggestion = match.to_suggestion(f"grammar_{i}_{match.offset}")
            # Add metadata for tracking
            suggestion.metadata = {
                "category": match.category,
                "rule_issue_type": match.rule_issue_type,
                "sentence": match.sentence,
            }
            suggestions.append(suggestion)

        return suggestions

    async def check_text_with_context(
        self, text: str, context: dict[str, Any]
    ) -> list[Suggestion]:
        """
        Check text with additional context for better suggestions.

        Args:
            text: The text to check.
            context: Additional context like section type, role, etc.

        Returns:
            List of context-aware suggestions.
        """
        suggestions = await self.get_suggestions(text)

        # Adjust severity based on context
        section_type = context.get("section_type", "")

        for suggestion in suggestions:
            # Be more strict on contact info sections
            if section_type in ("contact", "header"):
                if suggestion.severity == "info":
                    suggestion.severity = "warning"

            # Be more lenient on creative sections
            if section_type in ("summary", "objective"):
                if suggestion.type == "style":
                    suggestion.confidence = max(0, suggestion.confidence - 0.1)

        return suggestions
