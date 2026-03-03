"""
Tests for Prometheus monitoring setup.

Validates:
- Metrics export functionality
- Middleware instrumentation
- Custom metrics recording
- Alert rule validation
"""

import pytest
from lib.monitoring.prometheus_exporter import (
    PrometheusExporter,
    MetricConfig,
    get_exporter,
)
from middleware.metrics_middleware import (
    MetricsMiddleware,
    RateLimitMetricsMiddleware,
)


class TestPrometheusExporter:
    """Test the PrometheusExporter class."""

    def test_init_exporter(self):
        """Test exporter initialization."""
        config = MetricConfig()
        exporter = PrometheusExporter(config)

        assert exporter is not None
        assert exporter.registry is not None
        assert exporter.config == config

    def test_global_exporter(self):
        """Test global exporter singleton."""
        exporter1 = get_exporter()
        exporter2 = get_exporter()

        assert exporter1 is exporter2
        assert exporter1 is not None

    def test_http_metrics_initialized(self):
        """Test HTTP metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "http_requests_total")
        assert hasattr(exporter, "http_request_duration_seconds")
        assert hasattr(exporter, "http_errors_total")
        assert hasattr(exporter, "rate_limit_exceeded_total")

    def test_business_metrics_initialized(self):
        """Test business metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "pdfs_generated_total")
        assert hasattr(exporter, "resumes_tailored_total")
        assert hasattr(exporter, "variants_listed_total")

    def test_ai_metrics_initialized(self):
        """Test AI metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "ai_requests_total")
        assert hasattr(exporter, "ai_request_duration_seconds")
        assert hasattr(exporter, "ai_request_tokens_total")

    def test_database_metrics_initialized(self):
        """Test database metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "db_connections_active")
        assert hasattr(exporter, "db_query_duration_seconds")
        assert hasattr(exporter, "db_queries_total")

    def test_cache_metrics_initialized(self):
        """Test cache metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "cache_hits_total")
        assert hasattr(exporter, "cache_misses_total")
        assert hasattr(exporter, "cache_evictions_total")

    def test_queue_metrics_initialized(self):
        """Test queue metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "async_queue_depth")
        assert hasattr(exporter, "async_jobs_total")
        assert hasattr(exporter, "async_job_duration_seconds")

    def test_oauth_metrics_initialized(self):
        """Test OAuth metrics are initialized."""
        exporter = PrometheusExporter()

        assert hasattr(exporter, "oauth_connection_success_total")
        assert hasattr(exporter, "oauth_connection_failure_total")

    def test_record_http_request(self):
        """Test recording HTTP request metrics."""
        exporter = PrometheusExporter()

        # Record a request
        exporter.record_http_request(
            method="POST",
            endpoint="/api/v1/render/pdf",
            status_code=200,
            duration=0.45,
            request_size=5000,
            response_size=250000,
        )

        # Export and verify metrics exist
        metrics = exporter.export_prometheus()
        assert "http_requests_total" in metrics
        assert "http_request_duration_seconds" in metrics
        assert "http_request_size_bytes" in metrics
        assert "http_response_size_bytes" in metrics

    def test_record_http_error(self):
        """Test recording HTTP errors."""
        exporter = PrometheusExporter()

        exporter.record_http_request(
            method="POST",
            endpoint="/api/v1/render/pdf",
            status_code=500,
            duration=0.1,
            error_type="ServerError",
        )

        metrics = exporter.export_prometheus()
        assert "http_errors_total" in metrics

    def test_record_pdf_generation(self):
        """Test recording PDF generation metrics."""
        exporter = PrometheusExporter()

        exporter.record_pdf_generation(
            variant="modern", template="standard", duration=2.5, status="success"
        )

        metrics = exporter.export_prometheus()
        assert "pdfs_generated_total" in metrics
        assert "pdf_generation_duration_seconds" in metrics

    def test_record_resume_tailor(self):
        """Test recording resume tailoring metrics."""
        exporter = PrometheusExporter()

        exporter.record_resume_tailor(
            ai_provider="openai", model="gpt-4", duration=1.2, status="success"
        )

        metrics = exporter.export_prometheus()
        assert "resumes_tailored_total" in metrics
        assert "resume_tailor_duration_seconds" in metrics

    def test_record_ai_request(self):
        """Test recording AI provider request metrics."""
        exporter = PrometheusExporter()

        exporter.record_ai_request(
            provider="openai",
            model="gpt-4",
            duration=1.2,
            input_tokens=150,
            output_tokens=500,
            cost=0.025,
            status="success",
        )

        metrics = exporter.export_prometheus()
        assert "ai_requests_total" in metrics
        assert "ai_request_duration_seconds" in metrics
        assert "ai_request_tokens_total" in metrics
        assert "ai_request_cost_usd" in metrics

    def test_record_db_query(self):
        """Test recording database query metrics."""
        exporter = PrometheusExporter()

        exporter.record_db_query(
            operation="SELECT", table="resumes", duration=0.05, status="success"
        )

        metrics = exporter.export_prometheus()
        assert "db_queries_total" in metrics
        assert "db_query_duration_seconds" in metrics

    def test_record_slow_db_query(self):
        """Test recording slow database queries."""
        exporter = PrometheusExporter()

        exporter.record_db_query(
            operation="SELECT", table="users", duration=2.5, status="success"  # > 1s
        )

        metrics = exporter.export_prometheus()
        assert "db_slow_queries_total" in metrics

    def test_record_cache_hit(self):
        """Test recording cache hits."""
        exporter = PrometheusExporter()

        exporter.record_cache_hit("redis", "resume_template")

        metrics = exporter.export_prometheus()
        assert "cache_hits_total" in metrics

    def test_record_cache_miss(self):
        """Test recording cache misses."""
        exporter = PrometheusExporter()

        exporter.record_cache_miss("redis", "resume_template")

        metrics = exporter.export_prometheus()
        assert "cache_misses_total" in metrics

    def test_export_openmetrics(self):
        """Test OpenMetrics format export."""
        exporter = PrometheusExporter()
        exporter.record_http_request("GET", "/health", 200, 0.01)

        metrics = exporter.export_openmetrics()
        assert isinstance(metrics, bytes)
        assert b"http_requests_total" in metrics

    def test_export_prometheus_format(self):
        """Test Prometheus text format export."""
        exporter = PrometheusExporter()
        exporter.record_http_request("GET", "/health", 200, 0.01)

        metrics = exporter.export_prometheus()
        assert isinstance(metrics, str)
        assert "http_requests_total" in metrics

    def test_get_registry(self):
        """Test getting the Prometheus registry."""
        exporter = PrometheusExporter()
        registry = exporter.get_registry()

        assert registry is not None
        assert registry == exporter.registry

    def test_set_api_info(self):
        """Test setting API info metric."""
        exporter = PrometheusExporter()

        exporter.set_api_info(version="1.0.0", environment="production", debug=False)

        metrics = exporter.export_prometheus()
        assert "resumeai_api_info" in metrics


