"""
Database Read Replica Configuration and Management

Implements read replica pooling, health checks, and failover for improved
scalability and read performance.
"""

import asyncio
import os
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy import text

logger = logging.getLogger(__name__)


@dataclass
class ReplicaConfig:
    """Configuration for a single read replica."""

    url: str
    name: str = "replica"
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False

    def __hash__(self):
        return hash(self.url)

    def __eq__(self, other):
        if not isinstance(other, ReplicaConfig):
            return False
        return self.url == other.url


@dataclass
class ReplicaHealth:
    """Health status of a replica."""

    is_healthy: bool = True
    last_check_at: datetime = field(default_factory=datetime.utcnow)
    error_count: int = 0
    lag_seconds: Optional[float] = None
    response_time_ms: Optional[float] = None
    consecutive_failures: int = 0

    def mark_healthy(
        self, lag: Optional[float] = None, response_time: Optional[float] = None
    ):
        """Mark replica as healthy."""
        self.is_healthy = True
        self.last_check_at = datetime.utcnow()
        self.consecutive_failures = 0
        self.lag_seconds = lag
        self.response_time_ms = response_time
        self.error_count = 0

    def mark_unhealthy(self, error: str = ""):
        """Mark replica as unhealthy."""
        self.is_healthy = False
        self.last_check_at = datetime.utcnow()
        self.consecutive_failures += 1
        self.error_count += 1
        logger.warning(f"Replica marked unhealthy: {error}")


