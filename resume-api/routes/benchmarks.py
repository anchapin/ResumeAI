"""
Industry Benchmarking API endpoints.

Provides endpoints for:
- Salary range estimation
- Resume strength percentile calculation
- Skills gap analysis vs target role
- Market demand insights
"""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from database import get_async_session, SalaryBenchmark, SkillsDemand, IndustryBenchmark
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/benchmarks", tags=["Industry Benchmarking"])


# ============== Pydantic Models ==============


class SalaryEstimate(BaseModel):
    """Salary estimate response."""

    role_title: str
    experience_level: str
    location: Optional[str]
    salary_min: int
    salary_median: int
    salary_max: int
    salary_currency: str
    salary_period: str
    percentile: Optional[int] = None
    source: Optional[str]
    confidence: str  # low, medium, high


class ResumeStrengthResult(BaseModel):
    """Resume strength percentile result."""

    overall_score: float
    percentile: float
    percentile_label: str  # Bottom 20%, Top 50%, Top 20%, Top 10%
    category_scores: Dict[str, float]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


class SkillsGapItem(BaseModel):
    """Single skills gap item."""

    skill: str
    category: str
    required: bool
    has_skill: bool
    demand_score: int
    priority: str  # high, medium, low
    learning_resources: List[str]


class SkillsGapAnalysis(BaseModel):
    """Skills gap analysis result."""

    target_role: str
    current_skills: List[str]
    required_skills: List[str]
    missing_skills: List[SkillsGapItem]
    transferable_skills: List[SkillsGapItem]
    gap_percentage: float
    priority_recommendations: List[str]


class MarketDemandItem(BaseModel):
    """Market demand for a skill."""

    skill: str
    demand_score: int
    job_postings: int
    growth_rate: float
    trend: str  # growing, stable, declining


class MarketInsights(BaseModel):
    """Market insights response."""

    role_title: str
    top_skills: List[MarketDemandItem]
    emerging_skills: List[MarketDemandItem]
    declining_skills: List[MarketDemandItem]
    market_summary: str


# ============== Sample Data ==============

# In production, this would come from external APIs or database
SAMPLE_SALARY_DATA = {
    "Software Engineer": {
        "junior": {"min": 70000, "median": 85000, "max": 100000},
        "mid": {"min": 90000, "median": 120000, "max": 150000},
        "senior": {"min": 130000, "median": 160000, "max": 200000},
        "staff": {"min": 170000, "median": 210000, "max": 280000},
        "principal": {"min": 220000, "median": 280000, "max": 400000},
    },
    "Senior Software Engineer": {
        "senior": {"min": 130000, "median": 160000, "max": 200000},
        "staff": {"min": 170000, "median": 210000, "max": 280000},
    },
    "Data Scientist": {
        "junior": {"min": 75000, "median": 90000, "max": 110000},
        "mid": {"min": 100000, "median": 130000, "max": 160000},
        "senior": {"min": 140000, "median": 175000, "max": 220000},
    },
    "Product Manager": {
        "junior": {"min": 80000, "median": 95000, "max": 115000},
        "mid": {"min": 110000, "median": 140000, "max": 175000},
        "senior": {"min": 150000, "median": 190000, "max": 250000},
    },
}

SAMPLE_SKILLS_DEMAND = {
    "Python": {"demand_score": 95, "job_postings": 50000, "growth_rate": 15.5, "trend": "growing"},
    "JavaScript": {"demand_score": 92, "job_postings": 45000, "growth_rate": 8.2, "trend": "growing"},
    "TypeScript": {"demand_score": 88, "job_postings": 35000, "growth_rate": 25.3, "trend": "growing"},
    "React": {"demand_score": 90, "job_postings": 40000, "growth_rate": 12.1, "trend": "growing"},
    "AWS": {"demand_score": 89, "job_postings": 38000, "growth_rate": 18.7, "trend": "growing"},
    "Docker": {"demand_score": 85, "job_postings": 30000, "growth_rate": 20.5, "trend": "growing"},
    "Kubernetes": {"demand_score": 82, "job_postings": 25000, "growth_rate": 30.2, "trend": "growing"},
    "Machine Learning": {"demand_score": 87, "job_postings": 28000, "growth_rate": 35.8, "trend": "growing"},
    "SQL": {"demand_score": 88, "job_postings": 42000, "growth_rate": 5.3, "trend": "stable"},
    "Node.js": {"demand_score": 83, "job_postings": 32000, "growth_rate": 10.5, "trend": "growing"},
}

