"""
Application Analytics Service

Provides statistics and insights on job applications.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.sql import text

from ..jobs.models import JobApplication

logger = logging.getLogger(__name__)


class ApplicationAnalytics:
    """
    Provides application statistics and insights.
    
    Features:
    - Application statistics
    - Funnel visualization data
    - Conversion rate calculations
    - Time to response metrics
    
    Example:
        analytics = ApplicationAnalytics(db_session)
        stats = await analytics.get_stats(user_id)
    """
    
    def __init__(self, db_session: AsyncSession):
        """
        Initialize Application Analytics.
        
        Args:
            db_session: Async database session
        """
        self.db = db_session
    
    async def get_stats(
        self,
        user_id: int,
        days: int = 90,
    ) -> Dict[str, Any]:
        """
        Get application statistics.
        
        Args:
            user_id: User ID
            days: Time range in days
            
        Returns:
            Statistics dict
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Total applications
        total_query = select(func.count(JobApplication.id)).where(
            JobApplication.user_id == user_id,
            JobApplication.submitted_at >= since,
        )
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0
        
        # By status
        status_query = select(
            JobApplication.status,
            func.count(JobApplication.id),
        ).where(
            JobApplication.user_id == user_id,
            JobApplication.submitted_at >= since,
        ).group_by(JobApplication.status)
        
        status_result = await self.db.execute(status_query)
        by_status = dict(status_result.all())
        
        # By source
        source_query = select(
            JobApplication.external_source,
            func.count(JobApplication.id),
        ).where(
            JobApplication.user_id == user_id,
            JobApplication.external_source.isnot(None),
            JobApplication.submitted_at >= since,
        ).group_by(JobApplication.external_source)
        
        source_result = await self.db.execute(source_query)
        by_source = dict(source_result.all())
        
        # Calculate rates
        interviews = by_status.get("interviewing", 0)
        offers = by_status.get("offer", 0) + by_status.get("accepted", 0)
        
        interview_rate = (interviews / total * 100) if total > 0 else 0
        offer_rate = (offers / total * 100) if total > 0 else 0
        
        return {
            "total": total,
            "by_status": by_status,
            "by_source": by_source,
            "interview_rate": round(interview_rate, 1),
            "offer_rate": round(offer_rate, 1),
            "period_days": days,
        }
    
    async def get_funnel(
        self,
        user_id: int,
        days: int = 90,
    ) -> Dict[str, Any]:
        """
        Get application funnel data.
        
        Args:
            user_id: User ID
            days: Time range in days
            
        Returns:
            Funnel data dict
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Define funnel stages in order
        stages = [
            ("applied", "Applied"),
            ("screening", "Screening"),
            ("interviewing", "Interviewing"),
            ("offer", "Offer"),
            ("accepted", "Accepted"),
        ]
        
        funnel_data = []
        previous_count = None
        
        for status, label in stages:
            count_query = select(func.count(JobApplication.id)).where(
                JobApplication.user_id == user_id,
                JobApplication.status == status,
                JobApplication.submitted_at >= since,
            )
            count_result = await self.db.execute(count_query)
            count = count_result.scalar() or 0
            
            # Calculate conversion from previous stage
            conversion_rate = None
            if previous_count is not None and previous_count > 0:
                conversion_rate = round((count / previous_count) * 100, 1)
            
            funnel_data.append({
                "stage": status,
                "label": label,
                "count": count,
                "conversion_rate": conversion_rate,
            })
            
            previous_count = count
        
        return {
            "stages": funnel_data,
            "period_days": days,
        }
    
    async def get_conversion_rates(
        self,
        user_id: int,
        days: int = 90,
    ) -> Dict[str, Any]:
        """
        Get conversion rate metrics.
        
        Args:
            user_id: User ID
            days: Time range in days
            
        Returns:
            Conversion rates dict
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Get counts by status
        status_query = select(
            JobApplication.status,
            func.count(JobApplication.id),
        ).where(
            JobApplication.user_id == user_id,
            JobApplication.submitted_at >= since,
        ).group_by(JobApplication.status)
        
        status_result = await self.db.execute(status_query)
        status_counts = dict(status_result.all())
        
        total = sum(status_counts.values())
        
        # Calculate conversion rates
        applied = status_counts.get("applied", 0) + status_counts.get("screening", 0)
        screening = status_counts.get("screening", 0)
        interviewing = status_counts.get("interviewing", 0)
        offer = status_counts.get("offer", 0)
        accepted = status_counts.get("accepted", 0)
        
        return {
            "applied_to_screening": round(
                (screening / applied * 100) if applied > 0 else 0, 1
            ),
            "screening_to_interview": round(
                (interviewing / screening * 100) if screening > 0 else 0, 1
            ),
            "interview_to_offer": round(
                (offer / interviewing * 100) if interviewing > 0 else 0, 1
            ),
            "offer_to_acceptance": round(
                (accepted / offer * 100) if offer > 0 else 0, 1
            ),
            "overall_conversion": round(
                (accepted / total * 100) if total > 0 else 0, 1
            ),
            "period_days": days,
        }
    
    async def get_time_to_response(
        self,
        user_id: int,
        days: int = 90,
    ) -> Dict[str, Any]:
        """
        Get time to response metrics.
        
        Args:
            user_id: User ID
            days: Time range in days
            
        Returns:
            Time metrics dict
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Get applications with response time
        response_query = select(
            JobApplication.response_time_days,
        ).where(
            JobApplication.user_id == user_id,
            JobApplication.response_time_days.isnot(None),
            JobApplication.response_time_days > 0,
            JobApplication.submitted_at >= since,
        )
        
        response_result = await self.db.execute(response_query)
        response_times = [row[0] for row in response_result.all()]
        
        if not response_times:
            return {
                "avg_days": 0,
                "median_days": 0,
                "min_days": 0,
                "max_days": 0,
                "sample_size": 0,
            }
        
        # Calculate metrics
        avg_days = sum(response_times) / len(response_times)
        sorted_times = sorted(response_times)
        median_days = sorted_times[len(sorted_times) // 2]
        
        return {
            "avg_days": round(avg_days, 1),
            "median_days": median_days,
            "min_days": min(response_times),
            "max_days": max(response_times),
            "sample_size": len(response_times),
            "period_days": days,
        }
    
    async def get_activity_trend(
        self,
        user_id: int,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get application activity trend over time.
        
        Args:
            user_id: User ID
            days: Time range in days
            
        Returns:
            Trend data dict
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Group by week
        trend_query = select(
            func.date_trunc("week", JobApplication.submitted_at).label("week"),
            func.count(JobApplication.id),
        ).where(
            JobApplication.user_id == user_id,
            JobApplication.submitted_at >= since,
        ).group_by(
            text("week")
        ).order_by(
            text("week")
        )
        
        trend_result = await self.db.execute(trend_query)
        trend_data = [
            {"week": row[0].isoformat(), "count": row[1]}
            for row in trend_result.all()
        ]
        
        return {
            "trend": trend_data,
            "period_days": days,
        }
