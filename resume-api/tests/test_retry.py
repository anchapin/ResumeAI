"""
Tests for retry logic with exponential backoff (Python backend)
"""

import pytest
from unittest.mock import Mock, AsyncMock
from lib.utils.retry import (
    RetryConfig,
    RetryError,
    calculate_backoff_delay,
    is_retryable_status,
    is_retryable_exception,
    retry_with_backoff,
    retry_async_call,
    retry_sync_call,
)


class TestCalculateBackoffDelay:
    """Tests for exponential backoff calculation"""

    def test_exponential_backoff_calculation(self):
        """Test that exponential backoff is calculated correctly"""
        config = RetryConfig(
            initial_delay=0.1,
            backoff_multiplier=2.0,
            max_delay=10.0,
            jitter_fraction=0.0,  # No jitter for predictable tests
        )

        # Attempt 0: 0.1 * 2^0 = 0.1
        assert calculate_backoff_delay(0, config) == 0.1

        # Attempt 1: 0.1 * 2^1 = 0.2
        assert calculate_backoff_delay(1, config) == 0.2

        # Attempt 2: 0.1 * 2^2 = 0.4
        assert calculate_backoff_delay(2, config) == 0.4

    def test_max_delay_cap(self):
        """Test that max delay is respected"""
        config = RetryConfig(
            initial_delay=1.0,
            backoff_multiplier=2.0,
            max_delay=5.0,
            jitter_fraction=0.0,
        )

        # Very high attempt should be capped
        delay = calculate_backoff_delay(10, config)
        assert delay == 5.0

    def test_jitter_application(self):
        """Test that jitter is applied"""
        config = RetryConfig(
            initial_delay=0.1,
            backoff_multiplier=2.0,
            max_delay=10.0,
            jitter_fraction=0.1,
        )

        # Run multiple times to verify jitter varies
        delays = [calculate_backoff_delay(0, config) for _ in range(5)]
        unique_delays = set(delays)

        # Should have variation due to jitter
        assert len(unique_delays) > 1

        # All should be within expected range (0.1 to 0.1 + 0.1*0.1)
        for delay in delays:
            assert 0.1 <= delay <= 0.11

    def test_no_jitter_when_fraction_zero(self):
        """Test that no jitter is applied when jitterFraction is 0"""
        config = RetryConfig(
            initial_delay=0.1,
            backoff_multiplier=2.0,
            max_delay=10.0,
            jitter_fraction=0.0,
        )

        delay1 = calculate_backoff_delay(0, config)
        delay2 = calculate_backoff_delay(0, config)

        assert delay1 == delay2 == 0.1


class TestIsRetryableStatus:
    """Tests for status code retryability check"""

    def test_5xx_status_codes_are_retryable(self):
        """Test that 5xx errors are retryable"""
        assert is_retryable_status(500)
        assert is_retryable_status(502)
        assert is_retryable_status(503)
        assert is_retryable_status(504)

    def test_408_timeout_is_retryable(self):
        """Test that 408 Request Timeout is retryable"""
        assert is_retryable_status(408)

    def test_429_rate_limit_is_retryable(self):
        """Test that 429 Too Many Requests is retryable"""
        assert is_retryable_status(429)

    def test_4xx_errors_not_retryable(self):
        """Test that other 4xx errors are not retryable"""
        assert not is_retryable_status(400)
        assert not is_retryable_status(401)
        assert not is_retryable_status(403)
        assert not is_retryable_status(404)

    def test_2xx_status_codes_not_retryable(self):
        """Test that 2xx success is not retryable"""
        assert not is_retryable_status(200)
        assert not is_retryable_status(201)
        assert not is_retryable_status(204)


class TestIsRetryableException:
    """Tests for exception retryability check"""

    def test_connection_error_is_retryable(self):
        """Test that ConnectionError is retryable"""
        assert is_retryable_exception(ConnectionError("Connection failed"))

    def test_timeout_error_is_retryable(self):
        """Test that TimeoutError is retryable"""
        assert is_retryable_exception(TimeoutError("Request timed out"))

    def test_connection_reset_is_retryable(self):
        """Test that ConnectionResetError is retryable"""
        assert is_retryable_exception(ConnectionResetError("Connection reset"))

    def test_regular_exception_not_retryable(self):
        """Test that regular exceptions are not retryable"""
        assert not is_retryable_exception(ValueError("Invalid value"))
        assert not is_retryable_exception(KeyError("Missing key"))