SAMPLE_ROLE_SKILLS = {
    "Software Engineer": [
        "Python", "JavaScript", "TypeScript", "React", "Node.js",
        "SQL", "Git", "REST API", "Docker", "AWS"
    ],
    "Senior Software Engineer": [
        "Python", "JavaScript", "TypeScript", "React", "Node.js",
        "SQL", "Git", "REST API", "Docker", "AWS", "Kubernetes",
        "System Design", "Mentoring", "Architecture"
    ],
    "Data Scientist": [
        "Python", "SQL", "Machine Learning", "Pandas", "NumPy",
        "Scikit-learn", "TensorFlow", "PyTorch", "Statistics", "Data Visualization"
    ],
    "Product Manager": [
        "Product Strategy", "Roadmap Planning", "User Research",
        "Data Analysis", "SQL", "A/B Testing", "Agile", "Stakeholder Management"
    ],
}


# ============== Helper Functions ==============


def estimate_salary(
    role_title: str,
    experience_level: str,
    location: Optional[str] = None,
) -> SalaryEstimate:
    """Estimate salary based on role and experience level."""
    # Normalize role title
    role_key = role_title.title()

    # Try exact match first
    if role_key in SAMPLE_SALARY_DATA:
        role_data = SAMPLE_SALARY_DATA[role_key]
    else:
        # Try fuzzy match
        for key in SAMPLE_SALARY_DATA:
            if role_title.lower() in key.lower() or key.lower() in role_title.lower():
                role_data = SAMPLE_SALARY_DATA[key]
                break
        else:
            # Default to Software Engineer
            role_data = SAMPLE_SALARY_DATA["Software Engineer"]

    # Get experience level data
    level_data = role_data.get(experience_level.lower())

    if level_data:
        confidence = "high"
    else:
        # Use closest experience level
        level_order = ["junior", "mid", "senior", "staff", "principal"]
        if experience_level.lower() in level_order:
            idx = level_order.index(experience_level.lower())
            # Use adjacent level if exact not found
            if idx > 0:
                level_data = role_data.get(level_order[idx - 1])
            elif idx < len(level_order) - 1:
                level_data = role_data.get(level_order[idx + 1])
        confidence = "medium" if level_data else "low"

    if not level_data:
        # Fallback to overall averages
        level_data = {"min": 80000, "median": 110000, "max": 150000}
        confidence = "low"

    return SalaryEstimate(
        role_title=role_title,
        experience_level=experience_level,
        location=location,
        salary_min=level_data["min"],
        salary_median=level_data["median"],
        salary_max=level_data["max"],
        salary_currency="USD",
        salary_period="yearly",
        source="Industry data (Levels.fyi, BLS OES)",
        confidence=confidence,
    )


