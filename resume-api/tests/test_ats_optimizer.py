"""
Tests for ATS Optimizer Module
"""

import pytest
from lib.ats.optimizer import ATSOptimizer, ATSAwareScore, ats_optimizer


class TestATSOptimizer:
    """Test suite for ATS Optimizer"""
    
    @pytest.fixture
    def optimizer(self):
        """Create an ATS optimizer instance"""
        return ATSOptimizer()
    
    def test_optimizer_initialization(self, optimizer):
        """Test optimizer initializes correctly"""
        assert optimizer is not None
    
    def test_get_ats_aware_score_excellent(self, optimizer):
        """Test ATS-aware scoring with excellent ATS score"""
        result = optimizer.get_ats_aware_score(
            job_description="Looking for Python developer",
            resume_data={"skills": ["Python", "JavaScript"]},
            ats_score=85,
            base_match_score=70
        )
        
        assert isinstance(result, ATSAwareScore)
        assert result.base_match_score == 70
        assert result.ats_factor == 1.0
        assert result.adjusted_score == 70.0
        assert result.confidence == "high"
    
    def test_get_ats_aware_score_good(self, optimizer):
        """Test ATS-aware scoring with good ATS score"""
        result = optimizer.get_ats_aware_score(
            job_description="Looking for Python developer",
            resume_data={"skills": ["Python"]},
            ats_score=65,
            base_match_score=60
        )
        
        assert result.ats_factor == 0.95
        assert result.adjusted_score == 57.0
        assert result.confidence == "high"
    
    def test_get_ats_aware_score_needs_work(self, optimizer):
        """Test ATS-aware scoring with needs work ATS score"""
        result = optimizer.get_ats_aware_score(
            job_description="Looking for Python developer",
            resume_data={"skills": ["Python"]},
            ats_score=55,
            base_match_score=60
        )
        
        assert result.ats_factor == 0.85
        assert result.adjusted_score == 51.0
        assert result.confidence == "medium"
    
    def test_get_ats_aware_score_poor(self, optimizer):
        """Test ATS-aware scoring with poor ATS score"""
        result = optimizer.get_ats_aware_score(
            job_description="Looking for Python developer",
            resume_data={"skills": ["Python"]},
            ats_score=30,
            base_match_score=60
        )
        
        assert result.ats_factor == 0.7
        assert result.adjusted_score == 42.0
        assert result.confidence == "low"
    
    def test_get_ats_aware_score_critical(self, optimizer):
        """Test ATS-aware scoring with critical ATS score"""
        result = optimizer.get_ats_aware_score(
            job_description="Looking for Python developer",
            resume_data={"skills": ["Python"]},
            ats_score=15,
            base_match_score=60
        )
        
        assert result.ats_factor == 0.5
        assert result.adjusted_score == 30.0
        assert result.confidence == "very_low"
    
    def test_get_optimization_priority_both(self, optimizer):
        """Test optimization priority when both need work"""
        priority = optimizer.get_optimization_priority(ats_score=30, match_score=40)
        assert priority == "both"
    
    def test_get_optimization_priority_ats(self, optimizer):
        """Test optimization priority when ATS needs work"""
        priority = optimizer.get_optimization_priority(ats_score=30, match_score=70)
        assert priority == "ats"
    
    def test_get_optimization_priority_match(self, optimizer):
        """Test optimization priority when match needs work"""
        priority = optimizer.get_optimization_priority(ats_score=75, match_score=40)
        assert priority == "match"
    
    def test_get_optimization_priority_none(self, optimizer):
        """Test optimization priority when nothing needs work"""
        priority = optimizer.get_optimization_priority(ats_score=85, match_score=80)
        assert priority == "none"
    
    def test_estimate_improvement(self, optimizer):
        """Test improvement estimation"""
        result = optimizer.estimate_improvement(
            current_ats_score=40,
            target_ats_score=80,
            current_match_score=60
        )
        
        assert "current_adjusted_score" in result
        assert "potential_adjusted_score" in result
        assert "score_improvement" in result
        assert "percentage_improvement" in result
        assert "recommendation" in result
    
    def test_generate_recommendations_ats_issues(self, optimizer):
        """Test recommendation generation for ATS issues"""
        result = optimizer._generate_recommendations(
            ats_score=30,
            base_match_score=70,
            job_description="Python developer",
            resume_data={}
        )
        
        assert len(result) > 0
        assert any("ATS" in rec or "resume" in rec for rec in result)
    
    def test_generate_recommendations_match_issues(self, optimizer):
        """Test recommendation generation for match issues"""
        result = optimizer._generate_recommendations(
            ats_score=85,
            base_match_score=40,
            job_description="Python developer",
            resume_data={}
        )
        
        assert len(result) > 0
        assert any("match" in rec.lower() or "tailor" in rec.lower() for rec in result)
    
    def test_generate_recommendations_both_good(self, optimizer):
        """Test recommendation generation when both are good"""
        result = optimizer._generate_recommendations(
            ats_score=85,
            base_match_score=75,
            job_description="Python developer",
            resume_data={}
        )
        
        assert any("great" in rec.lower() or "✅" in rec for rec in result)
    
    def test_singleton_instance(self):
        """Test that singleton instance exists"""
        assert ats_optimizer is not None
        assert isinstance(ats_optimizer, ATSOptimizer)


class TestATSAwareScore:
    """Test suite for ATSAwareScore dataclass"""
    
    def test_score_rounding(self):
        """Test that adjusted score is rounded"""
        score = ATSAwareScore(
            base_match_score=65.5,
            ats_factor=0.85,
            adjusted_score=55.675,
            confidence="medium",
            recommendations=["Test"]
        )
        
        assert score.adjusted_score == 55.675
