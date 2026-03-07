"""
Salary Research Library

Provides functionality to research salary data based on title, location,
company, and experience level.
"""

import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class SalaryData:
    """Salary information for a specific role."""

    title: str
    company: Optional[str]
    location: str
    min_salary: int
    max_salary: int
    median_salary: int
    experience_level: str
    source: str
    sample_size: int = 0


class SalaryResearcher:
    """Research salary data from various sources."""

    def __init__(self):
        self.cache = {}  # Simple in-memory cache

    async def research_salary(
        self,
        title: str,
        location: str,
        company: Optional[str] = None,
        experience_level: str = "mid",
    ) -> Dict[str, Any]:
        """
        Research salary data for a given role.

        Args:
            title: Job title (e.g., "Software Engineer")
            location: Location (e.g., "San Francisco, CA")
            company: Optional company name
            experience_level: "entry", "mid", "senior", "lead", "executive"

        Returns:
            Dictionary with salary data and insights
        """
        cache_key = f"{title}:{location}:{company}:{experience_level}"

        # Check cache
        if cache_key in self.cache:
            return self.cache[cache_key]

        # Gather salary data from multiple sources
        tasks = [
            self._search_github_jobs(title, location),
            self._estimate_from_standards(title, location, experience_level),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine results
        salary_data = self._combine_salary_data(results)

        # Add insights
        insights = self._generate_insights(salary_data, experience_level)

        final_result = {
            "title": title,
            "location": location,
            "company": company,
            "experience_level": experience_level,
            "salary_data": salary_data,
            "insights": insights,
        }

        # Cache result
        self.cache[cache_key] = final_result
        return final_result

    async def _search_github_jobs(self, title: str, location: str) -> Optional[Dict]:
        """Search GitHub Jobs for salary data (if available)."""
        # Note: GitHub Jobs API was discontinued, using placeholder
        # In production, integrate with Levels.fyi, Glassdoor, etc.
        return None

    async def _estimate_from_standards(
        self, title: str, location: str, experience_level: str
    ) -> Dict[str, Any]:
        """Estimate salary based on industry standards."""

        # Base salary ranges by title and experience (USD)
        base_ranges = {
            "software engineer": {
                "entry": (60000, 90000),
                "mid": (90000, 140000),
                "senior": (130000, 180000),
                "lead": (160000, 220000),
                "executive": (200000, 350000),
            },
            "product manager": {
                "entry": (70000, 100000),
                "mid": (100000, 150000),
                "senior": (140000, 200000),
                "lead": (180000, 280000),
                "executive": (250000, 400000),
            },
            "designer": {
                "entry": (50000, 80000),
                "mid": (80000, 120000),
                "senior": (110000, 160000),
                "lead": (150000, 220000),
                "executive": (200000, 350000),
            },
            "data scientist": {
                "entry": (70000, 100000),
                "mid": (100000, 150000),
                "senior": (140000, 200000),
                "lead": (180000, 280000),
                "executive": (250000, 400000),
            },
        }

        # Location multipliers
        location_multipliers = {
            "san francisco": 1.25,
            "new york": 1.22,
            "seattle": 1.18,
            "los angeles": 1.12,
            "boston": 1.10,
            "austin": 1.02,
            "denver": 1.0,
            "chicago": 1.05,
            "remote": 1.0,
            "default": 1.0,
        }

        # Get base range
        title_key = title.lower()
        range_dict = base_ranges.get(title_key, base_ranges["software engineer"])
        base_min, base_max = range_dict.get(experience_level, range_dict["mid"])

        # Apply location multiplier
        loc_key = location.lower().split(",")[0].strip()
        multiplier = location_multipliers.get(loc_key, location_multipliers["default"])

        min_salary = int(base_min * multiplier)
        max_salary = int(base_max * multiplier)
        median_salary = int((min_salary + max_salary) / 2)

        return {
            "min_salary": min_salary,
            "max_salary": max_salary,
            "median_salary": median_salary,
            "source": "industry_estimates",
            "sample_size": 1000,
        }

    def _combine_salary_data(self, results: List[Any]) -> Dict[str, Any]:
        """Combine salary data from multiple sources."""
        valid_results = [r for r in results if r and isinstance(r, dict)]

        if not valid_results:
            return {
                "min_salary": 0,
                "max_salary": 0,
                "median_salary": 0,
                "source": "none",
                "sample_size": 0,
            }

        # Use the most reliable source (first valid result)
        return valid_results[0]

    def _generate_insights(
        self, salary_data: Dict[str, Any], experience_level: str
    ) -> Dict[str, Any]:
        """Generate insights about the salary data."""
        median = salary_data.get("median_salary", 0)

        if median == 0:
            return {"message": "Insufficient data to generate insights"}

        # Calculate expected growth
        growth_multipliers = {
            "entry": 1.5,
            "mid": 1.4,
            "senior": 1.25,
            "lead": 1.2,
            "executive": 1.15,
        }

        future_median = int(median * growth_multipliers.get(experience_level, 1.3))

        return {
            "5_year_projection": future_median,
            "annual_bonus_estimate": int(median * 0.1),
            "equity_estimate": (
                int(median * 0.15) if experience_level in ["senior", "lead", "executive"] else 0
            ),
            "total_compensation": median
            + int(median * 0.1)
            + (int(median * 0.15) if experience_level in ["senior", "lead", "executive"] else 0),
        }


class OfferComparison:
    """Compare job offers with weighted scoring."""

    def __init__(self):
        self.default_priorities = {
            "salary": 0.30,
            "growth": 0.25,
            "work_life_balance": 0.20,
            "benefits": 0.15,
            "culture": 0.10,
        }

    def compare_offers(
        self,
        offers: List[Dict[str, Any]],
        priorities: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Compare multiple job offers using weighted scoring.

        Args:
            offers: List of job offer dictionaries
            priorities: Dict of category weights (must sum to 1.0)

        Returns:
            Comparison results with scores and recommendations
        """
        if not offers:
            return {"error": "No offers to compare"}

        priorities = priorities or self.default_priorities

        # Validate priorities
        total_weight = sum(priorities.values())
        if abs(total_weight - 1.0) > 0.01:
            # Normalize weights
            priorities = {k: v / total_weight for k, v in priorities.items()}

        # Score each offer
        scored_offers = []
        for offer in offers:
            score = self._score_offer(offer, priorities)
            scored_offers.append(
                {
                    "offer": offer,
                    "score": score,
                    "breakdown": self._get_score_breakdown(offer, priorities),
                }
            )

        # Sort by score
        scored_offers.sort(key=lambda x: x["score"], reverse=True)

        return {
            "offers": scored_offers,
            "recommendation": scored_offers[0] if scored_offers else None,
            "priorities_used": priorities,
        }

    def _score_offer(self, offer: Dict[str, Any], priorities: Dict[str, float]) -> float:
        """Calculate weighted score for an offer."""
        score = 0.0

        # Salary score (normalized to 0-100)
        if offer.get("base_salary"):
            salary_score = min(100, offer["base_salary"] / 2500)  # $250k = max score
            score += salary_score * priorities.get("salary", 0)

        # Growth score
        growth_score = self._normalize_growth(offer.get("growth_opportunities", 5))
        score += growth_score * priorities.get("growth", 0)

        # Work-life balance score
        wlb_score = offer.get("work_life_balance", 5) * 20  # 1-5 scale to 0-100
        score += wlb_score * priorities.get("work_life_balance", 0)

        # Benefits score
        benefits_score = self._normalize_benefits(offer.get("benefits", {}))
        score += benefits_score * priorities.get("benefits", 0)

        # Culture score
        culture_score = offer.get("culture_score", 5) * 20
        score += culture_score * priorities.get("culture", 0)

        return round(score, 2)

    def _normalize_growth(self, growth: Any) -> float:
        """Normalize growth opportunity to 0-100."""
        if isinstance(growth, int):
            return min(100, growth * 20)  # 1-5 scale
        return 50  # Default middle score

    def _normalize_benefits(self, benefits: Dict[str, Any]) -> float:
        """Calculate benefits score."""
        score = 50  # Base score

        # Add points for various benefits
        if benefits.get("health_insurance"):
            score += 10
        if benefits.get("401k_match"):
            score += 10
        if benefits.get("stock_options"):
            score += 15
        if benefits.get("unlimited_pto"):
            score += 10
        if benefits.get("remote_work"):
            score += 5

        return min(100, score)

    def _get_score_breakdown(
        self, offer: Dict[str, Any], priorities: Dict[str, float]
    ) -> Dict[str, float]:
        """Get detailed score breakdown by category."""
        breakdown = {}

        if offer.get("base_salary"):
            breakdown["salary"] = min(100, offer["base_salary"] / 2500) * priorities.get(
                "salary", 0
            )

        breakdown["growth"] = self._normalize_growth(
            offer.get("growth_opportunities", 5)
        ) * priorities.get("growth", 0)
        breakdown["work_life_balance"] = (
            offer.get("work_life_balance", 5) * 20 * priorities.get("work_life_balance", 0)
        )
        breakdown["benefits"] = self._normalize_benefits(
            offer.get("benefits", {})
        ) * priorities.get("benefits", 0)
        breakdown["culture"] = offer.get("culture_score", 5) * 20 * priorities.get("culture", 0)

        return breakdown

    def generate_comparison_report(self, comparison: Dict[str, Any]) -> str:
        """Generate a text comparison report."""
        if not comparison.get("offers"):
            return "No offers to compare."

        report = ["Job Offer Comparison Report", "=" * 30, ""]

        for i, item in enumerate(comparison["offers"], 1):
            offer = item["offer"]
            report.append(f"{i}. {offer.get('company', 'Unknown Company')}")
            report.append(f"   Role: {offer.get('title', 'Unknown Role')}")
            report.append(f"   Score: {item['score']:.1f}/100")
            report.append(f"   Base Salary: ${offer.get('base_salary', 0):,}")
            report.append("")

        if comparison.get("recommendation"):
            rec = comparison["recommendation"]
            report.append("Recommendation")
            report.append("-" * 30)
            report.append(f"Best overall: {rec['offer'].get('company', 'Unknown')}")
            report.append(f"Total Score: {rec['score']:.1f}")

        return "\n".join(report)
