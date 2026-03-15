"""
Style Analyzer Service using spaCy and textstat.

Provides style analysis including readability, passive voice detection,
and action verb suggestions for resume content.
"""

import logging
import re
import uuid
from dataclasses import dataclass

import spacy
import textstat
from spacy.tokens import Doc

from .models import Suggestion, StyleAnalysis

logger = logging.getLogger(__name__)


# Weak verbs to flag for replacement
WEAK_VERBS = {
    "helped",
    "worked",
    "did",
    "made",
    "was",
    "were",
    "been",
    "being",
    "have",
    "has",
    "had",
    "got",
    "gotten",
    "handled",
    "dealt",
    "responsible",
    "tasked",
    "assigned",
    "involved",
    "participated",
    "assisted",
}

# Strong action verbs by category (from research)
ACTION_VERBS = {
    "leadership": [
        "led",
        "directed",
        "managed",
        "spearheaded",
        "orchestrated",
        "championed",
        "mentored",
        "supervised",
        "coordinated",
        "facilitated",
    ],
    "achievement": [
        "achieved",
        "exceeded",
        "generated",
        "optimized",
        "improved",
        "increased",
        "reduced",
        "accelerated",
        "maximized",
        "revolutionized",
    ],
    "technical": [
        "developed",
        "engineered",
        "architected",
        "automated",
        "implemented",
        "designed",
        "built",
        "deployed",
        "integrated",
        "programmed",
    ],
    "analytical": [
        "analyzed",
        "evaluated",
        "investigated",
        "forecasted",
        "assessed",
        "diagnosed",
        "audited",
        "researched",
        "quantified",
        "validated",
    ],
    "communication": [
        "communicated",
        "negotiated",
        "collaborated",
        "presented",
        "authored",
        "published",
        "persuaded",
        "influenced",
        "mediated",
        "translated",
    ],
}


@dataclass
class StyleAnalyzerConfig:
    """Configuration for StyleAnalyzer."""

    model_name: str = "en_core_web_sm"
    enabled: bool = True
    min_sentence_length: int = 10
    max_sentence_length: int = 40
    target_readability_score: float = 50.0  # Flesch Reading Ease