class ReplicaPool:
    """Manages a pool of read replicas with health monitoring and failover."""

    def __init__(
        self, primary_url: str, replicas: Optional[List[ReplicaConfig]] = None
    ):
        """
        Initialize replica pool.

        Args:
            primary_url: Primary database URL (write operations)
            replicas: List of replica configurations
        """
        self.primary_url = primary_url
        self.primary_engine: Optional[AsyncEngine] = None
        self.replica_engines: Dict[str, AsyncEngine] = {}
        self.replica_configs: Dict[str, ReplicaConfig] = {}
        self.replica_health: Dict[str, ReplicaHealth] = {}
        self.replica_index = 0  # For round-robin

        # Load replicas from environment if not provided
        if replicas is None:
            replicas = self._load_replicas_from_env()

        for replica_config in replicas:
            self.replica_configs[replica_config.url] = replica_config
            self.replica_health[replica_config.url] = ReplicaHealth()

    def _load_replicas_from_env(self) -> List[ReplicaConfig]:
        """Load replica configurations from environment variables."""
        replicas = []
        replica_urls = os.getenv("DATABASE_REPLICA_URLS", "").split(",")

        for i, url in enumerate(replica_urls):
            url = url.strip()
            if url:
                config = ReplicaConfig(
                    url=url,
                    name=f"replica_{i}",
                    pool_size=int(os.getenv(f"REPLICA_POOL_SIZE_{i}", "10")),
                    max_overflow=int(os.getenv(f"REPLICA_MAX_OVERFLOW_{i}", "20")),
                    pool_timeout=int(os.getenv(f"REPLICA_POOL_TIMEOUT_{i}", "30")),
                    echo=os.getenv("DATABASE_ECHO", "false").lower() == "true",
                )
                replicas.append(config)

        return replicas

    async def initialize(self):
        """Initialize all database engines (primary and replicas)."""
        # Initialize primary
        self.primary_engine = create_async_engine(
            self.primary_url,
            echo=os.getenv("DATABASE_ECHO", "false").lower() == "true",
        )

        # Initialize replicas
        for url, config in self.replica_configs.items():
            self.replica_engines[url] = create_async_engine(
                url,
                pool_size=config.pool_size,
                max_overflow=config.max_overflow,
                pool_timeout=config.pool_timeout,
                pool_recycle=config.pool_recycle,
                echo=config.echo,
            )

        logger.info(
            f"Initialized replica pool with {len(self.replica_engines)} replicas"
        )

    async def close(self):
        """Close all database connections."""
        if self.primary_engine:
            await self.primary_engine.dispose()

        for engine in self.replica_engines.values():
            await engine.dispose()

    async def health_check(self, timeout: int = 5) -> Dict[str, bool]:
        """
        Check health of all replicas.

        Returns:
            Dict mapping replica URLs to health status
        """
        health_status = {}

        # Check primary
        primary_healthy = await self._check_replica_health(
            self.primary_engine, self.primary_url, timeout=timeout
        )
        health_status[self.primary_url] = primary_healthy

        # Check all replicas
        for url, engine in self.replica_engines.items():
            is_healthy = await self._check_replica_health(engine, url, timeout=timeout)
            health_status[url] = is_healthy

        return health_status

    async def _check_replica_health(
        self, engine: AsyncEngine, url: str, timeout: int = 5
    ) -> bool:
        """Check if a single replica is healthy."""
        try:
            async with asyncio.timeout(timeout):
                async with engine.connect() as conn:
                    start = datetime.utcnow()
                    await conn.execute(text("SELECT 1"))
                    elapsed = (datetime.utcnow() - start).total_seconds() * 1000

                    # Try to check replication lag for actual replicas
                    lag = None
                    if url != self.primary_url:
                        try:
                            result = await conn.execute(text("SHOW SLAVE STATUS"))
                            row = result.fetchone()
                            if row and len(row) > 32:  # Seconds_Behind_Master position
                                lag = float(row[32])
                        except Exception:
                            # Not MySQL or command not available
                            pass

                    if url in self.replica_health:
                        self.replica_health[url].mark_healthy(
                            lag=lag, response_time=elapsed
                        )

                    return True
        except asyncio.TimeoutError:
            logger.warning(f"Health check timeout for {url}")
            if url in self.replica_health:
                self.replica_health[url].mark_unhealthy("timeout")
            return False
        except Exception as e:
            logger.warning(f"Health check failed for {url}: {e}")
            if url in self.replica_health:
                self.replica_health[url].mark_unhealthy(str(e))
            return False

    async def get_read_engine(self) -> AsyncEngine:
        """
        Get an engine for read operations.

        Uses round-robin load balancing across healthy replicas.
        Falls back to primary if no replicas are available.
        """
        if not self.replica_engines:
            return self.primary_engine

        # Get list of healthy replicas
        healthy_replicas = [
            url
            for url, health in self.replica_health.items()
            if health.is_healthy and url in self.replica_engines
        ]

        if not healthy_replicas:
            logger.warning("No healthy replicas available, using primary for reads")
            return self.primary_engine

        # Round-robin selection
        selected_url = healthy_replicas[self.replica_index % len(healthy_replicas)]
        self.replica_index += 1

        return self.replica_engines[selected_url]

    async def get_write_engine(self) -> AsyncEngine:
        """Get engine for write operations (always primary)."""
        return self.primary_engine

    def get_replica_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all replicas."""
        status = {}

        for url, health in self.replica_health.items():
            is_primary = url == self.primary_url
            status[url] = {
                "is_primary": is_primary,
                "is_healthy": health.is_healthy,
                "last_check": health.last_check_at.isoformat(),
                "error_count": health.error_count,
                "consecutive_failures": health.consecutive_failures,
                "lag_seconds": health.lag_seconds,
                "response_time_ms": health.response_time_ms,
            }

        return status

    def has_healthy_replicas(self) -> bool:
        """Check if any replicas are healthy."""
        return any(
            health.is_healthy and url != self.primary_url
            for url, health in self.replica_health.items()
        )


def create_replica_pool_from_env() -> ReplicaPool:
    """Create a replica pool from environment variables."""
    primary_url = os.getenv(
        "DATABASE_URL", "postgresql+asyncpg://user:password@localhost/resumeai"
    )

    return ReplicaPool(primary_url)
