"""
Skills Module

Skills extraction, categorization, and matching for job descriptions.
"""

from .extractor import SkillsExtractor
from .categorizer import SkillsCategorizer
from .matcher import SkillsMatcher
from .ontology import SkillsOntology

__all__ = [
    "SkillsExtractor",
    "SkillsCategorizer",
    "SkillsMatcher",
    "SkillsOntology",
]
