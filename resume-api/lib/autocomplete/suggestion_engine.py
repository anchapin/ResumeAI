"""
Suggestion Engine Service

Generates AI-powered completion suggestions.
"""

import hashlib
import logging
import time
from typing import Any

from .models import CompletionSuggestion, CompletionRequest, CompletionResponse

logger = logging.getLogger(__name__)


# Prompt templates for different completion types
INLINE_COMPLETION_PROMPT = """Complete this resume bullet point naturally. Continue from where the cursor is.

Current text: {text}
Section: {section_type}
Role: {role}

Provide 3 natural continuations that complete the sentence professionally.
Return as JSON array of strings."""

BULLET_COMPLETION_PROMPT = """Generate {limit} professional bullet points for a {section_type} section.

Role: {role}
Industry: {industry}
Seniority: {seniority}

Each bullet should:
- Start with a strong action verb
- Include quantifiable impact where possible
- Be specific and achievement-oriented

Return as JSON array of strings."""


class SuggestionEngine:
    """
    Generate AI-powered completion suggestions.

    Uses LLM (Claude/GPT-4o-mini) with caching for fast responses.

    Example:
        engine = SuggestionEngine(llm_client, cache)
        response = await engine.get_completions(request)
    """

    def __init__(self, llm_client=None, cache=None):
        """
        Initialize SuggestionEngine.

        Args:
            llm_client: LLM client (Claude/GPT-4o-mini)
            cache: Cache for storing completions
        """
        self.llm_client = llm_client
        self.cache = cache

    async def get_completions(
        self,
        request: CompletionRequest,
    ) -> CompletionResponse:
        """
        Get completion suggestions for text.

        Args:
            request: Completion request

        Returns:
            CompletionResponse with suggestions
        """
        start_time = time.time()

        # Check cache first
        cache_key = self._get_cache_key(request)
        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return CompletionResponse(
                    completions=[
                        CompletionSuggestion(
                            id=f"cache_{i}",
                            text=item,
                            type="inline",
                            confidence=0.9,
                            source="cache",
                        )
                        for i, item in enumerate(cached)
                    ],
                    context={"section_type": request.section_type},
                    processing_time_ms=5,
                )

        # Generate completions from LLM
        completions = await self._generate_completions(request)

        # Cache results
        if self.cache and completions:
            await self.cache.set(
                cache_key,
                [c.text for c in completions],
                ttl=3600,  # 1 hour
            )

        processing_time = (time.time() - start_time) * 1000

        return CompletionResponse(
            completions=completions,
            context={"section_type": request.section_type},
            processing_time_ms=processing_time,
        )

    async def get_bullet_completions(
        self,
        section_type: str,
        role: str | None = None,
        industry: str | None = None,
        seniority: str | None = None,
        limit: int = 3,
    ) -> list[str]:
        """
        Get bullet point completions.

        Args:
            section_type: Type of section (experience, projects, etc.)
            role: Job role/title
            industry: Industry
            seniority: Seniority level
            limit: Number of bullets to generate

        Returns:
            List of bullet point strings
        """
        # Check cache
        cache_key = f"bullet:{section_type}:{role}:{industry}:{seniority}:{limit}"
        if self.cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached

        # Generate from LLM
        bullets = await self._generate_bullet_completions(
            section_type, role, industry, seniority, limit
        )

        # Cache results
        if self.cache:
            await self.cache.set(cache_key, bullets, ttl=86400)  # 24 hours

        return bullets

    async def _generate_completions(
        self,
        request: CompletionRequest,
    ) -> list[CompletionSuggestion]:
        """Generate completions using LLM."""
        if not self.llm_client:
            # Fallback to template-based completions
            return self._get_template_completions(request)

        try:
            prompt = INLINE_COMPLETION_PROMPT.format(
                text=request.text,
                section_type=request.section_type or "experience",
                role=request.role or "Professional",
            )

            response = await self.llm_client.generate(
                prompt,
                max_tokens=200,
                temperature=0.7,
            )

            # Parse response (expecting JSON array)
            import json

            completions_text = json.loads(response)

            return [
                CompletionSuggestion(
                    id=f"comp_{i}_{hashlib.md5(c.encode()).hexdigest()[:8]}",
                    text=c,
                    type="inline",
                    confidence=0.8,
                    source="llm",
                )
                for i, c in enumerate(completions_text[: request.limit])
            ]

        except Exception as e:
            logger.error(f"LLM completion failed: {e}")
            return self._get_template_completions(request)

    async def _generate_bullet_completions(
        self,
        section_type: str,
        role: str | None,
        industry: str | None,
        seniority: str | None,
        limit: int,
    ) -> list[str]:
        """Generate bullet point completions using LLM."""
        if not self.llm_client:
            return self._get_template_bullets(section_type, role, limit)

        try:
            prompt = BULLET_COMPLETION_PROMPT.format(
                limit=limit,
                section_type=section_type,
                role=role or "Professional",
                industry=industry or "General",
                seniority=seniority or "Mid-level",
            )

            response = await self.llm_client.generate(
                prompt,
                max_tokens=500,
                temperature=0.7,
            )

            # Parse response
            import json

            bullets = json.loads(response)
            return bullets[:limit]

        except Exception as e:
            logger.error(f"Bullet generation failed: {e}")
            return self._get_template_bullets(section_type, role, limit)

    def _get_template_completions(
        self,
        request: CompletionRequest,
    ) -> list[CompletionSuggestion]:
        """Get template-based completions (fallback)."""
        templates = self._get_section_templates(request.section_type)

        return [
            CompletionSuggestion(
                id=f"template_{i}",
                text=template,
                type="inline",
                confidence=0.5,
                source="template",
            )
            for i, template in enumerate(templates[: request.limit])
        ]

    def _get_template_bullets(
        self,
        section_type: str,
        role: str | None,
        limit: int,
    ) -> list[str]:
        """Get template bullet points (fallback)."""
        templates = self._get_section_templates(section_type)
        return templates[:limit]

    def _get_section_templates(self, section_type: str | None) -> list[str]:
        """Get template bullets for section type."""
        templates = {
            "experience": [
                "Led development of new features that improved user engagement by 25%",
                "Collaborated with cross-functional teams to deliver projects on time",
                "Optimized system performance, reducing latency by 40%",
                "Mentored junior developers and conducted code reviews",
                "Implemented automated testing, increasing code coverage to 85%",
            ],
            "projects": [
                "Built a full-stack web application using React and Node.js",
                "Developed machine learning model with 95% accuracy",
                "Created RESTful API serving 10,000+ daily requests",
                "Designed and implemented database schema for scalable application",
            ],
            "education": [
                "Bachelor of Science in Computer Science",
                "Master of Science in Software Engineering",
                "Relevant coursework: Data Structures, Algorithms, System Design",
            ],
            "skills": [
                "Programming Languages: Python, JavaScript, TypeScript, Java",
                "Frameworks: React, Node.js, Django, FastAPI",
                "Tools: Git, Docker, Kubernetes, AWS",
            ],
        }

        return templates.get(section_type, templates["experience"])

    def _get_cache_key(self, request: CompletionRequest) -> str:
        """Generate cache key for request."""
        key_data = f"{request.text}:{request.cursor_position}:{request.section_type}:{request.role}"
        return f"completion:{hashlib.md5(key_data.encode()).hexdigest()}"
