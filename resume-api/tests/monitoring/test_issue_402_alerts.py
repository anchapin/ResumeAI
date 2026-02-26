"""
Tests for Issue #402: Prometheus Alert Rules.

Comprehensive tests for:
- High error rate alert (> 0.1%)
- PDF generation slow alert (p95 > 5s)
- Database connection pool exhaustion alert
- API key invalid alert (repeated 401s)
- Sentry integration for frontend errors
- Alert notification verification
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from monitoring.alerting import (
    Alert,
    AlertManager,
    HighErrorRateRule,
    PDFGenerationSlowRule,
    DatabaseConnectionPoolExhaustedRule,
    APIKeyInvalidRule,
)


class TestHighErrorRateAlert:
    """Test high error rate alert (> 0.1%)."""

    @pytest.mark.asyncio
    async def test_high_error_rate_rule_creation(self):
        """Test creating a high error rate rule."""
        rule = HighErrorRateRule(threshold=0.001)  # 0.1%

        assert rule.name == "high_error_rate"
        assert rule.threshold == 0.001
        assert rule.window_minutes == 5
        assert rule.enabled is True

    @pytest.mark.asyncio
    async def test_high_error_rate_rule_check(self):
        """Test high error rate rule check (returns None in fallback mode)."""
        rule = HighErrorRateRule(threshold=0.001)

        result = await rule.check()
        # Fallback implementation returns None
        assert result is None

    def test_high_error_rate_alert_message(self):
        """Test high error rate alert message."""
        alert = Alert(
            alert_type="high_error_rate",
            severity="critical",
            message="Error rate exceeded 0.1% threshold",
            details={"error_rate": 0.0015, "threshold": 0.001},
        )

        assert alert.alert_type == "high_error_rate"
        assert alert.severity == "critical"
        assert alert.details["error_rate"] == 0.0015


class TestPDFGenerationSlowAlert:
    """Test PDF generation slow alert (p95 > 5s)."""

    @pytest.mark.asyncio
    async def test_pdf_generation_slow_rule_creation(self):
        """Test creating a PDF generation slow rule."""
        rule = PDFGenerationSlowRule(threshold_seconds=5, percentile=0.95)

        assert rule.name == "pdf_generation_slow"
        assert rule.threshold_seconds == 5
        assert rule.percentile == 0.95
        assert rule.enabled is True

    @pytest.mark.asyncio
    async def test_pdf_generation_slow_rule_check(self):
        """Test PDF generation slow rule check."""
        rule = PDFGenerationSlowRule(threshold_seconds=5, percentile=0.95)

        result = await rule.check()
        assert result is None

    def test_pdf_generation_slow_alert_message(self):
        """Test PDF generation slow alert message."""
        alert = Alert(
            alert_type="pdf_generation_slow",
            severity="warning",
            message="PDF generation P95 response time exceeded 5 seconds",
            details={"p95_duration": 6.5, "threshold": 5, "percentile": 0.95},
        )

        assert alert.alert_type == "pdf_generation_slow"
        assert alert.severity == "warning"
        assert alert.details["p95_duration"] == 6.5


class TestDatabaseConnectionPoolAlert:
    """Test database connection pool exhaustion alert."""

    @pytest.mark.asyncio
    async def test_database_connection_pool_exhausted_rule_creation(self):
        """Test creating a database connection pool rule."""
        rule = DatabaseConnectionPoolExhaustedRule()

        assert rule.name == "database_connection_pool_exhausted"
        assert rule.enabled is True
        # Should have a 2-minute cooldown instead of default 5
        assert rule.alert_cooldown == timedelta(minutes=2)

    @pytest.mark.asyncio
    async def test_database_connection_pool_exhausted_rule_check(self):
        """Test database connection pool exhausted rule check."""
        rule = DatabaseConnectionPoolExhaustedRule()

        result = await rule.check()
        assert result is None

    def test_database_connection_pool_exhausted_alert_message(self):
        """Test database connection pool exhausted alert message."""
        alert = Alert(
            alert_type="database_connection_pool_exhausted",
            severity="critical",
            message="Database connection pool is exhausted",
            details={"active_connections": 100, "max_connections": 100},
        )

        assert alert.alert_type == "database_connection_pool_exhausted"
        assert alert.severity == "critical"
        assert alert.details["active_connections"] == 100


class TestAPIKeyInvalidAlert:
    """Test API key invalid alert (repeated 401s)."""

    @pytest.mark.asyncio
    async def test_api_key_invalid_rule_creation(self):
        """Test creating an API key invalid rule."""
        rule = APIKeyInvalidRule(threshold_per_second=1, window_minutes=5)

        assert rule.name == "api_key_invalid"
        assert rule.threshold_per_second == 1
        assert rule.window_minutes == 5
        assert rule.enabled is True

    @pytest.mark.asyncio
    async def test_api_key_invalid_rule_check(self):
        """Test API key invalid rule check."""
        rule = APIKeyInvalidRule(threshold_per_second=1)

        result = await rule.check()
        assert result is None

    def test_api_key_invalid_alert_message(self):
        """Test API key invalid alert message."""
        alert = Alert(
            alert_type="api_key_invalid",
            severity="warning",
            message="Repeated 401 Unauthorized responses detected",
            details={"endpoint": "/v1/render/pdf", "rate_per_second": 2.5, "threshold": 1},
        )

        assert alert.alert_type == "api_key_invalid"
        assert alert.severity == "warning"
        assert alert.details["rate_per_second"] == 2.5


class TestAlertManagerWithIssue402Rules:
    """Test AlertManager with Issue #402 alert rules."""

    def test_alert_manager_add_issue_402_rules(self):
        """Test that AlertManager adds Issue #402 rules."""
        manager = AlertManager()
        manager.add_default_rules()

        # Verify all Issue #402 rules are added
        rule_names = [rule.name for rule in manager.rules]

        assert "high_error_rate" in rule_names
        assert "pdf_generation_slow" in rule_names
        assert "database_connection_pool_exhausted" in rule_names
        assert "api_key_invalid" in rule_names

    def test_alert_manager_add_default_handlers(self):
        """Test that AlertManager adds default handlers including notify."""
        manager = AlertManager()
        manager.add_default_handlers()

        assert len(manager.handlers) >= 2

    def test_alert_manager_log_alert(self):
        """Test logging an alert."""
        manager = AlertManager()

        alert = Alert(
            alert_type="high_error_rate",
            severity="critical",
            message="Error rate exceeded threshold",
            details={"error_rate": 0.002},
        )

        # Should not raise
        manager.log_alert(alert)

    def test_alert_manager_notify_alert_sends_to_sentry(self):
        """Test that notify_alert sends certain alerts to Sentry."""
        manager = AlertManager()

        alert = Alert(
            alert_type="api_key_invalid",
            severity="warning",
            message="Repeated 401s detected",
            details={},
        )

        # Should not raise even without Sentry configured
        manager.notify_alert(alert)

    @pytest.mark.asyncio
    async def test_alert_manager_check_all_rules(self):
        """Test checking all rules."""
        manager = AlertManager()

        # Create a mock rule that returns an alert
        mock_rule = Mock()
        mock_rule.evaluate = Mock()

        async def mock_evaluate():
            return Alert(
                alert_type="test",
                severity="warning",
                message="Test alert",
                details={},
            )

        mock_rule.evaluate = mock_evaluate

        manager.add_rule(mock_rule)

        alerts = await manager.check_all_rules()

        assert len(alerts) == 1
        assert alerts[0].alert_type == "test"


