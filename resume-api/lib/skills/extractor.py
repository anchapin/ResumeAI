"""
Skills Extractor Service

Extracts skills from job description text using NLP and LLM.
"""

import logging
import time
from typing import Any

import spacy

from .models import ExtractedSkill, SkillsExtractResult
from .ontology import SkillsOntology, get_ontology

logger = logging.getLogger(__name__)


class SkillsExtractor:
    """
    Extract skills from job description text.

    Uses a hybrid approach:
    1. NLP-based extraction (spaCy NER)
    2. Ontology matching
    3. LLM-powered extraction for complex cases

    Example:
        extractor = SkillsExtractor()
        result = extractor.extract("We need a Python developer with AWS experience")
    """

    def __init__(self, ontology: SkillsOntology | None = None):
        """
        Initialize SkillsExtractor.

        Args:
            ontology: Skills ontology (uses singleton if not provided)
        """
        self.ontology = ontology or get_ontology()
        self._nlp = None
        self._load_nlp()

    def _load_nlp(self):
        """Load spaCy NLP model."""
        try:
            self._nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning(
                "spaCy model 'en_core_web_sm' not found. "
                "Run: python -m spacy download en_core_web_sm"
            )
            self._nlp = None

    @property
    def nlp(self):
        """Get spaCy NLP model."""
        return self._nlp

    def extract(
        self,
        jd_text: str,
        use_llm: bool = True,
    ) -> SkillsExtractResult:
        """
        Extract skills from job description text.

        Args:
            jd_text: Job description text
            use_llm: Whether to use LLM for complex cases

        Returns:
            SkillsExtractResult with extracted skills
        """
        start_time = time.time()

        if not jd_text or not jd_text.strip():
            return SkillsExtractResult(
                skills=[],
                by_category={},
                total_count=0,
                processing_time_ms=0,
            )

        extracted_skills: list[ExtractedSkill] = []

        # Method 1: Ontology-based extraction
        ontology_skills = self._extract_by_ontology(jd_text)
        extracted_skills.extend(ontology_skills)

        # Method 2: NLP-based extraction (if spaCy available)
        if self.nlp:
            nlp_skills = self._extract_by_nlp(jd_text)
            # Merge with ontology results
            extracted_skills = self._merge_skills(
                extracted_skills, nlp_skills
            )

        # Method 3: LLM-based extraction (for complex cases)
        if use_llm and len(extracted_skills) < 5:
            llm_skills = self._extract_by_llm(jd_text)
            extracted_skills = self._merge_skills(
                extracted_skills, llm_skills
            )

        # Group by category
        by_category: dict[str, list[ExtractedSkill]] = {}
        for skill in extracted_skills:
            if skill.category not in by_category:
                by_category[skill.category] = []
            by_category[skill.category].append(skill)

        processing_time = (time.time() - start_time) * 1000

        return SkillsExtractResult(
            skills=extracted_skills,
            by_category=by_category,
            total_count=len(extracted_skills),
            processing_time_ms=processing_time,
        )

    def _extract_by_ontology(self, text: str) -> list[ExtractedSkill]:
        """Extract skills by matching against ontology."""
        skills = []
        text_lower = text.lower()

        # Search for each skill in ontology
        for skill_name, skill_data in self.ontology._skills_index.items():
            # Check skill name
            if skill_name in text_lower:
                start = text_lower.find(skill_name)
                end = start + len(skill_name)

                skills.append(
                    ExtractedSkill(
                        name=skill_data["name"],
                        original_text=text[start:end],
                        category=skill_data["category"],
                        confidence=0.9,
                        start_offset=start,
                        end_offset=end,
                        synonyms=skill_data.get("synonyms", []),
                    )
                )

            # Check synonyms
            for synonym in skill_data.get("synonyms", []):
                if synonym.lower() in text_lower:
                    start = text_lower.find(synonym.lower())
                    end = start + len(synonym)

                    # Avoid duplicates
                    if not any(
                        s.name == skill_data["name"]
                        and abs(s.start_offset - start) < 10
                        for s in skills
                    ):
                        skills.append(
                            ExtractedSkill(
                                name=skill_data["name"],
                                original_text=text[start:end],
                                category=skill_data["category"],
                                confidence=0.85,
                                start_offset=start,
                                end_offset=end,
                                synonyms=skill_data.get("synonyms", []),
                            )
                        )

        return skills

    def _extract_by_nlp(self, text: str) -> list[ExtractedSkill]:
        """Extract skills using NLP (spaCy NER)."""
        if not self.nlp:
            return []

        skills = []
        doc = self.nlp(text)

        # Look for potential skill mentions in NER entities
        for ent in doc.ents:
            # Check if entity matches ontology
            matched = self.ontology.lookup(ent.text)
            if matched:
                skills.append(
                    ExtractedSkill(
                        name=matched["name"],
                        original_text=ent.text,
                        category=matched["category"],
                        confidence=0.8,
                        start_offset=ent.start_char,
                        end_offset=ent.end_char,
                        synonyms=matched.get("synonyms", []),
                    )
                )

        # Look for compound nouns (potential skill names)
        for chunk in doc.noun_chunks:
            text_chunk = chunk.text.strip()
            if len(text_chunk) > 2 and len(text_chunk) < 50:
                matched = self.ontology.lookup(text_chunk)
                if matched:
                    skills.append(
                        ExtractedSkill(
                            name=matched["name"],
                            original_text=text_chunk,
                            category=matched["category"],
                            confidence=0.75,
                            start_offset=chunk.start,
                            end_offset=chunk.end,
                            synonyms=matched.get("synonyms", []),
                        )
                    )

        return skills

    def _extract_by_llm(self, text: str) -> list[ExtractedSkill]:
        """Extract skills using LLM for complex cases."""
        # Placeholder - would integrate with LLM
        # In production, this would call the AI enhancer service
        logger.debug("LLM extraction not yet implemented")
        return []

    def _merge_skills(
        self,
        skills1: list[ExtractedSkill],
        skills2: list[ExtractedSkill],
    ) -> list[ExtractedSkill]:
        """Merge two skill lists, removing duplicates."""
        merged = {}

        for skill in skills1 + skills2:
            key = (skill.name.lower(), skill.category)
            if key not in merged:
                merged[key] = skill
            else:
                # Keep higher confidence
                if skill.confidence > merged[key].confidence:
                    merged[key] = skill

        return list(merged.values())

    def extract_with_categories(
        self, jd_text: str
    ) -> dict[str, list[ExtractedSkill]]:
        """
        Extract skills grouped by category.

        Args:
            jd_text: Job description text

        Returns:
            Dict mapping category to list of skills
        """
        result = self.extract(jd_text)
        return result.by_category

    def get_skill_names(self, jd_text: str) -> list[str]:
        """
        Extract just skill names from text.

        Args:
            jd_text: Job description text

        Returns:
            List of skill names
        """
        result = self.extract(jd_text)
        return [s.name for s in result.skills]
