"""
Async PDF rendering routes using job queue.

Endpoints:
- POST /v1/render/pdf-async - Submit async PDF render job
- GET /v1/jobs/{job_id} - Get job status
- GET /v1/jobs/{job_id}/download - Download completed PDF
- GET /v1/queue/stats - Get queue statistics
- DELETE /v1/jobs/{job_id} - Cancel job
"""

import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import FileResponse

# Setup library path
lib_path = Path(__file__).parent.parent
sys.path.insert(0, str(lib_path))

from lib.cli import ResumeGenerator
from lib.queue import Job, JobState, JobPriority
from config.dependencies import AuthorizedAPIKey, rate_limit
from config import settings
from monitoring import logging_config

from .models import (
    SubmitPDFRenderJobRequest,
    SubmitPDFRenderJobResponse,
    JobStatusResponse,
    JobStatus,
    QueueStatsResponse,
    ErrorResponse,
    JobPriorityLevel,
)

logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="", tags=["PDF"])

# Global queue and worker - will be set by app startup
_job_queue = None
_pdf_worker = None


def set_queue_and_worker(queue, worker):
    """Set the global queue and worker instances."""
    global _job_queue, _pdf_worker
    _job_queue = queue
    _pdf_worker = worker


def _get_queue():
    """Get the job queue."""
    if _job_queue is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Job queue is not initialized",
        )
    return _job_queue


def _get_worker():
    """Get the PDF worker."""
    if _pdf_worker is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF worker is not initialized",
        )
    return _pdf_worker


async def _render_pdf_handler(job: Job) -> bytes:
    """Handler function for rendering PDF from job."""
    try:
        # Initialize resume generator
        generator = ResumeGenerator(template_dir=str(Path(__file__).parent.parent / "templates"))

        # Render PDF
        pdf_bytes = generator.render_pdf(
            resume_data=job.payload.get("resume_data", {}),
            variant=job.metadata.get("variant", "default"),
        )

        return pdf_bytes

    except Exception as e:
        logger.error(f"PDF rendering failed: {e}", exc_info=True)
        raise


@router.post(
    "/v1/render/pdf-async",
    response_model=SubmitPDFRenderJobResponse,
    responses={
        202: {"model": SubmitPDFRenderJobResponse},
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    tags=["Rendering"],
    status_code=status.HTTP_202_ACCEPTED,
)
@rate_limit(settings.rate_limit_pdf)
async def submit_pdf_render_job(
    request: Request,
    body: SubmitPDFRenderJobRequest,
    auth: AuthorizedAPIKey,
):
    """
    Submit an asynchronous PDF rendering job.

    This endpoint accepts a resume and returns a job ID immediately.
    Use the job ID to check status and download the PDF when ready.

    Requires API key authentication via X-API-KEY header.
    Rate limit: 10 requests per minute per API key.

    Args:
        request: FastAPI Request object
        body: SubmitPDFRenderJobRequest with resume_data and options
        auth: API key authentication

    Returns:
        SubmitPDFRenderJobResponse with job_id and status (HTTP 202)

    Example:
        ```
        POST /v1/render/pdf-async
        X-API-KEY: rai_xxx...
        Content-Type: application/json

        {
            "resume_data": {...},
            "variant": "default",
            "priority": "normal"
        }

        Response (202):
        {
            "job_id": "550e8400-e29b-41d4-a716-446655440000",
            "status": "pending",
            "message": "PDF render job submitted successfully"
        }
        ```
    """
    try:
        queue = _get_queue()

        # Map priority strings to internal enum
        priority_map = {
            JobPriorityLevel.LOW: JobPriority.LOW,
            JobPriorityLevel.NORMAL: JobPriority.NORMAL,
            JobPriorityLevel.HIGH: JobPriority.HIGH,
            JobPriorityLevel.CRITICAL: JobPriority.CRITICAL,
        }

        # Create job
        job = Job(
            state=JobState.PENDING,
            priority=priority_map.get(body.priority, JobPriority.NORMAL),
            payload={"resume_data": body.resume_data},
            metadata={
                "variant": body.variant,
                "api_key": auth.api_key_id,
                "user_id": auth.user_id,
            },
            max_retries=3,
        )

        # Enqueue job
        job_id = await queue.enqueue(job)

        logger.info(
            f"PDF render job {job_id} submitted by {auth.api_key_id}",
            extra={
                "job_id": job_id,
                "api_key": auth.api_key_id,
                "priority": body.priority.value,
            },
        )

        return SubmitPDFRenderJobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            message="PDF render job submitted successfully",
        )

    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to submit PDF render job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit PDF render job",
        )


