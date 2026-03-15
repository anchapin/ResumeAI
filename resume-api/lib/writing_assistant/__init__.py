"""
Writing Assistant Module

Real-time AI-powered writing suggestions for resume editing.
"""

from .service import WritingAssistantService
from .grammar_checker import GrammarChecker
from .style_analyzer import StyleAnalyzer
from .ai_enhancer import AIEnhancer
from .suggestion_manager import SuggestionManager

__all__ = [
    "WritingAssistantService",
    "GrammarChecker",
    "StyleAnalyzer",
    "AIEnhancer",
    "SuggestionManager",
]