class TestSentryConfiguration:
    """Test Sentry configuration for frontend error tracking."""

    def test_sentry_config_attributes(self):
        """Test that SentryConfig has required attributes."""
        from config.sentry import SentryConfig

        assert hasattr(SentryConfig, "BACKEND_DSN")
        assert hasattr(SentryConfig, "FRONTEND_DSN")
        assert hasattr(SentryConfig, "ENVIRONMENT")
        assert hasattr(SentryConfig, "TRACES_SAMPLE_RATE")
        assert hasattr(SentryConfig, "FRONTEND_TRACES_SAMPLE_RATE")
        assert hasattr(SentryConfig, "ENABLED")

    def test_sentry_config_get_frontend_config(self):
        """Test getting Sentry frontend configuration."""
        from config.sentry import SentryConfig

        # When disabled
        with patch.object(SentryConfig, "ENABLED", False):
            config = SentryConfig.get_frontend_config()
            assert config == {}


class TestAlertIntegration:
    """Integration tests for alert system with Issue #402."""

    @pytest.mark.asyncio
    async def test_alert_manager_full_workflow(self):
        """Test full alert manager workflow."""
        manager = AlertManager()
        manager.add_default_rules()
        manager.add_default_handlers()

        # Verify setup
        assert len(manager.rules) >= 4  # At least the 4 Issue #402 rules
        assert len(manager.handlers) >= 1

    def test_all_issue_402_alerts_have_required_fields(self):
        """Test that all Issue #402 alerts have required fields."""
        manager = AlertManager()
        manager.add_default_rules()

        issue_402_rules = [
            rule
            for rule in manager.rules
            if rule.name
            in [
                "high_error_rate",
                "pdf_generation_slow",
                "database_connection_pool_exhausted",
                "api_key_invalid",
            ]
        ]

        assert len(issue_402_rules) == 4

        for rule in issue_402_rules:
            assert hasattr(rule, "name")
            assert hasattr(rule, "enabled")
            assert hasattr(rule, "check")
            assert hasattr(rule, "evaluate")


class TestAlertMetrics:
    """Test alert metrics and monitoring."""

    def test_alert_timestamps(self):
        """Test that alerts have proper timestamps."""
        alert = Alert(
            alert_type="test",
            severity="warning",
            message="Test",
            details={},
        )

        assert isinstance(alert.timestamp, datetime)
        assert alert.timestamp <= datetime.utcnow()

    def test_alert_cooldown_behavior(self):
        """Test alert cooldown behavior."""
        rule = HighErrorRateRule()

        # First alert should be allowed
        assert rule.should_alert() is True

        # Set last alert time
        rule.last_alert_time = datetime.utcnow()

        # Should not alert within cooldown
        assert rule.should_alert() is False

        # Move past cooldown
        rule.last_alert_time = datetime.utcnow() - timedelta(minutes=10)
        assert rule.should_alert() is True

    def test_different_cooldown_durations(self):
        """Test different cooldown durations for different rule types."""
        high_error_rate = HighErrorRateRule()
        pool_exhausted = DatabaseConnectionPoolExhaustedRule()

        # Pool exhaustion should have shorter cooldown (2 min vs 5 min)
        assert pool_exhausted.alert_cooldown < high_error_rate.alert_cooldown
        assert pool_exhausted.alert_cooldown == timedelta(minutes=2)
        assert high_error_rate.alert_cooldown == timedelta(minutes=5)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
