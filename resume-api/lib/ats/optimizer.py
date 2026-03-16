"""
ATS Optimizer Module

Provides ATS-aware job matching and optimization suggestions.
"""

from typing import Optional
from dataclasses import dataclass


@dataclass
class ATSAwareScore:
    """ATS-aware job match score result"""
    base_match_score: float
    ats_factor: float
    adjusted_score: float
    confidence: str
    recommendations: list[str]


class ATSOptimizer:
    """Optimizes job matching based on ATS compatibility"""
    
    # ATS score thresholds for confidence adjustments
    ATS_EXCELLENT_THRESHOLD = 80
    ATS_GOOD_THRESHOLD = 60
    ATS_POOR_THRESHOLD = 50
    ATS_CRITICAL_THRESHOLD = 20
    
    def __init__(self):
        pass
    
    def get_ats_aware_score(
        self,
        job_description: str,
        resume_data: dict,
        ats_score: float,
        base_match_score: float
    ) -> ATSAwareScore:
        """
        Calculate ATS-aware job match score.
        
        Args:
            job_description: The job description text
            resume_data: Parsed resume data
            ats_score: ATS compatibility score (0-100)
            base_match_score: Original match score before ATS adjustment
            
        Returns:
            ATSAwareScore with adjusted score and recommendations
        """
        # Determine ATS factor based on score
        ats_factor, confidence = self._get_ats_factor(ats_score)
        
        # Calculate adjusted score
        adjusted_score = base_match_score * ats_factor
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            ats_score, base_match_score, job_description, resume_data
        )
        
        return ATSAwareScore(
            base_match_score=base_match_score,
            ats_factor=ats_factor,
            adjusted_score=round(adjusted_score, 2),
            confidence=confidence,
            recommendations=recommendations
        )
    
    def _get_ats_factor(self, ats_score: float) -> tuple[float, str]:
        """Determine ATS factor and confidence level based on ATS score"""
        if ats_score >= self.ATS_EXCELLENT_THRESHOLD:
            return 1.0, "high"
        elif ats_score >= self.ATS_GOOD_THRESHOLD:
            return 0.95, "high"
        elif ats_score >= self.ATS_POOR_THRESHOLD:
            return 0.85, "medium"
        elif ats_score >= self.ATS_CRITICAL_THRESHOLD:
            return 0.7, "low"
        else:
            return 0.5, "very_low"
    
    def _generate_recommendations(
        self,
        ats_score: float,
        base_match_score: float,
        job_description: str,
        resume_data: dict
    ) -> list[str]:
        """Generate recommendations based on ATS and match analysis"""
        recommendations = []
        
        # ATS-related recommendations
        if ats_score < self.ATS_GOOD_THRESHOLD:
            if ats_score < self.ATS_CRITICAL_THRESHOLD:
                recommendations.append(
                    "⚠️ Your resume has critical ATS issues. Fix them before applying - "
                    "the resume may not be parsed correctly."
                )
            else:
                recommendations.append(
                    "📄 Improve ATS compatibility to increase your chances. "
                    "Consider regenerating your resume in a simpler format."
                )
        
        # Match-related recommendations
        if base_match_score < 50:
            recommendations.append(
                "🎯 Low match score - tailor your resume more specifically to this job description."
            )
        elif base_match_score < 70:
            recommendations.append(
                "✏️ Consider adding more keywords from the job description to improve your match score."
            )
        
        # Combined recommendations
        if ats_score < self.ATS_POOR_THRESHOLD and base_match_score < 60:
            recommendations.append(
                "💡 Both ATS compatibility and job match need improvement. "
                "Fix the resume format first, then tailor content."
            )
        
        # Positive feedback
        if ats_score >= self.ATS_EXCELLENT_THRESHOLD and base_match_score >= 70:
            recommendations.append(
                "✅ Great! Your resume is ATS-friendly and well-matched to this job."
            )
        
        return recommendations
    
    def get_optimization_priority(
        self,
        ats_score: float,
        match_score: float
    ) -> str:
        """
        Determine what to optimize first.
        
        Returns:
            'ats' - Focus on ATS fixes first
            'match' - Focus on content matching first
            'both' - Work on both simultaneously
        """
        ats_poor = ats_score < self.ATS_GOOD_THRESHOLD
        match_poor = match_score < 60
        
        if ats_poor and match_poor:
            return "both"
        elif ats_poor:
            return "ats"
        elif match_poor:
            return "match"
        else:
            return "none"
    
    def estimate_improvement(
        self,
        current_ats_score: float,
        target_ats_score: float,
        current_match_score: float
    ) -> dict:
        """
        Estimate the improvement in match score if ATS is improved.
        
        Returns:
            Dictionary with improvement estimates
        """
        current_factor, _ = self._get_ats_factor(current_ats_score)
        target_factor, _ = self._get_ats_factor(target_ats_score)
        
        current_adjusted = current_match_score * current_factor
        target_adjusted = current_match_score * target_factor
        
        score_improvement = target_adjusted - current_adjusted
        percentage_improvement = (score_improvement / current_adjusted * 100) if current_adjusted > 0 else 0
        
        return {
            "current_adjusted_score": round(current_adjusted, 2),
            "potential_adjusted_score": round(target_adjusted, 2),
            "score_improvement": round(score_improvement, 2),
            "percentage_improvement": round(percentage_improvement, 1),
            "recommendation": self._get_optimization_strategy(current_ats_score, target_ats_score)
        }
    
    def _get_optimization_strategy(
        self,
        current_ats_score: float,
        target_ats_score: float
    ) -> str:
        """Get the recommended optimization strategy"""
        if target_ats_score >= self.ATS_EXCELLENT_THRESHOLD:
            return (
                "Fully optimize for ATS - remove images, tables, and complex formatting. "
                "Use standard section headers and plain text."
            )
        elif target_ats_score >= self.ATS_GOOD_THRESHOLD:
            return (
                "Improve ATS compatibility - simplify layout and remove problematic elements. "
                "Consider using a cleaner template."
            )
        else:
            return "Focus on content matching - ATS score is too low to be viable."


# Singleton instance
ats_optimizer = ATSOptimizer()
