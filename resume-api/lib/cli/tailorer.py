"""
AI-powered Resume Tailorer.

This module provides functionality to tailor resumes to specific
job descriptions using AI providers (OpenAI, Anthropic, Google).
"""

import json
import logging
import os
import re
from typing import Dict, Any, List, Optional

try:
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResumeTailorer:
    """
    Tailor resumes to match job descriptions using AI.
    """

    def __init__(
        self,
        ai_provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize the ResumeTailorer.

        Args:
            ai_provider: AI provider to use ('openai', 'claude', 'gemini')
            api_key: API key for the AI provider
            model: Model name to use
        """
        self.ai_provider = ai_provider.lower()
        self.api_key = api_key or os.getenv(f"{self.ai_provider.upper()}_API_KEY")
        self.model = model or os.getenv("AI_MODEL")

        # Validate provider
        if self.ai_provider not in ["openai", "claude", "gemini"]:
            raise ValueError(
                f"Invalid AI provider: {ai_provider}. " "Must be 'openai', 'claude', or 'gemini'"
            )

        # Initialize AI client
        self._init_ai_client()

        logger.info(f"Initialized ResumeTailorer with {self.ai_provider}")

    def _init_ai_client(self):
        """Initialize the AI client based on provider."""
        if self.ai_provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError("openai package not installed")
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            base_url = os.getenv("OPENAI_BASE_URL")
            client_kwargs = {"api_key": self.api_key}
            if base_url:
                client_kwargs["base_url"] = base_url
            self.client = openai.OpenAI(**client_kwargs)
            self._call_ai = self._call_openai
            if not self.model:
                self.model = "gpt-4o"

        elif self.ai_provider == "claude":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("anthropic package not installed")
            if not self.api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")
            base_url = os.getenv("ANTHROPIC_BASE_URL")
            client_kwargs = {"api_key": self.api_key}
            if base_url:
                client_kwargs["base_url"] = base_url
            self.client = anthropic.Anthropic(**client_kwargs)
            self._call_ai = self._call_anthropic
            if not self.model:
                self.model = "claude-3-5-sonnet-20241022"

        elif self.ai_provider == "gemini":
            # Gemini falls back to OpenAI-compatible client
            if not OPENAI_AVAILABLE:
                raise ImportError("openai package not installed (used for Gemini)")
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self._call_ai = self._call_openai
            if not self.model:
                self.model = "gemini-1.5-pro"

    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API."""
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=4000,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic API."""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            temperature=0.4,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        company_name: str,
        job_title: str,
    ) -> Dict[str, Any]:
        """
        Tailor a resume to match a job description.

        Args:
            resume_data: Original resume data in JSON Resume format
            job_description: Job description text
            company_name: Name of the company
            job_title: Title of the position

        Returns:
            Tailored resume data in JSON Resume format
        """
        logger.info(f"Tailoring resume for {company_name} - {job_title}")

        prompt = self._build_tailor_prompt(resume_data, job_description, company_name, job_title)

        response = self._call_ai(prompt)
        tailored_data = self._parse_tailor_response(response, resume_data)

        logger.info("Resume tailoring completed")
        return tailored_data

    def _build_tailor_prompt(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        company_name: str,
        job_title: str,
    ) -> str:
        """Build the prompt for resume tailoring."""
        resume_json = json.dumps(resume_data, indent=2, default=str)

        return f"""You are an expert resume writer and career coach. Tailor the following resume to better match the job description.

RESUME DATA (JSON Resume format):
{resume_json}

JOB DETAILS:
Company: {company_name or "Not specified"}
Position: {job_title or "Not specified"}
Job Description:
{job_description}

INSTRUCTIONS:
1. Rewrite the professional summary to align with the job requirements
2. Reorder work experience entries so the most relevant appear first
3. Rewrite bullet points (highlights) to emphasize skills and achievements relevant to this role
4. Add quantifiable metrics where possible (percentages, dollar amounts, team sizes)
5. Ensure keywords from the job description appear naturally in the resume
6. Keep all factual information accurate — do NOT invent new positions, companies, or degrees
7. Preserve the JSON Resume schema structure exactly

Return ONLY a valid JSON object matching the exact same JSON Resume schema as the input. Do not include any text outside the JSON."""

    def _parse_tailor_response(
        self, response: str, original_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse AI response into tailored resume data."""
        try:
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                tailored = json.loads(json_match.group(0))
                # Validate that the response has at least basics or work
                if isinstance(tailored, dict) and ("basics" in tailored or "work" in tailored):
                    return tailored
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Failed to parse AI tailoring response, using original data")

        # Fallback: return original data unchanged
        return original_data

    def extract_keywords(self, job_description: str) -> List[str]:
        """
        Extract keywords from a job description using AI.

        Args:
            job_description: Job description text

        Returns:
            List of extracted keywords
        """
        prompt = f"""Extract the most important technical skills, tools, qualifications, and industry keywords from this job description.

JOB DESCRIPTION:
{job_description}

Return ONLY a JSON array of keyword strings, ordered by importance. Maximum 30 keywords. Example: ["Python", "Machine Learning", "AWS"]
Return ONLY valid JSON, nothing else."""

        try:
            response = self._call_ai(prompt)
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if json_match:
                keywords = json.loads(json_match.group(0))
                if isinstance(keywords, list):
                    return [str(k) for k in keywords[:30]]
        except Exception:
            logger.warning("AI keyword extraction failed, using fallback")

        # Fallback: simple text-based extraction
        return self._extract_keywords_fallback(job_description)

    def _extract_keywords_fallback(self, job_description: str) -> List[str]:
        """Fallback keyword extraction without AI."""
        text = re.sub(r"[^\w\s]", " ", job_description.lower())
        words = text.split()
        stop_words = {
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "was",
            "one",
            "our",
            "has",
            "have",
            "been",
            "this",
            "that",
            "with",
            "they",
            "from",
            "which",
            "will",
            "would",
            "about",
            "should",
            "could",
            "their",
            "your",
            "also",
            "more",
            "into",
            "than",
            "some",
            "such",
            "only",
            "over",
            "most",
        }
        keywords = [w for w in words if len(w) > 2 and w not in stop_words]
        word_freq: Dict[str, int] = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        sorted_kw = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_kw[:20]]

    def suggest_improvements(self, resume_data: Dict[str, Any], job_description: str) -> List[str]:
        """
        Suggest improvements to a resume based on a job description using AI.

        Args:
            resume_data: Current resume data
            job_description: Job description text

        Returns:
            List of improvement suggestions
        """
        resume_json = json.dumps(resume_data, indent=2, default=str)

        prompt = f"""You are an expert career coach. Compare this resume against the job description and provide specific, actionable improvement suggestions.

RESUME:
{resume_json}

JOB DESCRIPTION:
{job_description}

Provide 5-8 specific suggestions. Focus on:
- Missing skills or keywords that should be added
- Bullet points that could be strengthened with metrics
- Sections that could better match the job requirements
- Formatting or ordering improvements

Return ONLY a JSON array of suggestion strings. Example: ["Add Python to your skills section", "Quantify your impact in the TechCorp role"]
Return ONLY valid JSON, nothing else."""

        try:
            response = self._call_ai(prompt)
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if json_match:
                suggestions = json.loads(json_match.group(0))
                if isinstance(suggestions, list):
                    return [str(s) for s in suggestions[:8]]
        except Exception:
            logger.warning("AI suggestion generation failed, using fallback")

        # Fallback
        return self._suggest_improvements_fallback(resume_data, job_description)

    def _suggest_improvements_fallback(
        self, resume_data: Dict[str, Any], job_description: str
    ) -> List[str]:
        """Fallback suggestions without AI."""
        suggestions = []
        resume_text = str(resume_data).lower()
        keywords = self._extract_keywords_fallback(job_description)
        missing = [kw for kw in keywords[:10] if kw not in resume_text]

        if missing:
            suggestions.append(f"Consider incorporating these keywords: {', '.join(missing[:5])}")

        if not re.search(r"\d+%|\$\d+|\d+\+ years", resume_text):
            suggestions.append(
                "Add quantifiable metrics to your achievements " "(e.g., 'increased sales by 25%')"
            )

        if "basics" in resume_data and isinstance(resume_data["basics"], dict):
            summary = resume_data["basics"].get("summary", "")
            if summary and len(summary) < 100:
                suggestions.append(
                    "Expand your professional summary to better showcase your qualifications"
                )

        if not suggestions:
            suggestions = [
                "Tailor your resume to the specific job requirements",
                "Use strong action verbs at the beginning of bullet points",
                "Ensure your formatting is consistent throughout",
            ]

        return suggestions


