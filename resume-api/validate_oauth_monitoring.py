#!/usr/bin/env python3
"""
Validation script for OAuth monitoring system.

Tests the core functionality without requiring pytest.
"""

from datetime import datetime, timezone, timedelta
from monitoring.oauth_monitor import OAuthEvent, OAuthMonitor


def test_basic_functionality():
    """Test basic OAuth monitoring functionality."""
    print("=" * 60)
    print("OAuth Monitoring System Validation")
    print("=" * 60)

    monitor = OAuthMonitor()

    # Test 1: Event creation and recording
    print("\n[TEST 1] Event Recording")
    event = OAuthEvent(
        timestamp=datetime.now(timezone.utc),
        provider="github",
        event_type="connect",
        status="success",
        user_id="user123",
        duration_ms=150.5,
    )
    monitor.record_event(event)
    print(f"✓ Recorded event: {event.event_type} ({event.status})")
    assert len(monitor.events) == 1
    print("✓ Event stored in monitor")

    # Test 2: Metrics snapshot
    print("\n[TEST 2] Metrics Snapshot")
    for i in range(9):
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="connect",
                status="success",
                duration_ms=100.0 + i * 10,
            )
        )

    snapshot = monitor.get_metrics_snapshot("github", 5)
    print(f"✓ Total events: {snapshot.total_events}")
    print(f"✓ Success events: {snapshot.success_events}")
    print(f"✓ Success rate: {snapshot.success_rate:.2%}")
    print(f"✓ Avg response time: {snapshot.avg_response_time_ms:.2f}ms")
    assert snapshot.total_events == 10
    assert snapshot.success_rate == 1.0

    # Test 3: Error tracking
    print("\n[TEST 3] Error Tracking")
    for i in range(5):
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="callback",
                status="failure",
                error_code="invalid_state" if i < 3 else "expired_state",
            )
        )

    snapshot = monitor.get_metrics_snapshot("github", 5)
    print(f"✓ Total errors: {snapshot.failure_events}")
    print(f"✓ Error breakdown: {snapshot.error_counts}")
    print(f"✓ Top errors: {snapshot.top_errors}")
    assert snapshot.failure_events == 5
    assert snapshot.error_counts["invalid_state"] == 3

    # Test 4: Suspicious activity detection
    print("\n[TEST 4] Suspicious Activity Detection")
    monitor.reset()  # Clean slate

    # Record 6 failed attempts from same IP
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
    print(f"✓ Detected suspicious IPs: {len(suspicious)}")
    if suspicious:
        print(f"✓ IP: {suspicious[0][0]}, Failed attempts: {suspicious[0][1]}")
        assert suspicious[0][1] == 6

    # Test 5: Anomaly detection
    print("\n[TEST 5] Anomaly Detection")
    monitor.reset()

    # Create high failure rate scenario
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
    print(f"✓ Detected anomalies: {len(anomalies)}")
    for anomaly in anomalies:
        print(f"  - Type: {anomaly['type']}")
        print(f"    Severity: {anomaly['severity']}")

    # Test 6: Health status
    print("\n[TEST 6] Health Status")
    health = monitor.get_health_status("github")
    print(f"✓ Healthy: {health['healthy']}")
    print(f"✓ Success rate (short-term): {health['short_term']['success_rate']:.2%}")
    print(f"✓ Anomalies detected: {len(health['anomalies'])}")

    # Test 7: Event cleanup
    print("\n[TEST 7] Event Cleanup")
    monitor.reset()

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

    # Add old event
    old_time = now - timedelta(hours=25)
    monitor.events.append(
        OAuthEvent(
            timestamp=old_time,
            provider="github",
            event_type="connect",
            status="success",
        )
    )

    print(f"✓ Events before cleanup: {len(monitor.events)}")
    removed = monitor.cleanup_old_events(max_age_hours=24)
    print(f"✓ Removed {removed} old events")
    print(f"✓ Events after cleanup: {len(monitor.events)}")
    assert removed == 1

    # Test 8: Metrics export
    print("\n[TEST 8] Metrics Data Export")
    monitor.reset()

    for _ in range(5):
        monitor.record_event(
            OAuthEvent(
                timestamp=datetime.now(timezone.utc),
                provider="github",
                event_type="connect",
                status="success",
                duration_ms=100,
            )
        )

    snapshot = monitor.get_metrics_snapshot("github", 5)
    metrics_dict = {
        "total_events": snapshot.total_events,
        "success_events": snapshot.success_events,
        "failure_events": snapshot.failure_events,
        "rate_limit_events": snapshot.rate_limit_events,
        "token_expiration_events": snapshot.token_expiration_events,
        "success_rate": snapshot.success_rate,
        "avg_response_time_ms": snapshot.avg_response_time_ms,
    }
    print(f"✓ Snapshot data exportable: {all(v is not None for v in metrics_dict.values())}")
    print(f"  {metrics_dict}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_basic_functionality()
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback

        traceback.print_exc()
        exit(1)
