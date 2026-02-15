"""
Tests for alerting module.
"""

import pytest
from datetime import datetime, timedelta
from monitoring.alerting import (
    Alert,
    AlertRule,
    AlertManager,
    alert_manager,
    setup_alerting,
)


def test_alert_creation():
    """Test creating an alert."""
    alert = Alert(
        alert_type="high_error_rate",
        severity="warning",
        message="Error rate exceeded 5%",
        details={"error_rate": 0.07, "threshold": 0.05},
    )

    assert alert.alert_type == "high_error_rate"
    assert alert.severity == "warning"
    assert alert.message == "Error rate exceeded 5%"
    assert alert.details["error_rate"] == 0.07
    assert isinstance(alert.timestamp, datetime)


@pytest.mark.asyncio
async def test_alert_rule_check():
    """Test alert rule check."""
    rule = AlertRule(name="test_rule", enabled=True)

    # Default check returns None
    result = await rule.check()
    assert result is None


def test_alert_rule_should_alert():
    """Test alert rule should_alert logic."""
    rule = AlertRule(name="test_rule", enabled=True)

    # First time should alert
    assert rule.should_alert() is True

    # Set last alert time
    rule.last_alert_time = datetime.utcnow()

    # Within cooldown should not alert
    assert rule.should_alert() is False

    # After cooldown should alert again
    rule.last_alert_time = datetime.utcnow() - timedelta(minutes=10)
    assert rule.should_alert() is True


@pytest.mark.asyncio
async def test_alert_rule_evaluate_disabled():
    """Test that disabled rules don't alert."""
    rule = AlertRule(name="test_rule", enabled=False)

    result = await rule.evaluate()
    assert result is None


def test_alert_manager_creation():
    """Test creating an alert manager."""
    manager = AlertManager()

    assert manager.rules == []
    assert manager.handlers == []
    assert manager.running is False


def test_alert_manager_add_rule():
    """Test adding a rule to alert manager."""
    manager = AlertManager()
    rule = AlertRule(name="test_rule", enabled=True)

    manager.add_rule(rule)

    assert len(manager.rules) == 1
    assert manager.rules[0] == rule


def test_alert_manager_add_handler():
    """Test adding a handler to alert manager."""
    manager = AlertManager()

    def test_handler(alert):
        pass

    manager.add_handler(test_handler)

    assert len(manager.handlers) == 1


def test_alert_manager_log_handler():
    """Test the default log handler."""
    manager = AlertManager()

    alert = Alert(
        alert_type="test",
        severity="info",
        message="Test alert",
    )

    # This should not raise an error
    manager.log_alert(alert)


@pytest.mark.asyncio
async def test_alert_manager_check_all_rules():
    """Test checking all rules."""
    manager = AlertManager()

    # Add a rule that returns None
    manager.add_rule(AlertRule(name="test_rule", enabled=True))

    # Check all rules
    alerts = await manager.check_all_rules()

    assert isinstance(alerts, list)


@pytest.mark.asyncio
async def test_alert_manager_stop():
    """Test stopping alert manager."""
    manager = AlertManager()
    manager.running = True

    manager.stop()

    assert manager.running is False


def test_setup_alerting():
    """Test setting up alerting."""
    manager = setup_alerting()

    assert manager is not None
    assert isinstance(manager, AlertManager)


def test_global_alert_manager():
    """Test the global alert manager instance."""
    assert alert_manager is not None
    assert isinstance(alert_manager, AlertManager)
