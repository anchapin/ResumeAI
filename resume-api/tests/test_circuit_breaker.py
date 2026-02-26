"""
Unit tests for circuit breaker pattern implementation.

Tests:
- State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
- Failure threshold triggering
- Success threshold in HALF_OPEN state
- Timeout between states
- Exception handling and propagation
- Manual reset
"""

import sys
import pytest
import time
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add resume-api to python path
sys.path.insert(0, str(Path("resume-api").absolute()))

from lib.utils.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpen,
    CircuitState,
    openai_breaker,
    claude_breaker,
    gemini_breaker,
)


class TestCircuitBreakerBasics:
    """Test basic circuit breaker functionality."""

    def test_circuit_breaker_initialization(self):
        """Test circuit breaker initializes in CLOSED state."""
        breaker = CircuitBreaker(name="test_breaker")
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0
        assert breaker.success_count == 0
        assert breaker.name == "test_breaker"

    def test_circuit_breaker_custom_thresholds(self):
        """Test circuit breaker accepts custom thresholds."""
        breaker = CircuitBreaker(
            name="custom",
            failure_threshold=3,
            success_threshold=1,
            timeout=30,
        )
        assert breaker.failure_threshold == 3
        assert breaker.success_threshold == 1
        assert breaker.timeout == 30

    def test_successful_call_in_closed_state(self):
        """Test successful call passes through in CLOSED state."""
        breaker = CircuitBreaker(name="test")
        func = Mock(return_value="success")

        result = breaker.call(func, "arg1", kwarg1="value1")

        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0
        func.assert_called_once_with("arg1", kwarg1="value1")


class TestCircuitBreakerFailures:
    """Test circuit breaker failure handling."""

    def test_single_failure_keeps_closed(self):
        """Test single failure doesn't open circuit."""
        breaker = CircuitBreaker(name="test", failure_threshold=3)
        func = Mock(side_effect=Exception("error"))

        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 1

    def test_failure_threshold_opens_circuit(self):
        """Test reaching failure threshold opens circuit."""
        breaker = CircuitBreaker(name="test", failure_threshold=3)
        func = Mock(side_effect=Exception("error"))

        # First two failures
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(func)

        assert breaker.state == CircuitState.CLOSED

        # Third failure triggers OPEN
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.OPEN
        assert breaker.failure_count == 3

    def test_open_circuit_rejects_calls(self):
        """Test OPEN circuit rejects calls immediately."""
        breaker = CircuitBreaker(name="test", failure_threshold=1)
        func = Mock(side_effect=Exception("error"))

        # Open the circuit
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.OPEN

        # Reset mock to verify it's not called again
        func.reset_mock()

        # Next call should be rejected by circuit breaker
        with pytest.raises(CircuitBreakerOpen):
            breaker.call(func)

        func.assert_not_called()

    def test_failure_resets_counter_on_success(self):
        """Test successful call resets failure counter."""
        breaker = CircuitBreaker(name="test", failure_threshold=3)
        func = Mock(side_effect=[Exception("error"), "success"])

        # Failure
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.failure_count == 1

        # Success
        result = breaker.call(func)
        assert result == "success"
        assert breaker.failure_count == 0


class TestCircuitBreakerHalfOpen:
    """Test HALF_OPEN state functionality."""

    def test_transition_to_half_open_after_timeout(self):
        """Test OPEN -> HALF_OPEN transition after timeout."""
        breaker = CircuitBreaker(name="test", failure_threshold=1, timeout=1)
        func = Mock(side_effect=Exception("error"))

        # Open circuit
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.OPEN

        # Wait for timeout
        time.sleep(1.1)

        # Next call attempt should transition to HALF_OPEN
        func = Mock(return_value="recovered")
        result = breaker.call(func)

        assert result == "recovered"
        assert breaker.state == CircuitState.HALF_OPEN

    def test_success_threshold_in_half_open(self):
        """Test HALF_OPEN -> CLOSED transition after successes."""
        breaker = CircuitBreaker(
            name="test",
            failure_threshold=1,
            success_threshold=2,
            timeout=1,
        )
        func = Mock(side_effect=Exception("error"))

        # Open circuit
        with pytest.raises(Exception):
            breaker.call(func)

        # Wait and transition to HALF_OPEN
        time.sleep(1.1)
        func = Mock(return_value="success")

        # First success
        breaker.call(func)
        assert breaker.state == CircuitState.HALF_OPEN
        assert breaker.success_count == 1

        # Second success
        breaker.call(func)
        assert breaker.state == CircuitState.CLOSED
        assert breaker.success_count == 0

    def test_failure_in_half_open_reopens_circuit(self):
        """Test failure in HALF_OPEN reopens circuit."""
        breaker = CircuitBreaker(name="test", failure_threshold=1, timeout=1)
        func = Mock(side_effect=Exception("error"))

        # Open circuit
        with pytest.raises(Exception):
            breaker.call(func)

        # Transition to HALF_OPEN
        time.sleep(1.1)
        func = Mock(return_value="success")
        breaker.call(func)

        assert breaker.state == CircuitState.HALF_OPEN

        # Failure in HALF_OPEN
        func = Mock(side_effect=Exception("error"))
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.OPEN