class TestRetryWithBackoffDecorator:
    """Tests for retry decorator"""

    @pytest.mark.asyncio
    async def test_async_function_success_on_first_attempt(self):
        """Test that async function succeeds on first attempt"""
        call_count = 0

        @retry_with_backoff()
        async def async_func():
            nonlocal call_count
            call_count += 1
            return "success"

        result = await async_func()
        assert result == "success"
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_async_function_retries_on_network_error(self):
        """Test that async function retries on network error"""
        call_count = 0

        @retry_with_backoff(RetryConfig(max_retries=2, initial_delay=0.01))
        async def async_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Network error")
            return "success"

        result = await async_func()
        assert result == "success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_async_function_fails_after_max_retries(self):
        """Test that async function fails after max retries"""
        call_count = 0

        @retry_with_backoff(RetryConfig(max_retries=2, initial_delay=0.01))
        async def async_func():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Network error")

        with pytest.raises(RetryError) as exc_info:
            await async_func()

        assert exc_info.value.attempt_count == 3
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_async_function_no_retry_on_non_retryable_error(self):
        """Test that async function doesn't retry on non-retryable errors"""
        call_count = 0

        @retry_with_backoff(RetryConfig(max_retries=2))
        async def async_func():
            nonlocal call_count
            call_count += 1
            raise ValueError("Invalid value")

        with pytest.raises(ValueError):
            await async_func()

        assert call_count == 1

    def test_sync_function_success_on_first_attempt(self):
        """Test that sync function succeeds on first attempt"""
        call_count = 0

        @retry_with_backoff()
        def sync_func():
            nonlocal call_count
            call_count += 1
            return "success"

        result = sync_func()
        assert result == "success"
        assert call_count == 1

    def test_sync_function_retries_on_network_error(self):
        """Test that sync function retries on network error"""
        call_count = 0

        @retry_with_backoff(RetryConfig(max_retries=2, initial_delay=0.01))
        def sync_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Network error")
            return "success"

        result = sync_func()
        assert result == "success"
        assert call_count == 3

    def test_sync_function_fails_after_max_retries(self):
        """Test that sync function fails after max retries"""
        call_count = 0

        @retry_with_backoff(RetryConfig(max_retries=2, initial_delay=0.01))
        def sync_func():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Network error")

        with pytest.raises(RetryError) as exc_info:
            sync_func()

        assert exc_info.value.attempt_count == 3
        assert call_count == 3


class TestRetryAsyncCall:
    """Tests for retry_async_call function"""

    @pytest.mark.asyncio
    async def test_async_call_success(self):
        """Test successful async call"""
        async_func = AsyncMock(return_value="success")

        result = await retry_async_call(async_func)

        assert result == "success"
        assert async_func.call_count == 1

    @pytest.mark.asyncio
    async def test_async_call_retries_on_error(self):
        """Test that async call retries on retryable error"""
        async_func = AsyncMock(side_effect=[ConnectionError("Network error"), "success"])

        result = await retry_async_call(
            async_func, config=RetryConfig(max_retries=2, initial_delay=0.01)
        )

        assert result == "success"
        assert async_func.call_count == 2

    @pytest.mark.asyncio
    async def test_async_call_fails_after_max_retries(self):
        """Test that async call fails after max retries"""
        async_func = AsyncMock(side_effect=ConnectionError("Network error"))

        with pytest.raises(RetryError) as exc_info:
            await retry_async_call(
                async_func, config=RetryConfig(max_retries=1, initial_delay=0.01)
            )

        assert exc_info.value.attempt_count == 2


class TestRetrySyncCall:
    """Tests for retry_sync_call function"""

    def test_sync_call_success(self):
        """Test successful sync call"""
        func = Mock(return_value="success")

        result = retry_sync_call(func)

        assert result == "success"
        assert func.call_count == 1

    def test_sync_call_retries_on_error(self):
        """Test that sync call retries on retryable error"""
        func = Mock(side_effect=[ConnectionError("Network error"), "success"])

        result = retry_sync_call(func, config=RetryConfig(max_retries=2, initial_delay=0.01))

        assert result == "success"
        assert func.call_count == 2

    def test_sync_call_fails_after_max_retries(self):
        """Test that sync call fails after max retries"""
        func = Mock(side_effect=ConnectionError("Network error"))

        with pytest.raises(RetryError) as exc_info:
            retry_sync_call(func, config=RetryConfig(max_retries=1, initial_delay=0.01))

        assert exc_info.value.attempt_count == 2
