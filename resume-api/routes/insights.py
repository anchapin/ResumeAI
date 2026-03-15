"""
Insights Dashboard API endpoints.

Provides aggregated data and analytics for the insights dashboard.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, cast, Date
from sqlalchemy.dialects.postgresql import JSON

from database import get_async_session, JobApplication
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/insights", tags=["Insights Dashboard"])


# ============== Response Models ==============


class TrendDataPoint(BaseModel):
    """Single data point for trend chart."""

    date: str
    count: int
    cumulative: int


class TrendsResponse(BaseModel):
    """Response for application trends."""

    applied: List[TrendDataPoint]
    interviewing: List[TrendDataPoint]
    offers: List[TrendDataPoint]


class FunnelStage(BaseModel):
    """Single stage in the funnel."""

    stage: str
    count: int
    percentage: float
    conversion_rate: float


class FunnelResponse(BaseModel):
    """Response for application funnel."""

    stages: List[FunnelStage]
    total_applications: int


class CompanyInsight(BaseModel):
    """Insight for a single company."""

    company_name: str
    application_count: int
    latest_status: str
    days_in_pipeline: int


class SourceBreakdown(BaseModel):
    """Breakdown by application source."""

    source: str
    count: int
    percentage: float
    interview_rate: float


class InsightsSummary(BaseModel):
    """Summary insights response."""

    total_applications: int
    active_applications: int
    interview_rate: float
    offer_rate: float
    avg_days_to_response: Optional[float]
    top_companies: List[CompanyInsight]
    source_breakdown: List[SourceBreakdown]
    salary_range: Dict[str, Optional[float]]


# ============== Helper Functions ==============


def get_date_range(days: int) -> tuple[datetime, datetime]:
    """Get date range for the last N days."""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    return start_date, end_date


# ============== API Endpoints ==============


@router.get("/trends", response_model=TrendsResponse)
async def get_application_trends(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get application trends over time.

    Returns daily counts for applied, interviewing, and offers.
    """
    start_date, end_date = get_date_range(days)

    # Get applications by date and status
    query = select(
        cast(JobApplication.date_applied, Date).label('date'),
        JobApplication.status,
        func.count().label('count')
    ).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.date_applied >= start_date,
            JobApplication.date_applied <= end_date,
        )
    ).group_by(
        cast(JobApplication.date_applied, Date),
        JobApplication.status
    ).order_by(
        cast(JobApplication.date_applied, Date)
    )

    result = await db.execute(query)
    rows = result.all()

    # Organize data by status
    data_by_status: Dict[str, Dict[str, int]] = {
        'applied': {},
        'interviewing': {},
        'offer': {},
    }

    for row in rows:
        date_str = str(row.date)
        status = row.status
        count = row.count

        if status in data_by_status:
            data_by_status[status][date_str] = count

    # Generate all dates in range
    all_dates = []
    current = start_date.date()
    while current <= end_date.date():
        all_dates.append(str(current))
        current += timedelta(days=1)

    # Build trend data with cumulative counts
    def build_trend_data(status: str) -> List[TrendDataPoint]:
        trend_data = []
        cumulative = 0

        for date_str in all_dates:
            daily_count = data_by_status[status].get(date_str, 0)
            cumulative += daily_count

            trend_data.append(TrendDataPoint(
                date=date_str,
                count=daily_count,
                cumulative=cumulative,
            ))

        return trend_data

    return TrendsResponse(
        applied=build_trend_data('applied'),
        interviewing=build_trend_data('interviewing'),
        offers=build_trend_data('offer'),
    )


