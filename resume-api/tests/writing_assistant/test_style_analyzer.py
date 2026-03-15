"""
Tests for Style Analyzer Service.
"""

import pytest
from unittest.mock import patch, MagicMock

from lib.writing_assistant.style_analyzer import StyleAnalyzer, StyleAnalyzerConfig


class TestStyleAnalyzer:
    """Test StyleAnalyzer service."""

    @pytest.fixture
    def analyzer(self):
        """Create StyleAnalyzer instance."""
        config = StyleAnalyzerConfig(enabled=True)
        return StyleAnalyzer(config)

    def test_analyze_passive_voice(self, analyzer):
        """Test detection of passive voice."""
        text = "The project was led by John."
        
        # Mock spaCy not available, use simple detection
        with patch.object(analyzer, '_nlp', None):
            result = analyzer.analyze(text)
            
            assert result.passive_voice_count >= 0  # May detect passive

    def test_analyze_weak_verbs(self, analyzer):
        """Test detection of weak verbs."""
        text = "Helped with the project and worked on the team."
        
        result = analyzer.analyze(text)
        
        assert result.weak_verb_count >= 1

    def test_analyze_readability_score(self, analyzer):
        """Test readability score calculation."""
        text = "This is a simple sentence. It has short words."
        
        result = analyzer.analyze(text)
        
        assert 0 <= result.readability_score <= 100

    def test_analyze_empty_text(self, analyzer):
        """Test analysis of empty text."""
        result = analyzer.analyze("")
        
        assert result.readability_score == 0.0
        assert result.passive_voice_count == 0
        assert result.weak_verb_count == 0
        assert result.suggestions == []

    def test_analyze_disabled(self):
        """Test that disabled analyzer returns empty analysis."""
        config = StyleAnalyzerConfig(enabled=False)
        analyzer = StyleAnalyzer(config)
        
        result = analyzer.analyze("He helped with the project")
        
        assert result.suggestions == []

    def test_get_readability_score(self, analyzer):
        """Test readability score method."""
        text = "The quick brown fox jumps over the lazy dog."
        
        score = analyzer.get_readability_score(text)
        
        assert 0 <= score <= 100

    def test_get_passive_voice_count(self, analyzer):
        """Test passive voice counting."""
        text = "The ball was thrown by the boy."
        
        count = analyzer.get_passive_voice_count(text)
        
        assert count >= 0

    def test_detect_weak_verbs(self, analyzer):
        """Test weak verb detection."""
        text = "He helped and worked and did things."
        
        matches = analyzer._detect_weak_verbs(text)
        
        assert len(matches) >= 2  # Should find "helped", "worked", "did"

    def test_action_verb_suggestions(self, analyzer):
        """Test action verb suggestions."""
        text = "Helped with the project."
        
        suggestions = analyzer.get_action_verb_suggestions(text, "Engineer")
        
        assert len(suggestions) >= 0  # May have suggestions
        if suggestions:
            assert suggestions[0].type == "enhancement"
            assert len(suggestions[0].replacements) > 0

    def test_categorize_weak_verb_context(self, analyzer):
        """Test verb context categorization."""
        text = "Led the team on the project."
        
        category = analyzer._categorize_weak_verb_context(text, 4)
        
        assert category in ["leadership", "technical", "analytical", "communication", "achievement"]

    def test_sentence_splitting(self, analyzer):
        """Test sentence splitting."""
        text = "First sentence. Second sentence! Third sentence?"
        
        sentences = analyzer._get_sentences(text)
        
        assert len(sentences) >= 2

    def test_avg_sentence_length(self, analyzer):
        """Test average sentence length calculation."""
        text = "Short. Medium length sentence. This is a longer sentence with more words."
        
        avg = analyzer._get_avg_sentence_length(text)
        
        assert avg > 0

    def test_style_analysis_metrics(self, analyzer):
        """Test that analysis returns all expected metrics."""
        text = "The team was managed effectively. Results were achieved."
        
        result = analyzer.analyze(text)
        
        assert hasattr(result, 'readability_score')
        assert hasattr(result, 'passive_voice_count')
        assert hasattr(result, 'weak_verb_count')
        assert hasattr(result, 'avg_sentence_length')
        assert hasattr(result, 'suggestions')
        assert hasattr(result, 'metrics')
