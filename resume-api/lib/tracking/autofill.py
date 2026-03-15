"""
Auto-Fill Service

Generates application data from resume data.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AutoFillService:
    """
    Auto-fills job applications from resume data.
    
    Features:
    - Extract data from resume JSON
    - Map to common application fields
    - Generate cover letter from resume
    - Export in common formats
    
    Example:
        service = AutoFillService(db_session)
        data = service.extract_application_data(resume, job)
    """
    
    def __init__(self, db_session: AsyncSession):
        """
        Initialize Auto-Fill Service.
        
        Args:
            db_session: Async database session
        """
        self.db = db_session
    
    def extract_application_data(
        self,
        resume: Dict[str, Any],
        job: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extract application data from resume.
        
        Args:
            resume: Resume data dict
            job: Optional job data for customization
            
        Returns:
            Application data dict
        """
        basics = resume.get("basics", {})
        work = resume.get("work", [])
        education = resume.get("education", [])
        skills = resume.get("skills", [])
        
        application_data = {
            # Personal info
            "full_name": self._get_full_name(basics),
            "email": basics.get("email", ""),
            "phone": basics.get("phone", ""),
            "location": basics.get("location", {}).get("address", ""),
            "website": basics.get("url", ""),
            "linkedin": self._get_social_url(basics, "LinkedIn"),
            "github": self._get_social_url(basics, "GitHub"),
            
            # Work experience (formatted for applications)
            "work_experience": self._format_work_experience(work),
            
            # Education (formatted for applications)
            "education_history": self._format_education(education),
            
            # Skills (categorized)
            "skills": self._format_skills(skills),
            
            # Generated content
            "professional_summary": self._generate_summary(basics, work),
            "cover_letter_template": self._generate_cover_letter_template(
                basics, work, job
            ),
        }
        
        return application_data
    
    def _get_full_name(self, basics: Dict[str, Any]) -> str:
        """Extract full name from basics."""
        name = basics.get("name", "")
        if name:
            return name
        
        # Try to construct from firstName/lastName
        first = basics.get("firstName", "")
        last = basics.get("lastName", "")
        
        if first and last:
            return f"{first} {last}"
        
        return first or last or ""
    
    def _get_social_url(
        self,
        basics: Dict[str, Any],
        network: str,
    ) -> str:
        """Get social profile URL."""
        profiles = basics.get("profiles", [])
        
        for profile in profiles:
            if profile.get("network", "").lower() == network.lower():
                return profile.get("url", "")
        
        return ""
    
    def _format_work_experience(
        self,
        work: list,
    ) -> list:
        """Format work experience for applications."""
        formatted = []
        
        for job in work[:5]:  # Last 5 positions
            formatted.append({
                "company": job.get("company", ""),
                "position": job.get("position", ""),
                "start_date": job.get("startDate", ""),
                "end_date": job.get("endDate", "Present"),
                "description": job.get("summary", ""),
                "highlights": job.get("highlights", []),
            })
        
        return formatted
    
    def _format_education(
        self,
        education: list,
    ) -> list:
        """Format education for applications."""
        formatted = []
        
        for edu in education:
            formatted.append({
                "institution": edu.get("institution", ""),
                "degree": edu.get("studyType", ""),
                "field": edu.get("area", ""),
                "start_date": edu.get("startDate", ""),
                "end_date": edu.get("endDate", ""),
                "gpa": edu.get("score", ""),
            })
        
        return formatted
    
    def _format_skills(
        self,
        skills: list,
    ) -> Dict[str, list]:
        """Format skills by category."""
        categorized = {
            "technical": [],
            "languages": [],
            "frameworks": [],
            "tools": [],
            "soft": [],
        }
        
        for skill in skills:
            name = skill.get("name", "")
            category = skill.get("category", "technical")
            
            if category in categorized:
                categorized[category].append(name)
            else:
                categorized["technical"].append(name)
        
        return categorized
    
    def _generate_summary(
        self,
        basics: Dict[str, Any],
        work: list,
    ) -> str:
        """Generate professional summary."""
        name = self._get_full_name(basics)
        
        # Get most recent position
        recent_position = ""
        recent_company = ""
        
        if work:
            recent_position = work[0].get("position", "")
            recent_company = work[0].get("company", "")
        
        summary = f"{name}"
        
        if recent_position and recent_company:
            summary += f" is a {recent_position} at {recent_company}"
        
        summary += " with a proven track record of delivering high-quality results."
        
        return summary
    
    def _generate_cover_letter_template(
        self,
        basics: Dict[str, Any],
        work: list,
        job: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate cover letter template."""
        name = self._get_full_name(basics)
        
        # Get key achievements
        achievements = []
        for w in work[:2]:
            highlights = w.get("highlights", [])
            achievements.extend(highlights[:2])
        
        template = f"""Dear Hiring Manager,

I am writing to express my interest in the position at {job.get('company', 'your company') if job else 'your company'}.

With my background as {self._get_full_name(basics)}{', ' + work[0].get('position', '') if work else ''}, I am confident in my ability to contribute to your team.

Key achievements from my experience include:
"""
        
        for i, achievement in enumerate(achievements[:3], 1):
            template += f"\n{i}. {achievement}"
        
        template += f"""

I am excited about the opportunity to bring my skills and experience to {job.get('company', 'your company') if job else 'your company'}.

Thank you for considering my application.

Sincerely,
{name}
"""
        
        return template
    
    def generate_cover_letter(
        self,
        resume: Dict[str, Any],
        job: Dict[str, Any],
    ) -> str:
        """
        Generate customized cover letter.
        
        Args:
            resume: Resume data
            job: Job data
            
        Returns:
            Generated cover letter
        """
        basics = resume.get("basics", {})
        work = resume.get("work", [])
        
        # Get job details
        job_title = job.get("title", "the position")
        company = job.get("company", "your company")
        job_description = job.get("description", "")
        
        # Extract key skills from job description
        key_skills = self._extract_key_skills(job_description)
        
        # Generate personalized cover letter
        name = self._get_full_name(basics)
        
        cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company}.

"""
        
        # Add personalized opening based on job requirements
        if key_skills:
            cover_letter += f"With my expertise in {', '.join(key_skills[:3])}, I am excited about the opportunity to contribute to your team.\n\n"
        
        # Add relevant experience
        if work:
            recent = work[0]
            cover_letter += f"In my current role as {recent.get('position', '')} at {recent.get('company', '')}, I have:\n"
            
            highlights = recent.get("highlights", [])
            for highlight in highlights[:3]:
                cover_letter += f"• {highlight}\n"
        
        cover_letter += f"""
I am particularly drawn to {company} because of [specific reason related to company mission/values]. I am confident that my skills and experience align well with the requirements for this role.

Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to {company}'s success.

Sincerely,
{name}
"""
        
        return cover_letter
    
    def _extract_key_skills(
        self,
        job_description: str,
    ) -> list:
        """Extract key skills from job description."""
        # Common tech skills to look for
        common_skills = [
            "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust",
            "React", "Angular", "Vue", "Node.js", "Express",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes",
            "SQL", "PostgreSQL", "MongoDB", "Redis",
            "Machine Learning", "Data Science", "API Design",
        ]
        
        found_skills = []
        description_lower = job_description.lower()
        
        for skill in common_skills:
            if skill.lower() in description_lower:
                found_skills.append(skill)
        
        return found_skills[:5]  # Return top 5
    
    def export_application_json(
        self,
        application_data: Dict[str, Any],
    ) -> str:
        """
        Export application data as JSON.
        
        Args:
            application_data: Application data dict
            
        Returns:
            JSON string
        """
        import json
        return json.dumps(application_data, indent=2)
    
    def export_application_pdf(
        self,
        application_data: Dict[str, Any],
    ) -> bytes:
        """
        Export application data as PDF.
        
        Args:
            application_data: Application data dict
            
        Returns:
            PDF bytes
        """
        # Would use a PDF library like reportlab or weasyprint
        # For now, return placeholder
        logger.warning("PDF export not yet implemented")
        return b""
