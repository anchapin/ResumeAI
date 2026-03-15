"""
AI Enhancer Service using Claude and GPT-4o.

Provides AI-powered writing enhancements including:
- Bullet point enhancement
- Achievement quantification
- STAR/CAR transformation
- ATS keyword optimization

Uses a hybrid multi-provider strategy for cost optimization and reliability.
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Literal

import httpx

from .models import Enhancement, Suggestion

logger = logging.getLogger(__name__)


# Prompt templates for different enhancement types
ACTION_VERB_ENHANCEMENT_PROMPT = """
Analyze this resume bullet point and suggest stronger action verbs.

Bullet: {bullet}
Role: {role}
Industry: {industry}

Provide 3 alternative versions with stronger, more impactful action verbs.
Focus on achievement-oriented language.

Return JSON in this exact format:
{{
  "original": "{bullet}",
  "suggestions": [
    {{"version": "string", "verb_change": "string", "explanation": "string"}}
  ]
}}
"""

ACHIEVEMENT_QUANTIFICATION_PROMPT = """
Analyze this resume bullet point and suggest ways to add quantifiable metrics.

Bullet: {bullet}
Role: {role}

Identify opportunities to add:
- Percentages (% improvement, % reduction)
- Dollar amounts ($ budget, $ revenue)
- Time metrics (hours saved, days reduced)
- Volume metrics (# of users, # of projects)
- Rankings (top X%, #1 in region)

Return JSON in this exact format:
{{
  "original": "{bullet}",
  "quantified_versions": [
    {{"version": "string", "metric_type": "percentage|dollar|time|volume|ranking", "explanation": "string"}}
  ],
  "suggested_questions": ["What was the baseline?", "What was the impact?"]
}}
"""

STAR_TRANSFORMATION_PROMPT = """
Transform this resume bullet point using the STAR method (Situation-Task-Action-Result).

Bullet: {bullet}
Context: {context}

STAR Framework:
- Situation: What was the context/challenge?
- Task: What was your responsibility?
- Action: What specific actions did you take?
- Result: What was the measurable outcome?

Return JSON in this exact format:
{{
  "original": "{bullet}",
  "star_version": "string",
  "breakdown": {{
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string"
  }}
}}
"""

ATS_OPTIMIZATION_PROMPT = """
Optimize this resume bullet point for ATS (Applicant Tracking System) and job description alignment.

Bullet: {bullet}
Job Description Keywords: {jd_keywords}
Role: {role}

Guidelines:
- Mirror keywords from job description naturally
- Use standard industry terminology
- Avoid jargon, acronyms, or special characters
- Maintain readability while optimizing for keyword match

Return JSON in this exact format:
{{
  "original": "{bullet}",
  "optimized_version": "string",
  "keywords_added": ["keyword1", "keyword2"],
  "match_score_before": 0-100,
  "match_score_after": 0-100
}}
"""


@dataclass
class AIEnhancerConfig:
    """Configuration for AIEnhancer."""

    # Primary provider (Claude)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # Fallback provider (GPT-4o-mini)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Caching
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 86400  # 24 hours
    use_cache: bool = True

    # Timeouts
    request_timeout_seconds: float = 30.0
    max_retries: int = 3

    # Feature flags
    enabled: bool = True
    streaming_enabled: bool = True


class CircuitBreaker:
    """Simple circuit breaker for API calls."""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time: float | None = None
        self.state: Literal["closed", "open", "half-open"] = "closed"

    def record_success(self):
        """Record a successful call."""
        self.failures = 0
        self.state = "closed"

    def record_failure(self):
        """Record a failed call."""
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(
                f"Circuit breaker opened after {self.failures} failures"
            )

    def can_execute(self) -> bool:
        """Check if execution is allowed."""
        if self.state == "closed":
            return True

        if self.state == "open":
            if (
                self.last_failure_time
                and time.time() - self.last_failure_time
                > self.recovery_timeout
            ):
                self.state = "half-open"
                return True
            return False

        # half-open: allow one request to test
        return True


class AIEnhancer:
    """
    AI-powered writing enhancement service.

    Uses a hybrid multi-provider strategy:
    - Primary: Anthropic Claude 3.5 Sonnet (best quality)
    - Fallback: OpenAI GPT-4o-mini (cost-effective, fast)

    Features:
    - Bullet point enhancement
    - Achievement quantification
    - STAR/CAR transformation
    - ATS keyword optimization
    - Multi-layer caching
    - Circuit breaker for resilience

    Example:
        enhancer = AIEnhancer(config)
        enhancement = await enhancer.enhance_bullet(
            "Helped with the project",
            {"role": "Software Engineer"}
        )
    """

    def __init__(self, config: AIEnhancerConfig | None = None):
        """
        Initialize AIEnhancer.

        Args:
            config: Configuration object. Uses defaults if not provided.
        """
        self.config = config or AIEnhancerConfig()
        self._client = httpx.AsyncClient(
            timeout=self.config.request_timeout_seconds
        )
        self._circuit_breaker_claude = CircuitBreaker()
        self._circuit_breaker_openai = CircuitBreaker()
        self._cache: dict[str, Any] = {}  # In-memory cache (use Redis in prod)

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    def _generate_cache_key(
        self, operation: str, text: str, context: dict[str, Any]
    ) -> str:
        """Generate a cache key for the given operation and input."""
        key_data = json.dumps(
            {"operation": operation, "text": text, "context": context},
            sort_keys=True,
        )
        return hashlib.sha256(key_data.encode()).hexdigest()

    async def _get_from_cache(self, key: str) -> Any | None:
        """Get value from cache."""
        if not self.config.use_cache:
            return None

        # Check in-memory cache
        if key in self._cache:
            logger.debug(f"Cache hit for key: {key[:16]}...")
            return self._cache[key]

        return None

    async def _set_cache(self, key: str, value: Any):
        """Set value in cache."""
        if not self.config.use_cache:
            return

        self._cache[key] = value
        logger.debug(f"Cached result for key: {key[:16]}...")

    async def _call_claude(
        self, prompt: str, system_prompt: str = ""
    ) -> str:
        """
        Call Anthropic Claude API.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Returns:
            Model response text
        """
        if not self.config.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")

        if not self._circuit_breaker_claude.can_execute():
            raise Exception("Circuit breaker open for Claude API")

        try:
            response = await self._client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.config.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.config.anthropic_model,
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["content"][0]["text"]

            self._circuit_breaker_claude.record_success()
            return content

        except httpx.HTTPError as e:
            self._circuit_breaker_claude.record_failure()
            logger.error(f"Claude API error: {e}")
            raise

    async def _call_openai(
        self, prompt: str, system_prompt: str = ""
    ) -> str:
        """
        Call OpenAI GPT API.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Returns:
            Model response text
        """
        if not self.config.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        if not self._circuit_breaker_openai.can_execute():
            raise Exception("Circuit breaker open for OpenAI API")

        try:
            response = await self._client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            self._circuit_breaker_openai.record_success()
            return content

        except httpx.HTTPError as e:
            self._circuit_breaker_openai.record_failure()
            logger.error(f"OpenAI API error: {e}")
            raise

    async def _call_llm(
        self, prompt: str, system_prompt: str = ""
    ) -> str:
        """
        Call LLM with fallback strategy.

        Tries Claude first, falls back to GPT-4o-mini on failure.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Returns:
            Model response text
        """
        # Try Claude first
        if self.config.anthropic_api_key:
            try:
                return await self._call_claude(prompt, system_prompt)
            except Exception as e:
                logger.warning(
                    f"Claude failed, falling back to GPT-4o-mini: {e}"
                )

        # Fallback to GPT-4o-mini
        if self.config.openai_api_key:
            return await self._call_openai(prompt, system_prompt)

        raise ValueError("No LLM provider configured")

    def _parse_json_response(self, response: str) -> dict[str, Any]:
        """Parse JSON from LLM response."""
        # Extract JSON from response (handle markdown code blocks)
        import re

        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response, re.DOTALL)
        if json_match:
            response = json_match.group(1)

        return json.loads(response)

    async def enhance_bullet(
        self, bullet: str, context: dict[str, Any]
    ) -> Enhancement:
        """
        Enhance a resume bullet point with stronger action verbs.

        Args:
            bullet: The bullet point text
            context: Additional context (role, industry, etc.)

        Returns:
            Enhancement object with improved versions
        """
        if not self.config.enabled:
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="action_verbs",
                changes=[],
                confidence=0.0,
                explanation="AI enhancement disabled",
            )

        cache_key = self._generate_cache_key(
            "enhance_bullet", bullet, context
        )
        cached = await self._get_from_cache(cache_key)
        if cached:
            return Enhancement(**cached)

        role = context.get("role", "Professional")
        industry = context.get("industry", "General")

        prompt = ACTION_VERB_ENHANCEMENT_PROMPT.format(
            bullet=bullet, role=role, industry=industry
        )

        try:
            response = await self._call_llm(
                prompt,
                "You are an expert resume writer. Return only valid JSON.",
            )
            data = self._parse_json_response(response)

            suggestions = data.get("suggestions", [])
            best_suggestion = suggestions[0] if suggestions else {}

            result = Enhancement(
                original=bullet,
                enhanced=best_suggestion.get("version", bullet),
                enhancement_type="action_verbs",
                changes=[
                    {
                        "type": "verb_replacement",
                        "original": bullet,
                        "suggested": best_suggestion.get("version", ""),
                        "explanation": best_suggestion.get("explanation", ""),
                    }
                ],
                confidence=0.85,
                explanation="Enhanced with stronger action verbs",
            )

            await self._set_cache(cache_key, result.__dict__)
            return result

        except Exception as e:
            logger.error(f"Error enhancing bullet: {e}")
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="action_verbs",
                changes=[],
                confidence=0.0,
                explanation=f"Enhancement failed: {str(e)}",
            )

    async def quantify_achievement(self, bullet: str, role: str = "") -> Enhancement:
        """
        Add quantifiable metrics to a bullet point.

        Args:
            bullet: The bullet point text
            role: Optional role context

        Returns:
            Enhancement object with quantified versions
        """
        if not self.config.enabled:
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="quantification",
                changes=[],
                confidence=0.0,
                explanation="AI enhancement disabled",
            )

        cache_key = self._generate_cache_key(
            "quantify_achievement", bullet, {"role": role}
        )
        cached = await self._get_from_cache(cache_key)
        if cached:
            return Enhancement(**cached)

        prompt = ACHIEVEMENT_QUANTIFICATION_PROMPT.format(
            bullet=bullet, role=role
        )

        try:
            response = await self._call_llm(
                prompt,
                "You are an expert resume writer. Return only valid JSON.",
            )
            data = self._parse_json_response(response)

            quantified_versions = data.get("quantified_versions", [])
            best_version = (
                quantified_versions[0].get("version", bullet)
                if quantified_versions
                else bullet
            )

            result = Enhancement(
                original=bullet,
                enhanced=best_version,
                enhancement_type="quantification",
                changes=[
                    {
                        "type": "metric_added",
                        "original": bullet,
                        "suggested": best_version,
                        "metric_type": quantified_versions[0].get(
                            "metric_type", ""
                        )
                        if quantified_versions
                        else "",
                    }
                ],
                confidence=0.8,
                explanation="Added quantifiable metrics to demonstrate impact",
            )

            await self._set_cache(cache_key, result.__dict__)
            return result

        except Exception as e:
            logger.error(f"Error quantifying achievement: {e}")
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="quantification",
                changes=[],
                confidence=0.0,
                explanation=f"Quantification failed: {str(e)}",
            )

    async def transform_to_star(
        self, bullet: str, context: str = ""
    ) -> Enhancement:
        """
        Transform bullet point using STAR method.

        Args:
            bullet: The bullet point text
            context: Additional context about the situation

        Returns:
            Enhancement object with STAR-formatted version
        """
        if not self.config.enabled:
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="star_transformation",
                changes=[],
                confidence=0.0,
                explanation="AI enhancement disabled",
            )

        cache_key = self._generate_cache_key(
            "star_transform", bullet, {"context": context}
        )
        cached = await self._get_from_cache(cache_key)
        if cached:
            return Enhancement(**cached)

        prompt = STAR_TRANSFORMATION_PROMPT.format(
            bullet=bullet, context=context
        )

        try:
            response = await self._call_llm(
                prompt,
                "You are an expert resume writer. Return only valid JSON.",
            )
            data = self._parse_json_response(response)

            result = Enhancement(
                original=bullet,
                enhanced=data.get("star_version", bullet),
                enhancement_type="star_transformation",
                changes=[
                    {
                        "type": "star_transformation",
                        "breakdown": data.get("breakdown", {}),
                    }
                ],
                confidence=0.85,
                explanation="Transformed using STAR method (Situation-Task-Action-Result)",
            )

            await self._set_cache(cache_key, result.__dict__)
            return result

        except Exception as e:
            logger.error(f"Error transforming to STAR: {e}")
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="star_transformation",
                changes=[],
                confidence=0.0,
                explanation=f"STAR transformation failed: {str(e)}",
            )

    async def optimize_for_ats(
        self, bullet: str, jd_keywords: list[str], role: str = ""
    ) -> Enhancement:
        """
        Optimize bullet point for ATS keyword matching.

        Args:
            bullet: The bullet point text
            jd_keywords: Keywords from job description
            role: Optional role context

        Returns:
            Enhancement object with ATS-optimized version
        """
        if not self.config.enabled:
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="ats_optimization",
                changes=[],
                confidence=0.0,
                explanation="AI enhancement disabled",
            )

        cache_key = self._generate_cache_key(
            "ats_optimize", bullet, {"keywords": jd_keywords, "role": role}
        )
        cached = await self._get_from_cache(cache_key)
        if cached:
            return Enhancement(**cached)

        keywords_str = ", ".join(jd_keywords)
        prompt = ATS_OPTIMIZATION_PROMPT.format(
            bullet=bullet, jd_keywords=keywords_str, role=role
        )

        try:
            response = await self._call_llm(
                prompt,
                "You are an ATS optimization expert. Return only valid JSON.",
            )
            data = self._parse_json_response(response)

            result = Enhancement(
                original=bullet,
                enhanced=data.get("optimized_version", bullet),
                enhancement_type="ats_optimization",
                changes=[
                    {
                        "type": "keywords_added",
                        "keywords": data.get("keywords_added", []),
                        "match_score_before": data.get("match_score_before", 0),
                        "match_score_after": data.get("match_score_after", 0),
                    }
                ],
                confidence=0.8,
                explanation=f"Optimized for ATS with keywords: {', '.join(jd_keywords)}",
            )

            await self._set_cache(cache_key, result.__dict__)
            return result

        except Exception as e:
            logger.error(f"Error optimizing for ATS: {e}")
            return Enhancement(
                original=bullet,
                enhanced=bullet,
                enhancement_type="ats_optimization",
                changes=[],
                confidence=0.0,
                explanation=f"ATS optimization failed: {str(e)}",
            )

    async def get_enhancement_suggestions(
        self, text: str, context: dict[str, Any]
    ) -> list[Suggestion]:
        """
        Get AI-powered enhancement suggestions for text.

        Args:
            text: The text to analyze
            context: Additional context (section type, role, etc.)

        Returns:
            List of enhancement suggestions
        """
        suggestions = []

        # Get enhancement based on section type
        section_type = context.get("section_type", "")

        if section_type in ("experience", "projects"):
            # Suggest action verb enhancement
            enhancement = await self.enhance_bullet(text, context)
            if enhancement.changes:
                suggestions.append(
                    Suggestion(
                        id=f"ai_enhance_{hash(text) % 10000}",
                        type="enhancement",
                        severity="info",
                        message="Enhance this bullet with stronger action verbs",
                        offset=0,
                        length=len(text),
                        replacements=[enhancement.enhanced],
                        explanation=enhancement.explanation,
                        rule_id="AI_ENHANCEMENT",
                        confidence=enhancement.confidence,
                        metadata={"enhancement_type": "action_verbs"},
                    )
                )

        return suggestions
