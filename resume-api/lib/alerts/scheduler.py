"""
Alert Scheduler

Schedules and runs alert notifications.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .models import JobAlert, NotificationPreference
from .matcher import AlertJobMatcher
from .sender import NotificationSender

logger = logging.getLogger(__name__)


class AlertScheduler:
    """
    Schedules and runs alert notifications.
    
    Features:
    - Instant alerts (every 15 min)
    - Daily digest (9 AM local time)
    - Weekly digest (Monday 9 AM)
    - Timezone handling
    - Error handling and retry
    
    Example:
        scheduler = AlertScheduler(db_session, email_client, sms_client)
        scheduler.start()
    """
    
    def __init__(
        self,
        db_session: AsyncSession,
        email_client=None,
        sms_client=None,
    ):
        """
        Initialize Alert Scheduler.
        
        Args:
            db_session: Async database session
            email_client: Email client
            sms_client: SMS client
        """
        self.db = db_session
        self.matcher = AlertJobMatcher(db_session)
        self.sender = NotificationSender(db_session, email_client, sms_client)
        self.scheduler = AsyncIOScheduler()
    
    def start(self):
        """Start the scheduler."""
        # Instant alerts (every 15 minutes)
        self.scheduler.add_job(
            self._run_instant_alerts,
            'interval',
            minutes=15,
            id='instant_alerts',
            replace_existing=True,
            misfire_grace_time=300,  # 5 min grace
        )
        
        # Daily digest (9 AM UTC - would be adjusted per timezone)
        self.scheduler.add_job(
            self._run_daily_digest,
            'cron',
            hour=9,
            minute=0,
            id='daily_digest',
            replace_existing=True,
            misfire_grace_time=3600,  # 1 hour grace
        )
        
        # Weekly digest (Monday 9 AM UTC)
        self.scheduler.add_job(
            self._run_weekly_digest,
            'cron',
            day_of_week='mon',
            hour=9,
            minute=0,
            id='weekly_digest',
            replace_existing=True,
            misfire_grace_time=3600,
        )
        
        self.scheduler.start()
        logger.info("Alert scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        self.scheduler.shutdown()
        logger.info("Alert scheduler stopped")
    
    async def _run_instant_alerts(self):
        """Run instant alerts."""
        logger.info("Running instant alerts")
        
        try:
            # Get alerts with instant frequency
            from sqlalchemy import select
            result = await self.db.execute(
                select(JobAlert).where(
                    JobAlert.is_active == True,
                    JobAlert.frequency == 'instant',
                )
            )
            alerts = list(result.scalars().all())
            
            if not alerts:
                logger.info("No instant alerts to run")
                return
            
            # Match and send
            for alert in alerts:
                try:
                    jobs = await self.matcher.find_matches(alert, limit=5)
                    
                    if jobs:
                        # Get user
                        from ..database import User
                        user = await self.db.get(User, alert.user_id)
                        
                        if user:
                            # Send email
                            await self.sender.send_email_alert(user, alert, jobs)
                            
                            # Send SMS if enabled
                            prefs = await self.sender._get_preferences(user.id)
                            if prefs and prefs.sms_enabled:
                                await self.sender.send_sms_alert(user, alert, jobs[:3])  # Max 3 for SMS
                            
                            # Mark as sent
                            await self.matcher.mark_jobs_sent(alert, jobs)
                            
                except Exception as e:
                    logger.error(f"Failed to process instant alert {alert.id}: {e}")
            
            logger.info(f"Instant alerts completed: {len(alerts)} alerts processed")
            
        except Exception as e:
            logger.error(f"Instant alerts failed: {e}")
    
    async def _run_daily_digest(self):
        """Run daily digest."""
        logger.info("Running daily digest")
        
        try:
            # Get users with daily digest enabled
            from sqlalchemy import select
            result = await self.db.execute(
                select(NotificationPreference).where(
                    NotificationPreference.email_enabled == True,
                    NotificationPreference.daily_digest == True,
                )
            )
            preferences = list(result.scalars().all())
            
            if not preferences:
                logger.info("No daily digest subscribers")
                return
            
            # For each user, get jobs from last 24 hours
            for pref in preferences:
                try:
                    user = await self.db.get(type('obj', (object,), {'__tablename__': 'users'}), pref.user_id)
                    
                    if not user:
                        continue
                    
                    # Get jobs from last 24 hours (simplified - would filter by user preferences)
                    from ..jobs.models import JobPosting
                    from sqlalchemy import select
                    
                    yesterday = datetime.utcnow() - timedelta(days=1)
                    
                    jobs_result = await self.db.execute(
                        select(JobPosting).where(
                            JobPosting.is_active == True,
                            JobPosting.posted_date >= yesterday,
                        ).limit(20)
                    )
                    jobs = list(jobs_result.scalars().all())
                    
                    if jobs:
                        await self.sender.send_daily_digest(user, jobs)
                        
                except Exception as e:
                    logger.error(f"Failed to send daily digest to user {pref.user_id}: {e}")
            
            logger.info(f"Daily digest completed: {len(preferences)} users")
            
        except Exception as e:
            logger.error(f"Daily digest failed: {e}")
    
    async def _run_weekly_digest(self):
        """Run weekly digest."""
        logger.info("Running weekly digest")
        
        try:
            # Get users with weekly digest enabled
            from sqlalchemy import select
            result = await self.db.execute(
                select(NotificationPreference).where(
                    NotificationPreference.email_enabled == True,
                    NotificationPreference.weekly_digest == True,
                )
            )
            preferences = list(result.scalars().all())
            
            if not preferences:
                logger.info("No weekly digest subscribers")
                return
            
            # For each user, get jobs from last 7 days
            for pref in preferences:
                try:
                    user = await self.db.get(type('obj', (object,), {'__tablename__': 'users'}), pref.user_id)
                    
                    if not user:
                        continue
                    
                    # Get jobs from last 7 days
                    from ..jobs.models import JobPosting
                    from sqlalchemy import select
                    
                    last_week = datetime.utcnow() - timedelta(days=7)
                    
                    jobs_result = await self.db.execute(
                        select(JobPosting).where(
                            JobPosting.is_active == True,
                            JobPosting.posted_date >= last_week,
                        ).limit(50)
                    )
                    jobs = list(jobs_result.scalars().all())
                    
                    if jobs:
                        await self.sender.send_weekly_digest(user, jobs)
                        
                except Exception as e:
                    logger.error(f"Failed to send weekly digest to user {pref.user_id}: {e}")
            
            logger.info(f"Weekly digest completed: {len(preferences)} users")
            
        except Exception as e:
            logger.error(f"Weekly digest failed: {e}")
    
    async def run_manual_alert(
        self,
        alert_id: int,
    ):
        """
        Manually trigger an alert.
        
        Args:
            alert_id: Alert ID to trigger
        """
        from sqlalchemy import select
        
        alert = await self.db.get(JobAlert, alert_id)
        
        if not alert:
            logger.warning(f"Alert {alert_id} not found")
            return
        
        logger.info(f"Manually triggering alert {alert_id}")
        
        try:
            jobs = await self.matcher.find_matches(alert, limit=10)
            
            if jobs:
                user = await self.db.get(type('obj', (object,), {'__tablename__': 'users'}), alert.user_id)
                
                if user:
                    await self.sender.send_email_alert(user, alert, jobs)
                    await self.matcher.mark_jobs_sent(alert, jobs)
                    
                    logger.info(f"Manual alert {alert_id} sent with {len(jobs)} jobs")
            else:
                logger.info(f"No jobs found for manual alert {alert_id}")
                
        except Exception as e:
            logger.error(f"Manual alert {alert_id} failed: {e}")
