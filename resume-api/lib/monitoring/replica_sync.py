"""
Database Replica Synchronization Monitor

Monitors replication lag, detects out-of-sync replicas, and alerts on replication issues.
Provides metrics for replication health and performance tracking.
"""

import asyncio
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
import json

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy import text

logger = logging.getLogger(__name__)


@dataclass
class ReplicationMetrics:
    """Metrics for a replica."""

    replica_url: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    is_healthy: bool = True
    lag_seconds: Optional[float] = None
    response_time_ms: Optional[float] = None
    binlog_position: Optional[str] = None
    relay_log_position: Optional[str] = None
    master_log_file: Optional[str] = None
    last_io_error: Optional[str] = None
    last_sql_error: Optional[str] = None
    threads_connected: Optional[int] = None
    questions: Optional[int] = None
    slow_queries: Optional[int] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        d = asdict(self)
        d['timestamp'] = self.timestamp.isoformat()
        return d

    def is_lagging(self, threshold_seconds: float = 5.0) -> bool:
        """Check if replica is lagging beyond threshold."""
        if self.lag_seconds is None:
            return False
        return self.lag_seconds > threshold_seconds


class ReplicationSyncMonitor:
    """
    Monitors database replication synchronization and health.

    Features:
    - Replication lag detection
    - Out-of-sync replica detection
    - Performance metrics collection
    - Alert generation
    """

    def __init__(self, check_interval: int = 30, lag_threshold: float = 5.0):
        """
        Initialize monitor.

        Args:
            check_interval: Seconds between health checks
            lag_threshold: Maximum acceptable replication lag in seconds
        """
        self.check_interval = check_interval
        self.lag_threshold = lag_threshold
        self.metrics_history: Dict[str, List[ReplicationMetrics]] = {}
        self.max_history_size = 1000  # Keep last 1000 metrics per replica
        self.is_running = False
        self.monitor_task: Optional[asyncio.Task] = None

    async def start_monitoring(self, replica_engines: Dict[str, AsyncEngine],
                              primary_engine: AsyncEngine):
        """
        Start continuous monitoring of replicas.

        Args:
            replica_engines: Dict of replica URL -> AsyncEngine
            primary_engine: Primary database engine
        """
        if self.is_running:
            logger.warning("Monitor already running")
            return

        self.is_running = True
        self.replica_engines = replica_engines
        self.primary_engine = primary_engine

        self.monitor_task = asyncio.create_task(
            self._monitoring_loop()
        )
        logger.info("Replication sync monitoring started")

    async def stop_monitoring(self):
        """Stop monitoring."""
        self.is_running = False
        if self.monitor_task:
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Replication sync monitoring stopped")

    async def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                await self._check_all_replicas()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.check_interval)

    async def _check_all_replicas(self):
        """Check all replicas and collect metrics."""
        tasks = []
        for url, engine in self.replica_engines.items():
            tasks.append(self._check_replica(url, engine))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_replica(self, replica_url: str, engine: AsyncEngine):
        """Check a single replica."""
        try:
            metrics = ReplicationMetrics(replica_url=replica_url)

            async with engine.connect() as conn:
                # Get replication status
                try:
                    result = await conn.execute(text("SHOW SLAVE STATUS"))
                    row = result.fetchone()

                    if row:
                        # Parse MySQL SHOW SLAVE STATUS output
                        # Field positions vary by MySQL version, use column names
                        row_dict = row._mapping if hasattr(row, '_mapping') else {}

                        metrics.lag_seconds = row_dict.get('Seconds_Behind_Master')
                        metrics.binlog_position = row_dict.get('Master_Log_Pos')
                        metrics.relay_log_position = row_dict.get('Relay_Log_Pos')
                        metrics.master_log_file = row_dict.get('Master_Log_File')
                        metrics.last_io_error = row_dict.get('Last_IO_Error')
                        metrics.last_sql_error = row_dict.get('Last_SQL_Error')

                        # Check for errors
                        if metrics.last_io_error or metrics.last_sql_error:
                            metrics.is_healthy = False
                except Exception:
                    # Not MySQL or slave not running
                    pass

                # Get general stats
                try:
                    result = await conn.execute(text("SHOW STATUS"))
                    rows = result.fetchall()
                    for row in rows:
                        row_dict = row._mapping if hasattr(row, '_mapping') else {}
                        if row_dict.get('Variable_name') == 'Threads_connected':
                            metrics.threads_connected = int(row_dict.get('Value', 0))
                        elif row_dict.get('Variable_name') == 'Questions':
                            metrics.questions = int(row_dict.get('Value', 0))
                        elif row_dict.get('Variable_name') == 'Slow_queries':
                            metrics.slow_queries = int(row_dict.get('Value', 0))
                except Exception:
                    pass

            # Store metrics
            self._store_metrics(metrics)

            # Check for alerts
            await self._check_for_alerts(metrics)

        except Exception as e:
            logger.error(f"Error checking replica {replica_url}: {e}")

    def _store_metrics(self, metrics: ReplicationMetrics):
        """Store metrics in history."""
        if metrics.replica_url not in self.metrics_history:
            self.metrics_history[metrics.replica_url] = []

        self.metrics_history[metrics.replica_url].append(metrics)

        # Trim history
        if len(self.metrics_history[metrics.replica_url]) > self.max_history_size:
            self.metrics_history[metrics.replica_url] = \
                self.metrics_history[metrics.replica_url][-self.max_history_size:]

    async def _check_for_alerts(self, metrics: ReplicationMetrics):
        """Check for alert conditions and generate alerts."""
        alerts = []

        # Check replication lag
        if metrics.is_lagging(self.lag_threshold):
            alerts.append(
                f"High replication lag detected: {metrics.lag_seconds}s "
                f"(threshold: {self.lag_threshold}s)"
            )

        # Check for replication errors
        if metrics.last_io_error:
            alerts.append(f"IO Error: {metrics.last_io_error}")

        if metrics.last_sql_error:
            alerts.append(f"SQL Error: {metrics.last_sql_error}")

        # Check health
        if not metrics.is_healthy:
            alerts.append("Replica health check failed")

        for alert in alerts:
            logger.warning(f"Alert for {metrics.replica_url}: {alert}")

    def get_latest_metrics(self) -> Dict[str, Optional[ReplicationMetrics]]:
        """Get latest metrics for all replicas."""
        latest = {}
        for replica_url, history in self.metrics_history.items():
            latest[replica_url] = history[-1] if history else None
        return latest

    def get_metrics_history(self, replica_url: str,
                           lookback_minutes: int = 60) -> List[ReplicationMetrics]:
        """
        Get metrics history for a replica.

        Args:
            replica_url: Replica URL
            lookback_minutes: How far back to look

        Returns:
            List of metrics within the time window
        """
        if replica_url not in self.metrics_history:
            return []

        cutoff = datetime.utcnow() - timedelta(minutes=lookback_minutes)
        return [
            m for m in self.metrics_history[replica_url]
            if m.timestamp >= cutoff
        ]

    def get_replication_stats(self) -> Dict:
        """Get overall replication statistics."""
        stats = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_replicas': len(self.metrics_history),
            'healthy_replicas': 0,
            'lagging_replicas': 0,
            'replicas': {}
        }

        for replica_url, history in self.metrics_history.items():
            if not history:
                continue

            latest = history[-1]
            replica_stats = {
                'is_healthy': latest.is_healthy,
                'lag_seconds': latest.lag_seconds,
                'response_time_ms': latest.response_time_ms,
                'threads_connected': latest.threads_connected,
                'slow_queries': latest.slow_queries,
            }

            stats['replicas'][replica_url] = replica_stats

            if latest.is_healthy:
                stats['healthy_replicas'] += 1

            if latest.is_lagging(self.lag_threshold):
                stats['lagging_replicas'] += 1

        return stats

    def export_metrics_json(self) -> str:
        """Export all metrics as JSON."""
        latest = self.get_latest_metrics()
        data = {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': {
                url: m.to_dict() if m else None
                for url, m in latest.items()
            }
        }
        return json.dumps(data, indent=2)

    async def export_metrics_prometheus(self) -> str:
        """Export metrics in Prometheus format."""
        lines = [
            "# HELP replication_lag_seconds Replication lag in seconds",
            "# TYPE replication_lag_seconds gauge",
        ]

        for replica_url, history in self.metrics_history.items():
            if not history:
                continue

            latest = history[-1]
            if latest.lag_seconds is not None:
                # Clean URL for Prometheus labels
                safe_url = replica_url.replace("://", "_").replace("/", "_")
                lines.append(
                    f'replication_lag_seconds{{replica="{safe_url}"}} {latest.lag_seconds}'
                )

        # Add replica health
        lines.append("# HELP replica_health Replica health status (1=healthy, 0=unhealthy)")
        lines.append("# TYPE replica_health gauge")

        for replica_url, history in self.metrics_history.items():
            if not history:
                continue

            latest = history[-1]
            safe_url = replica_url.replace("://", "_").replace("/", "_")
            health_value = 1 if latest.is_healthy else 0
            lines.append(
                f'replica_health{{replica="{safe_url}"}} {health_value}'
            )

        return "\n".join(lines)
