"""
Deployment Event Tracking Module

Provides comprehensive deployment observability including:
- Deployment lifecycle tracking
- Deployment event logging
- Prometheus metrics for deployments
- Health state transitions
- Feature flag change tracking
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
import threading


from prometheus_client import Counter, Gauge, Histogram

from monitoring.logging_config import get_logger

logger = get_logger(__name__)


class EventType(str, Enum):
    """Types of deployment events."""

    DEPLOYMENT_START = "deployment_start"
    DEPLOYMENT_COMPLETE = "deployment_complete"
    DEPLOYMENT_FAIL = "deployment_fail"
    DEPLOYMENT_ROLLBACK = "deployment_rollback"
    HEALTH_TRANSITION = "health_transition"
    FEATURE_FLAG_CHANGE = "feature_flag_change"
    CONFIG_CHANGE = "config_change"
    SCALING_EVENT = "scaling_event"


class DeploymentStatus(str, Enum):
    """Deployment status states."""

    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class DeploymentType(str, Enum):
    """Types of deployment strategies."""

    ROLLING = "rolling"
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    RECREATE = "recreate"


# Prometheus metrics for deployment observability
DEPLOYMENT_COUNT = Counter(
    "deployment_total",
    "Total number of deployments",
    ["environment", "status", "deployment_type"],
)

DEPLOYMENT_DURATION = Histogram(
    "deployment_duration_seconds",
    "Deployment duration in seconds",
    ["environment", "deployment_type"],
)

DEPLOYMENTS_IN_PROGRESS = Gauge(
    "deployments_in_progress",
    "Number of deployments currently in progress",
    ["environment"],
)

DEPLOYMENT_EVENTS = Counter(
    "deployment_events_total",
    "Total number of deployment events",
    ["environment", "event_type"],
)

HEALTH_TRANSITIONS = Counter(
    "health_transitions_total",
    "Total health state transitions",
    ["environment", "from_state", "to_state"],
)

FEATURE_FLAG_CHANGES = Counter(
    "feature_flag_changes_total",
    "Total feature flag changes",
    ["environment", "flag_name", "action"],
)


@dataclass
class Deployment:
    """Represents a single deployment instance."""

    deployment_id: str
    version: str
    environment: str
    deployment_type: DeploymentType
    status: DeploymentStatus = DeploymentStatus.IN_PROGRESS
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Dict[str, str] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate deployment duration in seconds."""
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


@dataclass
class DeploymentEvent:
    """Represents a deployment-related event."""

    event_type: EventType
    deployment_id: Optional[str]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    environment: str = "production"
    metadata: Dict[str, str] = field(default_factory=dict)


