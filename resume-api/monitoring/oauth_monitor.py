"""
OAuth Monitoring Module

Comprehensive monitoring for OAuth-related issues including:
- Endpoint health and uptime tracking
- OAuth failure rates and error patterns
- Token expiration and refresh tracking
- Suspicious activity detection (rate limiting, multiple failures)
- Metrics aggregation and analysis
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import threading

from monitoring import logging_config
from monitoring import metrics as monitoring_metrics

logger = logging_config.get_logger(__name__)


@dataclass
class OAuthEvent:
    """Represents an OAuth operation event."""

    timestamp: datetime
    provider: str
    event_type: str  # "connect", "disconnect", "token_refresh", "callback", etc.
    status: str  # "success", "failure", "rate_limited", "token_expired"
    user_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: float = 0.0
    ip_address: Optional[str] = None

    def to_dict(self):
        return asdict(self)


@dataclass
class OAuthMetricsSnapshot:
    """Snapshot of OAuth metrics at a point in time."""

    timestamp: datetime
    provider: str
    total_events: int = 0
    success_events: int = 0
    failure_events: int = 0
    rate_limit_events: int = 0
    token_expiration_events: int = 0
    avg_response_time_ms: float = 0.0
    success_rate: float = 0.0

    # Error breakdown
    error_counts: Dict[str, int] = field(default_factory=dict)

    # Top errors
    top_errors: List[Tuple[str, int]] = field(default_factory=list)


class OAuthMonitor:
    """
    Monitors OAuth operations and detects anomalies and issues.

    Features:
    - Real-time event tracking
    - Metrics aggregation over time windows
    - Suspicious activity detection
    - Rate limiting detection
    - Token expiration tracking
    """

    def __init__(self, alert_cooldown_minutes: int = 5):
        self.events: List[OAuthEvent] = []
        self.events_lock = threading.RLock()

        # Time window configurations (in minutes)
        self.short_window = 5
        self.medium_window = 15
        self.long_window = 60

        # Alert thresholds
        self.failure_rate_threshold = 0.15  # 15% failure rate
        self.rate_limit_hit_threshold = 5  # 5 rate limit hits
        self.token_expiration_threshold = 3  # 3 expiration events
        self.storage_error_threshold = 2  # 2 storage errors

        # Suspicious activity detection
        self.failed_attempts_threshold = 5  # 5 failed attempts from same IP
        self.suspicious_ip_window = 5  # Check within 5 minute window

        # Alert cooldown to prevent duplicate alerts
        self.alert_cooldown = timedelta(minutes=alert_cooldown_minutes)
        self.last_alerts: Dict[str, datetime] = {}

        # Suspicious IPs tracker
        self.failed_attempts_by_ip: Dict[str, List[datetime]] = defaultdict(list)

    def record_event(self, event: OAuthEvent) -> None:
        """Record an OAuth event."""
        with self.events_lock:
            self.events.append(event)

            # Update metrics based on event status
            if event.status == "success":
                monitoring_metrics.increment_oauth_connection_success(event.provider)
            elif event.status == "failure":
                monitoring_metrics.increment_oauth_connection_failure(
                    provider=event.provider, error_type=event.error_code or "unknown"
                )
                # Track failed attempt by IP for suspicious activity detection
                if event.ip_address:
                    self._track_failed_attempt(event.ip_address)
            elif event.status == "rate_limited":
                monitoring_metrics.increment_oauth_rate_limit_hits(event.provider)
            elif event.status == "token_expired":
                monitoring_metrics.increment_oauth_token_expiration_events(
                    event.provider
                )

            # Log the event
            logger.info(
                f"oauth_{event.event_type}",
                provider=event.provider,
                status=event.status,
                user_id=event.user_id,
                error_code=event.error_code,
                duration_ms=event.duration_ms,
                ip_address=event.ip_address,
            )

    def _track_failed_attempt(self, ip_address: str) -> None:
        """Track failed authentication attempts by IP."""
        now = datetime.now(timezone.utc)
        self.failed_attempts_by_ip[ip_address].append(now)

        # Clean up old entries outside the suspicious window
        cutoff = now - timedelta(minutes=self.suspicious_ip_window)
        self.failed_attempts_by_ip[ip_address] = [
            ts for ts in self.failed_attempts_by_ip[ip_address] if ts > cutoff
        ]

    def get_metrics_snapshot(
        self,
        provider: str = "github",
        window_minutes: int = 5,
        since: Optional[datetime] = None,
    ) -> OAuthMetricsSnapshot:
        """
        Get aggregated metrics for a time window.

        Args:
            provider: OAuth provider (e.g., "github")
            window_minutes: Time window in minutes
            since: Start time (defaults to window_minutes ago)

        Returns:
            OAuthMetricsSnapshot with aggregated metrics
        """
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

        with self.events_lock:
            # Filter events for the provider and time window
            relevant_events = [
                e
                for e in self.events
                if e.provider == provider and e.timestamp >= since
            ]

        snapshot = OAuthMetricsSnapshot(
            timestamp=datetime.now(timezone.utc),
            provider=provider,
        )

        if not relevant_events:
            return snapshot

        # Calculate metrics
        snapshot.total_events = len(relevant_events)

        success_count = sum(1 for e in relevant_events if e.status == "success")
        failure_count = sum(1 for e in relevant_events if e.status == "failure")
        rate_limit_count = sum(1 for e in relevant_events if e.status == "rate_limited")
        token_exp_count = sum(1 for e in relevant_events if e.status == "token_expired")

        snapshot.success_events = success_count
        snapshot.failure_events = failure_count
        snapshot.rate_limit_events = rate_limit_count
        snapshot.token_expiration_events = token_exp_count

        # Calculate success rate
        total_attempts = success_count + failure_count
        snapshot.success_rate = (
            success_count / total_attempts if total_attempts > 0 else 0.0
        )

        # Calculate average response time
        if relevant_events:
            avg_time = sum(e.duration_ms for e in relevant_events) / len(
                relevant_events
            )
            snapshot.avg_response_time_ms = avg_time

        # Aggregate error codes
        error_counts = defaultdict(int)
        for event in relevant_events:
            if event.error_code:
                error_counts[event.error_code] += 1

        snapshot.error_counts = dict(error_counts)
        snapshot.top_errors = sorted(
            error_counts.items(), key=lambda x: x[1], reverse=True
        )[:5]

        return snapshot

    def get_suspicious_ips(
        self, window_minutes: Optional[int] = None
    ) -> List[Tuple[str, int]]:
        """
        Detect suspicious IPs with multiple failed attempts.

        Returns:
            List of (IP address, failed attempt count) tuples
        """
        if window_minutes is None:
            window_minutes = self.suspicious_ip_window

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=window_minutes)

        suspicious = []
        for ip, attempts in self.failed_attempts_by_ip.items():
            # Count attempts in the window
            recent_attempts = [ts for ts in attempts if ts > cutoff]
            if len(recent_attempts) >= self.failed_attempts_threshold:
                suspicious.append((ip, len(recent_attempts)))

        return sorted(suspicious, key=lambda x: x[1], reverse=True)

    def detect_anomalies(self, provider: str = "github") -> List[Dict]:
        """
        Detect anomalies and issues with OAuth.

        Returns:
            List of anomaly dictionaries with type, severity, and details
        """
        anomalies = []

        # Check multiple time windows
        for window, window_name in [
            (self.short_window, "short_term"),
            (self.medium_window, "medium_term"),
        ]:
            metrics = self.get_metrics_snapshot(provider, window)

            # High failure rate
            if metrics.success_rate < (1 - self.failure_rate_threshold):
                anomalies.append(
                    {
                        "type": "high_failure_rate",
                        "severity": "high",
                        "window": window_name,
                        "window_minutes": window,
                        "success_rate": metrics.success_rate,
                        "threshold": 1 - self.failure_rate_threshold,
                        "details": {
                            "total_events": metrics.total_events,
                            "success_events": metrics.success_events,
                            "failure_events": metrics.failure_events,
                            "top_errors": metrics.top_errors,
                        },
                    }
                )

            # High rate limiting hits
            if metrics.rate_limit_events >= self.rate_limit_hit_threshold:
                anomalies.append(
                    {
                        "type": "rate_limit_detected",
                        "severity": "medium",
                        "window": window_name,
                        "window_minutes": window,
                        "rate_limit_hits": metrics.rate_limit_events,
                        "threshold": self.rate_limit_hit_threshold,
                    }
                )

            # High token expiration
            if metrics.token_expiration_events >= self.token_expiration_threshold:
                anomalies.append(
                    {
                        "type": "token_expiration_spike",
                        "severity": "medium",
                        "window": window_name,
                        "window_minutes": window,
                        "token_expiration_events": metrics.token_expiration_events,
                        "threshold": self.token_expiration_threshold,
                    }
                )

        # Check for suspicious IPs
        suspicious_ips = self.get_suspicious_ips()
        if suspicious_ips:
            anomalies.append(
                {
                    "type": "suspicious_activity",
                    "severity": "high",
                    "suspicious_ips": suspicious_ips,
                    "threshold": self.failed_attempts_threshold,
                    "window_minutes": self.suspicious_ip_window,
                }
            )

        return anomalies

    def get_health_status(self, provider: str = "github") -> Dict:
        """Get overall health status for OAuth."""
        short_metrics = self.get_metrics_snapshot(provider, self.short_window)
        medium_metrics = self.get_metrics_snapshot(provider, self.medium_window)

        # Determine health based on success rate
        is_healthy = short_metrics.success_rate >= (1 - self.failure_rate_threshold)

        return {
            "provider": provider,
            "healthy": is_healthy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "short_term": {
                "window_minutes": self.short_window,
                "total_events": short_metrics.total_events,
                "success_rate": short_metrics.success_rate,
                "avg_response_time_ms": short_metrics.avg_response_time_ms,
                "rate_limit_events": short_metrics.rate_limit_events,
                "token_expiration_events": short_metrics.token_expiration_events,
            },
            "medium_term": {
                "window_minutes": self.medium_window,
                "total_events": medium_metrics.total_events,
                "success_rate": medium_metrics.success_rate,
                "avg_response_time_ms": medium_metrics.avg_response_time_ms,
            },
            "anomalies": self.detect_anomalies(provider),
        }

    def cleanup_old_events(self, max_age_hours: int = 24) -> int:
        """
        Remove events older than max_age_hours.

        Returns:
            Number of events removed
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

        with self.events_lock:
            original_count = len(self.events)
            self.events = [e for e in self.events if e.timestamp > cutoff]
            removed = original_count - len(self.events)

        if removed > 0:
            logger.info("oauth_events_cleanup", removed_count=removed)

        return removed

    def reset(self) -> None:
        """Reset all monitoring data."""
        with self.events_lock:
            self.events.clear()
        self.failed_attempts_by_ip.clear()
        self.last_alerts.clear()


# Global monitor instance
oauth_monitor = OAuthMonitor()


def initialize_oauth_monitoring() -> OAuthMonitor:
    """Initialize OAuth monitoring."""
    logger.info("oauth_monitoring_initialized")
    return oauth_monitor
