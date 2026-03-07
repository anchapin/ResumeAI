"""
Salary Research and Offer Comparison API Routes

Provides endpoints for:
- Researching salary data based on title, location, company
- Comparing job offers with weighted scoring
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from lib.salary import SalaryResearcher, OfferComparison

router = APIRouter(prefix="/salary", tags=["salary"])


# Request/Response Models
class SalaryResearchRequest(BaseModel):
    """Request model for salary research."""

    title: str
    location: str
    company: Optional[str] = None
    experience_level: str = "mid"


class SalaryResearchResponse(BaseModel):
    """Response model for salary research."""

    success: bool
    title: str
    location: str
    company: Optional[str]
    experience_level: str
    salary_data: Dict[str, Any]
    insights: Dict[str, Any]


class OfferInput(BaseModel):
    """Input model for a job offer."""

    company: str
    title: str
    base_salary: int
    signing_bonus: Optional[int] = 0
    equity: Optional[str] = None
    work_life_balance: int = 3  # 1-5 scale
    growth_opportunities: int = 3  # 1-5 scale
    culture_score: int = 3  # 1-5 scale
    benefits: Dict[str, bool] = {}
    location: str = ""


class OfferComparisonRequest(BaseModel):
    """Request model for offer comparison."""

    offers: List[OfferInput]
    priorities: Optional[Dict[str, float]] = None


class OfferComparisonResponse(BaseModel):
    """Response model for offer comparison."""

    success: bool
    offers: List[Dict[str, Any]]
    recommendation: Optional[Dict[str, Any]]
    priorities_used: Dict[str, float]
    report: str


class PrioritiesUpdateRequest(BaseModel):
    """Request model for updating priorities."""

    priorities: Dict[str, float]


# Salary research endpoint
@router.post("/research", response_model=SalaryResearchResponse)
async def research_salary(request: SalaryResearchRequest):
    """
    Research salary data for a given job title and location.

    Returns salary ranges, median, and insights based on
    industry standards and available data.
    """
    try:
        researcher = SalaryResearcher()
        result = await researcher.research_salary(
            title=request.title,
            location=request.location,
            company=request.company,
            experience_level=request.experience_level,
        )

        return SalaryResearchResponse(
            success=True,
            title=result["title"],
            location=result["location"],
            company=result["company"],
            experience_level=result["experience_level"],
            salary_data=result["salary_data"],
            insights=result["insights"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Salary research failed: {str(e)}")


# Offer management endpoints
@router.post("/offers", response_model=Dict[str, Any])
async def create_offer(offer: OfferInput):
    """
    Create and validate a job offer.

    Returns the offer with calculated total compensation.
    """
    try:
        # Calculate total compensation
        total_comp = offer.base_salary
        if offer.signing_bonus:
            total_comp += offer.signing_bonus

        return {
            "success": True,
            "offer": offer.dict(),
            "total_compensation": total_comp,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Offer creation failed: {str(e)}")


@router.post("/offers/compare", response_model=OfferComparisonResponse)
async def compare_offers(request: OfferComparisonRequest):
    """
    Compare multiple job offers using weighted scoring.

    Supports custom priorities for different compensation aspects.
    """
    try:
        comparator = OfferComparison()

        # Convert Pydantic models to dicts
        offers = [offer.dict() for offer in request.offers]

        result = comparator.compare_offers(offers=offers, priorities=request.priorities)

        # Generate report
        report = comparator.generate_comparison_report(result)

        return OfferComparisonResponse(
            success=True,
            offers=result["offers"],
            recommendation=result.get("recommendation"),
            priorities_used=result["priorities_used"],
            report=report,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Offer comparison failed: {str(e)}")


@router.put("/offers/priorities", response_model=Dict[str, float])
async def update_priorities(request: PrioritiesUpdateRequest):
    """
    Update and priority validate weights for offer comparison.

    Weights should sum to 1.0.
    """
    try:
        priorities = request.priorities

        # Validate and normalize
        total = sum(priorities.values())
        if total == 0:
            # Use defaults
            priorities = {
                "salary": 0.30,
                "growth": 0.25,
                "work_life_balance": 0.20,
                "benefits": 0.15,
                "culture": 0.10,
            }
        elif abs(total - 1.0) > 0.01:
            # Normalize
            priorities = {k: v / total for k, v in priorities.items()}

        return priorities
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Priority update failed: {str(e)}")


@router.get("/offers/priorities/default", response_model=Dict[str, float])
async def get_default_priorities():
    """
    Get default priority weights for offer comparison.
    """
    return {
        "salary": 0.30,
        "growth": 0.25,
        "work_life_balance": 0.20,
        "benefits": 0.15,
        "culture": 0.10,
    }
