"""
Tests for async PDF rendering job queue system.
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from pathlib import Path

from lib.queue import (
    LocalQueue,
    Job,
    JobState,
    JobPriority,
    JobConfig,
)
from lib.queue.pdf_worker import PDFWorker, PDFWorkerPool


class TestJobQueue:
    """Test job queue functionality."""

    @pytest.fixture
    def queue(self):
        """Create a test queue."""
        return LocalQueue()

    @pytest.mark.asyncio
    async def test_enqueue_job(self, queue):
        """Test enqueueing a job."""
        job = Job(
            payload={"test": "data"},
            priority=JobPriority.NORMAL,
        )

        job_id = await queue.enqueue(job)

        assert job_id == job.job_id
        assert job.job_id in queue.jobs

    @pytest.mark.asyncio
    async def test_dequeue_job(self, queue):
        """Test dequeueing a job."""
        job = Job(payload={"test": "data"})
        await queue.enqueue(job)

        dequeued = await queue.dequeue()

        assert dequeued is not None
        assert dequeued.job_id == job.job_id
        assert dequeued.state == JobState.PROCESSING

    @pytest.mark.asyncio
    async def test_dequeue_empty_queue(self, queue):
        """Test dequeueing from empty queue."""
        dequeued = await queue.dequeue()
        assert dequeued is None

    @pytest.mark.asyncio
    async def test_get_job(self, queue):
        """Test getting job by ID."""
        job = Job(payload={"test": "data"})
        await queue.enqueue(job)

        retrieved = await queue.get_job(job.job_id)

        assert retrieved is not None
        assert retrieved.job_id == job.job_id

    @pytest.mark.asyncio
    async def test_get_nonexistent_job(self, queue):
        """Test getting nonexistent job."""
        retrieved = await queue.get_job("nonexistent-id")
        assert retrieved is None

    @pytest.mark.asyncio
    async def test_update_job(self, queue):
        """Test updating job status."""
        job = Job(payload={"test": "data"})
        await queue.enqueue(job)

        job.state = JobState.PROCESSING
        job.progress = 50
        await queue.update_job(job)

        updated = await queue.get_job(job.job_id)
        assert updated.state == JobState.PROCESSING
        assert updated.progress == 50

    @pytest.mark.asyncio
    async def test_job_priority_ordering(self, queue):
        """Test jobs are dequeued in priority order."""
        job1 = Job(payload={"id": 1}, priority=JobPriority.LOW)
        job2 = Job(payload={"id": 2}, priority=JobPriority.HIGH)
        job3 = Job(payload={"id": 3}, priority=JobPriority.NORMAL)

        await queue.enqueue(job1)
        await queue.enqueue(job2)
        await queue.enqueue(job3)

        # Dequeue in priority order
        first = await queue.dequeue()
        assert first.payload["id"] == 2  # HIGH priority

        first.state = JobState.COMPLETED
        await queue.update_job(first)

        second = await queue.dequeue()
        assert second.payload["id"] == 3  # NORMAL priority

    @pytest.mark.asyncio
    async def test_get_jobs_by_state(self, queue):
        """Test filtering jobs by state."""
        job1 = Job(state=JobState.PENDING)
        job2 = Job(state=JobState.PENDING)
        job3 = Job(state=JobState.COMPLETED)

        await queue.enqueue(job1)
        await queue.enqueue(job2)
        await queue.enqueue(job3)

        pending = await queue.get_jobs_by_state(JobState.PENDING)
        assert len(pending) == 2

    @pytest.mark.asyncio
    async def test_cancel_job(self, queue):
        """Test cancelling a job."""
        job = Job(payload={"test": "data"})
        await queue.enqueue(job)

        success = await queue.cancel_job(job.job_id)

        assert success is True
        cancelled = await queue.get_job(job.job_id)
        assert cancelled.state == JobState.CANCELLED

    @pytest.mark.asyncio
    async def test_cannot_cancel_completed_job(self, queue):
        """Test cannot cancel completed job."""
        job = Job(state=JobState.COMPLETED)
        await queue.enqueue(job)

        success = await queue.cancel_job(job.job_id)

        assert success is False

    @pytest.mark.asyncio
    async def test_clear_old_completed_jobs(self, queue):
        """Test clearing old completed jobs."""
        # Create old completed job
        old_job = Job(state=JobState.COMPLETED)
        old_job.completed_at = datetime.utcnow() - timedelta(days=10)
        await queue.enqueue(old_job)

        # Create recent completed job
        new_job = Job(state=JobState.COMPLETED)
        await queue.enqueue(new_job)

        count = await queue.clear_completed_jobs(older_than_days=7)

        assert count == 1
        assert await queue.get_job(old_job.job_id) is None
        assert await queue.get_job(new_job.job_id) is not None

    @pytest.mark.asyncio
    async def test_job_should_retry(self):
        """Test job retry logic."""
        job = Job(
            state=JobState.FAILED,
            retry_count=0,
            max_retries=3,
        )

        assert job.should_retry() is True

        job.retry_count = 3
        assert job.should_retry() is False

    @pytest.mark.asyncio
    async def test_job_is_completed(self):
        """Test job completion check."""
        job = Job(state=JobState.PENDING)
        assert job.is_completed() is False

        job.state = JobState.COMPLETED
        assert job.is_completed() is True

        job.state = JobState.FAILED
        assert job.is_completed() is True

    @pytest.mark.asyncio
    async def test_queue_stats(self, queue):
        """Test getting queue statistics."""
        await queue.enqueue(Job(state=JobState.PENDING))
        await queue.enqueue(Job(state=JobState.PENDING))
        await queue.enqueue(Job(state=JobState.COMPLETED))

        stats = queue.get_stats()

        assert stats["total_jobs"] == 3
        assert stats["pending"] == 2
        assert stats["completed"] == 1


class TestPDFWorker:
    """Test PDF worker functionality."""

    @pytest.fixture
    def queue(self):
        """Create a test queue."""
        return LocalQueue()

    @pytest.fixture
    def worker(self, queue, tmp_path):
        """Create a test worker."""
        return PDFWorker(
            queue=queue,
            result_dir=str(tmp_path),
            timeout=5,
        )

    @pytest.mark.asyncio
    async def test_worker_initialization(self, worker):
        """Test worker initialization."""
        assert worker.result_dir.exists()
        assert worker.timeout == 5
        assert worker.running is False

    @pytest.mark.asyncio
    async def test_set_render_handler(self, worker):
        """Test setting render handler."""

        async def mock_render(job):
            return b"PDF content"

        worker.set_render_handler(mock_render)

        assert worker.render_handler is not None

    @pytest.mark.asyncio
    async def test_worker_process_job(self, queue, worker, tmp_path):
        """Test worker processing a job."""

        async def mock_render(job):
            return b"PDF content"

        worker.set_render_handler(mock_render)

        # Create and enqueue job
        job = Job(payload={"test": "data"})
        await queue.enqueue(job)

        # Process one job
        await worker._process_next_job()

        # Check result
        result_job = await queue.get_job(job.job_id)
        assert result_job.state == JobState.COMPLETED
        assert result_job.progress == 100
        assert "pdf_path" in result_job.result

    @pytest.mark.asyncio
    async def test_worker_handles_error(self, queue, worker):
        """Test worker handles rendering errors with retry."""
        call_count = [0]

        async def failing_render(job):
            call_count[0] += 1
            raise RuntimeError("Render failed")

        worker.set_render_handler(failing_render)

        # Create and enqueue job
        job = Job(payload={"test": "data"}, max_retries=2)
        await queue.enqueue(job)

        # Process job
        await worker._process_next_job()

        # Check job is requeued for retry
        result_job = await queue.get_job(job.job_id)
        assert result_job.state == JobState.PENDING
        assert result_job.retry_count == 1
        assert result_job.error is not None

    @pytest.mark.asyncio
    async def test_worker_fails_after_max_retries(self, queue, worker):
        """Test worker marks job failed after max retries."""

        async def failing_render(job):
            raise RuntimeError("Render failed")

        worker.set_render_handler(failing_render)

        # Create and enqueue job with low retry count
        job = Job(payload={"test": "data"}, max_retries=0)
        await queue.enqueue(job)

        # Process job
        await worker._process_next_job()

        # Check job is marked failed
        result_job = await queue.get_job(job.job_id)
        assert result_job.state == JobState.FAILED
        assert result_job.retry_count == 1

    @pytest.mark.asyncio
    async def test_worker_timeout(self, queue, tmp_path):
        """Test worker timeout handling."""
        worker = PDFWorker(
            queue=queue,
            result_dir=str(tmp_path),
            timeout=0.1,  # 100ms timeout
        )

        async def slow_render(job):
            await asyncio.sleep(1)  # Simulate slow operation
            return b"PDF content"

        worker.set_render_handler(slow_render)

        # Create and enqueue job
        job = Job(payload={"test": "data"}, max_retries=0)
        await queue.enqueue(job)

        # Process job (should timeout)
        await worker._process_next_job()

        # Check job is marked failed
        result_job = await queue.get_job(job.job_id)
        assert result_job.state == JobState.FAILED
        assert "timeout" in result_job.error.lower()

    @pytest.mark.asyncio
    async def test_worker_get_job_status(self, queue, worker):
        """Test getting job status from worker."""
        job = Job(
            payload={"test": "data"},
            state=JobState.PROCESSING,
            progress=50,
        )
        await queue.enqueue(job)

        status = await worker.get_job_status(job.job_id)

        assert status is not None
        assert status["job_id"] == job.job_id
        assert status["state"] == "processing"
        assert status["progress"] == 50

    @pytest.mark.asyncio
    async def test_worker_get_queue_stats(self, queue, worker):
        """Test getting queue stats from worker."""
        await queue.enqueue(Job(state=JobState.PENDING))
        await queue.enqueue(Job(state=JobState.COMPLETED))

        stats = await worker.get_queue_stats()

        assert "total_jobs" in stats
        assert stats["total_jobs"] == 2
        assert stats["worker_running"] is False


class TestPDFWorkerPool:
    """Test worker pool functionality."""

    @pytest.fixture
    def queue(self):
        """Create a test queue."""
        return LocalQueue()

    @pytest.fixture
    def pool(self, queue, tmp_path):
        """Create a test worker pool."""
        return PDFWorkerPool(
            queue=queue,
            num_workers=2,
            result_dir=str(tmp_path),
            timeout=5,
        )

    @pytest.mark.asyncio
    async def test_pool_initialization(self, pool):
        """Test pool initialization."""
        assert pool.num_workers == 2

    @pytest.mark.asyncio
    async def test_pool_set_render_handler(self, pool):
        """Test setting render handler on pool."""

        async def mock_render(job):
            return b"PDF content"

        pool.set_render_handler(mock_render)

        # Handler should be set on pool
        assert pool.render_handler is not None

    @pytest.mark.asyncio
    async def test_pool_start_stop(self, pool):
        """Test starting and stopping pool."""

        async def mock_render(job):
            return b"PDF content"

        pool.set_render_handler(mock_render)
        await pool.start()

        assert len(pool.workers) == 2
        assert len(pool.tasks) == 2

        await pool.stop()

        # All workers should be stopped
        for worker in pool.workers:
            assert worker.running is False

    @pytest.mark.asyncio
    async def test_pool_get_worker_stats(self, pool):
        """Test getting stats from worker pool."""
        stats = await pool.get_worker_stats()

        assert "total_workers" in stats
        assert stats["total_workers"] == 2
        assert "workers" in stats
        assert len(stats["workers"]) == 2


class TestJobModel:
    """Test Job model serialization/deserialization."""

    def test_job_to_dict(self):
        """Test converting job to dictionary."""
        job = Job(
            payload={"test": "data"},
            state=JobState.PROCESSING,
            priority=JobPriority.HIGH,
        )

        data = job.to_dict()

        assert data["job_id"] == job.job_id
        assert data["state"] == "processing"
        assert data["priority"] == 10
        assert data["payload"] == {"test": "data"}

    def test_job_from_dict(self):
        """Test creating job from dictionary."""
        data = {
            "job_id": "test-id",
            "state": "processing",
            "priority": 5,
            "payload": {"test": "data"},
            "progress": 50,
            "created_at": datetime.utcnow().isoformat(),
        }

        job = Job.from_dict(data)

        assert job.job_id == "test-id"
        assert job.state == JobState.PROCESSING
        assert job.priority == JobPriority.NORMAL
        assert job.progress == 50

    def test_job_roundtrip(self):
        """Test job serialization roundtrip."""
        job1 = Job(
            payload={"test": "data"},
            state=JobState.COMPLETED,
            priority=JobPriority.HIGH,
            progress=100,
        )

        data = job1.to_dict()
        job2 = Job.from_dict(data)

        assert job2.job_id == job1.job_id
        assert job2.state == job1.state
        assert job2.priority == job1.priority
        assert job2.progress == job1.progress
