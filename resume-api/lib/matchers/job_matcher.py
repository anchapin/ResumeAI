"""
Job Matcher: Hybrid SBERT + Keyword matching for resume-JD compatibility.
"""

import re
from typing import TypedDict
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import spacy
import numpy as np

from .skill_ontology import SKILL_ONTOLOGY, ALL_SKILLS, get_canonical_skill


class MatchResult(TypedDict):
    match_score: float
    semantic_score: float
    skills_score: float
    experience_score: float
    education_score: float
    missing_skills: list[str]
    semantic_matches: dict[str, str]
    suggestions: list[str]


class JobMatcher:
    """Hybrid job matcher using SBERT and keyword matching."""

    def __init__(self):
        self._model: SentenceTransformer | None = None
        self._nlp: spacy.Language | None = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load SBERT model."""
        if self._model is None:
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        return self._model

    @property
    def nlp(self) -> spacy.Language:
        """Lazy load spaCy NLP model."""
        if self._nlp is None:
            self._nlp = spacy.load("en_core_web_sm")
        return self._nlp

    def calculate_match_score(
        self, resume_text: str, job_description: str
    ) -> MatchResult:
        """
        Calculate match score between resume and job description.

        Returns:
            MatchResult with scores and gap analysis
        """
        # 1. Semantic Similarity (40%)
        semantic_score = self._calculate_semantic_similarity(resume_text, job_description)
        semantic_normalized = (semantic_score + 1) / 2  # [-1, 1] → [0, 1]

        # 2. Skills Match (35%)
        resume_skills = self.extract_skills(resume_text)
        jd_skills = self.extract_skills(job_description)
        skills_score, missing_skills, semantic_matches = self._calculate_skills_match(
            resume_skills, jd_skills
        )

        # 3. Experience Match (15%)
        resume_years = self.extract_years_experience(resume_text)
        jd_years = self.extract_years_experience(job_description)
        experience_score = self._calculate_experience_match(resume_years, jd_years)

        # 4. Education Match (10%)
        resume_edu = self.extract_education_level(resume_text)
        jd_edu = self.extract_education_level(job_description)
        education_score = self._calculate_education_match(resume_edu, jd_edu)

        # Final weighted score
        final_score = (
            semantic_normalized * 0.40
            + skills_score * 0.35
            + experience_score * 0.15
            + education_score * 0.10
        )

        # Generate suggestions
        suggestions = self._generate_suggestions(
            missing_skills, semantic_matches, resume_skills, jd_skills
        )

        return MatchResult(
            match_score=round(final_score * 100, 1),
            semantic_score=round(semantic_normalized * 100, 1),
            skills_score=round(skills_score * 100, 1),
            experience_score=round(experience_score * 100, 1),
            education_score=round(education_score * 100, 1),
            missing_skills=list(missing_skills)[:10],  # Top 10
            semantic_matches=semantic_matches,
            suggestions=suggestions,
        )

    def _calculate_semantic_similarity(self, resume_text: str, job_description: str) -> float:
        """Calculate semantic similarity using SBERT embeddings."""
        resume_emb = self.model.encode([resume_text], convert_to_numpy=True)
        jd_emb = self.model.encode([job_description], convert_to_numpy=True)

        score = cosine_similarity(resume_emb, jd_emb)[0][0]
        return float(score)

    def _calculate_skills_match(
        self, resume_skills: set[str], jd_skills: set[str]
    ) -> tuple[float, set[str], dict[str, str]]:
        """
        Calculate skills match score.

        Returns:
            Tuple of (score, missing_skills, semantic_matches)
        """
        if not jd_skills:
            return 1.0, set(), {}

        # Exact matches
        matched_skills = resume_skills.intersection(jd_skills)

        # Find semantic near-matches
        semantic_matches = self._find_semantic_matches(resume_skills, jd_skills - matched_skills)

        # Remove semantically matched skills from missing
        missing_skills = jd_skills - matched_skills - set(semantic_matches.keys())

        # Calculate score
        # Weight: exact matches (70%), semantic matches (30%)
        exact_score = len(matched_skills) / len(jd_skills) * 0.7
        semantic_score = len(semantic_matches) / len(jd_skills) * 0.3
        total_score = exact_score + semantic_score

        return min(1.0, total_score), missing_skills, semantic_matches

    def _find_semantic_matches(
        self, resume_skills: set[str], missing_skills: set[str]
    ) -> dict[str, str]:
        """
        Find semantic matches between resume skills and missing skills.

        Returns:
            Dict mapping missing_skill -> matched_resume_skill
        """
        if not missing_skills or not resume_skills:
            return {}

        semantic_matches = {}
        threshold = 0.75

        # Encode all skills
        all_skills = list(missing_skills.union(resume_skills))
        embeddings = self.model.encode(all_skills, convert_to_numpy=True)

        # Create index mapping
        skill_to_idx = {skill: i for i, skill in enumerate(all_skills)}

        # Compare missing vs resume skills
        for missing in missing_skills:
            missing_emb = embeddings[skill_to_idx[missing]].reshape(1, -1)

            for resume_skill in resume_skills:
                resume_emb = embeddings[skill_to_idx[resume_skill]].reshape(1, -1)
                similarity = cosine_similarity(missing_emb, resume_emb)[0][0]

                if similarity >= threshold and missing not in semantic_matches:
                    semantic_matches[missing] = resume_skill

        return semantic_matches

    def _calculate_experience_match(self, resume_years: float, jd_years: float) -> float:
        """Calculate experience match score."""
        if jd_years <= 0:
            return 1.0
        return min(1.0, resume_years / jd_years)

    def _calculate_education_match(self, resume_level: int, jd_level: int) -> float:
        """
        Calculate education match score.

        Levels: 0=HS, 1=Bachelor, 2=Master, 3=PhD
        """
        if jd_level <= 0:
            return 1.0
        if resume_level >= jd_level:
            return 1.0
        # Partial credit for being one level below
        if resume_level == jd_level - 1:
            return 0.7
        return 0.3

    def extract_skills(self, text: str) -> set[str]:
        """Extract skills from text using ontology + NER."""
        skills = set()
        text_lower = text.lower()

        # Method 1: Ontology lookup (case-insensitive)
        for skill, synonyms in SKILL_ONTOLOGY.items():
            for synonym in synonyms:
                if synonym.lower() in text_lower:
                    skills.add(skill)
                    break

        # Method 2: spaCy NER for custom entities
        doc = self.nlp(text)
        for ent in doc.ents:
            # Check if entity matches any skill pattern
            if ent.label_ in ["PRODUCT", "ORG", "SKILL"]:
                canonical = get_canonical_skill(ent.text)
                if canonical:
                    skills.add(canonical)

        return skills

    def extract_years_experience(self, text: str) -> float:
        """Extract years of experience from text."""
        # Pattern: "X years", "X+ years", "X-Y years"
        patterns = [
            r"(\d+)\+?\s*(?:years?|yrs?|y\.o\.e)",
            r"(\d+)\s*-\s*(\d+)\s*years?",
        ]

        total_years = 0.0

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    # Range: take average
                    years = (int(match[0]) + int(match[1])) / 2
                else:
                    years = int(match)
                total_years = max(total_years, years)

        # Also check for experience in section headers
        exp_section = re.search(
            r"(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|work|professional)",
            text,
            re.IGNORECASE,
        )
        if exp_section:
            years = int(exp_section.group(1))
            total_years = max(total_years, years)

        return total_years

    def extract_education_level(self, text: str) -> int:
        """
        Extract education level from text.

        Returns:
            0=HS, 1=Bachelor, 2=Master, 3=PhD
        """
        text_lower = text.lower()

        # PhD indicators
        if any(term in text_lower for term in ["phd", "ph.d", "doctor of philosophy", "doctorate"]):
            return 3

        # Master indicators
        if any(
            term in text_lower
            for term in ["master", "m.s.", "ms", "m.a.", "ma", "mba", "master of science", "master of arts"]
        ):
            return 2

        # Bachelor indicators
        if any(
            term in text_lower
            for term in [
                "bachelor",
                "b.s.",
                "bs",
                "b.a.",
                "ba",
                "bachelor of science",
                "bachelor of arts",
                "undergraduate degree",
                "four-year degree",
            ]
        ):
            return 1

        # High school or none found
        return 0

    def _generate_suggestions(
        self,
        missing_skills: set[str],
        semantic_matches: dict[str, str],
        resume_skills: set[str],
        jd_skills: set[str],
    ) -> list[str]:
        """Generate actionable improvement suggestions."""
        suggestions = []

        # Top priority: Add critical missing skills
        priority_skills = list(missing_skills)[:5]
        for skill in priority_skills:
            suggestions.append(f"Add '{skill}' to your Skills section")

        # Mention semantic matches (already covered)
        if semantic_matches:
            matched_values = list(set(semantic_matches.values()))[:3]
            matched_keys = list(semantic_matches.keys())[:3]
            if matched_values and matched_keys:
                suggestions.append(
                    f"Good news! Your experience with {', '.join(matched_values)} "
                    f"may cover {', '.join(matched_keys)}"
                )

        # Keyword optimization
        jd_keywords = jd_skills - resume_skills - missing_skills
        if jd_keywords:
            suggestions.append(
                f"Consider mentioning {', '.join(list(jd_keywords)[:3])} in your experience bullets"
            )

        return suggestions[:10]  # Limit to 10 suggestions


# Singleton instance
_matcher_instance: JobMatcher | None = None


def get_matcher() -> JobMatcher:
    """Get singleton JobMatcher instance."""
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = JobMatcher()
    return _matcher_instance
