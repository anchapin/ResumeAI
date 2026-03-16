"""
API-based Job Source

Fetches jobs from REST APIs.
"""

import asyncio
import logging
from typing import List, Optional, AsyncIterator
from datetime import datetime

import httpx

from .base import BaseJobSource
from ..models import JobSource, JobPosting

logger = logging.getLogger(__name__)


class APIJobSource(BaseJobSource):
    """
    Fetches jobs from REST APIs.
    
    Features:
    - Pagination support
    - API key management
    - Rate limiting
    
    Example:
        fetcher = APIJobSource()
        jobs = await fetcher.fetch(source)
    """
    
    def __init__(self, rate_limit: int = 100):
        """
        Initialize API Job Source.
        
        Args:
            rate_limit: Requests per minute
        """
        self.rate_limit = rate_limit
        self._last_request = None
    
    async def fetch(self, source: JobSource) -> List[JobPosting]:
        """
        Fetch jobs from API.
        
        Args:
            source: JobSource with API configuration
            
        Returns:
            List of JobPosting objects
        """
        logger.info(f"Fetching from API: {source.name}")
        
        all_jobs = []
        
        try:
            async for page in self.paginate(source):
                for job_data in page:
                    try:
                        job = self.map_to_job_posting(source, job_data)
                        if job:
                            all_jobs.append(job)
                    except Exception as e:
                        logger.error(f"Failed to map job: {e}")
                        continue
                
                # Rate limiting
                await self._rate_limit()
                
        except Exception as e:
            logger.error(f"Failed to fetch from API {source.name}: {e}")
        
        logger.info(f"Fetched {len(all_jobs)} jobs from {source.name}")
        
        return all_jobs
    
    async def paginate(self, source: JobSource) -> AsyncIterator[List[dict]]:
        """
        Paginate through API results.
        
        Args:
            source: JobSource configuration
            
        Yields:
            Pages of job data
        """
        # Default pagination
        page = 1
        per_page = 50
        
        while True:
            # Build URL with pagination
            url = self.build_url(source, page, per_page)
            
            # Make request
            data = await self.make_request(source, url)
            
            if not data:
                break
            
            # Extract jobs from response
            jobs = self.extract_jobs(data)
            
            if not jobs:
                break
            
            yield jobs
            
            # Check if more pages
            if not self.has_more_pages(data, page):
                break
            
            page += 1
            
            # Rate limiting
            await self._rate_limit()
    
    def build_url(
        self,
        source: JobSource,
        page: int = 1,
        per_page: int = 50,
    ) -> str:
        """
        Build API URL with pagination.
        
        Args:
            source: JobSource configuration
            page: Page number
            per_page: Items per page
            
        Returns:
            Full URL with query params
        """
        from urllib.parse import urlencode
        
        base_url = source.url
        
        params = {
            'page': page,
            'per_page': per_page,
        }
        
        # Add API key if required
        if source.api_key:
            params['api_key'] = source.api_key
        
        query_string = urlencode(params)
        
        if '?' in base_url:
            return f"{base_url}&{query_string}"
        else:
            return f"{base_url}?{query_string}"
    
    async def make_request(
        self,
        source: JobSource,
        url: str,
    ) -> Optional[dict]:
        """
        Make API request.
        
        Args:
            source: JobSource configuration
            url: Request URL
            
        Returns:
            Response data or None
        """
        headers = {
            "User-Agent": "ResumeAI/1.0 Job Aggregator",
            "Accept": "application/json",
        }
        
        # Add API key header if present
        if source.api_key:
            headers["Authorization"] = f"Bearer {source.api_key}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    timeout=30.0,
                    headers=headers,
                )
                
                if response.status_code == 429:
                    # Rate limited
                    retry_after = int(response.headers.get('Retry-After', 60))
                    logger.warning(f"Rate limited, waiting {retry_after}s")
                    await asyncio.sleep(retry_after)
                    return await self.make_request(source, url)
                
                response.raise_for_status()
                
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"API request failed: {e}")
                return None
    
    def extract_jobs(self, data: dict) -> List[dict]:
        """
        Extract job list from API response.
        
        Args:
            data: API response data
            
        Returns:
            List of job data dicts
        """
        # Try common response structures
        if isinstance(data, list):
            return data
        
        if 'jobs' in data:
            return data['jobs']
        
        if 'results' in data:
            return data['results']
        
        if 'data' in data:
            return data['data']
        
        if 'items' in data:
            return data['items']
        
        return []
    
    def has_more_pages(self, data: dict, current_page: int) -> bool:
        """
        Check if more pages exist.
        
        Args:
            data: API response data
            current_page: Current page number
            
        Returns:
            True if more pages exist
        """
        # Check explicit pagination info
        if 'pagination' in data:
            pagination = data['pagination']
            return pagination.get('has_more', False)
        
        if 'total_pages' in data:
            return current_page < data['total_pages']
        
        if 'total' in data and 'per_page' in data:
            total = data['total']
            per_page = data['per_page']
            return current_page * per_page < total
        
        # Check if we got a full page
        jobs = self.extract_jobs(data)
        return len(jobs) >= 50  # Assume full page means more
    
    async def _rate_limit(self):
        """Enforce rate limiting."""
        import asyncio
        from datetime import datetime, timedelta
        
        if self._last_request:
            elapsed = (datetime.utcnow() - self._last_request).total_seconds()
            min_interval = 60.0 / self.rate_limit
            
            if elapsed < min_interval:
                wait_time = min_interval - elapsed
                await asyncio.sleep(wait_time)
        
        self._last_request = datetime.utcnow()
    
    def map_to_job_posting(
        self,
        source: JobSource,
        data: dict,
    ):
        """Map API data to JobPosting."""
        # Extract fields based on common API structures
        job_data = {
            'title': data.get('title', data.get('job_title', '')),
            'company': data.get('company', data.get('company_name', data.get('organization', ''))),
            'url': data.get('url', data.get('link', data.get('apply_url', ''))),
            'location': data.get('location', data.get('city', data.get('location_name', ''))),
            'remote': data.get('remote', data.get('is_remote', False)),
            'salary_min': data.get('salary_min', data.get('min_salary', data.get('salary_from'))),
            'salary_max': data.get('salary_max', data.get('max_salary', data.get('salary_to'))),
            'description': data.get('description', data.get('content', data.get('summary', ''))),
            'posted_date': data.get('posted_date', data.get('published_at', data.get('created_at'))),
            'employment_type': data.get('employment_type', data.get('job_type', 'full-time')),
        }
        
        return self.create_job_posting(source, job_data)


