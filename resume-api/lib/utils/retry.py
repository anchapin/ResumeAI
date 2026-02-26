"""
Retry logic with exponential backoff for API calls (backend)
Handles transient failures with exponential backoff and jitter
"""

import asyncio
import logging
import random
from typing import Any, Callable, Optional, Set, TypeVar, Union
from functools import wraps
from dataclasses import dataclass

logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable[..., Any])

# Status codes that should trigger retry
RETRYABLE_STATUS_CODES: Set[int] = {
    408,  # Request Timeout
    429,  # Too Many Requests
    500,  # Internal Server Error
    502,  # Bad Gateway
    503,  # Service Unavailable
    504,  # Gateway Timeout
}


@dataclass
class RetryConfig:
    """Configuration for retry logic"""
    max_retries: int = 3
    initial_delay: float = 0.1  # seconds
    max_delay: float = 10.0  # seconds
    backoff_multiplier: float = 2.0
    jitter_fraction: float = 0.1  # 0-1, percentage of delay to add as jitter


class RetryError(Exception):
    """Error raised when retries are exhausted"""
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        attempt_count: int = 0,
        last_error: Optional[Exception] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.attempt_count = attempt_count
        self.last_error = last_error


def calculate_backoff_delay(
    attempt_number: int,
    config: RetryConfig,
) -> float:
    """
    Calculate exponential backoff delay with jitter
    
    Args:
        attempt_number: 0-indexed attempt number
        config: retry configuration
        
    Returns:
        delay in seconds
    """
    # exponential: initial_delay * (backoff_multiplier ^ attempt_number)
    exponential_delay = config.initial_delay * (config.backoff_multiplier ** attempt_number)
    capped_delay = min(exponential_delay, config.max_delay)

    # add jitter: random variance of 0 to jitter_fraction * delay
    jitter = random.random() * (capped_delay * config.jitter_fraction)
    return capped_delay + jitter


def is_retryable_status(status_code: int) -> bool:
    """Check if a status code should trigger a retry"""
    return status_code in RETRYABLE_STATUS_CODES


