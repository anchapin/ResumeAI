"""
Deployment Event Tracking Module

Tracks deployment lifecycle events including:
- Deployment start/complete/fail
- Rollback events
- Configuration changes
- Health status transitions
- Feature flag changes
"""

import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from collections import deque
import threading

from prometheus_client import Counter, Gauge, Histogram
from prometheus_client.registry import CollectorRegistry

from monitoring.logging_config import get_logger

logger = get_logger(__name__)

# Create a separate registry for deployment metrics
deployment_registry = CollectorRegistry()


class DeploymentStatus(str, Enum):
    """Deployment status states."""
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class DeploymentType(str, Enum):
    """Types of deployments."""
    INITIAL = "initial"
    ROLLING = "rolling"
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    ROLLBACK = "rollback"
    HOTFIX = "hotfix"


class EventType(str, Enum):
    """Deployment event types."""
    DEPLOYMENT_STARTED = "deployment_started"
    DEPLOYMENT_COMPLETED = "deployment_completed"
    DEPLOYMENT_FAILED = "deployment_failed"
    DEPLOYMENT_ROLLBACK = "deployment_rollback"
    CONFIG_CHANGED = "config_changed"
    FEATURE_FLAG_CHANGED = "feature_flag_changed"
    HEALTH_STATUS_CHANGED = "health_status_changed"
    SCALING_EVENT = "scaling_event"


@dataclass
class DeploymentEvent:
    """Represents a deployment event."""
    event_type: EventType
    timestamp: datetime
    deployment_id: str
    version: str
    status: DeploymentStatus
    environment: str
    deployment_type: DeploymentType
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None


