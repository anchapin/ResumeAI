"""
Job queue abstraction for async PDF rendering.

Supports local queue, Redis, and SQS implementations.
"""

import json
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Optional, List, Any
from pathlib import Path

import logging

logger = logging.getLogger(__name__)


class JobState(str, Enum):
    """Job states."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobPriority(int, Enum):
    """Job priority levels (higher number = higher priority)."""

    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20


@dataclass
class JobConfig:
    """Configuration for job queue."""

    max_retries: int = 3
    retry_backoff_base: float = 2.0  # exponential backoff multiplier
    retry_backoff_max: int = 3600  # max backoff 1 hour
    timeout: int = 60  # timeout in seconds per job
    queue_dir: Optional[str] = None  # for local queue


@dataclass
class Job:
    """Represents a job in the queue."""

    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: JobState = JobState.PENDING
    priority: JobPriority = JobPriority.NORMAL
    payload: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Any] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0  # 0-100
    eta_seconds: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary."""
        data = asdict(self)
        data["state"] = self.state.value
        data["priority"] = self.priority.value
        data["created_at"] = self.created_at.isoformat()
        data["started_at"] = self.started_at.isoformat() if self.started_at else None
        data["completed_at"] = (
            self.completed_at.isoformat() if self.completed_at else None
        )
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        """Create job from dictionary."""
        data = data.copy()
        if isinstance(data.get("state"), str):
            data["state"] = JobState(data["state"])
        if isinstance(data.get("priority"), int):
            data["priority"] = JobPriority(data["priority"])
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if isinstance(data.get("started_at"), str):
            data["started_at"] = (
                datetime.fromisoformat(data["started_at"])
                if data["started_at"]
                else None
            )
        if isinstance(data.get("completed_at"), str):
            data["completed_at"] = (
                datetime.fromisoformat(data["completed_at"])
                if data["completed_at"]
                else None
            )
        return cls(**data)

    def is_completed(self) -> bool:
        """Check if job is completed (success or failure)."""
        return self.state in (JobState.COMPLETED, JobState.FAILED)

    def should_retry(self) -> bool:
        """Check if job should be retried."""
        return self.state == JobState.FAILED and self.retry_count < self.max_retries

    def get_retry_delay(self) -> int:
        """Get delay for next retry (exponential backoff with jitter)."""
        import random

        delay = (
            min(int(self.retry_backoff_base**self.retry_count), self.max_retries)
            if hasattr(self, "retry_backoff_base")
            else (2**self.retry_count)
        )
        # Add jitter (±20%)
        jitter = random.uniform(0.8, 1.2)
        return int(delay * jitter)


class JobQueue(ABC):
    """Abstract base class for job queues."""

    @abstractmethod
    async def enqueue(self, job: Job) -> str:
        """Enqueue a job. Returns job_id."""
        pass

    @abstractmethod
    async def dequeue(self, timeout: int = 0) -> Optional[Job]:
        """Dequeue the next job. Returns None if queue is empty."""
        pass

    @abstractmethod
    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID."""
        pass

    @abstractmethod
    async def update_job(self, job: Job) -> None:
        """Update job status."""
        pass

    @abstractmethod
    async def get_jobs_by_state(self, state: JobState) -> List[Job]:
        """Get all jobs in a specific state."""
        pass

    @abstractmethod
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job. Returns True if successful."""
        pass

    @abstractmethod
    async def clear_completed_jobs(self, older_than_days: int = 7) -> int:
        """Clear completed jobs older than N days. Returns count deleted."""
        pass


