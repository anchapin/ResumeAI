"""
Database Migration Helpers

Helpers for applying migrations to primary and verifying replica synchronization.
Includes rollback support and replica catchup monitoring.
"""

import asyncio
import logging
from typing import List, Optional, Callable
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy import text

logger = logging.getLogger(__name__)


class MigrationManager:
    """
    Manages database migrations with replica synchronization support.

    Features:
    - Apply migrations to primary
    - Verify replica catchup
    - Rollback support
    - Migration history tracking
    """

    def __init__(
        self,
        primary_engine: AsyncEngine,
        replica_engines: dict,
        check_interval: float = 1.0,
        timeout_seconds: float = 300.0,
        lag_threshold: float = 1.0,
    ):
        """
        Initialize migration manager.

        Args:
            primary_engine: Primary database engine
            replica_engines: Dict of replica URL -> AsyncEngine
            check_interval: Seconds between lag checks
            timeout_seconds: Maximum time to wait for replica catchup
            lag_threshold: Maximum acceptable replication lag in seconds
        """
        self.primary_engine = primary_engine
        self.replica_engines = replica_engines
        self.check_interval = check_interval
        self.timeout_seconds = timeout_seconds
        self.lag_threshold = lag_threshold
        self.migration_history: List[dict] = []

    async def apply_migration(
        self,
        migration_func: Callable,
        description: str = "",
        verify_replicas: bool = True,
        rollback_func: Optional[Callable] = None,
    ) -> bool:
        """
        Apply a migration to primary and optionally wait for replicas.

        Args:
            migration_func: Async function that performs the migration
            description: Description of the migration
            verify_replicas: Whether to wait for replicas to catch up
            rollback_func: Optional async function to rollback migration

        Returns:
            True if migration succeeded, False otherwise
        """
        start_time = datetime.utcnow()
        migration_id = f"{start_time.isoformat()}_{description}"

        try:
            # Apply migration to primary
            logger.info(f"Starting migration: {description}")
            await migration_func()
            logger.info(f"Migration applied to primary: {description}")

            # Optionally wait for replicas
            if verify_replicas and self.replica_engines:
                success = await self.wait_for_replica_catchup(
                    migration_id, timeout=self.timeout_seconds
                )

                if not success:
                    logger.error(
                        f"Migration {description} not replicated to all replicas"
                    )

                    # Attempt rollback if provided
                    if rollback_func:
                        try:
                            logger.info(f"Rolling back migration: {description}")
                            await rollback_func()
                            logger.info(f"Rollback completed: {description}")
                        except Exception as e:
                            logger.error(f"Rollback failed: {e}")

                    return False

            # Record migration
            self.migration_history.append(
                {
                    "id": migration_id,
                    "description": description,
                    "timestamp": start_time.isoformat(),
                    "success": True,
                }
            )

            return True

        except Exception as e:
            logger.error(f"Migration failed: {e}")

            # Attempt rollback
            if rollback_func:
                try:
                    logger.info(f"Rolling back migration: {description}")
                    await rollback_func()
                    logger.info(f"Rollback completed: {description}")
                except Exception as rb_error:
                    logger.error(f"Rollback failed: {rb_error}")

            self.migration_history.append(
                {
                    "id": migration_id,
                    "description": description,
                    "timestamp": start_time.isoformat(),
                    "success": False,
                    "error": str(e),
                }
            )

            return False

    async def wait_for_replica_catchup(
        self, migration_id: str, timeout: float = 300.0
    ) -> bool:
        """
        Wait for all replicas to catch up with migration.

        Args:
            migration_id: ID of the migration for tracking
            timeout: Maximum seconds to wait

        Returns:
            True if all replicas caught up, False if timeout
        """
        start_time = datetime.utcnow()

        while True:
            elapsed = (datetime.utcnow() - start_time).total_seconds()

            if elapsed > timeout:
                logger.warning(f"Timeout waiting for replicas to catch up ({elapsed}s)")
                return False

            # Check lag on all replicas
            all_caught_up = True
            for replica_url, engine in self.replica_engines.items():
                lag = await self._get_replication_lag(engine)

                if lag is None:
                    # Can't determine lag, assume caught up
                    continue

                if lag > self.lag_threshold:
                    all_caught_up = False
                    logger.debug(
                        f"Replica {replica_url} lag: {lag}s "
                        f"(threshold: {self.lag_threshold}s)"
                    )
                    break

            if all_caught_up:
                logger.info("All replicas have caught up")
                return True

            await asyncio.sleep(self.check_interval)

    async def _get_replication_lag(self, engine: AsyncEngine) -> Optional[float]:
        """
        Get current replication lag for a replica.

        Args:
            engine: Replica engine

        Returns:
            Lag in seconds, or None if unavailable
        """
        try:
            async with engine.connect() as conn:
                result = await conn.execute(text("SHOW SLAVE STATUS"))
                row = result.fetchone()

                if row:
                    row_dict = row._mapping if hasattr(row, "_mapping") else {}
                    lag = row_dict.get("Seconds_Behind_Master")
                    if lag is not None:
                        return float(lag)

                return None
        except Exception as e:
            logger.debug(f"Could not get replication lag: {e}")
            return None

    async def verify_replication_state(self) -> dict:
        """
        Verify current replication state across all replicas.

        Returns:
            Dict with replication status for each replica
        """
        state = {"timestamp": datetime.utcnow().isoformat(), "replicas": {}}

        for replica_url, engine in self.replica_engines.items():
            try:
                async with engine.connect() as conn:
                    # Get slave status
                    result = await conn.execute(text("SHOW SLAVE STATUS"))
                    row = result.fetchone()

                    if row:
                        row_dict = row._mapping if hasattr(row, "_mapping") else {}
                        state["replicas"][replica_url] = {
                            "is_running": True,
                            "lag_seconds": row_dict.get("Seconds_Behind_Master"),
                            "master_log_file": row_dict.get("Master_Log_File"),
                            "relay_log_file": row_dict.get("Relay_Master_Log_File"),
                            "seconds_behind_master": row_dict.get(
                                "Seconds_Behind_Master"
                            ),
                            "io_running": row_dict.get("Slave_IO_Running"),
                            "sql_running": row_dict.get("Slave_SQL_Running"),
                        }
                    else:
                        state["replicas"][replica_url] = {"is_running": False}

            except Exception as e:
                state["replicas"][replica_url] = {"error": str(e), "is_running": False}

        return state

    def get_migration_history(self) -> List[dict]:
        """Get history of migrations."""
        return self.migration_history.copy()

    async def health_check(self) -> bool:
        """
        Perform health check on primary and replicas.

        Returns:
            True if all databases are healthy
        """
        try:
            # Check primary
            async with self.primary_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))

            # Check replicas
            for engine in self.replica_engines.values():
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))

            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