def calculate_resume_strength(
    years_experience: float,
    skills: List[str],
    education_level: int,
    target_role: str,
) -> ResumeStrengthResult:
    """Calculate resume strength percentile."""
    # Get required skills for target role
    required_skills = SAMPLE_ROLE_SKILLS.get(target_role, SAMPLE_ROLE_SKILLS["Software Engineer"])

    # Calculate category scores
    skills_match = len(set(skills).intersection(set(required_skills))) / len(required_skills) * 100

    # Experience score (normalized to 0-100)
    experience_score = min(100, (years_experience / 10) * 100)

    # Education score
    education_scores = {0: 50, 1: 70, 2: 85, 3: 95}
    education_score = education_scores.get(education_level, 70)

    # Overall score (weighted average)
    overall_score = (skills_match * 0.5 + experience_score * 0.35 + education_score * 0.15)

    # Calculate percentile (simplified - in production would use actual distribution)
    percentile = min(99, max(1, overall_score))

    # Determine label
    if percentile >= 90:
        label = "Top 10%"
    elif percentile >= 75:
        label = "Top 25%"
    elif percentile >= 50:
        label = "Top 50%"
    elif percentile >= 25:
        label = "Bottom 50%"
    else:
        label = "Bottom 25%"

    # Identify strengths and weaknesses
    strengths = []
    weaknesses = []

    if skills_match >= 80:
        strengths.append("Strong skills match for target role")
    elif skills_match < 50:
        weaknesses.append("Missing key skills for target role")

    if experience_score >= 70:
        strengths.append("Solid experience level")
    elif experience_score < 40:
        weaknesses.append("Consider gaining more experience")

    if education_score >= 80:
        strengths.append("Strong educational background")

    # Generate recommendations
    recommendations = []
    missing_skills = set(required_skills) - set(skills)
    if missing_skills:
        recommendations.append(f"Add these skills to your resume: {', '.join(list(missing_skills)[:3])}")

    if years_experience < 3:
        recommendations.append("Highlight projects and internships to demonstrate experience")

    return ResumeStrengthResult(
        overall_score=round(overall_score, 1),
        percentile=round(percentile, 1),
        percentile_label=label,
        category_scores={
            "skills_match": round(skills_match, 1),
            "experience": round(experience_score, 1),
            "education": round(education_score, 1),
        },
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations,
    )


def analyze_skills_gap(
    current_skills: List[str],
    target_role: str,
) -> SkillsGapAnalysis:
    """Analyze skills gap for target role."""
    required_skills = SAMPLE_ROLE_SKILLS.get(target_role, SAMPLE_ROLE_SKILLS["Software Engineer"])

    current_set = set(current_skills)
    required_set = set(required_skills)

    missing = required_set - current_set
    has = current_set.intersection(required_set)

    # Create gap items for missing skills
    missing_items = []
    for skill in missing:
        demand_data = SAMPLE_SKILLS_DEMAND.get(skill, {"demand_score": 50})
        priority = "high" if demand_data["demand_score"] >= 80 else "medium" if demand_data["demand_score"] >= 60 else "low"

        missing_items.append(SkillsGapItem(
            skill=skill,
            category="technical",
            required=True,
            has_skill=False,
            demand_score=demand_data["demand_score"],
            priority=priority,
            learning_resources=[],
        ))

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    missing_items.sort(key=lambda x: (priority_order[x.priority], -x.demand_score))

    # Create transferable skills items
    transferable_items = []
    for skill in has:
        demand_data = SAMPLE_SKILLS_DEMAND.get(skill, {"demand_score": 50})
        transferable_items.append(SkillsGapItem(
            skill=skill,
            category="technical",
            required=True,
            has_skill=True,
            demand_score=demand_data["demand_score"],
            priority="low",
            learning_resources=[],
        ))

    # Calculate gap percentage
    gap_percentage = (len(missing) / len(required_skills)) * 100 if required_skills else 0

    # Generate priority recommendations
    priority_recommendations = []
    high_priority = [item for item in missing_items if item.priority == "high"]
    if high_priority:
        priority_recommendations.append(f"Priority: Learn {', '.join([s.skill for s in high_priority[:3]])}")

    medium_priority = [item for item in missing_items if item.priority == "medium"]
    if medium_priority:
        priority_recommendations.append(f"Next: Consider {', '.join([s.skill for s in medium_priority[:3]])}")

    return SkillsGapAnalysis(
        target_role=target_role,
        current_skills=list(current_set),
        required_skills=required_skills,
        missing_skills=missing_items,
        transferable_skills=transferable_items,
        gap_percentage=round(gap_percentage, 1),
        priority_recommendations=priority_recommendations,
    )


