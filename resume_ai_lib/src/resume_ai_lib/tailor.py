"""
AI-powered Resume Tailoring.

This module provides functionality to tailor resumes to specific job descriptions
using AI providers (OpenAI, Anthropic).
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Try to import AI libraries
try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ResumeTailorer:
    """
    Tailor resumes to match job descriptions using AI.

    Supports multiple AI providers:
    - OpenAI (GPT models)
    - Anthropic (Claude models)
    """

    def __init__(
        self,
        ai_provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        """
        Initialize the ResumeTailorer.

        Args:
            ai_provider: AI provider to use ('openai' or 'anthropic')
            api_key: API key for the AI provider
            model: Model name to use
            base_url: Optional base URL for custom API endpoints
        """
        self.ai_provider = ai_provider.lower()
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.client = None

        # Validate provider
        if self.ai_provider not in ["openai", "anthropic"]:
            raise ValueError(
                f"Invalid AI provider: {ai_provider}. "
                "Must be 'openai' or 'anthropic'"
            )

        # Check availability
        if self.ai_provider == "openai" and not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package not installed. Install with: pip install openai"
            )
        if self.ai_provider == "anthropic" and not ANTHROPIC_AVAILABLE:
            raise ImportError(
                "anthropic package not installed. Install with: pip install anthropic"
            )

        # Initialize AI client
        self._init_ai_client()

        logger.info(f"Initialized ResumeTailorer with {self.ai_provider}")

    def _init_ai_client(self):
        """Initialize the AI client based on provider."""
        if self.ai_provider == "openai":
            client_kwargs: Dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                client_kwargs["base_url"] = self.base_url
            self.client = openai.OpenAI(**client_kwargs)
            if not self.model:
                self.model = "gpt-4-turbo-preview"

        elif self.ai_provider == "anthropic":
            client_kwargs: Dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                client_kwargs["base_url"] = self.base_url
            self.client = anthropic.Anthropic(**client_kwargs)
            if not self.model:
                self.model = "claude-3-5-sonnet-20241022"

    def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
    ) -> Dict[str, Any]:
        """
        Tailor a resume to match a job description.

        Args:
            resume_data: Original resume data
            job_description: Job description text

        Returns:
            Tailored resume data
        """
        logger.info("Tailoring resume for job description")

        # Extract keywords from job description
        keywords = self.extract_keywords(job_description)

        # Match and score experience
        tailored_data = resume_data.copy()

        # Add tailoring metadata
        tailored_data["_tailored"] = True
        tailored_data["_tailored_for"] = {
            "keywords": keywords,
            "ai_provider": self.ai_provider,
            "model": self.model,
        }

        # Tailor experience section if exists
        if "experience" in tailored_data and isinstance(
            tailored_data["experience"], list
        ):
            for exp in tailored_data["experience"]:
                if isinstance(exp, dict):
                    exp["_tailored"] = True
                    # Calculate relevance score based on keyword matching
                    exp["_relevance_score"] = self._calculate_relevance(exp, keywords)

        # Also handle "work" field (JSON Resume format)
        if "work" in tailored_data and isinstance(tailored_data["work"], list):
            for exp in tailored_data["work"]:
                if isinstance(exp, dict):
                    exp["_tailored"] = True
                    exp["_relevance_score"] = self._calculate_relevance(exp, keywords)

        # Use AI to enhance the resume if client is available
        if self.client:
            try:
                tailored_data = self._ai_tailor(
                    tailored_data, job_description, keywords
                )
            except Exception as e:
                logger.warning(
                    f"AI tailoring failed, using keyword-based tailoring: {e}"
                )

        logger.info("Resume tailoring completed")
        return tailored_data

    def _calculate_relevance(
        self, experience: Dict[str, Any], keywords: List[str]
    ) -> float:
        """Calculate relevance score for an experience entry based on keywords."""
        score = 0.0

        # Check title
        title = experience.get("title", "").lower()
        role = experience.get("role", "").lower()
        company = experience.get("company", "").lower()

        # Check description/bullets
        description = ""
        if isinstance(experience.get("bullets"), list):
            description = " ".join(
                [
                    b.get("text", "") if isinstance(b, dict) else str(b)
                    for b in experience["bullets"]
                ]
            ).lower()
        elif isinstance(experience.get("description"), str):
            description = experience["description"].lower()

        text_to_check = f"{title} {role} {company} {description}"

        for keyword in keywords:
            if keyword.lower() in text_to_check:
                score += 1.0

        # Normalize to 0-1 range
        max_score = max(len(keywords), 1)
        return min(score / max_score, 1.0)

    def _ai_tailor(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        keywords: List[str],
    ) -> Dict[str, Any]:
        """Use AI to enhance the resume tailoring."""

        prompt = f"""You are an expert resume writer. I need you to tailor my resume data for a specific job description.

