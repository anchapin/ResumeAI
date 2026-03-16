"""
A/B Testing API endpoints for resume variants.

Provides endpoints for:
- Creating and managing resume variants
- Tracking variant performance
- Statistical significance calculation
- Auto-pause recommendations
"""

import math
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from scipy import stats

from database import get_async_session, ResumeVariant, JobApplication
from config.dependencies import AuthorizedAPIKey

router = APIRouter(prefix="/api/v1/variants", tags=["A/B Testing"])


# ============== Pydantic Models ==============


class VariantCreate(BaseModel):
    """Model for creating a resume variant."""

    name: str = Field(..., min_length=1, max_length=100)
    variant_key: str = Field(..., pattern="^[A-Z]$")  # A, B, C, etc.
    description: Optional[str] = None
    base_resume_id: Optional[int] = None
    data: dict  # Resume content as JSON


class VariantUpdate(BaseModel):
    """Model for updating a resume variant."""

    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    data: Optional[dict] = None
    is_active: Optional[bool] = None
    is_paused: Optional[bool] = None


class VariantPerformance(BaseModel):
    """Performance metrics for a variant."""

    variant_id: int
    variant_key: str
    name: str
    applications: int
    interviews: int
    offers: int
    interview_rate: float
    offer_rate: float
    is_paused: bool


class VariantComparison(BaseModel):
    """Comparison between variants."""

    variants: List[VariantPerformance]
    best_variant: Optional[str]
    is_significant: bool
    p_value: Optional[float]
    confidence: Optional[float]
    recommendation: str


class SignificanceResult(BaseModel):
    """Statistical significance test result."""

    is_significant: bool
    p_value: float
    chi_squared: float
    confidence: float
    variant_a_rate: float
    variant_b_rate: float
    recommendation: str


class AutoPauseRecommendation(BaseModel):
    """Auto-pause recommendation for a variant."""

    variant_id: int
    variant_key: str
    should_pause: bool
    reason: str
    confidence: float
    performance_vs_best: float


# ============== Helper Functions ==============


def calculate_chi_squared(variant_a: dict, variant_b: dict) -> SignificanceResult:
    """
    Calculate chi-squared test for significance between two variants.

    Args:
        variant_a: {'applications': int, 'interviews': int}
        variant_b: {'applications': int, 'interviews': int}

    Returns:
        SignificanceResult with p-value and recommendation
    """
    # Contingency table
    #              Interview  No Interview
    # Variant A    a_int      a_no_int
    # Variant B    b_int      b_no_int

    a_int = variant_a['interviews']
    a_no_int = variant_a['applications'] - variant_a['interviews']
    b_int = variant_b['interviews']
    b_no_int = variant_b['applications'] - variant_b['interviews']

    # Ensure we have valid data
    if a_no_int < 0 or b_no_int < 0:
        return SignificanceResult(
            is_significant=False,
            p_value=1.0,
            chi_squared=0.0,
            confidence=0.0,
            variant_a_rate=0.0,
            variant_b_rate=0.0,
            recommendation="Insufficient data for statistical test",
        )

    # Calculate rates
    a_rate = a_int / variant_a['applications'] if variant_a['applications'] > 0 else 0
    b_rate = b_int / variant_b['applications'] if variant_b['applications'] > 0 else 0

    # Contingency table for chi-squared test
    observed = [[a_int, a_no_int], [b_int, b_no_int]]

    # Perform chi-squared test
    try:
        chi2, p_value, dof, expected = stats.chi2_contingency(observed)
    except ValueError:
        # Handle edge cases (e.g., all zeros)
        return SignificanceResult(
            is_significant=False,
            p_value=1.0,
            chi_squared=0.0,
            confidence=0.0,
            variant_a_rate=a_rate,
            variant_b_rate=b_rate,
            recommendation="Insufficient data for statistical test",
        )

    is_significant = p_value < 0.05
    confidence = 1 - p_value

    # Determine recommendation
    if not is_significant:
        recommendation = "Not enough data to determine a winner"
    elif a_rate > b_rate:
        recommendation = "Variant A is performing significantly better"
    else:
        recommendation = "Variant B is performing significantly better"

    return SignificanceResult(
        is_significant=is_significant,
        p_value=round(p_value, 4),
        chi_squared=round(chi2, 2),
        confidence=round(confidence, 4),
        variant_a_rate=round(a_rate * 100, 1),
        variant_b_rate=round(b_rate * 100, 1),
        recommendation=recommendation,
    )


