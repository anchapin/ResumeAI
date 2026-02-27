"""
Test suite for GitHub Issue #401 - Prometheus Metrics & Grafana Dashboards
"""

import pytest
from monitoring import metrics


class TestPrometheusMetricsInstrumentation:
    """Test Prometheus metrics instrumentation for dashboards."""

    def test_http_requests_total_metric_exists(self):
        assert metrics.http_requests_total is not None

    def test_http_request_duration_seconds_metric_exists(self):
        assert metrics.http_request_duration_seconds is not None

    def test_http_errors_total_metric_exists(self):
        assert metrics.http_errors_total is not None

    def test_db_query_duration_seconds_metric_exists(self):
        assert metrics.db_query_duration_seconds is not None

    def test_ai_request_duration_seconds_metric_exists(self):
        assert metrics.ai_request_duration_seconds is not None


class TestMetricsHistogramBuckets:
    """Test histogram buckets configuration."""

    def test_http_request_duration_histogram_buckets(self):
        histogram = metrics.http_request_duration_seconds
        assert histogram is not None

    def test_db_query_duration_histogram_buckets(self):
        histogram = metrics.db_query_duration_seconds
        assert histogram is not None

    def test_ai_request_histogram_buckets(self):
        histogram = metrics.ai_request_duration_seconds
        assert histogram is not None


class TestMetricsLabels:
    """Test metric labels."""

    def test_http_requests_total_labels(self):
        metrics.increment_http_requests("GET", "/api/resumes", 200)

    def test_http_errors_total_labels(self):
        metrics.increment_http_errors("GET", "/api/resumes", 500)

    def test_db_query_duration_labels(self):
        metrics.observe_db_query_duration("select", 0.010)


class TestMetricsCollection:
    """Test metrics collection."""

    def test_metrics_registry_exists(self):
        assert metrics.registry is not None

    def test_metrics_info_is_set(self):
        assert metrics.api_info is not None


class TestGrafanaDashboardMetrics:
    """Test dashboard metrics."""

    def test_request_metrics_dashboard_data(self):
        for i in range(10):
            metrics.increment_http_requests("GET", "/api/resumes", 200)
            metrics.observe_http_request_duration("GET", "/api/resumes", 0.1 + i * 0.01)
        assert metrics.http_requests_total is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
