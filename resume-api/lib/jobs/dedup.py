"""
Job Deduplication Service

Identifies and removes duplicate job postings.
"""

import logging
from typing import List, Dict, Tuple
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


class JobDeduplicator:
    """
    Deduplicates job postings.
    
    Uses multi-signal matching:
    - Title similarity (fuzzy matching)
    - Company name matching
    - Location matching
    - URL comparison
    
    Example:
        dedup = JobDeduplicator()
        unique_jobs = dedup.deduplicate(jobs)
    """
    
    def __init__(
        self,
        title_threshold: float = 85.0,
        company_threshold: float = 90.0,
        location_threshold: float = 80.0,
    ):
        """
        Initialize Job Deduplicator.
        
        Args:
            title_threshold: Title similarity threshold (0-100)
            company_threshold: Company similarity threshold (0-100)
            location_threshold: Location similarity threshold (0-100)
        """
        self.title_threshold = title_threshold
        self.company_threshold = company_threshold
        self.location_threshold = location_threshold
    
    def deduplicate(
        self,
        jobs: List,
    ) -> List:
        """
        Remove duplicate jobs.
        
        Args:
            jobs: List of JobPosting objects
            
        Returns:
            List of unique jobs (keeps best version)
        """
        if not jobs:
            return []
        
        logger.info(f"Deduplicating {len(jobs)} jobs")
        
        # Group by URL first (exact duplicates)
        by_url: Dict[str, List] = {}
        for job in jobs:
            url = job.url
            if url not in by_url:
                by_url[url] = []
            by_url[url].append(job)
        
        # Keep best version of each URL
        unique_jobs = []
        for url, job_list in by_url.items():
            if len(job_list) == 1:
                unique_jobs.append(job_list[0])
            else:
                # Keep the one with most complete data
                best = self._select_best_version(job_list)
                unique_jobs.append(best)
        
        # Now check for fuzzy duplicates (same job, different URLs)
        unique_jobs = self._deduplicate_fuzzy(unique_jobs)
        
        logger.info(f"Reduced to {len(unique_jobs)} unique jobs")
        
        return unique_jobs
    
    def _select_best_version(self, jobs: List) -> object:
        """
        Select best version from duplicates.
        
        Args:
            jobs: List of duplicate jobs
            
        Returns:
            Best job version
        """
        # Score each job
        def score(job):
            s = 0
            
            # Prefer complete descriptions
            if job.description and len(job.description) > 100:
                s += 10
            
            # Prefer complete salary info
            if job.salary_min and job.salary_max:
                s += 5
            
            # Prefer recent postings
            if job.posted_date:
                s += 3
            
            # Prefer active jobs
            if job.is_active:
                s += 2
            
            # Prefer jobs with skills extracted
            if job.skills:
                s += 1
            
            return s
        
        return max(jobs, key=score)
    
    def _deduplicate_fuzzy(self, jobs: List) -> List:
        """
        Remove fuzzy duplicates.
        
        Args:
            jobs: List of jobs (already URL-deduplicated)
            
        Returns:
            List of unique jobs
        """
        unique = []
        
        for job in jobs:
            is_duplicate = False
            
            for existing in unique:
                if self.are_duplicates(job, existing):
                    # Keep better version
                    if self._select_best_version([job, existing]) == job:
                        unique.remove(existing)
                        unique.append(job)
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique.append(job)
        
        return unique
    
    def are_duplicates(
        self,
        job1: object,
        job2: object,
    ) -> bool:
        """
        Check if two jobs are duplicates.
        
        Args:
            job1: First job
            job2: Second job
            
        Returns:
            True if duplicates
        """
        # Exact URL match is already handled
        if job1.url == job2.url:
            return True
        
        # Check title + company similarity
        title_sim = fuzz.token_set_ratio(
            job1.title.lower(),
            job2.title.lower()
        )
        
        company_sim = fuzz.ratio(
            job1.company.lower(),
            job2.company.lower()
        )
        
        # Both must be high confidence
        if title_sim >= self.title_threshold and company_sim >= self.company_threshold:
            # Also check location if available
            if job1.location and job2.location:
                location_sim = fuzz.ratio(
                    job1.location.lower(),
                    job2.location.lower()
                )
                
                if location_sim >= self.location_threshold:
                    return True
            else:
                # No location, but title+company match is strong
                return True
        
        return False
    
    def find_duplicates(
        self,
        jobs: List,
    ) -> List[Tuple[int, int, float]]:
        """
        Find all duplicate pairs.
        
        Args:
            jobs: List of jobs
            
        Returns:
            List of (index1, index2, confidence) tuples
        """
        duplicates = []
        
        for i in range(len(jobs)):
            for j in range(i + 1, len(jobs)):
                if self.are_duplicates(jobs[i], jobs[j]):
                    # Calculate confidence
                    title_sim = fuzz.token_set_ratio(
                        jobs[i].title.lower(),
                        jobs[j].title.lower()
                    )
                    company_sim = fuzz.ratio(
                        jobs[i].company.lower(),
                        jobs[j].company.lower()
                    )
                    confidence = (title_sim + company_sim) / 2
                    
                    duplicates.append((i, j, confidence))
        
        return duplicates
    
    def get_duplicate_stats(
        self,
        jobs: List,
    ) -> dict:
        """
        Get duplicate statistics.
        
        Args:
            jobs: List of jobs
            
        Returns:
            Statistics dict
        """
        total = len(jobs)
        unique = len(self.deduplicate(jobs))
        duplicates = total - unique
        
        return {
            'total': total,
            'unique': unique,
            'duplicates': duplicates,
            'duplicate_rate': duplicates / total if total > 0 else 0,
        }