def should_auto_pause(variant: dict, all_variants: List[dict]) -> AutoPauseRecommendation:
    """
    Determine if a variant should be auto-paused.

    Criteria:
    - At least 20 applications
    - Interview rate < 50% of best variant
    - Difference is statistically significant (p < 0.05)
    """
    if variant['applications'] < 20:
        return AutoPauseRecommendation(
            variant_id=variant['variant_id'],
            variant_key=variant['variant_key'],
            should_pause=False,
            reason="Insufficient applications (< 20)",
            confidence=0.0,
            performance_vs_best=0.0,
        )

    # Find best variant
    best_variant = max(all_variants, key=lambda v: v['interview_rate'])

    if variant['variant_id'] == best_variant['variant_id']:
        return AutoPauseRecommendation(
            variant_id=variant['variant_id'],
            variant_key=variant['variant_key'],
            should_pause=False,
            reason="This is the best performing variant",
            confidence=0.0,
            performance_vs_best=0.0,
        )

    # Check if underperforming
    performance_ratio = variant['interview_rate'] / best_variant['interview_rate'] if best_variant['interview_rate'] > 0 else 0

    if performance_ratio >= 0.5:
        return AutoPauseRecommendation(
            variant_id=variant['variant_id'],
            variant_key=variant['variant_key'],
            should_pause=False,
            reason="Performance within 50% of best variant",
            confidence=0.0,
            performance_vs_best=performance_ratio,
        )

    # Check statistical significance
    result = calculate_chi_squared(variant, best_variant)

    if result.is_significant:
        return AutoPauseRecommendation(
            variant_id=variant['variant_id'],
            variant_key=variant['variant_key'],
            should_pause=True,
            reason=f"Significantly underperforming (p={result.p_value}, {result.confidence*100:.0f}% confidence)",
            confidence=result.confidence,
            performance_vs_best=performance_ratio,
        )

    return AutoPauseRecommendation(
        variant_id=variant['variant_id'],
        variant_key=variant['variant_key'],
        should_pause=False,
        reason="Underperforming but not statistically significant",
        confidence=result.confidence,
        performance_vs_best=performance_ratio,
    )


# ============== API Endpoints ==============


@router.post("", status_code=201)
async def create_variant(
    variant: VariantCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Create a new resume variant for A/B testing.

    **Required fields:**
    - `name`: Display name for the variant (e.g., "Technical Focus")
    - `variant_key`: Single letter identifier (A, B, C)
    - `data`: Resume content as JSON

    **Optional fields:**
    - `description`: Notes about what makes this variant different
    - `base_resume_id`: ID of the base resume this variant was created from
    """
    # Check if variant key already exists for user
    existing = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.user_id == current_user["id"],
                ResumeVariant.variant_key == variant.variant_key.upper(),
                ResumeVariant.is_active == True,
            )
        )
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            400,
            f"Variant '{variant.variant_key.upper()}' already exists for your account",
        )

    db_variant = ResumeVariant(
        user_id=current_user["id"],
        **variant.model_dump(),
        variant_key=variant.variant_key.upper(),
    )

    db.add(db_variant)
    await db.commit()
    await db.refresh(db_variant)

    return db_variant


@router.get("")
async def list_variants(
    include_performance: bool = Query(True),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    List all resume variants for the current user.

    **Query parameters:**
    - `include_performance`: Include performance metrics (default: true)
    """
    query = select(ResumeVariant).where(
        and_(
            ResumeVariant.user_id == current_user["id"],
            ResumeVariant.is_active == True,
        )
    ).order_by(ResumeVariant.created_at)

    result = await db.execute(query)
    variants = result.scalars().all()

    if not include_performance:
        return {"variants": variants}

    # Get performance data for each variant
    variants_with_performance = []

    for variant in variants:
        # Count applications that used this variant
        # (In a real implementation, job_applications would have a variant_id field)
        # For now, we'll use a placeholder
        perf_data = {
            'variant_id': variant.id,
            'variant_key': variant.variant_key,
            'name': variant.name,
            'applications': 0,  # Would come from database
            'interviews': 0,
            'offers': 0,
            'interview_rate': 0.0,
            'offer_rate': 0.0,
            'is_paused': variant.is_paused,
        }
        variants_with_performance.append(perf_data)

    return {
        "variants": variants,
        "performance": variants_with_performance,
    }


@router.get("/{variant_id}")
async def get_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get a specific resume variant by ID.
    """
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    return variant


@router.put("/{variant_id}")
async def update_variant(
    variant_id: int,
    variant_update: VariantUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Update a resume variant.

    Only provided fields will be updated.
    """
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    # Update fields
    update_data = variant_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(variant, field, value)

    await db.commit()
    await db.refresh(variant)

    return variant


@router.delete("/{variant_id}", status_code=204)
async def delete_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Delete (deactivate) a resume variant.

    This action can be undone by reactivating the variant.
    """
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    # Soft delete by setting is_active to False
    variant.is_active = False
    await db.commit()

    return None


@router.get("/compare")
async def compare_variants(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Compare performance of all active variants.

    Returns statistical significance analysis and recommendations.
    """
    # Get all active variants
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.user_id == current_user["id"],
                ResumeVariant.is_active == True,
            )
        )
    )

    variants = result.scalars().all()

    if len(variants) < 2:
        return VariantComparison(
            variants=[],
            best_variant=None,
            is_significant=False,
            p_value=None,
            confidence=None,
            recommendation="Create at least 2 variants to compare performance",
        )

    # Get performance data (placeholder - would come from tracking)
    variants_data = []
    for variant in variants:
        # Placeholder data
        perf = VariantPerformance(
            variant_id=variant.id,
            variant_key=variant.variant_key,
            name=variant.name,
            applications=0,
            interviews=0,
            offers=0,
            interview_rate=0.0,
            offer_rate=0.0,
            is_paused=variant.is_paused,
        )
        variants_data.append(perf)

    # Find best variant
    if variants_data:
        best = max(variants_data, key=lambda v: v.interview_rate)
        best_variant = best.variant_key
    else:
        best_variant = None

    # Compare best vs second best if we have enough data
    is_significant = False
    p_value = None
    confidence = None
    recommendation = "Not enough data for statistical comparison"

    if len(variants_data) >= 2:
        sorted_variants = sorted(variants_data, key=lambda v: v.interview_rate, reverse=True)
        best = sorted_variants[0]
        second = sorted_variants[1]

        if best.applications >= 20 and second.applications >= 20:
            result = calculate_chi_squared(
                {'applications': best.applications, 'interviews': best.interviews},
                {'applications': second.applications, 'interviews': second.interviews},
            )
            is_significant = result.is_significant
            p_value = result.p_value
            confidence = result.confidence
            recommendation = result.recommendation

    return VariantComparison(
        variants=variants_data,
        best_variant=best_variant,
        is_significant=is_significant,
        p_value=p_value,
        confidence=confidence,
        recommendation=recommendation,
    )