class TestCircuitBreakerReset:
    """Test circuit breaker reset functionality."""

    def test_manual_reset_closes_circuit(self):
        """Test manual reset returns circuit to CLOSED."""
        breaker = CircuitBreaker(name="test", failure_threshold=1)
        func = Mock(side_effect=Exception("error"))

        # Open circuit
        with pytest.raises(Exception):
            breaker.call(func)

        assert breaker.state == CircuitState.OPEN

        # Reset
        breaker.reset()

        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0
        assert breaker.success_count == 0

    def test_reset_clears_all_counters(self):
        """Test reset clears failure and success counters."""
        breaker = CircuitBreaker(
            name="test",
            failure_threshold=3,
            success_threshold=2,
        )

        # Simulate some failures
        for _ in range(2):
            func = Mock(side_effect=Exception("error"))
            with pytest.raises(Exception):
                breaker.call(func)

        assert breaker.failure_count == 2

        # Reset
        breaker.reset()

        assert breaker.failure_count == 0
        assert breaker.success_count == 0
        assert breaker.last_failure_time is None
        assert breaker.open_time is None


class TestCircuitBreakerExceptions:
    """Test exception handling in circuit breaker."""

    def test_original_exception_propagated(self):
        """Test original exceptions are propagated."""
        breaker = CircuitBreaker(name="test")
        func = Mock(side_effect=ValueError("test error"))

        with pytest.raises(ValueError, match="test error"):
            breaker.call(func)

    def test_circuit_breaker_open_exception(self):
        """Test CircuitBreakerOpen exception has useful message."""
        breaker = CircuitBreaker(name="test_service", failure_threshold=1)
        func = Mock(side_effect=Exception("error"))

        # Open the circuit
        with pytest.raises(Exception):
            breaker.call(func)

        # Verify exception message
        with pytest.raises(CircuitBreakerOpen) as exc_info:
            breaker.call(Mock())

        assert "test_service" in str(exc_info.value)
        assert "OPEN" in str(exc_info.value)


class TestCircuitBreakerGetState:
    """Test get_state method."""

    def test_get_state_returns_string(self):
        """Test get_state returns current state as string."""
        breaker = CircuitBreaker(name="test")
        assert breaker.get_state() == "CLOSED"

        breaker.state = CircuitState.OPEN
        assert breaker.get_state() == "OPEN"

        breaker.state = CircuitState.HALF_OPEN
        assert breaker.get_state() == "HALF_OPEN"


class TestGlobalBreakers:
    """Test global circuit breaker instances."""

    def test_openai_breaker_exists(self):
        """Test OpenAI breaker is initialized."""
        assert openai_breaker is not None
        assert openai_breaker.name == "openai"
        assert openai_breaker.state == CircuitState.CLOSED

    def test_claude_breaker_exists(self):
        """Test Claude breaker is initialized."""
        assert claude_breaker is not None
        assert claude_breaker.name == "claude"
        assert claude_breaker.state == CircuitState.CLOSED

    def test_gemini_breaker_exists(self):
        """Test Gemini breaker is initialized."""
        assert gemini_breaker is not None
        assert gemini_breaker.name == "gemini"
        assert gemini_breaker.state == CircuitState.CLOSED

    def test_global_breakers_independent(self):
        """Test global breakers are independent."""
        func = Mock(side_effect=Exception("error"))

        # Open OpenAI breaker
        for _ in range(5):
            with pytest.raises(Exception):
                openai_breaker.call(func)

        assert openai_breaker.state == CircuitState.OPEN

        # Claude and Gemini should still be CLOSED
        assert claude_breaker.state == CircuitState.CLOSED
        assert gemini_breaker.state == CircuitState.CLOSED

        # Reset for other tests
        openai_breaker.reset()


class TestCircuitBreakerIntegration:
    """Integration tests with AI providers."""

    def test_time_until_retry_calculation(self):
        """Test _time_until_retry calculates correctly."""
        breaker = CircuitBreaker(name="test", timeout=60)
        func = Mock(side_effect=Exception("error"))

        with pytest.raises(Exception):
            breaker.call(func)

        # Open the circuit
        assert breaker.state == CircuitState.OPEN

        # Mock the open_time to test calculation
        import datetime

        breaker.open_time = datetime.datetime.utcnow() - datetime.timedelta(
            seconds=30
        )

        remaining = breaker._time_until_retry()
        assert 25 <= remaining <= 35  # Allow some tolerance for execution time

    def test_full_state_cycle(self):
        """Test complete state cycle: CLOSED -> OPEN -> HALF_OPEN -> CLOSED."""
        breaker = CircuitBreaker(
            name="test",
            failure_threshold=2,
            success_threshold=2,
            timeout=1,
        )

        # CLOSED state: accumulate failures
        func = Mock(side_effect=Exception("error"))
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(func)

        assert breaker.state == CircuitState.OPEN

        # OPEN state: reject calls immediately
        with pytest.raises(CircuitBreakerOpen):
            breaker.call(Mock())

        # Wait for timeout
        time.sleep(1.1)

        # HALF_OPEN state: allow test calls
        func = Mock(return_value="recovered")
        breaker.call(func)
        assert breaker.state == CircuitState.HALF_OPEN

        # Success in HALF_OPEN
        breaker.call(func)
        assert breaker.state == CircuitState.CLOSED

        assert breaker.failure_count == 0
        assert breaker.success_count == 0
