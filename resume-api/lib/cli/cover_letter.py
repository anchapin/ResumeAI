"""
Cover Letter Generator for ResumeAI API.

This module provides a simplified CoverLetterGenerator that works with
JSON Resume format (dict) instead of resume.yaml files.
"""

import os
import json
import re
from typing import Any, Dict, Optional

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


class CoverLetterGenerator:
    """
    Generate personalized cover letters with AI.
    
    Works with JSON Resume format (dict) instead of resume.yaml files.
    """

    def __init__(
        self,
        ai_provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize cover letter generator.

        Args:
            ai_provider: AI provider (openai, anthropic, gemini)
            api_key: API key for the AI provider
            model: Optional model override
        """
        self.ai_provider = ai_provider.lower()
        self.api_key = api_key or os.getenv(f"{self.ai_provider.upper()}_API_KEY")
        self.model = model or os.getenv("AI_MODEL")
        
        if not self.api_key:
            raise ValueError(f"{self.ai_provider.upper()}_API_KEY environment variable not set")

        # Initialize the AI client
        if self.ai_provider == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError("openai package not installed")
            base_url = os.getenv("OPENAI_BASE_URL")
            client_kwargs = {"api_key": self.api_key}
            if base_url:
                client_kwargs["base_url"] = base_url
            self.client = openai.OpenAI(**client_kwargs)
            self._call_ai = self._call_openai
            
        elif self.ai_provider == "anthropic":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("anthropic package not installed")
            base_url = os.getenv("ANTHROPIC_BASE_URL")
            client_kwargs = {"api_key": self.api_key}
            if base_url:
                client_kwargs["base_url"] = base_url
            self.client = anthropic.Anthropic(**client_kwargs)
            self._call_ai = self._call_anthropic
        else:
            raise ValueError(f"Unknown AI provider: {ai_provider}")

    def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        company_name: str,
        job_title: str,
        tone: str = "professional",
    ) -> Dict[str, Any]:
        """
        Generate a cover letter based on resume and job description.

        Args:
            resume_data: Resume data in JSON Resume format
            job_description: Job description text
            company_name: Company name
            job_title: Job title
            tone: Tone of the cover letter (professional, casual, formal)

        Returns:
            Dict with cover letter sections
        """
        # Extract relevant info from resume
        basics = resume_data.get("basics", {})
        name = basics.get("name", "Candidate")
        summary = basics.get("summary", "")
        
        # Get work experience
        work = resume_data.get("work", [])
        experience_summary = ""
        if work:
            for job in work[:3]:
                position = job.get("position", "")
                company = job.get("company", "")
                if position or company:
                    experience_summary += f"- {position} at {company}\n"
                highlights = job.get("highlights", [])
                for h in highlights[:2]:
                    experience_summary += f"  • {h}\n"

        # Get skills
        skills = resume_data.get("skills", [])
        skill_names = []
        for skill in skills:
            if isinstance(skill, dict):
                name = skill.get("name", "")
                if name:
                    skill_names.append(name)
            elif isinstance(skill, str):
                skill_names.append(skill)
        
        skills_str = ", ".join(skill_names[:15]) if skill_names else "various skills"

        # Build the prompt
        prompt = self._build_prompt(
            name=name,
            summary=summary,
            experience=experience_summary,
            skills=skills_str,
            job_description=job_description,
            company_name=company_name,
            job_title=job_title,
            tone=tone,
        )

        # Call AI
        response = self._call_ai(prompt)

        # Parse the response
        cover_letter = self._parse_response(response, company_name, job_title, name)
        
        return cover_letter

    def _build_prompt(
        self,
        name: str,
        summary: str,
        experience: str,
        skills: str,
        job_description: str,
        company_name: str,
        job_title: str,
        tone: str,
    ) -> str:
        """Build the cover letter generation prompt."""
        
        tone_guidance = {
            "professional": "Use a professional but warm tone. Be confident but not arrogant.",
            "casual": "Use a friendly, conversational tone. Show enthusiasm while remaining credible.",
            "formal": "Use a formal, traditional business letter format. Be precise and polished.",
        }.get(tone, "Use a professional tone.")

        return f"""You are an expert cover letter writer. Write a compelling, truthful cover letter for a job application.

CANDIDATE INFORMATION:
Name: {name}
Summary: {summary}
Skills: {skills}
Experience:
{experience}

JOB DETAILS:
Company: {company_name}
Position: {job_title}
Job Description:
{job_description}

TONE: {tone_guidance}

Write a cover letter that:
1. Opens with a strong hook mentioning the specific position and company
2. Highlights 2-3 specific experiences/skills that match the job requirements
3. Explains why the candidate is excited about THIS company and role
4. Closes with a clear call to action

Return ONLY a JSON object with these keys (no other text):
- header: Your contact information as a formatted string (name, email, phone, location)
- introduction: First paragraph - introduce yourself, mention the position, and state why you're excited
- body: Main paragraphs (as a single string) - connect your experience to their needs
- closing: Final paragraph - thank them, express interest in interview, professional sign-off
- full_text: The complete cover letter as a single string
- metadata: Object with word_count and any notes

Return ONLY valid JSON, nothing else."""

    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API."""
        model = self.model or "gpt-4o"
        
        response = self.client.chat.completions.create(
            model=model,
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        
        return response.choices[0].message.content

    def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic API."""
        model = self.model or "claude-3-5-sonnet-20241022"
        
        message = self.client.messages.create(
            model=model,
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        
        return message.content[0].text

    def _parse_response(
        self,
        response: str,
        company_name: str,
        job_title: str,
        candidate_name: str,
    ) -> Dict[str, Any]:
        """Parse AI response into cover letter sections."""
        
        # Try to extract JSON from response
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                # Ensure all required keys exist
                return {
                    "header": data.get("header", f"{candidate_name}"),
                    "introduction": data.get("introduction", ""),
                    "body": data.get("body", ""),
                    "closing": data.get("closing", ""),
                    "full_text": data.get("full_text", response),
                    "metadata": data.get("metadata", {"word_count": len(response.split())}),
                }
        except (json.JSONDecodeError, AttributeError):
            pass

        # Fallback: return the raw response as full_text
        return {
            "header": candidate_name,
            "introduction": "",
            "body": "",
            "closing": "",
            "full_text": response,
            "metadata": {"word_count": len(response.split()), "note": "Parse fallback used"},
        }