# Mock version for testing without AI API keys
class MockResumeTailorer:
    """
    Mock tailorer for testing without requiring AI API keys.
    """

    def __init__(self, **kwargs):
        """Initialize mock tailorer."""
        self.ai_provider = "mock"

    def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        company_name: str,
        job_title: str,
    ) -> Dict[str, Any]:
        """Mock tailoring - just adds metadata."""
        tailored_data = resume_data.copy()
        tailored_data["_tailored"] = True
        tailored_data["_tailored_for"] = {
            "company": company_name,
            "job_title": job_title,
            "ai_provider": "mock",
        }

        # Add relevance scores to experience
        if "work" in tailored_data and isinstance(tailored_data["work"], list):
            for exp in tailored_data["work"]:
                if isinstance(exp, dict):
                    exp["_tailored"] = True
                    exp["_relevance_score"] = 0.75

        return tailored_data

    def extract_keywords(self, job_description: str) -> List[str]:
        """Extract keywords from job description."""
        # Simple keyword extraction
        import re

        words = re.findall(r"\b[a-zA-Z]{3,}\b", job_description.lower())
        return list(set(words))[:20]

    def suggest_improvements(self, resume_data: Dict[str, Any], job_description: str) -> List[str]:
        """Provide mock improvement suggestions."""
        return [
            "Add more quantifiable achievements",
            "Include relevant keywords from job description",
            "Improve formatting consistency",
        ]
