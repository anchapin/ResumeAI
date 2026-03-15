"""
External Sync Service

Syncs applications with external platforms (LinkedIn, etc.).
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..jobs.models import JobApplication

logger = logging.getLogger(__name__)


# Status mapping between platforms and our system
LINKEDIN_STATUS_MAP = {
    "applied": "applied",
    "viewed": "screening",
    "in_progress": "interviewing",
    "interviewing": "interviewing",
    "offer": "offer",
    "accepted": "accepted",
    "rejected": "rejected",
    "withdrawn": "withdrawn",
    "archived": "archived",
}

INDEED_STATUS_MAP = {
    "submitted": "applied",
    "viewed": "screening",
    "selected": "interviewing",
    "offered": "offer",
    "hired": "accepted",
    "not_selected": "rejected",
    "withdrawn": "withdrawn",
}


class ExternalSyncService:
    """
    Syncs applications with external platforms.
    
    Features:
    - LinkedIn application sync
    - Status mapping between platforms
    - Periodic sync scheduling
    - Conflict resolution
    
    Example:
        sync = ExternalSyncService(db_session, linkedin_client)
        count = await sync.sync_linkedin_applications(user_id)
    """
    
    def __init__(
        self,
        db_session: AsyncSession,
        linkedin_client: Optional[Any] = None,
    ):
        """
        Initialize External Sync Service.
        
        Args:
            db_session: Async database session
            linkedin_client: LinkedIn API client (optional)
        """
        self.db = db_session
        self.linkedin_client = linkedin_client
    
    async def sync_linkedin_applications(
        self,
        user_id: int,
    ) -> int:
        """
        Sync applications from LinkedIn.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of applications synced
        """
        if not self.linkedin_client:
            logger.warning("LinkedIn client not configured")
            return 0
        
        try:
            # Fetch applications from LinkedIn
            linkedin_apps = await self._fetch_linkedin_applications()
            
            synced_count = 0
            
            for li_app in linkedin_apps:
                # Map LinkedIn status to our status
                li_status = li_app.get("status", "")
                our_status = LINKEDIN_STATUS_MAP.get(li_status, "applied")
                
                # Find or create application
                application = await self._find_or_create_application(
                    user_id=user_id,
                    external_source="linkedin",
                    external_id=li_app.get("id"),
                    job_title=li_app.get("job_title"),
                    company=li_app.get("company"),
                )
                
                if application:
                    # Update status if changed
                    if application.status != our_status:
                        application.status = our_status
                        application.external_status = li_status
                        synced_count += 1
            
            logger.info(f"Synced {synced_count} LinkedIn applications for user {user_id}")
            return synced_count
            
        except Exception as e:
            logger.error(f"Failed to sync LinkedIn applications: {e}")
            return 0
    
    async def _fetch_linkedin_applications(self) -> List[Dict[str, Any]]:
        """
        Fetch applications from LinkedIn API.
        
        Returns:
            List of LinkedIn application data
        """
        if not self.linkedin_client:
            return []
        
        # Would call LinkedIn API here
        # For now, return empty list
        return []
    
    async def _find_or_create_application(
        self,
        user_id: int,
        external_source: str,
        external_id: str,
        job_title: str,
        company: str,
    ) -> Optional[JobApplication]:
        """
        Find existing application or create new one.
        
        Args:
            user_id: User ID
            external_source: External source name
            external_id: External application ID
            job_title: Job title
            company: Company name
            
        Returns:
            JobApplication
        """
        # Try to find by external ID
        existing = await self.db.execute(
            select(JobApplication).where(
                JobApplication.user_id == user_id,
                JobApplication.external_source == external_source,
                JobApplication.external_id == external_id,
            )
        )
        
        application = existing.scalar_one_or_none()
        
        if not application:
            # Create new application
            application = JobApplication(
                user_id=user_id,
                external_source=external_source,
                external_id=external_id,
                status="applied",
            )
            self.db.add(application)
            await self.db.commit()
            await self.db.refresh(application)
        
        return application
    
    async def update_application_status(
        self,
        app_id: int,
        external_status: str,
        source: str,
    ) -> bool:
        """
        Update application status from external source.
        
        Args:
            app_id: Application ID
            external_status: Status from external source
            source: Source name (linkedin, indeed, etc.)
            
        Returns:
            True if updated
        """
        application = await self.db.get(JobApplication, app_id)
        
        if not application:
            return False
        
        # Map external status to our status
        status_map = {
            "linkedin": LINKEDIN_STATUS_MAP,
            "indeed": INDEED_STATUS_MAP,
        }
        
        mapper = status_map.get(source.lower(), {})
        our_status = mapper.get(external_status, "applied")
        
        # Update if different
        if application.status != our_status:
            application.status = our_status
            application.external_status = external_status
            await self.db.commit()
            
            logger.info(
                f"Updated application {app_id} status to {our_status} "
                f"from {source} status {external_status}"
            )
            return True
        
        return False
    
    async def schedule_sync(
        self,
        user_id: int,
        source: str,
        interval_hours: int = 24,
    ) -> bool:
        """
        Schedule periodic sync for a user.
        
        Args:
            user_id: User ID
            source: Source to sync
            interval_hours: Sync interval in hours
            
        Returns:
            True if scheduled
        """
        # Would integrate with APScheduler or similar
        # For now, just log
        logger.info(
            f"Scheduled {source} sync for user {user_id} "
            f"every {interval_hours} hours"
        )
        return True
    
    def map_status(
        self,
        external_status: str,
        source: str,
    ) -> str:
        """
        Map external status to our status.
        
        Args:
            external_status: Status from external source
            source: Source name
            
        Returns:
            Mapped status
        """
        status_map = {
            "linkedin": LINKEDIN_STATUS_MAP,
            "indeed": INDEED_STATUS_MAP,
        }
        
        mapper = status_map.get(source.lower(), {})
        return mapper.get(external_status, "applied")