class DeploymentEventTracker:
    """
    Tracks deployment events and provides deployment observability.

    Thread-safe implementation that maintains in-memory state of deployments
    and emits Prometheus metrics.
    """

    def __init__(self, max_events: int = 1000, max_deployments: int = 100):
        self._deployments: Dict[str, Deployment] = {}
        self._events: List[DeploymentEvent] = []
        self._max_events = max_events
        self._max_deployments = max_deployments
        self._lock = threading.RLock()

    def start_deployment(
        self,
        deployment_id: str,
        version: str,
        environment: str,
        deployment_type: DeploymentType = DeploymentType.ROLLING,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Deployment:
        """
        Record the start of a deployment.

        Args:
            deployment_id: Unique identifier for the deployment
            version: Version being deployed
            environment: Target environment
            deployment_type: Type of deployment strategy
            metadata: Additional metadata

        Returns:
            Deployment object
        """
        with self._lock:
            deployment = Deployment(
                deployment_id=deployment_id,
                version=version,
                environment=environment,
                deployment_type=deployment_type,
                metadata=metadata or {},
            )

            self._deployments[deployment_id] = deployment

            # Clean up old deployments if needed
            self._cleanup_deployments()

            # Update metrics
            DEPLOYMENTS_IN_PROGRESS.labels(environment=environment).inc()
            DEPLOYMENT_COUNT.labels(
                environment=environment,
                status=DeploymentStatus.IN_PROGRESS.value,
                deployment_type=deployment_type.value,
            ).inc()

            # Record event
            self._record_event(
                EventType.DEPLOYMENT_START,
                deployment_id,
                environment,
                {"version": version, "type": deployment_type.value},
            )

            logger.info(
                "deployment_started",
                deployment_id=deployment_id,
                version=version,
                environment=environment,
                deployment_type=deployment_type.value,
            )

            return deployment

    def complete_deployment(
        self,
        deployment_id: str,
        status: DeploymentStatus,
        error_message: Optional[str] = None,
    ) -> Optional[Deployment]:
        """
        Record the completion of a deployment.

        Args:
            deployment_id: Unique identifier for the deployment
            status: Final deployment status
            error_message: Error message if failed

        Returns:
            Updated Deployment object or None if not found
        """
        with self._lock:
            deployment = self._deployments.get(deployment_id)
            if not deployment:
                logger.warning(
                    "completion_attempted_for_unknown_deployment", deployment_id=deployment_id
                )
                return None

            deployment.status = status
            deployment.completed_at = datetime.utcnow()
            deployment.error_message = error_message

            # Update metrics
            DEPLOYMENTS_IN_PROGRESS.labels(environment=deployment.environment).dec()

            if deployment.duration_seconds:
                DEPLOYMENT_DURATION.labels(
                    environment=deployment.environment,
                    deployment_type=deployment.deployment_type.value,
                ).observe(deployment.duration_seconds)

            DEPLOYMENT_COUNT.labels(
                environment=deployment.environment,
                status=status.value,
                deployment_type=deployment.deployment_type.value,
            ).inc()

            # Record event
            event_type = (
                EventType.DEPLOYMENT_COMPLETE
                if status == DeploymentStatus.SUCCESS
                else EventType.DEPLOYMENT_FAIL
            )
            self._record_event(
                event_type,
                deployment_id,
                deployment.environment,
                {
                    "version": deployment.version,
                    "status": status.value,
                    "duration_seconds": str(deployment.duration_seconds or 0),
                },
            )

            logger.info(
                "deployment_completed",
                deployment_id=deployment_id,
                status=status.value,
                duration_seconds=deployment.duration_seconds,
            )

            return deployment

    def record_health_transition(
        self,
        from_state: str,
        to_state: str,
        deployment_id: Optional[str] = None,
        environment: str = "production",
    ) -> None:
        """
        Record a health state transition.

        Args:
            from_state: Previous health state
            to_state: New health state
            deployment_id: Associated deployment ID
            environment: Environment name
        """
        with self._lock:
            HEALTH_TRANSITIONS.labels(
                environment=environment,
                from_state=from_state,
                to_state=to_state,
            ).inc()

            self._record_event(
                EventType.HEALTH_TRANSITION,
                deployment_id,
                environment,
                {"from_state": from_state, "to_state": to_state},
            )

            logger.info(
                "health_transition",
                from_state=from_state,
                to_state=to_state,
                deployment_id=deployment_id,
            )

    def record_feature_flag_change(
        self,
        flag_name: str,
        action: str,
        deployment_id: Optional[str] = None,
        environment: str = "production",
    ) -> None:
        """
        Record a feature flag change.

        Args:
            flag_name: Name of the feature flag
            action: Action performed (enabled, disabled, updated)
            deployment_id: Associated deployment ID
            environment: Environment name
        """
        with self._lock:
            FEATURE_FLAG_CHANGES.labels(
                environment=environment,
                flag_name=flag_name,
                action=action,
            ).inc()

            self._record_event(
                EventType.FEATURE_FLAG_CHANGE,
                deployment_id,
                environment,
                {"flag_name": flag_name, "action": action},
            )

            logger.info(
                "feature_flag_change",
                flag_name=flag_name,
                action=action,
                deployment_id=deployment_id,
            )

    def get_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """Get deployment by ID."""
        with self._lock:
            return self._deployments.get(deployment_id)

    def get_deployments(
        self,
        environment: Optional[str] = None,
        status: Optional[DeploymentStatus] = None,
        limit: int = 100,
    ) -> List[Deployment]:
        """
        Get deployments with optional filtering.

        Args:
            environment: Filter by environment
            status: Filter by status
            limit: Maximum number of deployments to return

        Returns:
            List of Deployment objects
        """
        with self._lock:
            deployments = list(self._deployments.values())

            if environment:
                deployments = [d for d in deployments if d.environment == environment]
            if status:
                deployments = [d for d in deployments if d.status == status]

            # Sort by start time, most recent first
            deployments.sort(key=lambda d: d.started_at, reverse=True)

            return deployments[:limit]

    def get_events(
        self,
        deployment_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
        limit: int = 100,
    ) -> List[DeploymentEvent]:
        """
        Get deployment events with optional filtering.

        Args:
            deployment_id: Filter by deployment ID
            event_type: Filter by event type
            limit: Maximum number of events to return

        Returns:
            List of DeploymentEvent objects
        """
        with self._lock:
            events = list(self._events)

            if deployment_id:
                events = [e for e in events if e.deployment_id == deployment_id]
            if event_type:
                events = [e for e in events if e.event_type == event_type]

            # Sort by timestamp, most recent first
            events.sort(key=lambda e: e.timestamp, reverse=True)

            return events[:limit]

    def get_stats(self, environment: Optional[str] = None) -> Dict:
        """
        Get deployment statistics.

        Args:
            environment: Optional environment filter

        Returns:
            Dictionary with deployment statistics
        """
        with self._lock:
            deployments = self.get_deployments(environment=environment)

            total = len(deployments)
            successful = len([d for d in deployments if d.status == DeploymentStatus.SUCCESS])
            failed = len([d for d in deployments if d.status == DeploymentStatus.FAILED])
            in_progress = len([d for d in deployments if d.status == DeploymentStatus.IN_PROGRESS])

            completed_deployments = [d for d in deployments if d.duration_seconds is not None]
            avg_duration = (
                sum(d.duration_seconds for d in completed_deployments) / len(completed_deployments)
                if completed_deployments
                else 0
            )

            return {
                "total_deployments": total,
                "successful": successful,
                "failed": failed,
                "in_progress": in_progress,
                "success_rate": successful / total if total > 0 else 0,
                "average_duration_seconds": avg_duration,
            }

    def _record_event(
        self,
        event_type: EventType,
        deployment_id: Optional[str],
        environment: str,
        metadata: Dict[str, str],
    ) -> None:
        """Internal method to record an event."""
        event = DeploymentEvent(
            event_type=event_type,
            deployment_id=deployment_id,
            environment=environment,
            metadata=metadata,
        )

        self._events.append(event)
        DEPLOYMENT_EVENTS.labels(
            environment=environment,
            event_type=event_type.value,
        ).inc()

        # Clean up old events if needed
        self._cleanup_events()

    def _cleanup_events(self) -> None:
        """Remove old events to prevent memory growth."""
        if len(self._events) > self._max_events:
            # Keep most recent events
            self._events = self._events[-self._max_events :]

    def _cleanup_deployments(self) -> None:
        """Remove old completed deployments to prevent memory growth."""
        if len(self._deployments) > self._max_deployments:
            # Get completed deployments sorted by completion time
            completed = [
                d for d in self._deployments.values() if d.status != DeploymentStatus.IN_PROGRESS
            ]
            completed.sort(key=lambda d: d.completed_at or d.started_at, reverse=True)

            # Keep only recent ones
            to_remove = completed[self._max_deployments :]
            for d in to_remove:
                del self._deployments[d.deployment_id]


# Global deployment event tracker instance
deployment_event_tracker = DeploymentEventTracker()


# Convenience functions that use the global tracker


def start_deployment(
    deployment_id: str,
    version: str,
    environment: str,
    deployment_type: DeploymentType = DeploymentType.ROLLING,
    metadata: Optional[Dict[str, str]] = None,
) -> Deployment:
    """Start tracking a new deployment."""
    return deployment_event_tracker.start_deployment(
        deployment_id=deployment_id,
        version=version,
        environment=environment,
        deployment_type=deployment_type,
        metadata=metadata,
    )


def complete_deployment(
    deployment_id: str,
    status: DeploymentStatus,
    error_message: Optional[str] = None,
) -> Optional[Deployment]:
    """Complete a deployment."""
    return deployment_event_tracker.complete_deployment(
        deployment_id=deployment_id,
        status=status,
        error_message=error_message,
    )


def record_health_transition(
    from_state: str,
    to_state: str,
    deployment_id: Optional[str] = None,
    environment: str = "production",
) -> None:
    """Record a health state transition."""
    deployment_event_tracker.record_health_transition(
        from_state=from_state,
        to_state=to_state,
        deployment_id=deployment_id,
        environment=environment,
    )


def record_feature_flag_change(
    flag_name: str,
    action: str,
    deployment_id: Optional[str] = None,
    environment: str = "production",
) -> None:
    """Record a feature flag change."""
    deployment_event_tracker.record_feature_flag_change(
        flag_name=flag_name,
        action=action,
        deployment_id=deployment_id,
        environment=environment,
    )


def get_deployment(deployment_id: str) -> Optional[Deployment]:
    """Get deployment by ID."""
    return deployment_event_tracker.get_deployment(deployment_id)


def get_deployments(
    environment: Optional[str] = None,
    status: Optional[DeploymentStatus] = None,
    limit: int = 100,
) -> List[Deployment]:
    """Get deployments with optional filtering."""
    return deployment_event_tracker.get_deployments(
        environment=environment,
        status=status,
        limit=limit,
    )


def get_events(
    deployment_id: Optional[str] = None,
    event_type: Optional[EventType] = None,
    limit: int = 100,
) -> List[DeploymentEvent]:
    """Get deployment events with optional filtering."""
    return deployment_event_tracker.get_events(
        deployment_id=deployment_id,
        event_type=event_type,
        limit=limit,
    )


def get_deployment_stats(environment: Optional[str] = None) -> Dict:
    """Get deployment statistics."""
    return deployment_event_tracker.get_stats(environment=environment)