class StyleAnalyzer:
    """
    Style analysis service using spaCy and textstat.

    Analyzes resume text for:
    - Readability scores (Flesch Reading Ease, Flesch-Kincaid)
    - Passive voice detection
    - Weak verb identification
    - Sentence length optimization
    - Action verb suggestions

    Example:
        analyzer = StyleAnalyzer()
        analysis = analyzer.analyze("Responsible for managing team...")
    """

    def __init__(self, config: StyleAnalyzerConfig | None = None):
        """
        Initialize StyleAnalyzer.

        Args:
            config: Configuration object. Uses defaults if not provided.
        """
        self.config = config or StyleAnalyzerConfig()
        self._nlp = None

    def _load_model(self):
        """Load spaCy model lazily."""
        if self._nlp is None:
            try:
                self._nlp = spacy.load(self.config.model_name)
            except OSError:
                logger.warning(
                    f"spaCy model '{self.config.model_name}' not found. "
                    "Run: python -m spacy download en_core_web_sm"
                )
                self._nlp = None

    @property
    def nlp(self) -> spacy.Language | None:
        """Get spaCy NLP model."""
        self._load_model()
        return self._nlp

    def analyze(self, text: str) -> StyleAnalysis:
        """
        Analyze text for style issues.

        Args:
            text: The text to analyze.

        Returns:
            StyleAnalysis object with scores and suggestions.

        Example:
            >>> analysis = analyzer.analyze("The project was led by John...")
            >>> print(f"Readability: {analysis.readability_score}")
            >>> print(f"Passive voice: {analysis.passive_voice_count}")
        """
        if not self.config.enabled or not text or not text.strip():
            return StyleAnalysis(
                readability_score=0.0,
                passive_voice_count=0,
                weak_verb_count=0,
                avg_sentence_length=0.0,
                suggestions=[],
                metrics={},
            )

        self._load_model()

        # Calculate metrics
        readability_score = self.get_readability_score(text)
        sentences = self._get_sentences(text)
        avg_sentence_length = self._get_avg_sentence_length(text)

        suggestions = []

        # Detect passive voice
        passive_matches = self._detect_passive_voice(text)
        for offset, length, matched_text in passive_matches:
            suggestions.append(
                Suggestion(
                    id=f"style_passive_{offset}",
                    type="style",
                    severity="warning",
                    message="Consider using active voice for stronger impact",
                    offset=offset,
                    length=length,
                    replacements=[],
                    explanation="Active voice makes your resume more direct and impactful",
                    rule_id="PASSIVE_VOICE",
                    confidence=0.7,
                )
            )

        # Detect weak verbs
        weak_matches = self._detect_weak_verbs(text)
        for offset, length, verb, category in weak_matches:
            stronger_verbs = ACTION_VERBS.get(category, [])[:3]
            suggestions.append(
                Suggestion(
                    id=f"style_weak_verb_{offset}",
                    type="enhancement",
                    severity="info",
                    message=f"Replace weak verb '{verb}' with a stronger action verb",
                    offset=offset,
                    length=length,
                    replacements=stronger_verbs,
                    explanation=f"Strong action verbs like '{stronger_verbs[0] if stronger_verbs else 'achieved'}' show impact",
                    rule_id="WEAK_VERB",
                    confidence=0.8,
                    metadata={"category": category, "original_verb": verb},
                )
            )

        # Check sentence length
        if avg_sentence_length > self.config.max_sentence_length:
            suggestions.append(
                Suggestion(
                    id="style_long_sentences",
                    type="style",
                    severity="info",
                    message="Some sentences may be too long",
                    offset=0,
                    length=len(text),
                    replacements=[],
                    explanation=f"Average sentence length is {avg_sentence_length:.1f} words. Aim for 10-40 words for better readability.",
                    rule_id="LONG_SENTENCE",
                    confidence=0.6,
                )
            )

        return StyleAnalysis(
            readability_score=readability_score,
            passive_voice_count=len(passive_matches),
            weak_verb_count=len(weak_matches),
            avg_sentence_length=avg_sentence_length,
            suggestions=suggestions,
            metrics={
                "sentence_count": len(sentences),
                "word_count": len(text.split()),
                "syllable_count": textstat.syllable_count(text),
            },
        )

    def get_readability_score(self, text: str) -> float:
        """
        Calculate Flesch Reading Ease score.

        Args:
            text: The text to analyze.

        Returns:
            Score from 0-100 (higher = easier to read).
            Target: 50-60 for resume content.
        """
        if not text or not text.strip():
            return 0.0

        try:
            score = textstat.flesch_reading_ease(text)
            return max(0, min(100, score))
        except Exception as e:
            logger.warning(f"Error calculating readability: {e}")
            return 50.0

    def get_passive_voice_count(self, text: str) -> int:
        """Count passive voice constructions in text."""
        matches = self._detect_passive_voice(text)
        return len(matches)

    def _detect_passive_voice(self, text: str) -> list[tuple[int, int, str]]:
        """
        Detect passive voice constructions.

        Returns:
            List of (offset, length, matched_text) tuples.
        """
        if not self.nlp:
            # Fallback: simple pattern matching
            return self._detect_passive_voice_simple(text)

        matches = []
        doc: Doc = self.nlp(text)

        for token in doc:
            # Check for passive construction: be + past participle
            if token.pos_ == "AUX" and token.lemma_ in {
                "be",
                "am",
                "is",
                "are",
                "was",
                "were",
                "been",
                "being",
            }:
                # Look for past participle after
                for child in token.children:
                    if child.pos_ == "VERB" and child.morph.get("VerbForm") == ["Part"]:
                        if child.morph.get("Tense") == ["Past"]:
                            start = token.idx
                            end = child.idx + len(child.text)
                            matched = text[start:end]
                            matches.append((start, end - start, matched))

        return matches

    def _detect_passive_voice_simple(self, text: str) -> list[tuple[int, int, str]]:
        """Simple passive voice detection without spaCy."""
        matches = []
        # Common passive patterns
        patterns = [
            r"\b(was|were|been|being)\s+(\w+ed)\b",
            r"\b(is|are|am)\s+(\w+ed)\b",
            r"\b(has|have|had)\s+been\s+(\w+ed)\b",
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                matches.append((match.start(), match.end() - match.start(), match.group()))

        return matches

    def _detect_weak_verbs(
        self, text: str
    ) -> list[tuple[int, int, str, str]]:
        """
        Detect weak verbs that should be replaced.

        Returns:
            List of (offset, length, verb, category) tuples.
        """
        matches = []
        text_lower = text.lower()
        words = text_lower.split()

        # Track position
        pos = 0
        for i, word in enumerate(words):
            # Clean word (remove punctuation)
            clean_word = re.sub(r"[^\w]", "", word)

            if clean_word in WEAK_VERBS:
                # Find position in original text
                found_pos = text_lower.find(clean_word, pos)
                if found_pos != -1:
                    # Determine category based on context
                    category = self._categorize_weak_verb_context(
                        text, found_pos
                    )
                    matches.append(
                        (found_pos, len(clean_word), clean_word, category)
                    )
                    pos = found_pos + len(clean_word)

        return matches

    def _categorize_weak_verb_context(
        self, text: str, offset: int
    ) -> str:
        """Categorize weak verb based on surrounding context."""
        # Look at nearby words for context
        start = max(0, offset - 50)
        end = min(len(text), offset + 50)
        context = text[start:end].lower()

        # Categorize based on context clues
        if any(
            word in context
            for word in ["team", "group", "project", "initiative"]
        ):
            return "leadership"
        elif any(
            word in context
            for word in ["code", "system", "software", "application"]
        ):
            return "technical"
        elif any(
            word in context
            for word in ["data", "analysis", "report", "metric"]
        ):
            return "analytical"
        elif any(
            word in context
            for word in ["client", "customer", "stakeholder"]
        ):
            return "communication"
        else:
            return "achievement"

    def _get_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        if not self.nlp:
            # Simple fallback
            return re.split(r"[.!?]+", text)

        doc: Doc = self.nlp(text)
        return [sent.text for sent in doc.sents]

    def _get_avg_sentence_length(self, text: str) -> float:
        """Calculate average sentence length in words."""
        sentences = self._get_sentences(text)
        if not sentences:
            return 0.0

        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)

    def get_action_verb_suggestions(
        self, text: str, role: str | None = None
    ) -> list[Suggestion]:
        """
        Get action verb suggestions based on role/context.

        Args:
            text: The text to analyze.
            role: Optional role/industry context.

        Returns:
            List of action verb suggestions.
        """
        weak_matches = self._detect_weak_verbs(text)
        suggestions = []

        for offset, length, verb, category in weak_matches:
            # Get stronger alternatives
            alternatives = ACTION_VERBS.get(category, [])[:5]

            if role:
                # Boost verbs relevant to role
                if "engineer" in role.lower() and category == "technical":
                    alternatives = [
                        "architected",
                        "engineered",
                        "automated",
                    ] + alternatives[:2]

            suggestions.append(
                Suggestion(
                    id=f"action_verb_{offset}",
                    type="enhancement",
                    severity="info",
                    message=f"Replace '{verb}' with a stronger action verb",
                    offset=offset,
                    length=length,
                    replacements=alternatives,
                    explanation="Strong action verbs demonstrate impact and ownership",
                    rule_id="ACTION_VERB",
                    confidence=0.75,
                    metadata={"category": category, "original_verb": verb},
                )
            )

        return suggestions