**Job Description:**
{job_description}

**Resume Data (JSON):**
{json.dumps(resume_data, indent=2)}

**Extracted Keywords:**
{', '.join(keywords)}

**Instructions:**
1. Analyze the job description and the resume data.
2. Modify the "professional_summary" or "summary" to be more relevant to the job.
3. Reorder or select the most relevant "bullets" in the "experience" or "work" section.
4. Ensure the JSON structure remains EXACTLY the same.
5. Do NOT add fake experience.
6. Return ONLY the valid JSON of the modified resume data.

Return ONLY valid JSON, nothing else."""

        if self.ai_provider == "anthropic":
            response = self._call_anthropic(prompt)
        else:
            response = self._call_openai(prompt)

        # Parse JSON from response
        tailored_data = self._extract_json(response, resume_data)
        return tailored_data

    def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic Claude API."""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI GPT API."""
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=4000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    def _extract_json(self, response: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
        """Extract JSON from AI response."""
        # Try to extract from code blocks
        patterns = [
            r"```json\s*(\{.*?\})\s*```",
            r"```\s*(\{.*?\})\s*```",
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue

        # Try to parse the whole response
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object directly
        obj_match = re.search(r"\{.*\}", response, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group(0))
            except json.JSONDecodeError:
                pass

        # Return fallback if all attempts fail
        logger.warning("Could not extract valid JSON from AI response, using fallback")
        return fallback

    def extract_keywords(self, job_description: str) -> List[str]:
        """
        Extract keywords from a job description.

        Args:
            job_description: Job description text

        Returns:
            List of extracted keywords
        """
        # Use AI if client is available
        if self.client:
            try:
                return self._ai_extract_keywords(job_description)
            except Exception as e:
                logger.warning(f"AI keyword extraction failed: {e}")

        # Fallback to regex-based extraction
        return self._regex_extract_keywords(job_description)

    def _ai_extract_keywords(self, job_description: str) -> List[str]:
        """Use AI to extract keywords."""
        prompt = f"""Extract the key technologies, programming languages, frameworks, and tools mentioned in this job posting.

**Job Posting:**
{job_description}

**Instructions:**
- Extract ONLY specific technologies, languages, frameworks, and tools
- Include programming languages (e.g., Python, JavaScript, Go)
- Include frameworks and libraries (e.g., React, Django, TensorFlow)
- Include platforms and tools (e.g., Kubernetes, Docker, AWS)
- Use lowercase for all technologies
- Return ONLY a JSON array of strings

