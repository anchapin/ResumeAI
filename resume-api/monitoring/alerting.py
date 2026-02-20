"""Alerting module for monitoring and alerting."""

from datetime import datetime, timedelta

from config import settings
from monitoring import logging_config
from monitoring import metrics as monitoring_metrics

logger = logging_config.get_logger(__name__)


class Alert:
    def __init__(self, alert_type, severity, message, details=None):
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.utcnow()


class AlertRule:
    def __init__(self, name, enabled=True):
        self.name = name
        self.enabled = enabled
        self.last_alert_time = None
        self.alert_cooldown = timedelta(minutes=5)

    async def check(self):
        return None

    def should_alert(self):
        if self.last_alert_time is None:
            return True
        return datetime.utcnow() - self.last_alert_time > self.alert_cooldown

    async def evaluate(self):
        if not self.enabled:
            return None
        alert = await self.check()
        if alert and self.should_alert():
            self.last_alert_time = datetime.utcnow()
            return alert
        return None


class OAuthAuthenticationFailureRule(AlertRule):
    """Alert rule for high OAuth authentication failure rates."""

    def __init__(self, threshold=0.1, window_minutes=5, enabled=True):
        super().__init__("oauth_auth_failure", enabled)
        self.threshold = threshold  # 10% failure rate
        self.window_minutes = window_minutes

    async def check(self):
        """Check if OAuth authentication failure rate exceeds threshold."""
        try:
            # In a real implementation, you would query a time-series database
            # or use a sliding window counter. For now, we'll use the
            # prometheus_client metrics which accumulate over time.
            from prometheus_client import REGISTRY

            # Get OAuth connection metrics
            success_count = monitoring_metrics.oauth_connection_success_total._value.get()
            failure_count = sum(
                metric._value.get()
                for metric in monitoring_metrics.oauth_connection_failure_total._value.values()
            )

            total_attempts = success_count + failure_count
            if total_attempts == 0:
                return None

            failure_rate = failure_count / total_attempts
            if failure_rate > self.threshold:
                return Alert(
                    alert_type="oauth_auth_failure",
                    severity="high",
                    message=f"High OAuth authentication failure rate: {failure_rate:.2%} (threshold: {self.threshold:.2%})",
                    details={
                        "success_count": success_count,
                        "failure_count": failure_count,
                        "failure_rate": failure_rate,
                        "threshold": self.threshold,
                    },
                )
        except Exception as e:
            logger.error("oauth_auth_failure_rule_check_error", error=str(e))
        return None


class OAuthRateLimitRule(AlertRule):
    """Alert rule for OAuth rate limit approaching."""

    def __init__(self, threshold=10, window_minutes=5, enabled=True):
        super().__init__("oauth_rate_limit", enabled)
        self.threshold = threshold  # 10 rate limit hits in window

    async def check(self):
        """Check if OAuth rate limit hits exceed threshold."""
        try:
            # Get rate limit hits from metrics
            rate_limit_hits = monitoring_metrics.oauth_rate_limit_hits_total._value.get()

            if rate_limit_hits > self.threshold:
                return Alert(
                    alert_type="oauth_rate_limit",
                    severity="medium",
                    message=f"OAuth API rate limit approaching: {rate_limit_hits} hits detected",
                    details={
                        "rate_limit_hits": rate_limit_hits,
                        "threshold": self.threshold,
                    },
                )
        except Exception as e:
            logger.error("oauth_rate_limit_rule_check_error", error=str(e))
        return None


class OAuthTokenExpirationRule(AlertRule):
    """Alert rule for OAuth token expiration events."""

    def __init__(self, threshold=5, window_minutes=5, enabled=True):
        super().__init__("oauth_token_expiration", enabled)
        self.threshold = threshold  # 5 expiration events in window

    async def check(self):
        """Check if OAuth token expiration events exceed threshold."""
        try:
            # Get token expiration events from metrics
            expiration_count = monitoring_metrics.oauth_token_expiration_events._value.get()

            if expiration_count > self.threshold:
                return Alert(
                    alert_type="oauth_token_expiration",
                    severity="medium",
                    message=f"OAuth token expiration events detected: {expiration_count} events",
                    details={
                        "expiration_count": expiration_count,
                        "threshold": self.threshold,
                    },
                )
        except Exception as e:
            logger.error("oauth_token_expiration_rule_check_error", error=str(e))
        return None


class OAuthStorageErrorRule(AlertRule):
    """Alert rule for OAuth token storage errors."""

    def __init__(self, threshold=3, window_minutes=5, enabled=True):
        super().__init__("oauth_storage_error", enabled)
        self.threshold = threshold  # 3 storage errors in window

    async def check(self):
        """Check if OAuth token storage errors exceed threshold."""
        try:
            # Get storage errors from metrics
            storage_error_count = sum(
                metric._value.get()
                for metric in monitoring_metrics.oauth_storage_errors_total._value.values()
            )

            if storage_error_count > self.threshold:
                return Alert(
                    alert_type="oauth_storage_error",
                    severity="high",
                    message=f"OAuth token storage errors detected: {storage_error_count} errors",
                    details={
                        "storage_error_count": storage_error_count,
                        "threshold": self.threshold,
                    },
                )
        except Exception as e:
            logger.error("oauth_storage_error_rule_check_error", error=str(e))
        return None


class AlertManager:
    def __init__(self):
        self.rules = []
        self.handlers = []
        self.running = False
        self.check_interval = settings.alert_check_interval

    def add_rule(self, rule):
        self.rules.append(rule)

    def add_handler(self, handler):
        self.handlers.append(handler)

    def add_default_rules(self):
        """Add default alert rules."""
        # Add OAuth-specific alert rules
        self.add_rule(OAuthAuthenticationFailureRule())
        self.add_rule(OAuthRateLimitRule())
        self.add_rule(OAuthTokenExpirationRule())
        self.add_rule(OAuthStorageErrorRule())

    def add_default_handlers(self):
        self.add_handler(self.log_alert)

    def log_alert(self, alert):
        logger.warning(
            "alert_triggered",
            alert_type=alert.alert_type,
            severity=alert.severity,
            message=alert.message,
        )

    async def check_all_rules(self):
        alerts = []
        for rule in self.rules:
            try:
                alert = await rule.evaluate()
                if alert:
                    alerts.append(alert)
                    for handler in self.handlers:
                        try:
                            handler(alert)
                        except Exception:
                            pass
            except Exception:
                pass
        return alerts

    async def start(self):
        if not settings.enable_alerting:
            return
        self.running = True
        while self.running:
            await self.check_all_rules()
            import asyncio

            await asyncio.sleep(self.check_interval)

    def stop(self):
        self.running = False


alert_manager = AlertManager()


def setup_alerting():
    alert_manager.add_default_rules()
    alert_manager.add_default_handlers()
    return alert_manager