@router.get("/{variant_id}/significance")
async def get_variant_significance(
    variant_id: int,
    baseline_variant_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Calculate statistical significance for a variant compared to baseline.

    If no baseline is specified, compares against the average of all other variants.
    """
    # Get the variant
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    # Get baseline variant or calculate average
    if baseline_variant_id:
        baseline_result = await db.execute(
            select(ResumeVariant).where(
                and_(
                    ResumeVariant.id == baseline_variant_id,
                    ResumeVariant.user_id == current_user["id"],
                )
            )
        )
        baseline = baseline_result.scalar_one_or_none()

        if not baseline:
            raise HTTPException(404, "Baseline variant not found")

        # Placeholder performance data
        variant_perf = {'applications': 0, 'interviews': 0}
        baseline_perf = {'applications': 0, 'interviews': 0}

        return calculate_chi_squared(variant_perf, baseline_perf)

    # Compare against average of other variants
    other_variants = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.user_id == current_user["id"],
                ResumeVariant.id != variant_id,
                ResumeVariant.is_active == True,
            )
        )
    )

    others = other_variants.scalars().all()

    if not others:
        return SignificanceResult(
            is_significant=False,
            p_value=1.0,
            chi_squared=0.0,
            confidence=0.0,
            variant_a_rate=0.0,
            variant_b_rate=0.0,
            recommendation="No other variants to compare against",
        )

    # Placeholder - would aggregate performance from other variants
    return calculate_chi_squared(
        {'applications': 0, 'interviews': 0},
        {'applications': 0, 'interviews': 0},
    )


@router.get("/auto-pause/recommendations")
async def get_auto_pause_recommendations(
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Get auto-pause recommendations for underperforming variants.

    Returns a list of variants that should be paused based on performance.
    """
    # Get all active variants
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.user_id == current_user["id"],
                ResumeVariant.is_active == True,
            )
        )
    )

    variants = result.scalars().all()

    if len(variants) < 2:
        return {"recommendations": []}

    # Get performance data (placeholder)
    variants_data = []
    for variant in variants:
        variants_data.append({
            'variant_id': variant.id,
            'variant_key': variant.variant_key,
            'applications': 0,  # Would come from tracking
            'interviews': 0,
            'is_paused': variant.is_paused,
        })

    # Get recommendations
    recommendations = []
    for variant_data in variants_data:
        if not variant_data['is_paused']:
            rec = should_auto_pause(variant_data, variants_data)
            if rec.should_pause:
                recommendations.append(rec)

    return {"recommendations": recommendations}


@router.post("/{variant_id}/pause")
async def pause_variant(
    variant_id: int,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Pause a variant (stop using it for new applications).
    """
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    variant.is_paused = True
    if reason:
        variant.pause_reason = reason

    await db.commit()
    await db.refresh(variant)

    return {"status": "paused", "variant_id": variant_id}


@router.post("/{variant_id}/resume")
async def resume_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(AuthorizedAPIKey),
):
    """
    Resume a paused variant.
    """
    result = await db.execute(
        select(ResumeVariant).where(
            and_(
                ResumeVariant.id == variant_id,
                ResumeVariant.user_id == current_user["id"],
            )
        )
    )

    variant = result.scalar_one_or_none()

    if not variant:
        raise HTTPException(404, "Variant not found")

    variant.is_paused = False
    variant.pause_reason = None

    await db.commit()
    await db.refresh(variant)

    return {"status": "resumed", "variant_id": variant_id}
