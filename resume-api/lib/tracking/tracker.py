"""
Application Tracker Service

Tracks job applications through the hiring pipeline.
"""

import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..jobs.models import JobApplication

logger = logging.getLogger(__name__)


# Valid status transitions
STATUS_TRANSITIONS = {
    "draft": ["applied", "archived"],
    "applied": ["screening", "interviewing", "rejected", "withdrawn"],
    "screening": ["interviewing", "rejected", "withdrawn"],
    "interviewing": ["offer", "rejected", "withdrawn"],
    "offer": ["accepted", "rejected", "withdrawn"],
    "accepted": [],
    "rejected": [],
    "withdrawn": [],
    "archived": [],
}


class ApplicationTracker:
    """
    Tracks job applications through the hiring pipeline.
    
    Features:
    - Create/update applications
    - Status workflow validation
    - Response time tracking
    - External application tracking
    
    Example:
        tracker = ApplicationTracker(db_session)
        app = await tracker.create_application(data, user_id)
    """
    
    def __init__(self, db_session: AsyncSession):
        """
        Initialize Application Tracker.
        
        Args:
            db_session: Async database session
        """
        self.db = db_session
    
    async def create_application(
        self,
        data: dict,
        user_id: int,
    ) -> JobApplication:
        """
        Create a new job application.
        
        Args:
            data: Application data
            user_id: User ID
            
        Returns:
            Created JobApplication
        """
        application = JobApplication(
            user_id=user_id,
            job_id=data.get("job_id"),
            status=data.get("status", "applied"),
            external_id=data.get("external_id"),
            external_source=data.get("external_source"),
            external_status=data.get("external_status"),
            submitted_at=data.get("submitted_at"),
            notes=data.get("notes"),
            autofilled=data.get("autofilled", False),
        )
        
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        
        logger.info(f"Created application {application.id} for user {user_id}")
        
        return application
    
    async def update_application(
        self,
        app_id: int,
        data: dict,
        user_id: int,
    ) -> JobApplication:
        """
        Update an existing application.
        
        Args:
            app_id: Application ID
            data: Update data
            user_id: User ID (for ownership check)
            
        Returns:
            Updated JobApplication
        """
        application = await self.db.get(JobApplication, app_id)
        
        if not application:
            raise ValueError(f"Application {app_id} not found")
        
        if application.user_id != user_id:
            raise ValueError(f"Application {app_id} does not belong to user {user_id}")
        
        # Update fields
        for field, value in data.items():
            if hasattr(application, field):
                setattr(application, field, value)
        
        await self.db.commit()
        await self.db.refresh(application)
        
        logger.info(f"Updated application {application.id} for user {user_id}")
        
        return application
    
    async def update_status(
        self,
        app_id: int,
        new_status: str,
        user_id: int,
    ) -> JobApplication:
        """
        Update application status with workflow validation.
        
        Args:
            app_id: Application ID
            new_status: New status
            user_id: User ID
            
        Returns:
            Updated JobApplication
            
        Raises:
            ValueError: If status transition is invalid
        """
        application = await self.db.get(JobApplication, app_id)
        
        if not application:
            raise ValueError(f"Application {app_id} not found")
        
        if application.user_id != user_id:
            raise ValueError(f"Application {app_id} does not belong to user {user_id}")
        
        # Validate status transition
        current_status = application.status
        allowed_transitions = STATUS_TRANSITIONS.get(current_status, [])
        
        if new_status not in allowed_transitions:
            raise ValueError(
                f"Cannot transition from '{current_status}' to '{new_status}'. "
                f"Allowed transitions: {allowed_transitions}"
            )
        
        # Update status and tracking
        application.status = new_status
        application.days_in_status = self._calculate_days_in_status(
            application.submitted_at
        )
        
        # Track response time if moving to interviewing or offer
        if new_status in ["interviewing", "offer"] and application.submitted_at:
            application.response_time_days = self._calculate_days_in_status(
                application.submitted_at
            )
        
        await self.db.commit()
        await self.db.refresh(application)
        
        logger.info(
            f"Updated application {application.id} status to {new_status}"
        )
        
        return application
    
    async def delete_application(
        self,
        app_id: int,
        user_id: int,
    ) -> bool:
        """
        Delete an application.
        
        Args:
            app_id: Application ID
            user_id: User ID
            
        Returns:
            True if deleted
        """
        application = await self.db.get(JobApplication, app_id)
        
        if not application:
            raise ValueError(f"Application {app_id} not found")
        
        if application.user_id != user_id:
            raise ValueError(f"Application {app_id} does not belong to user {user_id}")
        
        await self.db.delete(application)
        await self.db.commit()
        
        logger.info(f"Deleted application {application.id} for user {user_id}")
        
        return True
    
    async def get_applications(
        self,
        user_id: int,
        status: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[JobApplication]:
        """
        Get user's applications with filters.
        
        Args:
            user_id: User ID
            status: Filter by status
            source: Filter by source
            limit: Limit results
            offset: Offset results
            
        Returns:
            List of JobApplication
        """
        query = select(JobApplication).where(
            JobApplication.user_id == user_id
        )
        
        if status:
            query = query.where(JobApplication.status == status)
        
        if source:
            query = query.where(JobApplication.external_source == source)
        
        query = query.order_by(JobApplication.submitted_at.desc())
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_application(
        self,
        app_id: int,
        user_id: int,
    ) -> Optional[JobApplication]:
        """
        Get a specific application.
        
        Args:
            app_id: Application ID
            user_id: User ID
            
        Returns:
            JobApplication or None
        """
        application = await self.db.get(JobApplication, app_id)
        
        if not application:
            return None
        
        if application.user_id != user_id:
            return None
        
        return application
    
    def _calculate_days_in_status(self, submitted_at: Optional[datetime]) -> int:
        """Calculate days since submission."""
        if not submitted_at:
            return 0
        
        delta = datetime.utcnow() - submitted_at
        return delta.days
    
    async def track_external_application(
        self,
        user_id: int,
        job_id: str,
        external_source: str,
        external_id: str,
        status: str = "applied",
    ) -> JobApplication:
        """
        Track an application submitted externally.
        
        Args:
            user_id: User ID
            job_id: Job ID
            external_source: Source (LinkedIn, Indeed, etc.)
            external_id: External application ID
            status: Application status
            
        Returns:
            Created JobApplication
        """
        # Check if application already exists
        existing = await self.db.execute(
            select(JobApplication).where(
                JobApplication.user_id == user_id,
                JobApplication.job_id == job_id,
                JobApplication.external_source == external_source,
            )
        )
        
        application = existing.scalar_one_or_none()
        
        if application:
            # Update existing
            application.external_id = external_id
            application.status = status
            await self.db.commit()
            await self.db.refresh(application)
        else:
            # Create new
            application = await self.create_application(
                {
                    "job_id": job_id,
                    "external_source": external_source,
                    "external_id": external_id,
                    "status": status,
                },
                user_id,
            )
        
        return application
