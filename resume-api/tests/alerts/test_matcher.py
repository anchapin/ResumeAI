"""
Tests for Alert Job Matcher.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from lib.alerts.matcher import AlertJobMatcher
from lib.alerts.models import JobAlert


class TestAlertJobMatcher:
    """Test AlertJobMatcher class."""

    @pytest.fixture
    def matcher(self):
        """Create matcher instance."""
        db_session = AsyncMock()
        return AlertJobMatcher(db_session)

    @pytest.fixture
    def mock_alert(self):
        """Create mock alert."""
        alert = MagicMock(spec=JobAlert)
        alert.id = 1
        alert.user_id = 1
        alert.name = "Test Alert"
        alert.query = "Python Engineer"
        alert.remote = True
        alert.location = "San Francisco"
        alert.min_salary = 100000
        alert.employment_type = "full-time"
        alert.experience_level = "mid"
        alert.frequency = "daily"
        alert.is_active = True
        return alert

    @pytest.mark.asyncio
    async def test_match_all_alerts(self, matcher, mock_alert):
        """Test matching all alerts."""
        # Mock get_alerts
        matcher._get_alerts = AsyncMock(return_value=[mock_alert])
        
        # Mock find_matches
        mock_jobs = [MagicMock(id="job1"), MagicMock(id="job2")]
        matcher.find_matches = AsyncMock(return_value=mock_jobs)
        
        results = await matcher.match_all_alerts()
        
        assert len(results) == 1
        assert mock_alert in results
        assert len(results[mock_alert]) == 2

    @pytest.mark.asyncio
    async def test_match_all_alerts_no_alerts(self, matcher):
        """Test matching with no alerts."""
        matcher._get_alerts = AsyncMock(return_value=[])
        
        results = await matcher.match_all_alerts()
        
        assert results == {}

    @pytest.mark.asyncio
    async def test_match_all_alerts_with_errors(self, matcher, mock_alert):
        """Test matching with errors."""
        matcher._get_alerts = AsyncMock(return_value=[mock_alert])
        matcher.find_matches = AsyncMock(side_effect=Exception("Match failed"))
        
        results = await matcher.match_all_alerts()
        
        # Should handle error gracefully
        assert results == {}

    @pytest.mark.asyncio
    async def test_find_matches(self, matcher, mock_alert):
        """Test finding matches for an alert."""
        # Mock query building
        mock_query = MagicMock()
        matcher.db.execute = AsyncMock()
        matcher.db.execute.return_value.scalars.return_value.all.return_value = [
            MagicMock(id="job1"),
            MagicMock(id="job2"),
        ]
        
        jobs = await matcher.find_matches(mock_alert, limit=10)
        
        assert len(jobs) == 2

    @pytest.mark.asyncio
    async def test_get_alerts_active_only(self, matcher):
        """Test getting only active alerts."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [MagicMock()]
        matcher.db.execute = AsyncMock(return_value=mock_result)
        
        alerts = await matcher._get_alerts(active_only=True)
        
        assert len(alerts) == 1
        matcher.db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_alerts_includes_inactive(self, matcher):
        """Test getting all alerts including inactive."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [MagicMock()]
        matcher.db.execute = AsyncMock(return_value=mock_result)
        
        alerts = await matcher._get_alerts(active_only=False)
        
        assert len(alerts) == 1

    @pytest.mark.asyncio
    async def test_apply_filters_query(self, matcher, mock_alert):
        """Test applying query filter."""
        mock_query = MagicMock()
        
        result = await matcher._apply_filters(mock_query, mock_alert)
        
        # Query should be called with filter conditions
        assert mock_query.where.called

    @pytest.mark.asyncio
    async def test_apply_filters_remote(self, matcher):
        """Test applying remote filter."""
        alert = MagicMock(spec=JobAlert)
        alert.query = None
        alert.remote = True
        alert.location = None
        alert.min_salary = None
        alert.employment_type = None
        alert.experience_level = None
        
        mock_query = MagicMock()
        
        result = await matcher._apply_filters(mock_query, alert)
        
        assert mock_query.where.called

    @pytest.mark.asyncio
    async def test_exclude_sent_jobs(self, matcher, mock_alert):
        """Test excluding already sent jobs."""
        # Mock sent jobs query
        mock_sent_result = MagicMock()
        mock_sent_result.all.return_value = [("job1",), ("job2",)]
        matcher.db.execute = AsyncMock(return_value=mock_sent_result)
        
        mock_query = MagicMock()
        
        result = await matcher._exclude_sent_jobs(mock_query, mock_alert)
        
        # Should exclude job1 and job2
        assert mock_query.where.called

    @pytest.mark.asyncio
    async def test_exclude_sent_jobs_no_sent(self, matcher, mock_alert):
        """Test excluding when no jobs sent."""
        mock_sent_result = MagicMock()
        mock_sent_result.all.return_value = []
        matcher.db.execute = AsyncMock(return_value=mock_sent_result)
        
        mock_query = MagicMock()
        
        result = await matcher._exclude_sent_jobs(mock_query, mock_alert)
        
        # Query should not be modified
        assert result == mock_query

    @pytest.mark.asyncio
    async def test_mark_jobs_sent(self, matcher, mock_alert):
        """Test marking jobs as sent."""
        jobs = [MagicMock(id="job1"), MagicMock(id="job2")]
        
        # Mock existing match check
        existing_result = MagicMock()
        existing_result.scalar_one_or_none.return_value = None
        matcher.db.execute = AsyncMock(return_value=existing_result)
        matcher.db.commit = AsyncMock()
        
        await matcher.mark_jobs_sent(mock_alert, jobs)
        
        assert matcher.db.commit.called

    @pytest.mark.asyncio
    async def test_mark_jobs_sent_existing_match(self, matcher, mock_alert):
        """Test marking jobs with existing match."""
        jobs = [MagicMock(id="job1")]
        
        # Mock existing match
        existing_match = MagicMock()
        existing_result = MagicMock()
        existing_result.scalar_one_or_none.return_value = existing_match
        matcher.db.execute = AsyncMock(return_value=existing_result)
        matcher.db.commit = AsyncMock()
        
        await matcher.mark_jobs_sent(mock_alert, jobs)
        
        assert existing_match.is_sent == True
        assert existing_match.sent_at is not None

    def test_score_match_perfect(self, matcher, mock_alert):
        """Test scoring a perfect match."""
        job = MagicMock()
        job.title = "Python Engineer"
        job.company = "Tech Corp"
        job.location = "San Francisco, CA"
        job.remote = True
        job.salary_min = 120000
        job.salary_max = 150000
        job.employment_type = "full-time"
        job.experience_level = "mid"
        
        score = matcher.score_match(mock_alert, job)
        
        # Should be high score (close to 100)
        assert score >= 80

    def test_score_match_partial(self, matcher, mock_alert):
        """Test scoring a partial match."""
        job = MagicMock()
        job.title = "Software Developer"
        job.company = "Startup Inc"
        job.location = "Remote"
        job.remote = True
        job.salary_min = 80000
        job.salary_max = 100000
        job.employment_type = "full-time"
        job.experience_level = "mid"
        
        score = matcher.score_match(mock_alert, job)
        
        # Should be medium score
        assert 40 <= score < 80

    def test_score_match_poor(self, matcher, mock_alert):
        """Test scoring a poor match."""
        job = MagicMock()
        job.title = "Marketing Manager"
        job.company = "Retail Corp"
        job.location = "New York"
        job.remote = False
        job.salary_min = 50000
        job.salary_max = 60000
        job.employment_type = "part-time"
        job.experience_level = "entry"
        
        score = matcher.score_match(mock_alert, job)
        
        # Should be low score
        assert score < 40

    def test_score_match_no_preferences(self, matcher):
        """Test scoring when alert has no preferences."""
        alert = MagicMock(spec=JobAlert)
        alert.query = None
        alert.remote = None
        alert.location = None
        alert.min_salary = None
        alert.employment_type = None
        alert.experience_level = None
        
        job = MagicMock()
        
        score = matcher.score_match(alert, job)
        
        # Should get full points for no preferences
        assert score == 100
