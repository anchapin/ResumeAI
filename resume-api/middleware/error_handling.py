"""
Error Handling Middleware for ResumeAI API
Centralized error handling and request tracking
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from ..error_schemas import ErrorCode
from ..error_helpers import APIException, generate_request_id


logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for centralized error handling"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", generate_request_id())
        request.state.request_id = request_id
        request.state.start_time = time.time()
        
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
            
        except APIException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error_code": exc.error_code.value,
                    "error_message": exc.message,
                    "request_id": exc.request_id,
                    "timestamp": time.time(),
                    "status_code": exc.status_code,
                    "path": str(request.url.path),
                    "method": request.method
                },
                headers={"X-Request-ID": request_id}
            )
        
        except Exception as exc:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error_code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                    "error_message": "An internal server error occurred",
                    "request_id": request_id,
                    "timestamp": time.time(),
                    "status_code": 500
                },
                headers={"X-Request-ID": request_id}
            )