@router.get("/funnel", response_model=FunnelResponse)
async def get_application_funnel(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get application funnel showing conversion rates.

    Stages: Applied → Screening → Interviewing → Offer → Accepted
    """
    # Count by status
    query = select(
        JobApplication.status,
        func.count().label('count')
    ).where(
        JobApplication.user_id == current_user["id"]
    ).group_by(JobApplication.status)

    result = await db.execute(query)
    status_counts = {row.status: row.count for row in result}

    total = sum(status_counts.values())

    # Define funnel stages in order
    funnel_stages = [
        ('applied', 'Applied'),
        ('screening', 'Screening'),
        ('interviewing', 'Interviewing'),
        ('offer', 'Offer'),
        ('accepted', 'Accepted'),
    ]

    stages = []
    prev_count = total

    for status, label in funnel_stages:
        count = status_counts.get(status, 0)
        percentage = (count / total * 100) if total > 0 else 0
        conversion_rate = (count / prev_count * 100) if prev_count > 0 else 0

        stages.append(FunnelStage(
            stage=label,
            count=count,
            percentage=round(percentage, 1),
            conversion_rate=round(conversion_rate, 1),
        ))

        prev_count = count

    return FunnelResponse(
        stages=stages,
        total_applications=total,
    )


@router.get("/summary", response_model=InsightsSummary)
async def get_insights_summary(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get summary insights for the dashboard.

    Includes totals, rates, top companies, and source breakdown.
    """
    start_date, _ = get_date_range(days)

    # Total applications
    total_query = select(func.count()).where(
        JobApplication.user_id == current_user["id"]
    )
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    # Active applications (not rejected/withdrawn)
    active_query = select(func.count()).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.status.notin_(['rejected', 'withdrawn']),
        )
    )
    active_result = await db.execute(active_query)
    active = active_result.scalar() or 0

    # Interview count
    interview_query = select(func.count()).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.status == 'interviewing',
        )
    )
    interview_result = await db.execute(interview_query)
    interviews = interview_result.scalar() or 0

    # Offer count
    offer_query = select(func.count()).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.status == 'offer',
        )
    )
    offer_result = await db.execute(offer_query)
    offers = offer_result.scalar() or 0

    # Calculate rates
    interview_rate = (interviews / total * 100) if total > 0 else 0
    offer_rate = (offers / total * 100) if total > 0 else 0

    # Top companies
    company_query = select(
        JobApplication.company_name,
        func.count().label('count'),
        func.max(JobApplication.status).label('latest_status'),
        func.max(JobApplication.date_created).label('latest_date')
    ).where(
        JobApplication.user_id == current_user["id"]
    ).group_by(
        JobApplication.company_name
    ).order_by(
        func.count().desc()
    ).limit(5)

    company_result = await db.execute(company_query)
    top_companies = []

    for row in company_result:
        days_in_pipeline = 0
        if row.latest_date:
            days_in_pipeline = (datetime.now(timezone.utc) - row.latest_date.replace(tzinfo=timezone.utc)).days

        top_companies.append(CompanyInsight(
            company_name=row.company_name,
            application_count=row.count,
            latest_status=row.latest_status,
            days_in_pipeline=max(0, days_in_pipeline),
        ))

    # Source breakdown
    source_query = select(
        JobApplication.source,
        func.count().label('count')
    ).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.source.isnot(None),
        )
    ).group_by(JobApplication.source)

    source_result = await db.execute(source_query)
    source_breakdown = []

    for row in source_result:
        # Calculate interview rate for this source
        source_interview_query = select(func.count()).where(
            and_(
                JobApplication.user_id == current_user["id"],
                JobApplication.source == row.source,
                JobApplication.status == 'interviewing',
            )
        )
        source_interview_result = await db.execute(source_interview_query)
        source_interviews = source_interview_result.scalar() or 0
        interview_rate_source = (source_interviews / row.count * 100) if row.count > 0 else 0

        source_breakdown.append(SourceBreakdown(
            source=row.source or 'Unknown',
            count=row.count,
            percentage=round((row.count / total * 100) if total > 0 else 0, 1),
            interview_rate=round(interview_rate_source, 1),
        ))

    # Salary range
    salary_query = select(
        func.min(JobApplication.salary_min).label('min'),
        func.max(JobApplication.salary_max).label('max'),
        func.avg(JobApplication.salary_min).label('avg_min'),
        func.avg(JobApplication.salary_max).label('avg_max')
    ).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.salary_min.isnot(None),
            JobApplication.salary_max.isnot(None),
        )
    )

    salary_result = await db.execute(salary_query)
    salary_row = salary_result.first()

    salary_range = {
        'min': salary_row.min if salary_row else None,
        'max': salary_row.max if salary_row else None,
        'avg_min': round(salary_row.avg_min, 0) if salary_row and salary_row.avg_min else None,
        'avg_max': round(salary_row.avg_max, 0) if salary_row and salary_row.avg_max else None,
    }

    return InsightsSummary(
        total_applications=total,
        active_applications=active,
        interview_rate=round(interview_rate, 1),
        offer_rate=round(offer_rate, 1),
        avg_days_to_response=None,  # Would need more complex calculation
        top_companies=top_companies,
        source_breakdown=source_breakdown,
        salary_range=salary_range,
    )


@router.get("/skills")
async def get_skills_distribution(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get skills distribution from job descriptions.

    Extracts and counts skills mentioned in saved job descriptions.
    """
    # Get all job descriptions
    query = select(JobApplication.job_description).where(
        and_(
            JobApplication.user_id == current_user["id"],
            JobApplication.job_description.isnot(None),
        )
    )

    result = await db.execute(query)
    job_descriptions = [row[0] for row in result.all() if row[0]]

    # Simple skill extraction (in production, use NLP)
    common_skills = [
        'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js',
        'AWS', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL',
        'MongoDB', 'Redis', 'GraphQL', 'REST', 'Microservices',
        'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
        'FastAPI', 'Django', 'Flask', 'Express', 'Next.js',
        'Git', 'CI/CD', 'Agile', 'Scrum', 'TDD',
    ]

    skill_counts: Dict[str, int] = {skill: 0 for skill in common_skills}

    for description in job_descriptions:
        desc_lower = description.lower()
        for skill in common_skills:
            if skill.lower() in desc_lower:
                skill_counts[skill] += 1

    # Filter to skills with count > 0 and sort
    skills_data = [
        {'skill': skill, 'count': count}
        for skill, count in skill_counts.items()
        if count > 0
    ]
    skills_data.sort(key=lambda x: x['count'], reverse=True)

    return {'skills': skills_data[:20]}  # Top 20 skills