class BatchMigrationManager:
    """
    Manages batched migrations for large tables.

    Applies migrations in batches to avoid locking tables for extended periods.
    """

    def __init__(
        self,
        primary_engine: AsyncEngine,
        batch_size: int = 1000,
        delay_between_batches: float = 0.1,
    ):
        """
        Initialize batch migration manager.

        Args:
            primary_engine: Primary database engine
            batch_size: Number of rows per batch
            delay_between_batches: Delay in seconds between batches
        """
        self.primary_engine = primary_engine
        self.batch_size = batch_size
        self.delay_between_batches = delay_between_batches

    async def migrate_table_in_batches(
        self, table_name: str, migration_func: Callable, id_column: str = "id"
    ) -> int:
        """
        Apply migration to table in batches.

        Args:
            table_name: Name of table to migrate
            migration_func: Async function(session, ids) to apply migration
            id_column: Name of ID column to batch on

        Returns:
            Total number of rows migrated
        """
        total_migrated = 0
        offset = 0

        while True:
            # Get batch of IDs
            async with self.primary_engine.begin() as conn:
                result = await conn.execute(
                    text(f"""
                        SELECT {id_column} FROM {table_name}
                        ORDER BY {id_column}
                        LIMIT :limit OFFSET :offset
                    """),
                    {"limit": self.batch_size, "offset": offset},
                )
                rows = result.fetchall()

            if not rows:
                break

            ids = [row[0] for row in rows]

            # Apply migration to batch
            try:
                async with self.primary_engine.begin() as conn:
                    await migration_func(conn, ids)
                total_migrated += len(ids)
                logger.info(
                    f"Migrated batch: {offset}-{offset + len(ids)} "
                    f"({total_migrated} total)"
                )
            except Exception as e:
                logger.error(f"Batch migration failed at offset {offset}: {e}")
                raise

            offset += self.batch_size

            # Delay to avoid overwhelming the database
            if self.delay_between_batches > 0:
                await asyncio.sleep(self.delay_between_batches)

        return total_migrated
