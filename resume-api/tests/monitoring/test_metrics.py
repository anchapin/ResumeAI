"""
Tests for metrics collection.
"""

from monitoring.metrics import (
    increment_http_requests,
    observe_http_request_duration,
    increment_http_errors,
    increment_rate_limit_exceeded,
    increment_pdfs_generated,
    increment_resumes_tailored,
    increment_variants_listed,
    set_active_users,
    set_requests_per_user_avg,
    increment_ai_requests,
    observe_ai_request_duration,
    set_db_connections_active,
    observe_db_query_duration,
    increment_db_queries,
    http_requests_total,
    http_errors_total,
)


def test_increment_http_requests():
    """Test incrementing HTTP requests counter."""
    # Get initial count
    initial = http_requests_total.labels(
        method="GET", endpoint="/test", status_code=200
    )._value._value

    # Increment
    increment_http_requests("GET", "/test", 200)

    # Check it incremented
    new_value = http_requests_total.labels(
        method="GET", endpoint="/test", status_code=200
    )._value._value
    assert new_value == initial + 1


def test_observe_http_request_duration():
    """Test observing HTTP request duration."""
    # This should not raise an error
    observe_http_request_duration("GET", "/test", 0.5)


def test_increment_http_errors():
    """Test incrementing HTTP errors counter."""
    # Get initial count
    initial = http_errors_total.labels(
        method="POST", endpoint="/test", status_code=500
    )._value._value

    # Increment
    increment_http_errors("POST", "/test", 500)

    # Check it incremented
    new_value = http_errors_total.labels(
        method="POST", endpoint="/test", status_code=500
    )._value._value
    assert new_value == initial + 1


def test_increment_rate_limit_exceeded():
    """Test incrementing rate limit exceeded counter."""
    # This should not raise an error
    increment_rate_limit_exceeded("/api/v1/render/pdf")


def test_increment_pdfs_generated():
    """Test incrementing PDFs generated counter."""
    # This should not raise an error
    increment_pdfs_generated("modern")
    increment_pdfs_generated()  # Test default


def test_increment_resumes_tailored():
    """Test incrementing resumes tailored counter."""
    # This should not raise an error
    increment_resumes_tailored("openai")
    increment_resumes_tailored("claude")
    increment_resumes_tailored()  # Test default


def test_increment_variants_listed():
    """Test incrementing variants listed counter."""
    # This should not raise an error
    increment_variants_listed()


def test_set_active_users():
    """Test setting active users gauge."""
    # This should not raise an error
    set_active_users(100)


def test_set_requests_per_user_avg():
    """Test setting requests per user average gauge."""
    # This should not raise an error
    set_requests_per_user_avg(5.5)


def test_increment_ai_requests():
    """Test incrementing AI requests counter."""
    # This should not raise an error
    increment_ai_requests("openai", "gpt-4o", "success")
    increment_ai_requests("anthropic", "claude-3-5-sonnet", "error")
    increment_ai_requests("openai", "gpt-4o")  # Test default status


def test_observe_ai_request_duration():
    """Test observing AI request duration."""
    # This should not raise an error
    observe_ai_request_duration("openai", "gpt-4o", 2.5)


def test_set_db_connections_active():
    """Test setting DB connections active gauge."""
    # This should not raise an error
    set_db_connections_active(10)


def test_observe_db_query_duration():
    """Test observing DB query duration."""
    # This should not raise an error
    observe_db_query_duration("select", 0.05)


def test_increment_db_queries():
    """Test incrementing DB queries counter."""
    # This should not raise an error
    increment_db_queries("select")
    increment_db_queries("insert")