class LocalQueue(JobQueue):
    """In-memory job queue for single-process deployment."""

    def __init__(self, config: JobConfig = None):
        """Initialize local queue."""
        self.config = config or JobConfig()
        self.jobs: Dict[str, Job] = {}
        self.queue: List[str] = []  # job_ids in priority order
        self.job_states: Dict[str, List[str]] = {state: [] for state in JobState}
        logger.info("Initialized LocalQueue")

    async def enqueue(self, job: Job) -> str:
        """Enqueue a job."""
        self.jobs[job.job_id] = job
        self.job_states[JobState.PENDING].append(job.job_id)
        self._sort_queue()
        logger.info(f"Enqueued job {job.job_id} with priority {job.priority}")
        return job.job_id

    async def dequeue(self, timeout: int = 0) -> Optional[Job]:
        """Dequeue the next job."""
        if not self.queue:
            return None

        # Find first pending job
        for job_id in self.queue:
            job = self.jobs.get(job_id)
            if job and job.state == JobState.PENDING:
                job.state = JobState.PROCESSING
                job.started_at = datetime.utcnow()
                self._update_job_states(job_id, JobState.PENDING, JobState.PROCESSING)
                logger.info(f"Dequeued job {job_id}")
                return job

        return None

    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID."""
        return self.jobs.get(job_id)

    async def update_job(self, job: Job) -> None:
        """Update job status."""
        if job.job_id not in self.jobs:
            raise ValueError(f"Job {job.job_id} not found")

        old_state = self.jobs[job.job_id].state
        self.jobs[job.job_id] = job

        if old_state != job.state:
            self._update_job_states(job.job_id, old_state, job.state)

        if job.is_completed():
            job.completed_at = job.completed_at or datetime.utcnow()

        logger.info(f"Updated job {job.job_id} to state {job.state}")

    async def get_jobs_by_state(self, state: JobState) -> List[Job]:
        """Get all jobs in a specific state."""
        job_ids = self.job_states.get(state, [])
        return [self.jobs[job_id] for job_id in job_ids if job_id in self.jobs]

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        job = self.jobs.get(job_id)
        if not job:
            return False

        if job.is_completed():
            return False

        old_state = job.state
        job.state = JobState.CANCELLED
        job.completed_at = datetime.utcnow()
        self._update_job_states(job_id, old_state, JobState.CANCELLED)
        logger.info(f"Cancelled job {job_id}")
        return True

    async def clear_completed_jobs(self, older_than_days: int = 7) -> int:
        """Clear completed jobs older than N days."""
        cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
        jobs_to_remove = []

        for job_id, job in self.jobs.items():
            if (
                job.is_completed()
                and job.completed_at
                and job.completed_at < cutoff_date
            ):
                jobs_to_remove.append(job_id)

        for job_id in jobs_to_remove:
            job = self.jobs.pop(job_id)
            if job.state in self.job_states:
                self.job_states[job.state] = [
                    jid for jid in self.job_states[job.state] if jid != job_id
                ]
            if job_id in self.queue:
                self.queue.remove(job_id)

        logger.info(f"Cleared {len(jobs_to_remove)} completed jobs")
        return len(jobs_to_remove)

    def _sort_queue(self) -> None:
        """Sort queue by priority (highest first)."""
        pending_jobs = []
        for job_id in list(set(self.queue)):
            job = self.jobs.get(job_id)
            if job and job.state == JobState.PENDING:
                pending_jobs.append((job.priority.value, job.created_at, job_id))

        pending_jobs.sort(
            key=lambda x: (-x[0], x[1])
        )  # Sort by priority desc, then created_at asc
        self.queue = [job_id for _, _, job_id in pending_jobs]

    def _update_job_states(
        self, job_id: str, old_state: JobState, new_state: JobState
    ) -> None:
        """Update job state tracking."""
        if job_id in self.job_states[old_state]:
            self.job_states[old_state].remove(job_id)
        if job_id not in self.job_states[new_state]:
            self.job_states[new_state].append(job_id)
        self._sort_queue()

    def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        return {
            "total_jobs": len(self.jobs),
            "pending": len(self.job_states[JobState.PENDING]),
            "processing": len(self.job_states[JobState.PROCESSING]),
            "completed": len(self.job_states[JobState.COMPLETED]),
            "failed": len(self.job_states[JobState.FAILED]),
            "cancelled": len(self.job_states[JobState.CANCELLED]),
        }
