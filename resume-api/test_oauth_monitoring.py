"""
Tests for OAuth Monitoring System

Tests the monitoring module, event recording, metrics aggregation,
anomaly detection, and suspicious activity detection.
"""

import pytest
from datetime import datetime, timezone, timedelta
from monitoring.oauth_monitor import (
    OAuthEvent,
    OAuthMonitor,
)


class TestOAuthEvent:
    """Test OAuthEvent data structure."""

    def test_event_creation(self):
        """Test creating an OAuth event."""
        event = OAuthEvent(
            timestamp=datetime.now(timezone.utc),
            provider="github",
            event_type="connect",
            status="success",
            user_id="user123",
            duration_ms=150.5,
        )

        assert event.provider == "github"
        assert event.event_type == "connect"
        assert event.status == "success"
        assert event.user_id == "user123"
        assert event.duration_ms == 150.5

    def test_event_to_dict(self):
        """Test converting event to dictionary."""
        event = OAuthEvent(
            timestamp=datetime.now(timezone.utc),
            provider="github",
            event_type="token_refresh",
            status="failure",
            error_code="invalid_grant",
        )

        event_dict = event.to_dict()
        assert event_dict["provider"] == "github"
        assert event_dict["status"] == "failure"
        assert event_dict["error_code"] == "invalid_grant"


