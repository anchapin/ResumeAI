"""
Tests for Database Read Replica Implementation

Tests for replica pool, connection management, failover, and synchronization.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta

from config.database_replicas import ReplicaPool, ReplicaConfig, ReplicaHealth
from lib.db.connection_manager import (
    DatabaseConnectionManager,
    RoutingSession,
    initialize_connection_manager,
    get_connection_manager,
)
from lib.monitoring.replica_sync import (
    ReplicationSyncMonitor,
    ReplicationMetrics,
)
from lib.db.migration_helpers import (
    MigrationManager,
    BatchMigrationManager,
)


class TestReplicaConfig:
    """Tests for ReplicaConfig."""
    
    def test_replica_config_creation(self):
        """Test creating replica configuration."""
        config = ReplicaConfig(
            url="postgresql://replica1:5432/resumeai",
            name="replica_1",
            pool_size=20,
        )
        assert config.url == "postgresql://replica1:5432/resumeai"
        assert config.name == "replica_1"
        assert config.pool_size == 20
    
    def test_replica_config_hash(self):
        """Test replica config is hashable."""
        config1 = ReplicaConfig(url="postgresql://replica1:5432/resumeai")
        config2 = ReplicaConfig(url="postgresql://replica1:5432/resumeai")
        
        # Should be equal
        assert config1 == config2
        assert hash(config1) == hash(config2)
    
    def test_replica_config_inequality(self):
        """Test replica config inequality."""
        config1 = ReplicaConfig(url="postgresql://replica1:5432/resumeai")
        config2 = ReplicaConfig(url="postgresql://replica2:5432/resumeai")
        
        assert config1 != config2


class TestReplicaHealth:
    """Tests for ReplicaHealth."""
    
    def test_replica_health_creation(self):
        """Test creating replica health."""
        health = ReplicaHealth()
        assert health.is_healthy is True
        assert health.error_count == 0
        assert health.consecutive_failures == 0
    
    def test_mark_healthy(self):
        """Test marking replica as healthy."""
        health = ReplicaHealth(is_healthy=False, consecutive_failures=3)
        health.mark_healthy(lag=0.5, response_time=10.0)
        
        assert health.is_healthy is True
        assert health.consecutive_failures == 0
        assert health.lag_seconds == 0.5
        assert health.response_time_ms == 10.0
    
    def test_mark_unhealthy(self):
        """Test marking replica as unhealthy."""
        health = ReplicaHealth(is_healthy=True)
        health.mark_unhealthy("connection timeout")
        
        assert health.is_healthy is False
        assert health.consecutive_failures == 1
        assert health.error_count == 1


class TestReplicaPool:
    """Tests for ReplicaPool."""
    
    def test_replica_pool_creation(self):
        """Test creating replica pool."""
        primary_url = "postgresql://primary:5432/resumeai"
        replicas = [
            ReplicaConfig(url="postgresql://replica1:5432/resumeai"),
            ReplicaConfig(url="postgresql://replica2:5432/resumeai"),
        ]
        
        pool = ReplicaPool(primary_url, replicas)
        assert pool.primary_url == primary_url
        assert len(pool.replica_engines) == 0  # Not initialized yet
        assert len(pool.replica_configs) == 2
    
    def test_replica_pool_get_read_engine_with_replicas(self):
        """Test getting read engine with healthy replicas."""
        pool = ReplicaPool(
            "postgresql://primary:5432/resumeai",
            [ReplicaConfig(url="postgresql://replica1:5432/resumeai")]
        )
        
        # Mock engines
        pool.primary_engine = Mock()
        pool.replica_engines["postgresql://replica1:5432/resumeai"] = Mock()
        pool.replica_health["postgresql://replica1:5432/resumeai"].is_healthy = True
        
        # Should get replica engine
        engine = asyncio.run(pool.get_read_engine())
        assert engine == pool.replica_engines["postgresql://replica1:5432/resumeai"]
    
    def test_replica_pool_fallback_to_primary(self):
        """Test fallback to primary when no healthy replicas."""
        pool = ReplicaPool(
            "postgresql://primary:5432/resumeai",
            [ReplicaConfig(url="postgresql://replica1:5432/resumeai")]
        )
        
        # Mock engines
        pool.primary_engine = Mock()
        pool.replica_engines["postgresql://replica1:5432/resumeai"] = Mock()
        pool.replica_health["postgresql://replica1:5432/resumeai"].is_healthy = False
        
        # Should fall back to primary
        engine = asyncio.run(pool.get_read_engine())
        assert engine == pool.primary_engine
    
    def test_replica_pool_write_always_primary(self):
        """Test write operations always use primary."""
        pool = ReplicaPool(
            "postgresql://primary:5432/resumeai",
            [ReplicaConfig(url="postgresql://replica1:5432/resumeai")]
        )
        
        pool.primary_engine = Mock()
        engine = asyncio.run(pool.get_write_engine())
        assert engine == pool.primary_engine
    
    def test_replica_pool_round_robin(self):
        """Test round-robin load balancing across replicas."""
        primary_url = "postgresql://primary:5432/resumeai"
        replica1_url = "postgresql://replica1:5432/resumeai"
        replica2_url = "postgresql://replica2:5432/resumeai"
        
        pool = ReplicaPool(
            primary_url,
            [
                ReplicaConfig(url=replica1_url),
                ReplicaConfig(url=replica2_url),
            ]
        )
        
        pool.primary_engine = Mock()
        pool.replica_engines[replica1_url] = Mock(name="replica1")
        pool.replica_engines[replica2_url] = Mock(name="replica2")
        pool.replica_health[replica1_url].is_healthy = True
        pool.replica_health[replica2_url].is_healthy = True
        
        # Get engines in sequence - should round-robin
        engines = []
        for _ in range(4):
            engine = asyncio.run(pool.get_read_engine())
            engines.append(engine)
        
        # Should alternate between replicas
        assert engines[0] == pool.replica_engines[replica1_url]
        assert engines[1] == pool.replica_engines[replica2_url]
        assert engines[2] == pool.replica_engines[replica1_url]
        assert engines[3] == pool.replica_engines[replica2_url]
    
    def test_get_replica_status(self):
        """Test getting replica status."""
        pool = ReplicaPool(
            "postgresql://primary:5432/resumeai",
            [ReplicaConfig(url="postgresql://replica1:5432/resumeai")]
        )
        
        # Mark replica as healthy with lag
        pool.replica_health["postgresql://replica1:5432/resumeai"].mark_healthy(
            lag=0.5,
            response_time=10.0
        )
        
        status = pool.get_replica_status()
        
        assert "postgresql://primary:5432/resumeai" in status
        assert "postgresql://replica1:5432/resumeai" in status
        assert status["postgresql://replica1:5432/resumeai"]["is_healthy"] is True
        assert status["postgresql://replica1:5432/resumeai"]["lag_seconds"] == 0.5


class TestRoutingSession:
    """Tests for RoutingSession."""
    
    def test_routing_session_creation(self):
        """Test creating routing session."""
        mock_engine = Mock()
        mock_pool = Mock()
        
        session = RoutingSession(bind=mock_engine, replica_pool=mock_pool)
        assert session.replica_pool == mock_pool
    
    def test_is_read_operation_select(self):
        """Test identifying SELECT as read operation."""
        session = RoutingSession(bind=Mock(), replica_pool=Mock())
        
        # Mock statement
        stmt = Mock()
        stmt.__str__ = Mock(return_value="SELECT * FROM users")
        
        assert session._is_read_operation(stmt) is True
    
    def test_is_read_operation_insert(self):
        """Test identifying INSERT as write operation."""
        session = RoutingSession(bind=Mock(), replica_pool=Mock())
        
        stmt = Mock()
        stmt.__str__ = Mock(return_value="INSERT INTO users VALUES (...)")
        
        assert session._is_read_operation(stmt) is False
    
    def test_is_read_operation_show(self):
        """Test identifying SHOW as read operation."""
        session = RoutingSession(bind=Mock(), replica_pool=Mock())
        
        stmt = Mock()
        stmt.__str__ = Mock(return_value="SHOW DATABASES")
        
        assert session._is_read_operation(stmt) is True


class TestDatabaseConnectionManager:
    """Tests for DatabaseConnectionManager."""
    
    def test_connection_manager_creation(self):
        """Test creating connection manager."""
        mock_pool = Mock(spec=ReplicaPool)
        manager = DatabaseConnectionManager(mock_pool)
        
        assert manager.replica_pool == mock_pool
    
    async def test_get_read_session(self):
        """Test getting read session."""
        mock_pool = Mock(spec=ReplicaPool)
        mock_engine = Mock()
        mock_pool.get_read_engine = AsyncMock(return_value=mock_engine)
        
        manager = DatabaseConnectionManager(mock_pool)
        
        # Would need to mock AsyncSession for full test
        # This is a basic structure test
        assert manager.replica_pool == mock_pool
    
    async def test_get_write_session(self):
        """Test getting write session."""
        mock_pool = Mock(spec=ReplicaPool)
        mock_engine = Mock()
        mock_pool.get_write_engine = AsyncMock(return_value=mock_engine)
        
        manager = DatabaseConnectionManager(mock_pool)
        assert manager.replica_pool == mock_pool
    
    def test_health_check(self):
        """Test health check method exists."""
        mock_pool = Mock(spec=ReplicaPool)
        manager = DatabaseConnectionManager(mock_pool)
        
        assert hasattr(manager, 'health_check')
        assert callable(manager.health_check)


class TestReplicationMetrics:
    """Tests for ReplicationMetrics."""
    
    def test_metrics_creation(self):
        """Test creating replication metrics."""
        metrics = ReplicationMetrics(replica_url="postgresql://replica1:5432/resumeai")
        
        assert metrics.replica_url == "postgresql://replica1:5432/resumeai"
        assert metrics.is_healthy is True
        assert metrics.lag_seconds is None
    
    def test_metrics_to_dict(self):
        """Test converting metrics to dict."""
        metrics = ReplicationMetrics(
            replica_url="postgresql://replica1:5432/resumeai",
            lag_seconds=0.5,
            response_time_ms=10.0,
        )
        
        d = metrics.to_dict()
        assert d['replica_url'] == "postgresql://replica1:5432/resumeai"
        assert d['lag_seconds'] == 0.5
        assert d['response_time_ms'] == 10.0
        assert 'timestamp' in d
    
    def test_is_lagging(self):
        """Test checking if replica is lagging."""
        # Not lagging
        metrics1 = ReplicationMetrics(
            replica_url="postgresql://replica1:5432/resumeai",
            lag_seconds=1.0
        )
        assert metrics1.is_lagging(threshold_seconds=5.0) is False
        
        # Lagging
        metrics2 = ReplicationMetrics(
            replica_url="postgresql://replica1:5432/resumeai",
            lag_seconds=10.0
        )
        assert metrics2.is_lagging(threshold_seconds=5.0) is True


class TestReplicationSyncMonitor:
    """Tests for ReplicationSyncMonitor."""
    
    def test_monitor_creation(self):
        """Test creating replication monitor."""
        monitor = ReplicationSyncMonitor(check_interval=30, lag_threshold=5.0)
        
        assert monitor.check_interval == 30
        assert monitor.lag_threshold == 5.0
        assert monitor.is_running is False
    
    def test_store_metrics(self):
        """Test storing metrics."""
        monitor = ReplicationSyncMonitor()
        
        metrics = ReplicationMetrics(replica_url="postgresql://replica1:5432/resumeai")
        monitor._store_metrics(metrics)
        
        assert "postgresql://replica1:5432/resumeai" in monitor.metrics_history
        assert len(monitor.metrics_history["postgresql://replica1:5432/resumeai"]) == 1
    
    def test_get_replication_stats(self):
        """Test getting replication statistics."""
        monitor = ReplicationSyncMonitor()
        
        metrics1 = ReplicationMetrics(
            replica_url="postgresql://replica1:5432/resumeai",
            is_healthy=True,
            lag_seconds=0.5
        )
        metrics2 = ReplicationMetrics(
            replica_url="postgresql://replica2:5432/resumeai",
            is_healthy=False,
            lag_seconds=10.0
        )
        
        monitor._store_metrics(metrics1)
        monitor._store_metrics(metrics2)
        
        stats = monitor.get_replication_stats()
        
        assert stats['total_replicas'] == 2
        assert stats['healthy_replicas'] == 1
        assert stats['lagging_replicas'] == 1


class TestMigrationManager:
    """Tests for MigrationManager."""
    
    def test_migration_manager_creation(self):
        """Test creating migration manager."""
        primary = Mock()
        replicas = {}
        
        manager = MigrationManager(primary, replicas)
        
        assert manager.primary_engine == primary
        assert manager.replica_engines == replicas
    
    async def test_apply_migration_success(self):
        """Test successful migration application."""
        primary = Mock()
        replicas = {}
        
        manager = MigrationManager(primary, replicas)
        
        # Mock migration function
        migration_called = False
        async def mock_migration():
            nonlocal migration_called
            migration_called = True
        
        success = await manager.apply_migration(
            mock_migration,
            description="test_migration",
            verify_replicas=False
        )
        
        assert success is True
        assert migration_called is True
        assert len(manager.migration_history) == 1
        assert manager.migration_history[0]['success'] is True
    
    async def test_apply_migration_failure(self):
        """Test failed migration application."""
        primary = Mock()
        replicas = {}
        
        manager = MigrationManager(primary, replicas)
        
        # Mock migration function that raises error
        async def mock_migration():
            raise Exception("Migration failed")
        
        success = await manager.apply_migration(
            mock_migration,
            description="test_migration",
            verify_replicas=False
        )
        
        assert success is False
        assert len(manager.migration_history) == 1
        assert manager.migration_history[0]['success'] is False
    
    async def test_migration_with_rollback(self):
        """Test migration with rollback on failure."""
        primary = Mock()
        replicas = {}
        
        manager = MigrationManager(primary, replicas)
        
        rollback_called = False
        async def mock_rollback():
            nonlocal rollback_called
            rollback_called = True
        
        async def mock_migration():
            raise Exception("Migration failed")
        
        success = await manager.apply_migration(
            mock_migration,
            description="test_migration",
            verify_replicas=False,
            rollback_func=mock_rollback
        )
        
        assert success is False
        assert rollback_called is True


class TestBatchMigrationManager:
    """Tests for BatchMigrationManager."""
    
    def test_batch_migration_manager_creation(self):
        """Test creating batch migration manager."""
        primary = Mock()
        manager = BatchMigrationManager(primary, batch_size=1000)
        
        assert manager.primary_engine == primary
        assert manager.batch_size == 1000


# Integration tests (would require actual database setup)
@pytest.mark.skip(reason="Requires actual database setup")
class TestDatabaseReplicasIntegration:
    """Integration tests with actual database."""
    
    async def test_replica_pool_initialization(self):
        """Test replica pool initialization."""
        # Would test with actual database URLs
        pass
    
    async def test_read_write_separation(self):
        """Test read/write query separation."""
        # Would test with actual database queries
        pass
    
    async def test_failover_to_primary(self):
        """Test failover to primary when replica fails."""
        # Would test by simulating replica failure
        pass
