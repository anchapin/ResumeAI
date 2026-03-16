"""
RSS Feed Job Source

Fetches jobs from RSS/Atom feeds.
"""

import logging
import feedparser
from typing import List, Optional
from datetime import datetime

import httpx

from .base import BaseJobSource
from ..models import JobSource, JobPosting

logger = logging.getLogger(__name__)


class RSSJobSource(BaseJobSource):
    """
    Fetches jobs from RSS/Atom feeds.
    
    Supported formats:
    - RSS 2.0
    - Atom 1.0
    
    Example:
        fetcher = RSSJobSource()
        jobs = await fetcher.fetch(source)
    """
    
    async def fetch(self, source: JobSource) -> List[JobPosting]:
        """
        Fetch jobs from RSS feed.
        
        Args:
            source: JobSource with RSS URL
            
        Returns:
            List of JobPosting objects
        """
        logger.info(f"Fetching RSS feed: {source.url}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    source.url,
                    timeout=30.0,
                    headers={"User-Agent": "ResumeAI/1.0 Job Aggregator"},
                )
                response.raise_for_status()
                
                return self.parse_feed(source, response.content)
                
        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {source.name}: {e}")
            return []
    
    def parse_feed(self, source: JobSource, feed_data: bytes) -> List[JobPosting]:
        """
        Parse RSS/Atom feed data.
        
        Args:
            source: JobSource configuration
            feed_data: Raw feed content
            
        Returns:
            List of JobPosting objects
        """
        feed = feedparser.parse(feed_data)
        
        if feed.bozo:
            logger.warning(f"Feed parser warning: {feed.bozo_exception}")
        
        logger.info(f"Parsed {len(feed.entries)} entries from {source.name}")
        
        jobs = []
        for entry in feed.entries:
            try:
                job = self.map_to_job_posting(source, entry)
                if job:
                    jobs.append(job)
            except Exception as e:
                logger.error(f"Failed to parse entry: {e}")
                continue
        
        return jobs
    
    def map_to_job_posting(
        self,
        source: JobSource,
        entry: dict,
    ) -> Optional[JobPosting]:
        """
        Map RSS entry to JobPosting.
        
        Args:
            source: JobSource configuration
            entry: RSS entry dict
            
        Returns:
            JobPosting or None
        """
        # Extract title
        title = entry.get('title', '')
        if not title:
            return None
        
        # Try to extract company from title (format: "Company | Title" or "Title @ Company")
        company = self.extract_company_from_title(title)
        if not company:
            company = entry.get('author', source.name)
        
        # Extract location
        location = self.extract_location(entry)
        
        # Check if remote
        remote = self.is_remote(entry, title)
        
        # Extract salary if present
        salary_min, salary_max = self.extract_salary(entry)
        
        # Get description
        description = entry.get('summary', entry.get('description', ''))
        
        # Strip HTML from description
        description = self.strip_html(description)
        
        # Get URL
        url = entry.get('link', '')
        if not url:
            return None
        
        # Get posted date
        posted_date = self.parse_date(
            entry.get('published', entry.get('updated', entry.get('created')))
        )
        
        # Build data dict
        data = {
            'title': self.clean_title(title),
            'company': company,
            'url': url,
            'location': location,
            'remote': remote,
            'salary_min': salary_min,
            'salary_max': salary_max,
            'description': description,
            'posted_date': posted_date,
            'employment_type': self.extract_employment_type(entry),
            'experience_level': self.extract_experience_level(entry),
        }
        
        return self.create_job_posting(source, data)
    
    def extract_company_from_title(self, title: str) -> Optional[str]:
        """Extract company name from job title."""
        # Format: "Company | Title"
        if ' | ' in title:
            parts = title.split(' | ')
            return parts[0].strip()
        
        # Format: "Title @ Company"
        if ' @ ' in title:
            parts = title.split(' @ ')
            return parts[-1].strip()
        
        # Format: "Title - Company"
        if ' - ' in title:
            parts = title.split(' - ')
            if len(parts) == 2:
                return parts[-1].strip()
        
        return None
    
    def clean_title(self, title: str) -> str:
        """Clean job title."""
        # Remove company name if present
        for sep in [' | ', ' @ ', ' - ']:
            if sep in title:
                parts = title.split(sep)
                if len(parts) == 2:
                    # Return the part that looks more like a title
                    if any(kw in parts[0].lower() for kw in ['engineer', 'developer', 'manager']):
                        return parts[0].strip()
                    return parts[-1].strip()
        
        return title.strip()
    
    def extract_location(self, entry: dict) -> Optional[str]:
        """Extract location from entry."""
        # Check common location fields
        for field in ['location', 'geo:lat', 'dc:coverage']:
            if field in entry:
                return str(entry[field])
        
        # Check tags/categories
        for tag in entry.get('tags', []):
            if tag.get('scheme', '').endswith('location'):
                return tag.get('term')
        
        return None
    
    def is_remote(self, entry: dict, title: str) -> bool:
        """Check if job is remote."""
        remote_keywords = ['remote', 'work from home', 'wfh', 'virtual', 'distributed']
        
        # Check title
        if any(kw in title.lower() for kw in remote_keywords):
            return True
        
        # Check summary/description
        summary = entry.get('summary', '').lower()
        if any(kw in summary for kw in remote_keywords):
            return True
        
        # Check tags
        for tag in entry.get('tags', []):
            term = tag.get('term', '').lower()
            if any(kw in term for kw in remote_keywords):
                return True
        
        return False
    
    def extract_salary(self, entry: dict) -> tuple:
        """Extract salary from entry."""
        import re
        
        # Check for salary in summary/description
        text = entry.get('summary', '') + ' ' + entry.get('description', '')
        
        # Pattern: $X - $Y or $X-$Y
        pattern = r'\$([\d,]+)\s*[-–to]+\s*\$?([\d,]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            try:
                min_sal = int(match.group(1).replace(',', ''))
                max_sal = int(match.group(2).replace(',', ''))
                return min_sal, max_sal
            except:
                pass
        
        # Pattern: $X+ or up to $X
        pattern = r'\$([\d,]+)\+|up to \$?([\d,]+)'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            try:
                sal = int(match.group(1) or match.group(2)).replace(',', '')
                return sal, int(sal * 1.2)  # Estimate range
            except:
                pass
        
        return None, None
    
    def strip_html(self, html: str) -> str:
        """Strip HTML tags from text."""
        if not html:
            return ''
        
        # Simple HTML stripping
        import re
        clean = re.sub(r'<[^>]+>', '', html)
        clean = re.sub(r'\s+', ' ', clean)
        
        return clean.strip()
    
    def extract_employment_type(self, entry: dict) -> str:
        """Extract employment type from entry."""
        text = (entry.get('title', '') + ' ' + entry.get('summary', '')).lower()
        
        if 'contract' in text or 'freelance' in text:
            return 'contract'
        elif 'part-time' in text or 'part time' in text:
            return 'part-time'
        elif 'intern' in text:
            return 'internship'
        
        return 'full-time'
    
    def extract_experience_level(self, entry: dict) -> str:
        """Extract experience level from entry."""
        text = (entry.get('title', '') + ' ' + entry.get('summary', '')).lower()
        
        if 'senior' in text or 'sr.' in text or 'lead' in text:
            return 'senior'
        elif 'junior' in text or 'jr.' in text or 'entry' in text:
            return 'entry'
        elif 'executive' in text or 'director' in text or 'vp' in text:
            return 'executive'
        
        return 'mid'