class TestOAuthMonitor:
    """Test OAuthMonitor main functionality."""

    @pytest.fixture
    def monitor(self):
        """Create a fresh monitor for testing."""
        return OAuthMonitor()

    def test_record_event(self, monitor):
        """Test recording an event."""
        event = OAuthEvent(
            timestamp=datetime.now(timezone.utc),
            provider="github",
            event_type="connect",
            status="success",
        )

        monitor.record_event(event)
        assert len(monitor.events) == 1

    def test_metrics_snapshot_empty(self, monitor):
        """Test metrics snapshot with no events."""
        snapshot = monitor.get_metrics_snapshot("github", 5)

        assert snapshot.total_events == 0
        assert snapshot.success_events == 0
        assert snapshot.failure_events == 0
        assert snapshot.success_rate == 0.0

    def test_metrics_snapshot_with_events(self, monitor):
        """Test metrics snapshot with events."""
        # Record 10 successful events
        for i in range(10):
            event = OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="connect",
                status="success",
                duration_ms=100.0 + i,
            )
            monitor.record_event(event)

        snapshot = monitor.get_metrics_snapshot("github", 5)
        assert snapshot.total_events == 10
        assert snapshot.success_events == 10
        assert snapshot.success_rate == 1.0
        assert snapshot.avg_response_time_ms > 100

    def test_metrics_success_rate_calculation(self, monitor):
        """Test success rate calculation."""
        # Record 7 successes and 3 failures
        for _ in range(7):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="success",
                )
            )

        for _ in range(3):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="failure",
                    error_code="auth_failed",
                )
            )

        snapshot = monitor.get_metrics_snapshot("github", 5)
        assert snapshot.total_events == 10
        assert snapshot.success_events == 7
        assert snapshot.failure_events == 3
        assert abs(snapshot.success_rate - 0.7) < 0.01

    def test_error_counting(self, monitor):
        """Test error code aggregation."""
        for _ in range(3):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="callback",
                    status="failure",
                    error_code="invalid_state",
                )
            )

        for _ in range(2):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="callback",
                    status="failure",
                    error_code="expired_state",
                )
            )

        snapshot = monitor.get_metrics_snapshot("github", 5)
        assert snapshot.error_counts["invalid_state"] == 3
        assert snapshot.error_counts["expired_state"] == 2
        assert len(snapshot.top_errors) == 2

    def test_suspicious_ips_detection(self, monitor):
        """Test suspicious IP detection."""
        # Record 6 failures from same IP
        for _ in range(6):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="failure",
                    ip_address="192.168.1.100",
                )
            )

        suspicious = monitor.get_suspicious_ips(5)
        assert len(suspicious) == 1
        assert suspicious[0][0] == "192.168.1.100"
        assert suspicious[0][1] == 6

    def test_suspicious_ips_threshold_not_met(self, monitor):
        """Test that suspicious IPs threshold is respected."""
        # Record 4 failures (below threshold of 5)
        for _ in range(4):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="failure",
                    ip_address="192.168.1.100",
                )
            )

        suspicious = monitor.get_suspicious_ips(5)
        assert len(suspicious) == 0

    def test_anomaly_detection_high_failure_rate(self, monitor):
        """Test anomaly detection for high failure rates."""
        # Record 3 successes and 7 failures (70% failure rate > 15% threshold)
        for _ in range(3):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="success",
                )
            )

        for _ in range(7):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="failure",
                    error_code="auth_failed",
                )
            )

        anomalies = monitor.detect_anomalies("github")
        high_failure_anomalies = [
            a for a in anomalies if a["type"] == "high_failure_rate"
        ]
        assert len(high_failure_anomalies) > 0
        assert high_failure_anomalies[0]["severity"] == "high"

    def test_anomaly_detection_rate_limiting(self, monitor):
        """Test anomaly detection for rate limiting."""
        # Record 5+ rate limit events
        for _ in range(6):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="callback",
                    status="rate_limited",
                )
            )

        anomalies = monitor.detect_anomalies("github")
        rate_limit_anomalies = [
            a for a in anomalies if a["type"] == "rate_limit_detected"
        ]
        assert len(rate_limit_anomalies) > 0
        assert rate_limit_anomalies[0]["severity"] == "medium"

    def test_anomaly_detection_token_expiration(self, monitor):
        """Test anomaly detection for token expiration spikes."""
        # Record 3+ token expiration events
        for _ in range(4):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="token_refresh",
                    status="token_expired",
                )
            )

        anomalies = monitor.detect_anomalies("github")
        expiration_anomalies = [
            a for a in anomalies if a["type"] == "token_expiration_spike"
        ]
        assert len(expiration_anomalies) > 0
        assert expiration_anomalies[0]["severity"] == "medium"

    def test_health_status(self, monitor):
        """Test health status calculation."""
        # Record 9 successes and 1 failure (90% success > 85% threshold)
        for _ in range(9):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="success",
                )
            )

        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="connect",
                status="failure",
                error_code="auth_failed",
            )
        )

        health = monitor.get_health_status("github")
        assert health["healthy"] is True
        assert health["short_term"]["success_rate"] == 0.9

    def test_cleanup_old_events(self, monitor):
        """Test cleanup of old events."""
        now = datetime.now(timezone.utc)

        # Add recent event
        monitor.record_event(
            OAuthEvent(
                timestamp=now,
                provider="github",
                event_type="connect",
                status="success",
            )
        )

        # Add old event (more than 24 hours ago)
        old_time = now - timedelta(hours=25)
        monitor.events.append(
            OAuthEvent(
                timestamp=old_time,
                provider="github",
                event_type="connect",
                status="success",
            )
        )

        assert len(monitor.events) == 2

        removed = monitor.cleanup_old_events(max_age_hours=24)
        assert removed == 1
        assert len(monitor.events) == 1

    def test_reset(self, monitor):
        """Test resetting the monitor."""
        # Add some events
        for _ in range(5):
            monitor.record_event(
                OAuthEvent(
                    timestamp=datetime.now(timezone.utc),
                    provider="github",
                    event_type="connect",
                    status="success",
                )
            )

        assert len(monitor.events) == 5

        monitor.reset()
        assert len(monitor.events) == 0


class TestOAuthMonitorIntegration:
    """Integration tests for OAuth monitoring."""

    def test_event_flow(self):
        """Test complete event recording and metrics flow."""
        monitor = OAuthMonitor()

        # Simulate OAuth flow
        # 1. User initiates connect
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="connect",
                status="success",
                user_id="user1",
                ip_address="192.168.1.1",
            )
        )

        # 2. GitHub callback with token exchange
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="token_exchange",
                status="success",
                user_id="user1",
                duration_ms=250,
            )
        )

        # 3. User profile fetch
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="user_fetch",
                status="success",
                user_id="user1",
                duration_ms=180,
            )
        )

        # Get metrics
        metrics = monitor.get_metrics_snapshot("github", 5)

        assert metrics.total_events == 3
        assert metrics.success_events == 3
        assert metrics.success_rate == 1.0
        assert metrics.avg_response_time_ms > 0

        # Get health
        health = monitor.get_health_status("github")
        assert health["healthy"] is True

        # Check for anomalies (should be none)
        anomalies = monitor.detect_anomalies("github")
        assert len(anomalies) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
