"""
Tests for Job Aggregator.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from lib.jobs.aggregator import JobAggregator
from lib.jobs.models import JobSource


class TestJobAggregator:
    """Test JobAggregator class."""

    @pytest.fixture
    def aggregator(self):
        """Create aggregator instance."""
        db_session = AsyncMock()
        return JobAggregator(db_session)

    @pytest.fixture
    def mock_sources(self):
        """Create mock sources."""
        return [
            JobSource(
                id="remote_ok",
                name="Remote OK",
                type="rss",
                url="https://remoteok.io/remote-jobs/rss",
                is_active=True,
            ),
            JobSource(
                id="adzuna",
                name="Adzuna",
                type="api",
                url="https://api.adzuna.com/v1/api/jobs/us/search",
                api_key="test_key",
                is_active=True,
            ),
        ]

    @pytest.mark.asyncio
    async def test_fetch_all(self, aggregator, mock_sources):
        """Test fetching from all sources."""
        # Mock source retrieval
        aggregator._get_sources = AsyncMock(return_value=mock_sources)
        
        # Mock individual fetches
        aggregator._fetch_source = AsyncMock(side_effect=[
            [MagicMock(id="job1"), MagicMock(id="job2")],
            [MagicMock(id="job3")],
        ])
        
        jobs = await aggregator.fetch_all()
        
        assert len(jobs) == 3
        assert aggregator._get_sources.called
        assert aggregator._fetch_source.call_count == 2

    @pytest.mark.asyncio
    async def test_fetch_all_parallel(self, aggregator, mock_sources):
        """Test parallel fetching."""
        aggregator._get_sources = AsyncMock(return_value=mock_sources)
        
        async def mock_fetch(source):
            await asyncio.sleep(0.01)
            return [MagicMock(id=f"job_{source.id}")]
        
        aggregator._fetch_source = mock_fetch
        
        import asyncio
        jobs = await aggregator.fetch_all(parallel=True)
        
        assert len(jobs) == 2

    @pytest.mark.asyncio
    async def test_fetch_all_sequential(self, aggregator, mock_sources):
        """Test sequential fetching."""
        aggregator._get_sources = AsyncMock(return_value=mock_sources)
        aggregator._fetch_source = AsyncMock(return_value=[MagicMock()])
        
        jobs = await aggregator.fetch_all(parallel=False)
        
        assert len(jobs) == 2

    @pytest.mark.asyncio
    async def test_fetch_all_no_sources(self, aggregator):
        """Test fetching with no sources."""
        aggregator._get_sources = AsyncMock(return_value=[])
        
        jobs = await aggregator.fetch_all()
        
        assert len(jobs) == 0

    @pytest.mark.asyncio
    async def test_fetch_all_with_errors(self, aggregator, mock_sources):
        """Test fetching with source errors."""
        aggregator._get_sources = AsyncMock(return_value=mock_sources)
        
        # One source fails, one succeeds
        aggregator._fetch_source = AsyncMock(side_effect=[
            Exception("Fetch failed"),
            [MagicMock(id="job1")],
        ])
        
        jobs = await aggregator.fetch_all()
        
        # Should still get jobs from successful source
        assert len(jobs) == 1

    @pytest.mark.asyncio
    async def test_fetch_source(self, aggregator):
        """Test fetching from specific source."""
        source = JobSource(
            id="test_source",
            name="Test Source",
            type="rss",
            url="https://example.com/rss",
        )
        
        aggregator._get_source = AsyncMock(return_value=source)
        aggregator._fetch_source = AsyncMock(return_value=[MagicMock(id="job1")])
        
        jobs = await aggregator.fetch_source("test_source")
        
        assert len(jobs) == 1

    @pytest.mark.asyncio
    async def test_fetch_source_not_found(self, aggregator):
        """Test fetching from non-existent source."""
        aggregator._get_source = AsyncMock(return_value=None)
        
        jobs = await aggregator.fetch_source("nonexistent")
        
        assert len(jobs) == 0

    @pytest.mark.asyncio
    async def test_get_fetcher_rss(self, aggregator):
        """Test getting RSS fetcher."""
        from lib.jobs.sources.rss import RSSJobSource
        
        source = JobSource(id="test", name="Test", type="rss", url="https://example.com/rss")
        fetcher = aggregator._get_fetcher(source)
        
        assert isinstance(fetcher, RSSJobSource)

    @pytest.mark.asyncio
    async def test_get_fetcher_api(self, aggregator):
        """Test getting API fetcher."""
        from lib.jobs.sources.api import APIJobSource
        
        source = JobSource(id="test", name="Test", type="api", url="https://api.example.com")
        fetcher = aggregator._get_fetcher(source)
        
        assert isinstance(fetcher, APIJobSource)

    @pytest.mark.asyncio
    async def test_get_fetcher_unknown(self, aggregator):
        """Test getting fetcher for unknown type."""
        source = JobSource(id="test", name="Test", type="unknown", url="https://example.com")
        fetcher = aggregator._get_fetcher(source)
        
        assert fetcher is None

    @pytest.mark.asyncio
    async def test_get_sources(self, aggregator, mock_sources):
        """Test getting sources."""
        aggregator._get_sources = AsyncMock(return_value=mock_sources)
        
        sources = await aggregator.get_sources()
        
        assert len(sources) == 2
        assert sources[0]["id"] == "remote_ok"

    @pytest.mark.asyncio
    async def test_schedule_fetch(self, aggregator):
        """Test scheduling fetch for due sources."""
        # Source that needs fetching (never fetched)
        source1 = JobSource(
            id="source1",
            name="Source 1",
            type="rss",
            url="https://example.com/rss",
            is_active=True,
            last_fetched=None,
        )
        
        # Source that was recently fetched
        source2 = JobSource(
            id="source2",
            name="Source 2",
            type="rss",
            url="https://example.com/rss",
            is_active=True,
            last_fetched=datetime.utcnow(),
            fetch_frequency=60,
        )
        
        aggregator._get_sources = AsyncMock(return_value=[source1, source2])
        
        due_sources = await aggregator.schedule_fetch(max_age_minutes=60)
        
        # Only source1 should be due
        assert len(due_sources) == 1
        assert due_sources[0].id == "source1"

    @pytest.mark.asyncio
    async def test_fetch_source_updates_metadata(self, aggregator):
        """Test that fetching updates source metadata."""
        source = JobSource(
            id="test",
            name="Test",
            type="rss",
            url="https://example.com/rss",
            jobs_fetched=10,
        )
        
        aggregator._get_fetcher = MagicMock(return_value=None)
        
        await aggregator._fetch_source(source)
        
        # Should have updated last_fetched and jobs_fetched
        assert source.last_fetched is not None
