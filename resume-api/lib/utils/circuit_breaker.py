"""
Circuit Breaker Pattern Implementation for AI Provider Calls.

This module implements the circuit breaker pattern to protect against cascading
failures when calling AI providers. It provides three states:
- CLOSED: Normal operation, calls pass through
- OPEN: Service is failing, calls are rejected immediately
- HALF_OPEN: Testing if service recovered, limited calls allowed

Configuration:
- failureThreshold: Number of failures before opening (default: 5)
- successThreshold: Number of successes in HALF_OPEN to close (default: 2)
- timeout: Seconds before transitioning from OPEN to HALF_OPEN (default: 60)
"""

import logging
from enum import Enum
from typing import Optional, Callable, Any, TypeVar
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open and preventing calls."""

    pass


class CircuitBreaker:
    """
    Circuit breaker for protecting against cascading failures.

    Implements state transitions:
    - CLOSED -> OPEN: After failureThreshold failures
    - OPEN -> HALF_OPEN: After timeout seconds
    - HALF_OPEN -> CLOSED: After successThreshold successes
    - HALF_OPEN -> OPEN: After first failure
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: int = 60,
    ):
        """
        Initialize circuit breaker.

        Args:
            name: Identifier for this circuit breaker
            failure_threshold: Failures before opening
            success_threshold: Successes in HALF_OPEN to close
            timeout: Seconds before OPEN -> HALF_OPEN transition
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.open_time: Optional[datetime] = None

    def call(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Execute function with circuit breaker protection.

        Args:
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            CircuitBreakerOpen: If circuit is open
        """
        self._check_state_transition()

        if self.state == CircuitState.OPEN:
            raise CircuitBreakerOpen(
                f"Circuit breaker '{self.name}' is OPEN. "
                f"Service unavailable. Retry in {self._time_until_retry()}s."
            )

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception:
            self._on_failure()
            raise

    def _check_state_transition(self) -> None:
        """Check and perform state transitions."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")

    def _should_attempt_reset(self) -> bool:
        """Check if timeout has elapsed for OPEN -> HALF_OPEN transition."""
        if self.open_time is None:
            return False

        elapsed = (datetime.now(timezone.utc) - self.open_time).total_seconds()
        return elapsed >= self.timeout

    def _on_success(self) -> None:
        """Handle successful call."""
        self.failure_count = 0

        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            logger.debug(
                f"Circuit breaker '{self.name}' HALF_OPEN success "
                f"({self.success_count}/{self.success_threshold})"
            )

            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                logger.info(
                    f"Circuit breaker '{self.name}' recovered. Transitioning to CLOSED"
                )

    def _on_failure(self) -> None:
        """Handle failed call."""
        self.last_failure_time = datetime.now(timezone.utc)

        if self.state == CircuitState.HALF_OPEN:
            # Any failure in HALF_OPEN reopens circuit
            self.state = CircuitState.OPEN
            self.open_time = datetime.now(timezone.utc)
            self.success_count = 0
            logger.warning(
                f"Circuit breaker '{self.name}' failure in HALF_OPEN. "
                f"Reopening circuit."
            )
        else:
            # CLOSED state: count failures
            self.failure_count += 1
            logger.debug(
                f"Circuit breaker '{self.name}' failure "
                f"({self.failure_count}/{self.failure_threshold})"
            )

            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.open_time = datetime.now(timezone.utc)
                logger.warning(
                    f"Circuit breaker '{self.name}' opened after "
                    f"{self.failure_count} failures"
                )

    def _time_until_retry(self) -> int:
        """Calculate seconds until OPEN -> HALF_OPEN transition."""
        if self.open_time is None:
            return self.timeout

        elapsed = (datetime.now(timezone.utc) - self.open_time).total_seconds()
        remaining = max(0, self.timeout - elapsed)
        return int(remaining)

    def get_state(self) -> str:
        """Get current circuit state."""
        return self.state.value

    def reset(self) -> None:
        """Manually reset circuit breaker to CLOSED state."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.open_time = None
        logger.info(f"Circuit breaker '{self.name}' manually reset")


# Global circuit breaker instances for each AI provider
openai_breaker = CircuitBreaker(
    name="openai",
    failure_threshold=5,
    success_threshold=2,
    timeout=60,
)

claude_breaker = CircuitBreaker(
    name="claude",
    failure_threshold=5,
    success_threshold=2,
    timeout=60,
)

gemini_breaker = CircuitBreaker(
    name="gemini",
    failure_threshold=5,
    success_threshold=2,
    timeout=60,
)