@dataclass
class Deployment:
    """Represents a deployment with lifecycle tracking."""
    deployment_id: str
    version: str
    environment: str
    deployment_type: DeploymentType
    status: DeploymentStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate deployment duration in seconds."""
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


# Prometheus metrics for deployment observability
deployment_count = Counter(
    "deployment_count",
    "Total number of deployments",
    ["environment", "status", "deployment_type"],
    registry=deployment_registry,
)

deployment_duration_seconds = Histogram(
    "deployment_duration_seconds",
    "Deployment duration in seconds",
    ["environment", "deployment_type"],
    buckets=[1, 5, 10, 30, 60, 300, 600, 1800, 3600],
    registry=deployment_registry,
)

deployments_in_progress = Gauge(
    "deployments_in_progress",
    "Number of deployments currently in progress",
    ["environment"],
    registry=deployment_registry,
)


class DeploymentEventTracker:
    """
    Tracks deployment events and maintains deployment history.
    
    This class provides thread-safe tracking of deployment lifecycle events
    and exposes Prometheus metrics for monitoring.
    """

    def __init__(self, max_events: int = 1000, max_deployments: int = 100):
        """
        Initialize the deployment event tracker.
        
        Args:
            max_events: Maximum number of events to keep in memory
            max_deployments: Maximum number of deployments to keep in memory
        """
        self._events: deque = deque(maxlen=max_events)
        self._deployments: Dict[str, Deployment] = {}
        self._max_deployments = max_deployments
        self._lock = threading.RLock()

    def start_deployment(
        self,
        deployment_id: str,
        version: str,
        environment: str,
        deployment_type: DeploymentType = DeploymentType.ROLLING,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Deployment:
        """
        Record the start of a deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            version: Version being deployed
            environment: Target environment
            deployment_type: Type of deployment
            metadata: Additional metadata
            
        Returns:
            Deployment object
        """
        with self._lock:
            # Create deployment record
            deployment = Deployment(
                deployment_id=deployment_id,
                version=version,
                environment=environment,
                deployment_type=deployment_type,
                status=DeploymentStatus.IN_PROGRESS,
                started_at=datetime.utcnow(),
                metadata=metadata or {},
            )
            
            self._deployments[deployment_id] = deployment
            
            # Create event
            event = DeploymentEvent(
                event_type=EventType.DEPLOYMENT_STARTED,
                timestamp=datetime.utcnow(),
                deployment_id=deployment_id,
                version=version,
                status=DeploymentStatus.IN_PROGRESS,
                environment=environment,
                deployment_type=deployment_type,
                metadata=metadata or {},
            )
            self._events.append(event)
            
            # Update metrics
            deployment_count.labels(
                environment=environment,
                status=DeploymentStatus.IN_PROGRESS.value,
                deployment_type=deployment_type.value,
            ).inc()
            
            deployments_in_progress.labels(environment=environment).inc()
            
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
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Deployment]:
        """
        Record the completion of a deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            status: Final deployment status
            error_message: Error message if deployment failed
            metadata: Additional metadata
            
        Returns:
            Updated Deployment object or None if not found
        """
        with self._lock:
            deployment = self._deployments.get(deployment_id)
            if not deployment:
                logger.warning(
                    "deployment_not_found",
                    deployment_id=deployment_id,
                )
                return None
            
            # Update deployment
            deployment.status = status
            deployment.completed_at = datetime.utcnow()
            deployment.error_message = error_message
            
            if metadata:
                deployment.metadata.update(metadata)
            
            # Calculate duration
            duration = deployment.duration_seconds
            
            # Create event
            event_type = {
                DeploymentStatus.SUCCESS: EventType.DEPLOYMENT_COMPLETED,
                DeploymentStatus.FAILED: EventType.DEPLOYMENT_FAILED,
                DeploymentStatus.ROLLED_BACK: EventType.DEPLOYMENT_ROLLBACK,
            }.get(status, EventType.DEPLOYMENT_COMPLETED)
            
            event = DeploymentEvent(
                event_type=event_type,
                timestamp=datetime.utcnow(),
                deployment_id=deployment_id,
                version=deployment.version,
                status=status,
                environment=deployment.environment,
                deployment_type=deployment.deployment_type,
                metadata=metadata or {},
                error_message=error_message,
                duration_seconds=duration,
            )
            self._events.append(event)
            
            # Update metrics
            deployment_count.labels(
                environment=deployment.environment,
                status=status.value,
                deployment_type=deployment.deployment_type.value,
            ).inc()
            
            if duration:
                deployment_duration_seconds.labels(
                    environment=deployment.environment,
                    deployment_type=deployment.deployment_type.value,
                ).observe(duration)
            
            deployments_in_progress.labels(environment=deployment.environment).dec()
            
            logger.info(
                "deployment_completed",
                deployment_id=deployment_id,
                version=deployment.version,
                status=status.value,
                environment=deployment.environment,
                duration_seconds=duration,
            )
            
            # Cleanup old deployments
            self._cleanup_old_deployments()
            
            return deployment

    def record_event(
        self,
        event_type: EventType,
        deployment_id: str,
        version: str,
        status: DeploymentStatus,
        environment: str,
        deployment_type: DeploymentType,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> DeploymentEvent:
        """
        Record a generic deployment event.
        
        Args:
            event_type: Type of event
            deployment_id: Related deployment ID
            version: Version being deployed
            status: Current deployment status
            environment: Target environment
            deployment_type: Type of deployment
            metadata: Additional metadata
            error_message: Error message if applicable
            
        Returns:
            Created DeploymentEvent
        """
        event = DeploymentEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            deployment_id=deployment_id,
            version=version,
            status=status,
            environment=environment,
            deployment_type=deployment_type,
            metadata=metadata or {},
            error_message=error_message,
        )
        
        with self._lock:
            self._events.append(event)
        
        logger.info(
            "deployment_event_recorded",
            event_type=event_type.value,
            deployment_id=deployment_id,
            environment=environment,
        )
        
        return event

    def get_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """Get a specific deployment by ID."""
        with self._lock:
            return self._deployments.get(deployment_id)

    def get_deployments(
        self,
        environment: Optional[str] = None,
        status: Optional[DeploymentStatus] = None,
        limit: int = 10,
    ) -> List[Deployment]:
        """
        Get deployments with optional filtering.
        
        Args:
            environment: Filter by environment
            status: Filter by deployment status
            limit: Maximum number of deployments to return
            
        Returns:
            List of deployments
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
        environment: Optional[str] = None,
        event_type: Optional[EventType] = None,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[DeploymentEvent]:
        """
        Get deployment events with optional filtering.
        
        Args:
            environment: Filter by environment
            event_type: Filter by event type
            since: Filter events after this timestamp
            limit: Maximum number of events to return
            
        Returns:
            List of deployment events
        """
        with self._lock:
            events = list(self._events)
            
            if environment:
                events = [e for e in events if e.environment == environment]
            if event_type:
                events = [e for e in events if e.event_type == event_type]
            if since:
                events = [e for e in events if e.timestamp >= since]
                
            # Sort by timestamp, most recent first
            events.sort(key=lambda e: e.timestamp, reverse=True)
            
            return events[:limit]

    def get_deployment_stats(self, environment: str) -> Dict[str, Any]:
        """
        Get deployment statistics for an environment.
        
        Args:
            environment: Environment to get stats for
            
        Returns:
            Dictionary with deployment statistics
        """
        with self._lock:
            deployments = [
                d for d in self._deployments.values() 
                if d.environment == environment
            ]
            
            completed = [d for d in deployments if d.status == DeploymentStatus.SUCCESS]
            failed = [d for d in deployments if d.status == DeploymentStatus.FAILED]
            in_progress = [d for d in deployments if d.status == DeploymentStatus.IN_PROGRESS]
            
            durations = [
                d.duration_seconds for d in completed 
                if d.duration_seconds is not None
            ]
            
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            return {
                "environment": environment,
                "total_deployments": len(deployments),
                "successful": len(completed),
                "failed": len(failed),
                "in_progress": len(in_progress),
                "success_rate": len(completed) / len(deployments) if deployments else 0,
                "average_duration_seconds": round(avg_duration, 2),
                "total_events": len(self._events),
            }

    def _cleanup_old_deployments(self) -> None:
        """Remove old deployments to stay within max limit."""
        if len(self._deployments) > self._max_deployments:
            # Sort by start time and remove oldest
            sorted_deployments = sorted(
                self._deployments.items(),
                key=lambda x: x[1].started_at,
            )
            
            to_remove = len(self._deployments) - self._max_deployments
            for deployment_id, _ in sorted_deployments[:to_remove]:
                del self._deployments[deployment_id]


# Global deployment event tracker instance
deployment_event_tracker = DeploymentEventTracker()


def get_deployment_tracker() -> DeploymentEventTracker:
    """Get the global deployment event tracker instance."""
    return deployment_event_tracker