@router.get(
    "/v1/jobs/{job_id}",
    response_model=JobStatusResponse,
    responses={
        200: {"model": JobStatusResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    tags=["Jobs"],
)
async def get_job_status(
    request: Request,
    job_id: str,
    auth: AuthorizedAPIKey,
):
    """
    Get the current status of a PDF render job.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: FastAPI Request object
        job_id: The job ID to check status for
        auth: API key authentication

    Returns:
        JobStatusResponse with current job status and progress

    Example:
        ```
        GET /v1/jobs/550e8400-e29b-41d4-a716-446655440000
        X-API-KEY: rai_xxx...

        Response (200):
        {
            "job_id": "550e8400-e29b-41d4-a716-446655440000",
            "state": "processing",
            "progress": 45.5,
            "eta_seconds": 15,
            "error": null,
            "retry_count": 0,
            "created_at": "2024-02-26T10:30:00Z",
            "started_at": "2024-02-26T10:30:05Z",
            "completed_at": null,
            "result": null
        }
        ```
    """
    try:
        queue = _get_queue()
        job = await queue.get_job(job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found"
            )

        # Verify ownership (optional - comment out if not needed)
        # if job.metadata.get('api_key') != auth.api_key_id:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Not authorized to access this job"
        #     )

        # Map internal JobState to API JobStatus
        state_map = {
            JobState.PENDING: JobStatus.PENDING,
            JobState.PROCESSING: JobStatus.PROCESSING,
            JobState.COMPLETED: JobStatus.COMPLETED,
            JobState.FAILED: JobStatus.FAILED,
            JobState.CANCELLED: JobStatus.CANCELLED,
        }

        return JobStatusResponse(
            job_id=job.job_id,
            state=state_map.get(job.state, JobStatus.PENDING),
            progress=job.progress,
            eta_seconds=job.eta_seconds,
            error=job.error,
            retry_count=job.retry_count,
            created_at=job.created_at.isoformat(),
            started_at=job.started_at.isoformat() if job.started_at else None,
            completed_at=job.completed_at.isoformat() if job.completed_at else None,
            result=job.result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job status",
        )


@router.get(
    "/v1/jobs/{job_id}/download",
    response_class=FileResponse,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF resume file"},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    tags=["Jobs"],
)
def _validate_job_for_download(job, job_id: str) -> Path:
    """Validate job state and return PDF path."""
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")

    # Check job state
    state_messages = {
        JobState.PENDING: "Job is still pending. Check status and try again later.",
        JobState.PROCESSING: "Job is still processing. Check status and try again later.",
        JobState.FAILED: f"Job failed: {job.error}",
        JobState.CANCELLED: "Job was cancelled",
    }

    if job.state in state_messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=state_messages[job.state],
        )

    if not job.result or "pdf_path" not in job.result:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job completed but PDF path not found",
        )

    pdf_path = job.result["pdf_path"]
    path_obj = Path(pdf_path)

    if not path_obj.exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF file not found on disk",
        )

    return path_obj


async def download_pdf(
    request: Request,
    job_id: str,
    auth: AuthorizedAPIKey,
):
    """
    Download a completed PDF from a job.

    The job must be in COMPLETED state.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: FastAPI Request object
        job_id: The job ID to download PDF from
        auth: API key authentication

    Returns:
        PDF file (application/pdf)

    Raises:
        404: Job not found
        422: Job not completed yet or failed
    """
    try:
        queue = _get_queue()
        job = await queue.get_job(job_id)
        path_obj = _validate_job_for_download(job, job_id)

        return FileResponse(
            path=str(path_obj),
            filename=f"resume_{job_id[:8]}.pdf",
            media_type="application/pdf",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download PDF",
        )


@router.delete(
    "/v1/jobs/{job_id}",
    responses={
        204: {"description": "Job cancelled successfully"},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    tags=["Jobs"],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancel_job(
    request: Request,
    job_id: str,
    auth: AuthorizedAPIKey,
):
    """
    Cancel a pending or processing job.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: FastAPI Request object
        job_id: The job ID to cancel
        auth: API key authentication

    Returns:
        HTTP 204 No Content on success

    Raises:
        404: Job not found
        422: Job already completed or failed
    """
    try:
        queue = _get_queue()
        success = await queue.cancel_job(job_id)

        if not success:
            job = await queue.get_job(job_id)
            if not job:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job {job_id} not found",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cannot cancel job in state: {job.state.value}",
                )

        logger.info(f"Job {job_id} cancelled by {auth.api_key_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel job",
        )


@router.get(
    "/v1/queue/stats",
    response_model=QueueStatsResponse,
    responses={
        200: {"model": QueueStatsResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    tags=["Queue"],
)
async def get_queue_stats(
    request: Request,
    auth: AuthorizedAPIKey,
):
    """
    Get queue statistics.

    Returns information about pending, processing, completed jobs, etc.

    Requires API key authentication via X-API-KEY header.

    Args:
        request: FastAPI Request object
        auth: API key authentication

    Returns:
        QueueStatsResponse with queue statistics

    Example:
        ```
        GET /v1/queue/stats
        X-API-KEY: rai_xxx...

        Response (200):
        {
            "total_jobs": 42,
            "pending": 5,
            "processing": 2,
            "completed": 30,
            "failed": 3,
            "cancelled": 2,
            "worker_active_jobs": 2,
            "worker_running": true
        }
        ```
    """
    try:
        worker = _get_worker()
        stats = await worker.get_queue_stats()

        return QueueStatsResponse(**stats)

    except Exception as e:
        logger.error(f"Failed to get queue stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get queue stats",
        )
