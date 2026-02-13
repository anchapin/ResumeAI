"""
AI Integration Utilities.

This module provides utilities for AI-powered resume tailoring,
including keyword extraction and improvement suggestions.
"""

import logging
import re
from typing import Dict, Any, List, Optional, Protocol
from abc import ABC, abstractmethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """
    Abstract base class for AI providers.

    This defines the interface that all AI providers must implement.
    """

    @abstractmethod
    def generate_response(self, prompt: str) -> str:
        """Generate a response from the AI provider."""
        pass


class AITailoringUtils:
    """
    Utilities for AI-powered resume tailoring.
    """

    @staticmethod
    def extract_keywords(text: str) -> List[str]:
        """
        Extract keywords from text using simple NLP techniques.

        Args:
            text: Text to extract keywords from

        Returns:
            List of extracted keywords
        """
        # Convert to lowercase
        text = text.lower()

        # Remove punctuation
        text = re.sub(r'[^\w\s]', ' ', text)

        # Split into words
        words = text.split()

        # Filter for meaningful keywords
        # - Length > 2 characters
        # - Not common stop words
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
            'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'this',
            'that', 'with', 'they', 'from', 'which', 'will', 'would', 'about',
            'should', 'could', 'their', 'your', 'also', 'more', 'into', 'than',
            'some', 'such', 'only', 'over', 'most', 'work', 'experience',
            'looking', 'team', 'role', 'join', 'company', 'position'
        }

        keywords = [
            word for word in words
            if len(word) > 2 and word not in stop_words
        ]

        # Count frequency and sort
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1

        # Return sorted by frequency (top 20)
        sorted_keywords = sorted(
            word_freq.items(),
            key=lambda x: x[1],
            reverse=True
        )

        return [word for word, freq in sorted_keywords[:20]]

    @staticmethod
    def calculate_match_score(
        resume_data: Dict[str, Any],
        keywords: List[str]
    ) -> float:
        """
        Calculate a match score between resume and job keywords.

        Args:
            resume_data: Resume data
            keywords: Keywords from job description

        Returns:
            Match score between 0.0 and 1.0
        """
        if not keywords:
            return 0.0

        # Convert resume to text
        resume_text = str(resume_data).lower()

        # Count keyword matches
        matches = 0
        for keyword in keywords:
            if keyword.lower() in resume_text:
                matches += 1

        # Calculate score
        score = matches / len(keywords)
        return round(score, 2)

    @staticmethod
    def generate_improvement_suggestions(
        resume_data: Dict[str, Any],
        job_description: str,
        keywords: Optional[List[str]] = None
    ) -> List[str]:
        """
        Generate suggestions for improving a resume.

        Args:
            resume_data: Current resume data
            job_description: Job description
            keywords: Optional pre-extracted keywords

        Returns:
            List of improvement suggestions
        """
        if keywords is None:
            keywords = AITailoringUtils.extract_keywords(job_description)

        suggestions = []

        # Convert resume to text
        resume_text = str(resume_data).lower()

        # Check for missing keywords
        missing_keywords = [
            kw for kw in keywords
            if kw.lower() not in resume_text
        ]

        if missing_keywords:
            suggestions.append(
                f"Consider incorporating these keywords: {', '.join(missing_keywords[:5])}"
            )

        # Check for metrics
        if not re.search(r'\d+%|\$\d+|\d+\+ years', resume_text):
            suggestions.append(
                "Add quantifiable metrics to your achievements "
                "(e.g., 'increased sales by 25%')"
            )

        # Check for action verbs
        action_verbs = [
            'achieved', 'implemented', 'developed', 'managed', 'led',
            'created', 'improved', 'reduced', 'increased', 'delivered'
        ]
        if not any(verb in resume_text for verb in action_verbs):
            suggestions.append(
                "Use strong action verbs at the beginning of bullet points"
            )

        # Check summary length
        if 'basics' in resume_data and 'summary' in resume_data['basics']:
            summary = resume_data['basics']['summary']
            if len(summary) < 100:
                suggestions.append(
                    "Consider expanding your summary to provide more context"
                )
            elif len(summary) > 300:
                suggestions.append(
                    "Consider shortening your summary for better readability"
                )

        # Default suggestions if none generated
        if not suggestions:
            suggestions.extend([
                "Review your resume for typos and grammatical errors",
                "Ensure your contact information is current",
                "Tailor your resume to the specific job requirements"
            ])

        return suggestions[:5]

    @staticmethod
    def prioritize_experience(
        resume_data: Dict[str, Any],
        job_description: str
    ) -> Dict[str, Any]:
        """
        Prioritize work experience entries based on job relevance.

        Args:
            resume_data: Resume data
            job_description: Job description

        Returns:
            Resume data with reordered experience
        """
        keywords = AITailoringUtils.extract_keywords(job_description)

        if 'work' not in resume_data or not isinstance(resume_data['work'], list):
            return resume_data

        # Calculate relevance scores
        work_items = []
        for item in resume_data['work']:
            item_text = str(item).lower()
            matches = sum(1 for kw in keywords if kw in item_text)
            score = matches / len(keywords) if keywords else 0
            work_items.append((score, item))

        # Sort by relevance score (descending)
        work_items.sort(key=lambda x: x[0], reverse=True)

        # Update resume with reordered experience
        resume_data['work'] = [item for score, item in work_items]

        return resume_data


# Placeholder for actual AI provider implementations
class OpenAIProvider(AIProvider):
    """OpenAI provider for AI-powered features."""

    def __init__(self, api_key: str, model: str = "gpt-4"):
        """Initialize OpenAI provider."""
        self.api_key = api_key
        self.model = model
        # In production:
        # import openai
        # self.client = openai.OpenAI(api_key=api_key)

    def generate_response(self, prompt: str) -> str:
        """Generate response using OpenAI API."""
        # In production:
        # response = self.client.chat.completions.create(
        #     model=self.model,
        #     messages=[{"role": "user", "content": prompt}]
        # )
        # return response.choices[0].message.content

        # Placeholder
        return "OpenAI response placeholder"


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider for AI-powered features."""

    def __init__(self, api_key: str, model: str = "claude-3-opus-20240229"):
        """Initialize Anthropic provider."""
        self.api_key = api_key
        self.model = model
        # In production:
        # import anthropic
        # self.client = anthropic.Anthropic(api_key=api_key)

    def generate_response(self, prompt: str) -> str:
        """Generate response using Anthropic API."""
        # In production:
        # response = self.client.messages.create(
        #     model=self.model,
        #     max_tokens=1024,
        #     messages=[{"role": "user", "content": prompt}]
        # )
        # return response.content[0].text

        # Placeholder
        return "Anthropic response placeholder"


class GeminiProvider(AIProvider):
    """Google Gemini provider for AI-powered features."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-pro"):
        """Initialize Gemini provider."""
        self.api_key = api_key
        self.model = model
        # In production:
        # import google.generativeai as genai
        # genai.configure(api_key=api_key)
        # self.client = genai.GenerativeModel(model)

    def generate_response(self, prompt: str) -> str:
        """Generate response using Gemini API."""
        # In production:
        # response = self.client.generate_content(prompt)
        # return response.text

        # Placeholder
        return "Gemini response placeholder"
