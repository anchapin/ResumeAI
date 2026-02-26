"""
PDF rendering worker for async job queue.

Processes PDF jobs from queue with timeout protection and error handling.
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Any, Dict

from .job_queue import JobQueue, Job, JobState, JobPriority

logger = logging.getLogger(__name__)


class PDFWorker:
    """Worker for processing PDF rendering jobs."""

    def __init__(
        self,
        queue: JobQueue,
        result_dir: Optional[str] = None,
        timeout: int = 60,
        max_concurrent_jobs: int = 1,
    ):
        """
        Initialize PDF worker.

        Args:
            queue: JobQueue instance to process jobs from
            result_dir: Directory to store generated PDFs
            timeout: Timeout per job in seconds
            max_concurrent_jobs: Maximum concurrent jobs (default 1 for single worker)
        """
        self.queue = queue
        self.result_dir = Path(result_dir) if result_dir else Path("/tmp/resume-pdfs")
        self.timeout = timeout
        self.max_concurrent_jobs = max_concurrent_jobs
        self.running = False
        self.active_jobs: Dict[str, asyncio.Task] = {}
        self.render_handler: Optional[Callable] = None

        # Create result directory
        self.result_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"PDFWorker initialized with result_dir={self.result_dir}")

    def set_render_handler(self, handler: Callable) -> None:
        """
        Set the PDF rendering handler function.

        Handler signature: async def render(job: Job) -> bytes
        Should raise exceptions on failure.
        """
        self.render_handler = handler
        logger.info("PDF render handler set")

    async def start(self) -> None:
        """Start worker - processes jobs continuously."""
        self.running = True
        logger.info("PDFWorker started")

        # Handle signals for graceful shutdown
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop = asyncio.get_event_loop()
                loop.add_signal_handler(sig, lambda: asyncio.create_task(self.stop()))
            except Exception:
                pass

        try:
            while self.running:
                await self._process_next_job()
                # Small delay to prevent busy-waiting
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
        finally:
            await self.stop()

    async def stop(self) -> None:
        """Stop worker gracefully."""
        logger.info("Stopping PDFWorker")
        self.running = False

        # Cancel active jobs
        for job_id, task in list(self.active_jobs.items()):
            task.cancel()

        # Wait for tasks to complete
        if self.active_jobs:
            await asyncio.gather(
                *self.active_jobs.values(),
                return_exceptions=True
            )

        logger.info("PDFWorker stopped")

    async def _process_next_job(self) -> None:
        """Process the next job from queue."""
        if len(self.active_jobs) >= self.max_concurrent_jobs:
            return

        job = await self.queue.dequeue(timeout=1)
        if not job:
            return

        # Create task for this job
        task = asyncio.create_task(self._handle_job(job))
        self.active_jobs[job.job_id] = task

        # Clean up completed tasks
        for job_id in list(self.active_jobs.keys()):
            if self.active_jobs[job_id].done():
                del self.active_jobs[job_id]

    async def _handle_job(self, job: Job) -> None:
        """Handle a single job with timeout and retry logic."""
        try:
            logger.info(f"Processing job {job.job_id}")
            job.progress = 10

            # Call render handler with timeout
            if not self.render_handler:
                raise RuntimeError("PDF render handler not set")

            try:
                job.progress = 20
                pdf_bytes = await asyncio.wait_for(
                    self.render_handler(job),
                    timeout=self.timeout
                )
                job.progress = 90

            except asyncio.TimeoutError:
                raise RuntimeError(
                    f"PDF rendering timeout after {self.timeout}s"
                )

            # Save PDF
            result_path = self.result_dir / f"{job.job_id}.pdf"
            with open(result_path, "wb") as f:
                f.write(pdf_bytes)
            job.progress = 95

            # Mark as complete
            job.state = JobState.COMPLETED
            job.result = {
                'pdf_path': str(result_path),
                'size_bytes': len(pdf_bytes),
            }
            job.progress = 100
            await self.queue.update_job(job)

            logger.info(f"Completed job {job.job_id} - PDF size: {len(pdf_bytes)} bytes")

        except Exception as e:
            await self._handle_job_error(job, e)

    async def _handle_job_error(self, job: Job, error: Exception) -> None:
        """Handle job error with retry logic."""
        job.error = str(error)
        job.retry_count += 1

        logger.error(
            f"Job {job.job_id} error: {error} (retry {job.retry_count}/{job.max_retries})"
        )

        # Check if should retry
        if job.should_retry():
            job.state = JobState.PENDING
            job.progress = 0
            await self.queue.update_job(job)
            logger.info(f"Job {job.job_id} requeued for retry")
        else:
            job.state = JobState.FAILED
            job.progress = 0
            await self.queue.update_job(job)
            logger.error(f"Job {job.job_id} permanently failed after {job.retry_count} retries")

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a job."""
        job = await self.queue.get_job(job_id)
        if not job:
            return None

        return {
            'job_id': job.job_id,
            'state': job.state.value,
            'progress': job.progress,
            'eta_seconds': job.eta_seconds,
            'error': job.error,
            'retry_count': job.retry_count,
            'created_at': job.created_at.isoformat(),
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
            'result': job.result,
        }

    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        stats = self.queue.get_stats() if hasattr(self.queue, 'get_stats') else {}
        return {
            **stats,
            'worker_active_jobs': len(self.active_jobs),
            'worker_running': self.running,
        }


class PDFWorkerPool:
    """Manage a pool of PDF workers."""

    def __init__(
        self,
        queue: JobQueue,
        num_workers: int = 1,
        result_dir: Optional[str] = None,
        timeout: int = 60,
    ):
        """
        Initialize worker pool.

        Args:
            queue: Shared JobQueue instance
            num_workers: Number of workers to spawn
            result_dir: Directory to store PDFs
            timeout: Timeout per job in seconds
        """
        self.queue = queue
        self.num_workers = num_workers
        self.result_dir = result_dir
        self.timeout = timeout
        self.workers: list[PDFWorker] = []
        self.tasks: list[asyncio.Task] = []
        self.render_handler: Optional[Callable] = None

    def set_render_handler(self, handler: Callable) -> None:
        """Set the PDF rendering handler for all workers."""
        self.render_handler = handler
        for worker in self.workers:
            worker.set_render_handler(handler)

    async def start(self) -> None:
        """Start all workers."""
        logger.info(f"Starting PDFWorkerPool with {self.num_workers} workers")

        for i in range(self.num_workers):
            worker = PDFWorker(
                queue=self.queue,
                result_dir=self.result_dir,
                timeout=self.timeout,
                max_concurrent_jobs=1,
            )
            if self.render_handler:
                worker.set_render_handler(self.render_handler)

            self.workers.append(worker)
            task = asyncio.create_task(worker.start())
            self.tasks.append(task)

        logger.info(f"Started {len(self.workers)} workers")

    async def stop(self) -> None:
        """Stop all workers gracefully."""
        logger.info("Stopping PDFWorkerPool")

        for worker in self.workers:
            await worker.stop()

        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

        logger.info("PDFWorkerPool stopped")

    async def get_worker_stats(self) -> Dict[str, Any]:
        """Get stats from all workers."""
        return {
            'total_workers': len(self.workers),
            'workers': [
                {
                    'index': i,
                    **await worker.get_queue_stats()
                }
                for i, worker in enumerate(self.workers)
            ]
        }
