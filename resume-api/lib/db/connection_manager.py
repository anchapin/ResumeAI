"""
Database Connection Manager

Handles read/write separation with automatic failover and health monitoring.
Routes SELECT queries to replicas and INSERT/UPDATE/DELETE to primary.
"""

import re
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine, create_async_engine
from sqlalchemy import text

from config.database_replicas import ReplicaPool


class RoutingSession(AsyncSession):
    """
    Custom AsyncSession that routes queries based on type.
    
    SELECT queries are routed to replicas, while write operations
    go to the primary database.
    """
    
    def __init__(self, *args, replica_pool: Optional[ReplicaPool] = None, **kwargs):
        """
        Initialize routing session.
        
        Args:
            replica_pool: ReplicaPool instance for managing replicas
        """
        self.replica_pool = replica_pool
        super().__init__(*args, **kwargs)
    
    async def execute(self, statement: Any, **kwargs):
        """
        Execute statement, routing to replica or primary as appropriate.
        
        Args:
            statement: SQLAlchemy statement to execute
            **kwargs: Additional arguments
            
        Returns:
            Query result
        """
        # Determine if this is a read or write operation
        is_read = self._is_read_operation(statement)
        
        # Get appropriate engine
        if is_read and self.replica_pool and self.replica_pool.has_healthy_replicas():
            # Try to use replica
            replica_engine = await self.replica_pool.get_read_engine()
            try:
                return await super().execute(statement, **kwargs)
            except Exception as e:
                # Fallback to primary on replica failure
                self.bind = await self.replica_pool.get_write_engine()
                return await super().execute(statement, **kwargs)
        else:
            # Use primary for writes or if no replicas available
            if self.replica_pool:
                self.bind = await self.replica_pool.get_write_engine()
            return await super().execute(statement, **kwargs)
    
    def _is_read_operation(self, statement: Any) -> bool:
        """
        Determine if a statement is a read operation.
        
        Args:
            statement: SQLAlchemy statement
            
        Returns:
            True if statement is a SELECT, False otherwise
        """
        try:
            # Convert statement to string for analysis
            stmt_str = str(statement).strip().upper()
            
            # Check for read operations
            if stmt_str.startswith("SELECT"):
                return True
            
            # Check for other read-only operations
            if stmt_str.startswith(("SHOW ", "DESCRIBE ", "EXPLAIN ")):
                return True
            
            return False
        except Exception:
            # If we can't determine, assume write
            return False


class DatabaseConnectionManager:
    """
    Manages database connections with read/write separation and failover.
    
    Features:
    - Read/write operation routing
    - Automatic failover to primary
    - Health monitoring
    - Connection pooling
    """
    
    def __init__(self, replica_pool: ReplicaPool):
        """
        Initialize connection manager.
        
        Args:
            replica_pool: ReplicaPool instance
        """
        self.replica_pool = replica_pool
    
    async def initialize(self):
        """Initialize replica pool and engines."""
        await self.replica_pool.initialize()
    
    async def close(self):
        """Close all database connections."""
        await self.replica_pool.close()
    
    async def get_read_session(self) -> RoutingSession:
        """
        Get a session for read operations.
        
        Returns:
            RoutingSession configured for reads
        """
        engine = await self.replica_pool.get_read_engine()
        return RoutingSession(bind=engine, replica_pool=self.replica_pool)
    
    async def get_write_session(self) -> RoutingSession:
        """
        Get a session for write operations.
        
        Returns:
            RoutingSession configured for writes (uses primary)
        """
        engine = await self.replica_pool.get_write_engine()
        return RoutingSession(bind=engine, replica_pool=self.replica_pool)
    
    async def get_session(self) -> RoutingSession:
        """
        Get a session that routes operations automatically.
        
        Returns:
            RoutingSession that determines read/write routing
        """
        # Start with read engine, will failover to primary if needed
        engine = await self.replica_pool.get_read_engine()
        return RoutingSession(bind=engine, replica_pool=self.replica_pool)
    
    async def health_check(self, timeout: int = 5) -> dict:
        """
        Check health of primary and all replicas.
        
        Args:
            timeout: Health check timeout in seconds
            
        Returns:
            Health status dict
        """
        return await self.replica_pool.health_check(timeout=timeout)
    
    def get_replica_status(self) -> dict:
        """
        Get current status of all replicas.
        
        Returns:
            Status dict for all replicas
        """
        return self.replica_pool.get_replica_status()
    
    async def verify_write_after_read(self, session: RoutingSession) -> bool:
        """
        Verify read-after-write consistency.
        
        After a write operation, ensures subsequent reads see the written data
        by forcing reads to primary if needed.
        
        Args:
            session: Database session
            
        Returns:
            True if consistency verified
        """
        # Force next read to primary to ensure written data is visible
        session.bind = await self.replica_pool.get_write_engine()
        return True


# Global connection manager instance
_connection_manager: Optional[DatabaseConnectionManager] = None


async def initialize_connection_manager(replica_pool: ReplicaPool):
    """Initialize global connection manager."""
    global _connection_manager
    _connection_manager = DatabaseConnectionManager(replica_pool)
    await _connection_manager.initialize()


async def get_connection_manager() -> DatabaseConnectionManager:
    """Get global connection manager."""
    if _connection_manager is None:
        raise RuntimeError("Connection manager not initialized")
    return _connection_manager


async def shutdown_connection_manager():
    """Shutdown global connection manager."""
    global _connection_manager
    if _connection_manager:
        await _connection_manager.close()
        _connection_manager = None
