"""
Job Aggregator Service

Orchestrates fetching jobs from multiple sources.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import JobSource, JobPosting
from .sources.base import BaseJobSource
from .sources.rss import RSSJobSource
from .sources.api import APIJobSource

logger = logging.getLogger(__name__)


class JobAggregator:
    """
    Aggregates jobs from multiple sources.
    
    Features:
    - Parallel fetching from multiple sources
    - Error handling per source (don't fail all if one fails)
    - Source abstraction for RSS, API, scraping
    - Automatic source health tracking
    
    Example:
        aggregator = JobAggregator(db_session)
        jobs = await aggregator.fetch_all()
    """
    
    def __init__(self, db_session: AsyncSession):
        """
        Initialize Job Aggregator.
        
        Args:
            db_session: Async database session
        """
        self.db = db_session
        self._sources: List[BaseJobSource] = []
    
    async def fetch_all(
        self,
        active_only: bool = True,
        parallel: bool = True,
    ) -> List[JobPosting]:
        """
        Fetch jobs from all sources.
        
        Args:
            active_only: Only fetch from active sources
            parallel: Fetch sources in parallel
            
        Returns:
            List of all fetched jobs
        """
        # Get sources from database
        sources = await self._get_sources(active_only)
        
        if not sources:
            logger.info("No sources to fetch from")
            return []
        
        logger.info(f"Fetching from {len(sources)} sources")
        
        all_jobs = []
        
        if parallel:
            # Fetch all sources in parallel
            tasks = [self._fetch_source(source) for source in sources]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Source fetch failed: {result}")
                elif isinstance(result, list):
                    all_jobs.extend(result)
        else:
            # Fetch sources sequentially
            for source in sources:
                try:
                    jobs = await self._fetch_source(source)
                    all_jobs.extend(jobs)
                except Exception as e:
                    logger.error(f"Source fetch failed: {e}")
        
        logger.info(f"Fetched {len(all_jobs)} total jobs")
        
        return all_jobs
    
    async def fetch_source(self, source_id: str) -> List[JobPosting]:
        """
        Fetch jobs from a specific source.
        
        Args:
            source_id: Source ID
            
        Returns:
            List of fetched jobs
        """
        source = await self._get_source(source_id)
        
        if not source:
            logger.warning(f"Source {source_id} not found")
            return []
        
        return await self._fetch_source(source)
    
    async def _fetch_source(self, source: JobSource) -> List[JobPosting]:
        """
        Fetch jobs from a single source.
        
        Args:
            source: JobSource object
            
        Returns:
            List of fetched jobs
        """
        logger.info(f"Fetching from source: {source.name}")
        
        try:
            # Get appropriate fetcher
            fetcher = self._get_fetcher(source)
            
            if not fetcher:
                logger.warning(f"No fetcher for source type: {source.type}")
                return []
            
            # Fetch jobs
            jobs = await fetcher.fetch(source)
            
            # Update source metadata
            source.last_fetched = datetime.utcnow()
            source.jobs_fetched += len(jobs)
            
            await self.db.commit()
            
            logger.info(f"Fetched {len(jobs)} jobs from {source.name}")
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to fetch from {source.name}: {e}")
            
            # Don't rollback - we still updated last_fetched
            return []
    
    def _get_fetcher(self, source: JobSource) -> Optional[BaseJobSource]:
        """
        Get appropriate fetcher for source type.
        
        Args:
            source: JobSource object
            
        Returns:
            Job source fetcher
        """
        if source.type == "rss":
            return RSSJobSource()
        elif source.type == "api":
            return APIJobSource()
        # elif source.type == "scrape":
        #     return ScraperJobSource()
        
        return None
    
    async def _get_sources(
        self,
        active_only: bool = True,
    ) -> List[JobSource]:
        """
        Get job sources from database.
        
        Args:
            active_only: Only return active sources
            
        Returns:
            List of JobSource objects
        """
        query = select(JobSource)
        
        if active_only:
            query = query.where(JobSource.is_active == True)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _get_source(self, source_id: str) -> Optional[JobSource]:
        """
        Get single source by ID.
        
        Args:
            source_id: Source ID
            
        Returns:
            JobSource or None
        """
        result = await self.db.execute(
            select(JobSource).where(JobSource.id == source_id)
        )
        return result.scalar_one_or_none()
    
    async def get_sources(self, active_only: bool = True) -> List[dict]:
        """
        Get list of sources with metadata.
        
        Args:
            active_only: Only return active sources
            
        Returns:
            List of source dicts
        """
        sources = await self._get_sources(active_only)
        
        return [
            {
                "id": source.id,
                "name": source.name,
                "type": source.type,
                "url": source.url,
                "is_active": source.is_active,
                "last_fetched": source.last_fetched.isoformat() if source.last_fetched else None,
                "fetch_frequency": source.fetch_frequency,
                "jobs_fetched": source.jobs_fetched,
            }
            for source in sources
        ]
    
    async def schedule_fetch(
        self,
        max_age_minutes: int = 60,
    ) -> List[JobSource]:
        """
        Get sources that need fetching.
        
        Args:
            max_age_minutes: Maximum age since last fetch
            
        Returns:
            List of sources to fetch
        """
        sources = await self._get_sources(active_only=True)
        
        threshold = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        
        due_sources = [
            source for source in sources
            if source.last_fetched is None or source.last_fetched < threshold
        ]
        
        logger.info(f"{len(due_sources)} sources due for fetch")
        
        return due_sources