def get_market_insights(target_role: str) -> MarketInsights:
    """Get market demand insights for target role."""
    required_skills = SAMPLE_ROLE_SKILLS.get(target_role, SAMPLE_ROLE_SKILLS["Software Engineer"])

    # Get demand data for required skills
    top_skills = []
    emerging = []
    declining = []

    for skill in required_skills:
        demand_data = SAMPLE_SKILLS_DEMAND.get(skill)
        if demand_data:
            item = MarketDemandItem(
                skill=skill,
                demand_score=demand_data["demand_score"],
                job_postings=demand_data["job_postings"],
                growth_rate=demand_data["growth_rate"],
                trend=demand_data["trend"],
            )

            top_skills.append(item)

            if demand_data["growth_rate"] >= 20:
                emerging.append(item)
            elif demand_data["growth_rate"] < 5:
                declining.append(item)

    # Sort by demand score
    top_skills.sort(key=lambda x: -x.demand_score)
    emerging.sort(key=lambda x: -x.growth_rate)

    # Generate summary
    if emerging:
        summary = f"Strong demand for {target_role} roles. Emerging skills: {', '.join([s.skill for s in emerging[:3]])}"
    else:
        summary = f"Stable demand for {target_role} roles with established skill requirements"

    return MarketInsights(
        role_title=target_role,
        top_skills=top_skills[:10],
        emerging_skills=emerging[:5],
        declining_skills=declining[:5],
        market_summary=summary,
    )


# ============== API Endpoints ==============


@router.get("/salary/estimate")
async def get_salary_estimate(
    role_title: str = Query(..., description="Job title/role"),
    experience_level: str = Query(..., description="junior, mid, senior, staff, principal"),
    location: Optional[str] = Query(None, description="City, State or Remote"),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get salary estimate for a role and experience level.

    **Experience levels:**
    - `junior`: 0-2 years
    - `mid`: 2-5 years
    - `senior`: 5-10 years
    - `staff`: 10-15 years
    - `principal`: 15+ years
    """
    return estimate_salary(role_title, experience_level, location)


@router.get("/salary/range")
async def get_salary_range(
    role_title: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get full salary range across all experience levels for a role.
    """
    result = {}
    for level in ["junior", "mid", "senior", "staff", "principal"]:
        estimate = estimate_salary(role_title, level)
        result[level] = {
            "min": estimate.salary_min,
            "median": estimate.salary_median,
            "max": estimate.salary_max,
        }

    return {"role": role_title, "ranges": result}


@router.post("/resume/strength")
async def calculate_resume_strength_endpoint(
    years_experience: float = Query(...),
    skills: str = Query(..., description="Comma-separated list of skills"),
    education_level: int = Query(1, description="0=HS, 1=Bachelor, 2=Master, 3=PhD"),
    target_role: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Calculate resume strength percentile.

    Returns overall score, percentile, and recommendations.
    """
    skills_list = [s.strip() for s in skills.split(",") if s.strip()]

    return calculate_resume_strength(
        years_experience=years_experience,
        skills=skills_list,
        education_level=education_level,
        target_role=target_role,
    )


@router.post("/skills/gap")
async def analyze_skills_gap_endpoint(
    skills: str = Query(..., description="Comma-separated list of current skills"),
    target_role: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Analyze skills gap for target role.

    Returns missing skills, transferable skills, and priority recommendations.
    """
    skills_list = [s.strip() for s in skills.split(",") if s.strip()]

    return analyze_skills_gap(skills_list, target_role)


@router.get("/market/insights")
async def get_market_insights_endpoint(
    role_title: str = Query(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get market demand insights for a role.

    Returns top skills, emerging skills, and market summary.
    """
    return get_market_insights(role_title)


@router.get("/skills/demand")
async def get_skills_demand(
    skill: Optional[str] = Query(None, description="Specific skill to look up"),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get demand data for skills.

    If no skill specified, returns top demanded skills.
    """
    if skill:
        # Look up specific skill
        demand_data = SAMPLE_SKILLS_DEMAND.get(skill)
        if not demand_data:
            raise HTTPException(404, f"Skill '{skill}' not found in database")

        return {
            "skill": skill,
            "demand_score": demand_data["demand_score"],
            "job_postings": demand_data["job_postings"],
            "growth_rate": demand_data["growth_rate"],
            "trend": demand_data["trend"],
        }

    # Return all skills sorted by demand
    sorted_skills = sorted(
        SAMPLE_SKILLS_DEMAND.items(),
        key=lambda x: -x[1]["demand_score"]
    )

    return {
        "skills": [
            {
                "skill": name,
                "demand_score": data["demand_score"],
                "job_postings": data["job_postings"],
                "growth_rate": data["growth_rate"],
                "trend": data["trend"],
            }
            for name, data in sorted_skills
        ]
    }