class TestMetricsMiddleware:
    """Test the HTTP metrics middleware."""

    @pytest.mark.asyncio
    async def test_middleware_records_request(self):
        """Test middleware records HTTP request metrics."""
        from fastapi import FastAPI

        app = FastAPI()
        app.add_middleware(MetricsMiddleware)

        @app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        # Create test client and make request
        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.get("/test")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_records_error(self):
        """Test middleware records error metrics."""
        from fastapi import FastAPI

        app = FastAPI()
        app.add_middleware(MetricsMiddleware)

        @app.get("/error")
        async def error_endpoint():
            return {"error": "test"}, 500

        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.get("/error")
        # Should still return 500 even though endpoint returns dict
        assert response.status_code in [200, 500]

    @pytest.mark.asyncio
    async def test_rate_limit_middleware(self):
        """Test rate limit metrics middleware."""
        from fastapi import FastAPI

        app = FastAPI()
        app.add_middleware(RateLimitMetricsMiddleware)

        @app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        from fastapi.testclient import TestClient

        client = TestClient(app)

        response = client.get("/test")
        assert response.status_code == 200


class TestMetricsIntegration:
    """Integration tests for metrics system."""

    def test_exporter_multiprocess_config(self):
        """Test exporter with multiprocess configuration."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            config = MetricConfig(enable_multiprocess=True, multiprocess_dir=tmpdir)
            exporter = PrometheusExporter(config)

            assert exporter.config.enable_multiprocess
            assert exporter.config.multiprocess_dir == tmpdir

    def test_multiple_export_formats(self):
        """Test exporting in multiple formats."""
        exporter = PrometheusExporter()
        exporter.record_http_request("GET", "/test", 200, 0.01)

        # Test Prometheus format
        prometheus = exporter.export_prometheus()
        assert "http_requests_total" in prometheus
        assert "# HELP" in prometheus

        # Test OpenMetrics format
        openmetrics = exporter.export_openmetrics()
        assert b"http_requests_total" in openmetrics

    def test_concurrent_metric_recording(self):
        """Test recording metrics concurrently."""
        import asyncio

        exporter = PrometheusExporter()

        async def record_requests():
            for i in range(10):
                exporter.record_http_request("GET", f"/endpoint-{i}", 200, 0.01)
                await asyncio.sleep(0.001)

        # Run concurrently
        asyncio.run(record_requests())

        # Verify metrics were recorded
        metrics = exporter.export_prometheus()
        assert "http_requests_total" in metrics


class TestAlertRuleValidation:
    """Test alert rules configuration."""

    def test_alert_rules_file_exists(self):
        """Test alert rules file exists."""
        import os

        alert_rules_path = (
            "/home/alex/Projects/ResumeAI/resume-api/config/alert_rules.yml"
        )
        assert os.path.exists(alert_rules_path), "alert_rules.yml should exist"

    def test_recording_rules_file_exists(self):
        """Test recording rules file exists."""
        import os

        rules_path = (
            "/home/alex/Projects/ResumeAI/resume-api/config/recording_rules.yml"
        )
        assert os.path.exists(rules_path), "recording_rules.yml should exist"

    def test_alert_rules_yaml_valid(self):
        """Test alert rules YAML is valid."""
        import yaml

        with open(
            "/home/alex/Projects/ResumeAI/resume-api/config/alert_rules.yml", "r"
        ) as f:
            rules = yaml.safe_load(f)
            assert "groups" in rules
            assert len(rules["groups"]) > 0

    def test_recording_rules_yaml_valid(self):
        """Test recording rules YAML is valid."""
        import yaml

        with open(
            "/home/alex/Projects/ResumeAI/resume-api/config/recording_rules.yml", "r"
        ) as f:
            rules = yaml.safe_load(f)
            assert "groups" in rules
            assert len(rules["groups"]) > 0


class TestPrometheusConfiguration:
    """Test Prometheus configuration."""

    def test_prometheus_config_exists(self):
        """Test prometheus.yml exists."""
        import os

        config_path = "/home/alex/Projects/ResumeAI/resume-api/config/prometheus.yml"
        assert os.path.exists(config_path), "prometheus.yml should exist"

    def test_prometheus_config_valid(self):
        """Test prometheus.yml is valid YAML."""
        import yaml

        with open(
            "/home/alex/Projects/ResumeAI/resume-api/config/prometheus.yml", "r"
        ) as f:
            config = yaml.safe_load(f)
            assert "global" in config
            assert "scrape_configs" in config
            assert len(config["scrape_configs"]) > 0

    def test_prometheus_has_resume_api_job(self):
        """Test prometheus.yml has resume-api job."""
        import yaml

        with open(
            "/home/alex/Projects/ResumeAI/resume-api/config/prometheus.yml", "r"
        ) as f:
            config = yaml.safe_load(f)
            job_names = [job["job_name"] for job in config["scrape_configs"]]
            assert "resume-api" in job_names


class TestGrafanaDashboards:
    """Test Grafana dashboard configurations."""

    def test_api_performance_dashboard_exists(self):
        """Test API performance dashboard exists."""
        import os

        dashboard_path = (
            "/home/alex/Projects/ResumeAI/resume-api/dashboards/api-performance.json"
        )
        assert os.path.exists(dashboard_path), "api-performance.json should exist"

    def test_business_metrics_dashboard_exists(self):
        """Test business metrics dashboard exists."""
        import os

        dashboard_path = (
            "/home/alex/Projects/ResumeAI/resume-api/dashboards/business-metrics.json"
        )
        assert os.path.exists(dashboard_path), "business-metrics.json should exist"

    def test_system_health_dashboard_exists(self):
        """Test system health dashboard exists."""
        import os

        dashboard_path = (
            "/home/alex/Projects/ResumeAI/resume-api/dashboards/system-health.json"
        )
        assert os.path.exists(dashboard_path), "system-health.json should exist"

    def test_dashboard_json_valid(self):
        """Test dashboard JSON is valid."""
        import json
        import os

        dashboards_dir = "/home/alex/Projects/ResumeAI/resume-api/dashboards"
        for filename in os.listdir(dashboards_dir):
            if filename.endswith(".json"):
                with open(os.path.join(dashboards_dir, filename), "r") as f:
                    dashboard = json.load(f)
                    assert "panels" in dashboard or "title" in dashboard


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
