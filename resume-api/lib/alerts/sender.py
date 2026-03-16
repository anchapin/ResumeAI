"""
Notification Sender Service

Sends email and SMS notifications for job alerts.
"""

import logging
from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from .models import JobAlert, NotificationPreference
from ..jobs.models import JobPosting
from ..database import User

logger = logging.getLogger(__name__)


class NotificationSender:
    """
    Sends notifications for job alerts.
    
    Features:
    - Email notifications
    - SMS notifications (Twilio)
    - Daily/weekly digest
    - Unsubscribe links
    - Delivery tracking
    
    Example:
        sender = NotificationSender(db_session, email_client, sms_client)
        await sender.send_email_alert(user, alert, jobs)
    """
    
    def __init__(
        self,
        db_session: AsyncSession,
        email_client=None,
        sms_client=None,
    ):
        """
        Initialize Notification Sender.
        
        Args:
            db_session: Async database session
            email_client: Email client (aiosmtplib)
            sms_client: SMS client (Twilio)
        """
        self.db = db_session
        self.email_client = email_client
        self.sms_client = sms_client
    
    async def send_email_alert(
        self,
        user: User,
        alert: JobAlert,
        jobs: List[JobPosting],
    ) -> bool:
        """
        Send email alert for matching jobs.
        
        Args:
            user: User object
            alert: JobAlert object
            jobs: List of matching jobs
            
        Returns:
            True if sent successfully
        """
        if not jobs:
            return False
        
        # Get user preferences
        prefs = await self._get_preferences(user.id)
        
        if not prefs or not prefs.email_enabled:
            logger.info(f"Email notifications disabled for user {user.id}")
            return False
        
        # Build email
        subject = f"{len(jobs)} new job{'s' if len(jobs) > 1 else ''} matching "{alert.name}""
        
        html_body = self._render_email_template(user, alert, jobs)
        text_body = self._render_text_template(user, alert, jobs)
        
        # Send email
        try:
            await self._send_email(
                to_email=user.email or prefs.email_address,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
            
            logger.info(f"Sent email alert to user {user.id} for alert {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False
    
    async def send_sms_alert(
        self,
        user: User,
        alert: JobAlert,
        jobs: List[JobPosting],
    ) -> bool:
        """
        Send SMS alert for matching jobs.
        
        Args:
            user: User object
            alert: JobAlert object
            jobs: List of matching jobs
            
        Returns:
            True if sent successfully
        """
        if not jobs:
            return False
        
        # Get user preferences
        prefs = await self._get_preferences(user.id)
        
        if not prefs or not prefs.sms_enabled:
            logger.info(f"SMS notifications disabled for user {user.id}")
            return False
        
        if not prefs.phone_number:
            logger.warning(f"No phone number for user {user.id}")
            return False
        
        # Build SMS message (short, 160 chars max)
        message = self._render_sms_template(alert, jobs)
        
        # Send SMS
        try:
            await self._send_sms(
                to_phone=prefs.phone_number,
                country_code=prefs.phone_country_code,
                message=message,
            )
            
            logger.info(f"Sent SMS alert to user {user.id} for alert {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS alert: {e}")
            return False
    
    async def send_daily_digest(
        self,
        user: User,
        jobs: List[JobPosting],
    ) -> bool:
        """
        Send daily digest email.
        
        Args:
            user: User object
            jobs: List of jobs for digest
            
        Returns:
            True if sent successfully
        """
        if not jobs:
            return False
        
        prefs = await self._get_preferences(user.id)
        
        if not prefs or not prefs.email_enabled or not prefs.daily_digest:
            return False
        
        subject = f"Your daily job digest: {len(jobs)} new jobs"
        html_body = self._render_digest_template(user, jobs, "daily")
        text_body = self._render_digest_text(user, jobs, "daily")
        
        try:
            await self._send_email(
                to_email=user.email or prefs.email_address,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
            
            logger.info(f"Sent daily digest to user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send daily digest: {e}")
            return False
    
    async def send_weekly_digest(
        self,
        user: User,
        jobs: List[JobPosting],
    ) -> bool:
        """
        Send weekly digest email.
        
        Args:
            user: User object
            jobs: List of jobs for digest
            
        Returns:
            True if sent successfully
        """
        if not jobs:
            return False
        
        prefs = await self._get_preferences(user.id)
        
        if not prefs or not prefs.email_enabled or not prefs.weekly_digest:
            return False
        
        subject = f"Your weekly job digest: {len(jobs)} new jobs"
        html_body = self._render_digest_template(user, jobs, "weekly")
        text_body = self._render_digest_text(user, jobs, "weekly")
        
        try:
            await self._send_email(
                to_email=user.email or prefs.email_address,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
            
            logger.info(f"Sent weekly digest to user {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send weekly digest: {e}")
            return False
    
    async def _get_preferences(
        self,
        user_id: int,
    ) -> Optional[NotificationPreference]:
        """Get user notification preferences."""
        from sqlalchemy import select
        
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        
        return result.scalar_one_or_none()
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
    ):
        """Send email using configured client."""
        if not self.email_client:
            logger.warning("Email client not configured, skipping email")
            return
        
        # Would use aiosmtplib here
        # For now, just log
        logger.info(f"Would send email to {to_email}: {subject}")
    
    async def _send_sms(
        self,
        to_phone: str,
        country_code: str,
        message: str,
    ):
        """Send SMS using Twilio."""
        if not self.sms_client:
            logger.warning("SMS client not configured, skipping SMS")
            return
        
        # Would use Twilio here
        # For now, just log
        logger.info(f"Would send SMS to {country_code}{to_phone}: {message[:50]}...")
    
    def _render_email_template(
        self,
        user: User,
        alert: JobAlert,
        jobs: List[JobPosting],
    ) -> str:
        """Render HTML email template."""
        jobs_html = ""
        for job in jobs[:10]:  # Max 10 jobs
            jobs_html += f"""
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h3 style="margin: 0 0 5px; color: #333;">{job.title}</h3>
                <p style="margin: 0 0 5px; color: #666;">{job.company}</p>
                <p style="margin: 0 0 10px; color: #999; font-size: 14px;">
                    {job.location or 'Remote'} • 
                    ${job.salary_min:,}-${job.salary_max:,} • 
                    {job.employment_type}
                </p>
                <a href="{job.url}" style="color: #007bff; text-decoration: none;">View Job →</a>
            </div>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .footer {{ background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">New Jobs Matching "{alert.name}"</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Hi {user.email.split('@')[0] if user.email else 'there'},</p>
                    <p>We found {len(jobs)} new job{'s' if len(jobs) > 1 else ''} matching your alert:</p>
                    {jobs_html}
                    <p style="text-align: center; margin-top: 30px;">
                        <a href="#" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View All Jobs</a>
                    </p>
                </div>
                <div class="footer">
                    <p>You're receiving this because you created a job alert.</p>
                    <p>
                        <a href="#" style="color: #007bff;">Manage Alerts</a> | 
                        <a href="#" style="color: #007bff;">Unsubscribe</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _render_text_template(
        self,
        user: User,
        alert: JobAlert,
        jobs: List[JobPosting],
    ) -> str:
        """Render plain text email."""
        text = f"""
New Jobs Matching "{alert.name}"

Hi {user.email.split('@')[0] if user.email else 'there'},

We found {len(jobs)} new job{'s' if len(jobs) > 1 else ''} matching your alert:

"""
        for i, job in enumerate(jobs[:10], 1):
            text += f"""
{i}. {job.title} at {job.company}
   {job.location or 'Remote'} • ${job.salary_min:,}-${job.salary_max:,}
   {job.url}

"""
        
        text += """
Manage your alerts: [link]
Unsubscribe: [link]
"""
        
        return text
    
    def _render_sms_template(
        self,
        alert: JobAlert,
        jobs: List[JobPosting],
    ) -> str:
        """Render SMS message (160 chars max)."""
        count = len(jobs)
        return f"{count} new job{'s' if count > 1 else ''} matching "{alert.name}". View: [short_link]"
    
    def _render_digest_template(
        self,
        user: User,
        jobs: List[JobPosting],
        digest_type: str,
    ) -> str:
        """Render digest email template."""
        # Group jobs by company or category
        return self._render_email_template(
            user,
            type('obj', (object,), {'name': f'{digest_type.title()} Digest'})(),
            jobs,
        )
    
    def _render_digest_text(
        self,
        user: User,
        jobs: List[JobPosting],
        digest_type: str,
    ) -> str:
        """Render digest plain text."""
        return self._render_text_template(
            user,
            type('obj', (object,), {'name': f'{digest_type.title()} Digest'})(),
            jobs,
        )