def is_retryable_exception(exception: Exception) -> bool:
    """Check if an exception is retryable (network error, timeout, etc.)"""
    # Network-related exceptions are generally retryable
    exception_type = type(exception).__name__
    retryable_exceptions = {
        'ConnectionError',
        'TimeoutError',
        'ConnectionResetError',
        'ConnectionRefusedError',
        'BrokenPipeError',
        'ConnectError',  # aiohttp
        'ClientConnectorError',  # aiohttp
        'ClientOSError',  # aiohttp
        'ClientSSLError',  # aiohttp (SSL errors are retryable)
    }
    return exception_type in retryable_exceptions


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
) -> Callable[[F], F]:
    """
    Decorator for retrying async functions with exponential backoff
    
    Args:
        config: retry configuration
        
    Returns:
        Decorated function
    """
    if config is None:
        config = RetryConfig()

    def decorator(func: F) -> F:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_error: Optional[Exception] = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    
                    # Check if error is retryable
                    if not is_retryable_exception(e):
                        # Non-retryable error, raise immediately
                        raise
                    
                    # If this was the last attempt, raise
                    if attempt >= config.max_retries:
                        error_msg = f"Failed after {attempt + 1} attempts: {str(e)}"
                        raise RetryError(
                            error_msg,
                            attempt_count=attempt + 1,
                            last_error=e,
                        ) from e
                    
                    # Calculate backoff and retry
                    delay = calculate_backoff_delay(attempt, config)
                    logger.warning(
                        f"Retryable error in {func.__name__}: {str(e)}. "
                        f"Attempt {attempt + 1}/{config.max_retries + 1}, "
                        f"retrying in {delay:.2f}s"
                    )
                    await asyncio.sleep(delay)
            
            # Should not reach here
            raise RetryError(
                f"Failed after {config.max_retries + 1} attempts",
                attempt_count=config.max_retries + 1,
                last_error=last_error,
            )
        
        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            last_error: Optional[Exception] = None
            
            for attempt in range(config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    
                    # Check if error is retryable
                    if not is_retryable_exception(e):
                        # Non-retryable error, raise immediately
                        raise
                    
                    # If this was the last attempt, raise
                    if attempt >= config.max_retries:
                        error_msg = f"Failed after {attempt + 1} attempts: {str(e)}"
                        raise RetryError(
                            error_msg,
                            attempt_count=attempt + 1,
                            last_error=e,
                        ) from e
                    
                    # Calculate backoff and retry
                    delay = calculate_backoff_delay(attempt, config)
                    logger.warning(
                        f"Retryable error in {func.__name__}: {str(e)}. "
                        f"Attempt {attempt + 1}/{config.max_retries + 1}, "
                        f"retrying in {delay:.2f}s"
                    )
                    asyncio.run(asyncio.sleep(delay))
            
            # Should not reach here
            raise RetryError(
                f"Failed after {config.max_retries + 1} attempts",
                attempt_count=config.max_retries + 1,
                last_error=last_error,
            )
        
        # Determine if function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        else:
            return sync_wrapper  # type: ignore

    return decorator


async def retry_async_call(
    func: Callable[..., Any],
    *args: Any,
    config: Optional[RetryConfig] = None,
    **kwargs: Any,
) -> Any:
    """
    Execute an async function with retry logic
    
    Args:
        func: async function to call
        *args: positional arguments
        config: retry configuration
        **kwargs: keyword arguments
        
    Returns:
        Function result
        
    Raises:
        RetryError: if all retries exhausted
    """
    if config is None:
        config = RetryConfig()
    
    last_error: Optional[Exception] = None
    
    for attempt in range(config.max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_error = e
            
            # Check if error is retryable
            if not is_retryable_exception(e):
                # Non-retryable error, raise immediately
                raise
            
            # If this was the last attempt, raise
            if attempt >= config.max_retries:
                error_msg = f"Failed after {attempt + 1} attempts: {str(e)}"
                raise RetryError(
                    error_msg,
                    attempt_count=attempt + 1,
                    last_error=e,
                ) from e
            
            # Calculate backoff and retry
            delay = calculate_backoff_delay(attempt, config)
            logger.warning(
                f"Retryable error in {func.__name__}: {str(e)}. "
                f"Attempt {attempt + 1}/{config.max_retries + 1}, "
                f"retrying in {delay:.2f}s"
            )
            await asyncio.sleep(delay)
    
    # Should not reach here
    raise RetryError(
        f"Failed after {config.max_retries + 1} attempts",
        attempt_count=config.max_retries + 1,
        last_error=last_error,
    )


def retry_sync_call(
    func: Callable[..., Any],
    *args: Any,
    config: Optional[RetryConfig] = None,
    **kwargs: Any,
) -> Any:
    """
    Execute a sync function with retry logic
    
    Args:
        func: function to call
        *args: positional arguments
        config: retry configuration
        **kwargs: keyword arguments
        
    Returns:
        Function result
        
    Raises:
        RetryError: if all retries exhausted
    """
    if config is None:
        config = RetryConfig()
    
    last_error: Optional[Exception] = None
    
    for attempt in range(config.max_retries + 1):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_error = e
            
            # Check if error is retryable
            if not is_retryable_exception(e):
                # Non-retryable error, raise immediately
                raise
            
            # If this was the last attempt, raise
            if attempt >= config.max_retries:
                error_msg = f"Failed after {attempt + 1} attempts: {str(e)}"
                raise RetryError(
                    error_msg,
                    attempt_count=attempt + 1,
                    last_error=e,
                ) from e
            
            # Calculate backoff and retry
            delay = calculate_backoff_delay(attempt, config)
            logger.warning(
                f"Retryable error in {func.__name__}: {str(e)}. "
                f"Attempt {attempt + 1}/{config.max_retries + 1}, "
                f"retrying in {delay:.2f}s"
            )
            import time
            time.sleep(delay)
    
    # Should not reach here
    raise RetryError(
        f"Failed after {config.max_retries + 1} attempts",
        attempt_count=config.max_retries + 1,
        last_error=last_error,
    )
