"""
Base Job Source Interface

Abstract base class for all job source fetchers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

from .models import JobSource, JobPosting


class BaseJobSource(ABC):
    """
    Abstract base class for job source fetchers.
    
    All source implementations (RSS, API, Scraper) must extend this class.
    
    Example:
        class RSSJobSource(BaseJobSource):
            async def fetch(self, source: JobSource) -> List[JobPosting]:
                # Implementation
    """
    
    @abstractmethod
    async def fetch(self, source: JobSource) -> List[JobPosting]:
        """
        Fetch jobs from source.
        
        Args:
            source: JobSource configuration
            
        Returns:
            List of JobPosting objects
        """
        pass
    
    def normalize_salary(
        self,
        salary_min: Optional[int],
        salary_max: Optional[int],
        currency: str = "USD",
        period: str = "yearly",
    ) -> tuple:
        """
        Normalize salary to annual USD.
        
        Args:
            salary_min: Minimum salary
            salary_max: Maximum salary
            currency: Salary currency
            period: Salary period (yearly, hourly, monthly)
            
        Returns:
            Tuple of (normalized_min, normalized_max, currency, period)
        """
        if salary_min is None and salary_max is None:
            return None, None, currency, period
        
        # Convert hourly to yearly (assume 2080 hours/year)
        if period == "hourly":
            if salary_min:
                salary_min = int(salary_min * 2080)
            if salary_max:
                salary_max = int(salary_max * 2080)
            period = "yearly"
        
        # Convert monthly to yearly
        elif period == "monthly":
            if salary_min:
                salary_min = int(salary_min * 12)
            if salary_max:
                salary_max = int(salary_max * 12)
            period = "yearly"
        
        # Note: Currency conversion would require exchange rate API
        # For now, we just store the currency
        
        return salary_min, salary_max, currency, period
    
    def parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """
        Parse date string to datetime.
        
        Args:
            date_str: Date string in various formats
            
        Returns:
            datetime object or None
        """
        if not date_str:
            return None
        
        # Try various formats
        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S%z",
            "%a, %d %b %Y %H:%M:%S %z",  # RFC 822
            "%B %d, %Y",
            "%b %d, %Y",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # Try ISO format as last resort
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            pass
        
        return None
    
    def extract_skills(self, description: str) -> List[str]:
        """
        Extract skills from job description.
        
        Args:
            description: Job description text
            
        Returns:
            List of extracted skills
        """
        # Common tech skills to look for
        common_skills = {
            'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
            'react', 'angular', 'vue', 'node', 'nodejs', 'express',
            'django', 'flask', 'fastapi', 'spring', 'rails',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
            'sql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'git', 'ci/cd', 'devops', 'agile', 'scrum',
        }
        
        if not description:
            return []
        
        description_lower = description.lower()
        skills = []
        
        for skill in common_skills:
            if skill in description_lower:
                # Capitalize skill name
                skills.append(skill.title().replace('++', '++').replace('c#', 'C#'))
        
        return skills
    
    def create_job_posting(
        self,
        source: JobSource,
        data: dict,
    ) -> JobPosting:
        """
        Create JobPosting from source data.
        
        Args:
            source: JobSource configuration
            data: Raw job data
            
        Returns:
            JobPosting object
        """
        from .schema import JobPosting as JobPostingSchema
        
        # Normalize salary
        salary_min, salary_max, currency, period = self.normalize_salary(
            data.get('salary_min'),
            data.get('salary_max'),
            data.get('salary_currency', 'USD'),
            data.get('salary_period', 'yearly'),
        )
        
        # Parse date
        posted_date = self.parse_date(data.get('posted_date'))
        
        # Extract skills
        description = data.get('description', '')
        skills = data.get('skills') or self.extract_skills(description)
        
        # Create schema object
        job_schema = JobPostingSchema(
            title=data.get('title', ''),
            company=data.get('company', ''),
            url=data.get('url', ''),
            location=data.get('location'),
            remote=data.get('remote', False),
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=currency,
            salary_period=period,
            description=description,
            apply_url=data.get('apply_url'),
            posted_date=posted_date,
            employment_type=data.get('employment_type', 'full-time'),
            experience_level=data.get('experience_level', 'mid'),
            skills=skills,
            categories=data.get('categories', []),
            source_id=source.id,
            source_name=source.name,
            raw_data=data,
        )
        
        # Convert to database model
        return JobPosting(
            id=job_schema.generate_id(),
            source_id=source.id,
            title=job_schema.title,
            company=job_schema.company,
            location=job_schema.location,
            remote=job_schema.remote,
            salary_min=job_schema.salary_min,
            salary_max=job_schema.salary_max,
            salary_currency=job_schema.salary_currency,
            salary_period=job_schema.salary_period,
            description=job_schema.description,
            url=str(job_schema.url),
            apply_url=str(job_schema.apply_url) if job_schema.apply_url else None,
            posted_date=job_schema.posted_date,
            employment_type=job_schema.employment_type,
            experience_level=job_schema.experience_level,
            skills=job_schema.skills,
            raw_data=job_schema.raw_data,
        )