# Specific API implementations

class AdzunaJobSource(APIJobSource):
    """Adzuna API implementation."""
    
    def build_url(self, source: JobSource, page: int = 1, per_page: int = 50) -> str:
        base_url = "https://api.adzuna.com/v1/api/jobs/us/search"
        
        params = {
            'app_id': source.api_key.split(':')[0] if source.api_key else '',
            'app_key': source.api_key.split(':')[1] if source.api_key and ':' in source.api_key else '',
            'page': page,
            'results_per_page': per_page,
            'content-type': 'application/json',
        }
        
        from urllib.parse import urlencode
        return f"{base_url}?{urlencode(params)}"
    
    def extract_jobs(self, data: dict) -> List[dict]:
        return data.get('results', [])
    
    def has_more_pages(self, data: dict, current_page: int) -> bool:
        count = data.get('count', 0)
        return current_page * 50 < count


class ArbeitnowJobSource(APIJobSource):
    """Arbeitnow API implementation."""
    
    def build_url(self, source: JobSource, page: int = 1, per_page: int = 50) -> str:
        base_url = "https://www.arbeitnow.com/api/jobs-api.php"
        
        params = {
            'page': page,
            'per_page': per_page,
        }
        
        from urllib.parse import urlencode
        return f"{base_url}?{urlencode(params)}"
    
    def extract_jobs(self, data: dict) -> List[dict]:
        return data.get('data', [])
    
    def has_more_pages(self, data: dict, current_page: int) -> bool:
        return data.get('more', False)