Return ONLY valid JSON, nothing else."""

        if self.ai_provider == "anthropic":
            response = self._call_anthropic(prompt)
        else:
            response = self._call_openai(prompt)

        # Extract JSON array from response
        json_match = re.search(r"\[.*\]", response, re.DOTALL)
        if json_match:
            try:
                keywords = json.loads(json_match.group(0))
                return [str(k).lower().strip() for k in keywords if k]
            except json.JSONDecodeError:
                pass

        return []

    def _regex_extract_keywords(self, job_description: str) -> List[str]:
        """Extract keywords using regex patterns."""

        # Common tech keywords to look for
        tech_keywords = [
            "python",
            "javascript",
            "typescript",
            "java",
            "go",
            "rust",
            "c++",
            "c#",
            "ruby",
            "php",
            "swift",
            "kotlin",
            "scala",
            "haskell",
            "sql",
            "react",
            "vue",
            "angular",
            "node.js",
            "django",
            "flask",
            "fastapi",
            "spring",
            "rails",
            "laravel",
            "next.js",
            "nuxt",
            "express",
            "tensorflow",
            "pytorch",
            "keras",
            "pandas",
            "numpy",
            "scikit",
            "kubernetes",
            "docker",
            "aws",
            "azure",
            "gcp",
            "google cloud",
            "postgres",
            "postgresql",
            "mysql",
            "mongodb",
            "redis",
            "sqlite",
            "elasticsearch",
            "dynamodb",
            "cassandra",
            "graphql",
            "rest",
            "api",
            "microservices",
            "devops",
            "ci/cd",
            "machine learning",
            "ml",
            "ai",
            "llm",
            "nlp",
            "git",
            "github",
            "gitlab",
            "jenkins",
            "circleci",
            "terraform",
            "ansible",
            "nginx",
            "linux",
        ]

        job_lower = job_description.lower()
        found_keywords = []

        for keyword in tech_keywords:
            if keyword in job_lower:
                found_keywords.append(keyword)

        # Also extract any other capitalized words that might be technologies
        capitalized = re.findall(r"\b[A-Z][a-zA-Z]{2,}\b", job_description)
        for word in capitalized:
            word_lower = word.lower()
            if word_lower not in found_keywords and len(word) > 3:
                # Add common ones
                if word_lower not in [
                    "and",
                    "the",
                    "for",
                    "with",
                    "from",
                    "this",
                    "that",
                ]:
                    found_keywords.append(word_lower)

        return list(dict.fromkeys(found_keywords))[:50]

    def suggest_improvements(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
    ) -> List[str]:
        """
        Suggest improvements to a resume based on a job description.

        Args:
            resume_data: Current resume data
            job_description: Job description text

        Returns:
            List of improvement suggestions
        """
        keywords = self.extract_keywords(job_description)

        suggestions = []

        # Check for missing keywords
        resume_text = json.dumps(resume_data).lower()
        missing_keywords = [k for k in keywords if k not in resume_text]
        if missing_keywords:
            suggestions.append(
                f"Consider adding these relevant skills: {', '.join(missing_keywords[:5])}"
            )

        # Check for metrics in experience
        has_metrics = bool(re.search(r"\d+%|\$\d+|\d+ [kK]?\+?|\d+x", resume_text))
        if not has_metrics:
            suggestions.append(
                "Add quantifiable metrics to your bullet points (e.g., 'Improved performance by 40%')"
            )

        # Check for summary
        has_summary = "summary" in resume_data or "professional_summary" in resume_data
        if not has_summary:
            suggestions.append("Add a professional summary tailored to this role")

        # General suggestions
        suggestions.extend(
            [
                "Ensure your formatting is consistent throughout",
                "Use action verbs at the beginning of bullet points",
                "Tailor your summary to match the company culture",
            ]
        )

        return suggestions


# Mock version for testing without AI API keys
class MockResumeTailorer(ResumeTailorer):
    """
    Mock tailorer for testing without requiring AI API keys.
    """

    def __init__(self, **kwargs):
        """Initialize mock tailorer."""
        super().__init__(ai_provider="mock", api_key=None)
        self.ai_provider = "mock"

    def _init_ai_client(self):
        """No client for mock."""
        self.client = None

    def tailor_resume(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
    ) -> Dict[str, Any]:
        """Mock tailoring - adds metadata and relevance scores."""
        keywords = self.extract_keywords(job_description)

        tailored_data = resume_data.copy()
        tailored_data["_tailored"] = True
        tailored_data["_tailored_for"] = {
            "keywords": keywords,
            "ai_provider": "mock",
        }

        # Add relevance scores to experience
        for key in ["experience", "work"]:
            if key in tailored_data and isinstance(tailored_data[key], list):
                for exp in tailored_data[key]:
                    if isinstance(exp, dict):
                        exp["_tailored"] = True
                        exp["_relevance_score"] = self._calculate_relevance(
                            exp, keywords
                        )

        return tailored_data
