"""
Alert Job Matcher Service

Matches jobs against user alerts.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from .models import JobAlert, AlertJobMatch
from ..jobs.models import JobPosting

logger = logging.getLogger(__name__)


class AlertJobMatcher:
    """
    Matches jobs against user alerts.
    
    Features:
    - Fuzzy matching for query
    - Exact matching for filters
    - Tracks sent jobs to avoid duplicates
    - Scores matches by relevance
    
    Example:
        matcher = AlertJobMatcher(db_session)
        matches = await matcher.match_all_alerts()
    """
    
    def __init__(self, db_session: AsyncSession):
        """
        Initialize Alert Job Matcher.
        
        Args:
            db_session: Async database session
        """
        self.db = db_session
    
    async def match_all_alerts(
        self,
        active_only: bool = True,
        limit_per_alert: int = 10,
    ) -> Dict[JobAlert, List[JobPosting]]:
        """
        Match all alerts against available jobs.
        
        Args:
            active_only: Only match active alerts
            limit_per_alert: Max jobs per alert
            
        Returns:
            Dict mapping alerts to matching jobs
        """
        # Get all active alerts
        alerts = await self._get_alerts(active_only)
        
        if not alerts:
            logger.info("No alerts to match")
            return {}
        
        logger.info(f"Matching {len(alerts)} alerts against jobs")
        
        results = {}
        
        for alert in alerts:
            try:
                jobs = await self.find_matches(alert, limit_per_alert)
                if jobs:
                    results[alert] = jobs
                    logger.info(f"Alert {alert.id} matched {len(jobs)} jobs")
            except Exception as e:
                logger.error(f"Failed to match alert {alert.id}: {e}")
        
        return results
    
    async def find_matches(
        self,
        alert: JobAlert,
        limit: int = 10,
    ) -> List[JobPosting]:
        """
        Find jobs matching an alert.
        
        Args:
            alert: JobAlert object
            limit: Max jobs to return
            
        Returns:
            List of matching JobPosting objects
        """
        # Build query
        query = select(JobPosting).where(
            JobPosting.is_active == True
        )
        
        # Apply alert filters
        query = await self._apply_filters(query, alert)
        
        # Exclude already sent jobs
        query = await self._exclude_sent_jobs(query, alert)
        
        # Order by relevance (posted date for now)
        query = query.order_by(JobPosting.posted_date.desc())
        
        # Limit results
        query = query.limit(limit)
        
        # Execute
        result = await self.db.execute(query)
        jobs = list(result.scalars().all())
        
        return jobs
    
    async def _get_alerts(
        self,
        active_only: bool = True,
    ) -> List[JobAlert]:
        """
        Get alerts to match.
        
        Args:
            active_only: Only return active alerts
            
        Returns:
            List of JobAlert objects
        """
        query = select(JobAlert)
        
        if active_only:
            query = query.where(JobAlert.is_active == True)
        
        # Only get alerts that haven't been sent recently based on frequency
        now = datetime.utcnow()
        
        query = query.where(
            or_(
                JobAlert.last_sent_at == None,
                JobAlert.frequency == 'instant',
                and_(
                    JobAlert.frequency == 'daily',
                    JobAlert.last_sent_at < now.replace(hour=0, minute=0, second=0)
                ),
                and_(
                    JobAlert.frequency == 'weekly',
                    JobAlert.last_sent_at < now.replace(weekday=0, hour=0, minute=0, second=0)
                ),
            )
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _apply_filters(
        self,
        query,
        alert: JobAlert,
    ):
        """
        Apply alert filters to job query.
        
        Args:
            query: SQLAlchemy query
            alert: JobAlert object
            
        Returns:
            Filtered query
        """
        # Query match (title, company, description)
        if alert.query:
            search_terms = alert.query.lower().split()
            for term in search_terms:
                query = query.where(
                    or_(
                        JobPosting.title.ilike(f"%{term}%"),
                        JobPosting.company.ilike(f"%{term}%"),
                        JobPosting.description.ilike(f"%{term}%"),
                    )
                )
        
        # Remote filter
        if alert.remote is not None:
            query = query.where(JobPosting.remote == alert.remote)
        
        # Location filter
        if alert.location:
            query = query.where(
                JobPosting.location.ilike(f"%{alert.location}%")
            )
        
        # Salary filter
        if alert.min_salary:
            query = query.where(
                or_(
                    JobPosting.salary_min >= alert.min_salary,
                    JobPosting.salary_max >= alert.min_salary,
                )
            )
        
        # Employment type filter
        if alert.employment_type:
            query = query.where(
                JobPosting.employment_type == alert.employment_type
            )
        
        # Experience level filter
        if alert.experience_level:
            query = query.where(
                JobPosting.experience_level == alert.experience_level
            )
        
        return query
    
    async def _exclude_sent_jobs(
        self,
        query,
        alert: JobAlert,
    ):
        """
        Exclude jobs already sent for this alert.
        
        Args:
            query: SQLAlchemy query
            alert: JobAlert object
            
        Returns:
            Query excluding sent jobs
        """
        # Get IDs of already sent jobs
        sent_query = select(AlertJobMatch.job_id).where(
            AlertJobMatch.alert_id == alert.id,
            AlertJobMatch.is_sent == True,
        )
        
        sent_result = await self.db.execute(sent_query)
        sent_job_ids = [row[0] for row in sent_result.all()]
        
        if sent_job_ids:
            query = query.where(~JobPosting.id.in_(sent_job_ids))
        
        return query
    
    async def mark_jobs_sent(
        self,
        alert: JobAlert,
        jobs: List[JobPosting],
    ):
        """
        Mark jobs as sent for an alert.
        
        Args:
            alert: JobAlert object
            jobs: List of jobs sent
        """
        for job in jobs:
            # Check if match already exists
            existing = await self.db.execute(
                select(AlertJobMatch).where(
                    AlertJobMatch.alert_id == alert.id,
                    AlertJobMatch.job_id == job.id,
                )
            )
            
            match = existing.scalar_one_or_none()
            
            if not match:
                match = AlertJobMatch(
                    alert_id=alert.id,
                    job_id=job.id,
                    is_sent=True,
                    sent_at=datetime.utcnow(),
                )
                self.db.add(match)
            else:
                match.is_sent = True
                match.sent_at = datetime.utcnow()
        
        # Update alert last_sent_at
        alert.last_sent_at = datetime.utcnow()
        alert.jobs_sent_count += len(jobs)
        
        await self.db.commit()
    
    def score_match(
        self,
        alert: JobAlert,
        job: JobPosting,
    ) -> float:
        """
        Score a job match by relevance.
        
        Args:
            alert: JobAlert object
            job: JobPosting object
            
        Returns:
            Relevance score (0-100)
        """
        score = 0.0
        
        # Query match score (40 points)
        if alert.query:
            query_lower = alert.query.lower()
            title_lower = job.title.lower()
            
            if query_lower in title_lower:
                score += 40
            elif any(term in title_lower for term in query_lower.split()):
                score += 20
        
        # Remote match (15 points)
        if alert.remote is not None:
            if job.remote == alert.remote:
                score += 15
        else:
            score += 15  # No preference, full points
        
        # Location match (15 points)
        if alert.location:
            if alert.location.lower() in job.location.lower():
                score += 15
        else:
            score += 15
        
        # Salary match (15 points)
        if alert.min_salary:
            if job.salary_max and job.salary_max >= alert.min_salary:
                score += 15
        else:
            score += 15
        
        # Type/level match (15 points)
        if alert.employment_type and alert.employment_type == job.employment_type:
            score += 7.5
        else:
            score += 3.75
        
        if alert.experience_level and alert.experience_level == job.experience_level:
            score += 7.5
        else:
            score += 3.75
        
        return score
