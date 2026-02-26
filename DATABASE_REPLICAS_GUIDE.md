# Database Read Replicas Implementation Guide

## Overview

This guide covers the database read replica implementation for ResumeAI, enabling horizontal scaling of read operations through replica pooling, automatic failover, and replication health monitoring.

## Architecture

### Components

1. **ReplicaPool** (`resume-api/config/database_replicas.py`)
   - Manages primary and replica database connections
   - Health monitoring and failover
   - Round-robin load balancing
   - Configuration from environment variables

2. **DatabaseConnectionManager** (`resume-api/lib/db/connection_manager.py`)
   - Read/write operation routing
   - Automatic failover to primary
   - Read-after-write consistency handling
   - Session management

3. **ReplicationSyncMonitor** (`resume-api/lib/monitoring/replica_sync.py`)
   - Monitors replication lag
   - Detects out-of-sync replicas
   - Performance metrics collection
   - Alert generation

4. **MigrationManager** (`resume-api/lib/db/migration_helpers.py`)
   - Applies migrations to primary
   - Verifies replica catchup
   - Rollback support
   - Migration history tracking

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
└──────────────┬──────────────────────────┬────────────────────┘
               │                          │
        SELECT/READ                  INSERT/UPDATE/DELETE
               │                          │
               ▼                          ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  RoutingSession  │        │  RoutingSession  │
    │  (Read-heavy)    │        │  (Write-only)    │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  ReplicaPool     │        │  Primary DB      │
    │ (Round-robin)    │        │  (Write master)  │
    └────────┬─────────┘        └──────────────────┘
             │
    ┌────────┴────────┬──────────────┬───────────┐
    │                 │              │           │
    ▼                 ▼              ▼           ▼
┌─────────┐    ┌─────────┐    ┌─────────┐  ┌─────────┐
│Replica 1│    │Replica 2│    │Replica 3│  │Replica N│
│ (Lag 0s)│    │ (Lag 1s)│    │ (Lag 2s)│  │ (Lag Xs)│
└─────────┘    └─────────┘    └─────────┘  └─────────┘

     ▲────────────────────────────────────────────────────┐
     │       Replication Stream (async)                   │
     │                                                    │
     └────────────────────────────────────────────────────┘
               (from Primary to Replicas)
```

## Configuration

### Environment Variables

```bash
# Primary database
DATABASE_URL=postgresql+asyncpg://user:pass@primary-host:5432/resumeai

# Read replicas (comma-separated URLs)
DATABASE_REPLICA_URLS=postgresql+asyncpg://user:pass@replica1:5432/resumeai,postgresql+asyncpg://user:pass@replica2:5432/resumeai

# Optional replica-specific settings
REPLICA_POOL_SIZE_0=10
REPLICA_MAX_OVERFLOW_0=20
REPLICA_POOL_TIMEOUT_0=30

DATABASE_ECHO=false  # Set to true for SQL logging
```

### Docker Compose Example

```yaml
version: '3.9'

services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_USER: resumeai
      POSTGRES_PASSWORD: password
      POSTGRES_DB: resumeai
    ports:
      - "5432:5432"
    volumes:
      - primary-data:/var/lib/postgresql/data

  postgres-replica1:
    image: postgres:15
    environment:
      POSTGRES_USER: resumeai
      POSTGRES_PASSWORD: password
      POSTGRES_DB: resumeai
    ports:
      - "5433:5432"
    volumes:
      - replica1-data:/var/lib/postgresql/data
    depends_on:
      - postgres-primary

  postgres-replica2:
    image: postgres:15
    environment:
      POSTGRES_USER: resumeai
      POSTGRES_PASSWORD: password
      POSTGRES_DB: resumeai
    ports:
      - "5434:5432"
    volumes:
      - replica2-data:/var/lib/postgresql/data
    depends_on:
      - postgres-primary

  api:
    build: ./resume-api
    environment:
      DATABASE_URL: postgresql+asyncpg://resumeai:password@postgres-primary:5432/resumeai
      DATABASE_REPLICA_URLS: postgresql+asyncpg://resumeai:password@postgres-replica1:5432/resumeai,postgresql+asyncpg://resumeai:password@postgres-replica2:5432/resumeai
    ports:
      - "8000:8000"
    depends_on:
      - postgres-primary
      - postgres-replica1
      - postgres-replica2

volumes:
  primary-data:
  replica1-data:
  replica2-data:
```

## Cloud Provider Setup

### AWS RDS

1. **Create Primary RDS Instance**
   ```
   - Engine: PostgreSQL 15+
   - Multi-AZ: Yes (for high availability)
   - Backup retention: 7+ days
   ```

2. **Create Read Replicas**
   ```
   - Same PostgreSQL version as primary
   - Different AZ for high availability
   - Enable automated backups on replica
   ```

3. **Configuration**
   ```bash
   DATABASE_URL=postgresql+asyncpg://user:pass@primary.region.rds.amazonaws.com:5432/resumeai
   DATABASE_REPLICA_URLS=postgresql+asyncpg://user:pass@replica1.region.rds.amazonaws.com:5432/resumeai,postgresql+asyncpg://user:pass@replica2.region.rds.amazonaws.com:5432/resumeai
   ```

### Google Cloud SQL

1. **Create Cloud SQL Instance (PostgreSQL)**
   ```
   - High availability: Enabled
   - Automatic backups: Enabled
   ```

2. **Create Read Replicas**
   ```
   - Cloud SQL > Replication > Create read replica
   - Choose region for load distribution
   ```

3. **Configuration**
   ```bash
   DATABASE_URL=postgresql+asyncpg://user:pass@primary-cloudsql-ip/resumeai
   DATABASE_REPLICA_URLS=postgresql+asyncpg://user:pass@replica1-cloudsql-ip/resumeai,postgresql+asyncpg://user:pass@replica2-cloudsql-ip/resumeai
   ```

### Azure Database for PostgreSQL

1. **Create Primary Server**
   ```
   - PostgreSQL 15+
   - High availability: Enabled
   ```

2. **Create Read Replicas**
   ```
   - Replication > Create replica
   - Choose region (can be different from primary)
   ```

3. **Configuration**
   ```bash
   DATABASE_URL=postgresql+asyncpg://user@server:pass@primary.postgres.database.azure.com/resumeai
   DATABASE_REPLICA_URLS=postgresql+asyncpg://user@replica1:pass@replica1.postgres.database.azure.com/resumeai
   ```

## Usage

### Basic Integration

```python
from config.database_replicas import create_replica_pool_from_env
from lib.db.connection_manager import initialize_connection_manager

# Initialize at startup
async def startup():
    replica_pool = create_replica_pool_from_env()
    await initialize_connection_manager(replica_pool)

# Use in routes
async def get_user(user_id: int):
    manager = await get_connection_manager()
    async with await manager.get_read_session() as session:
        # Automatically routed to replica
        user = await session.get(User, user_id)
        return user

async def update_user(user_id: int, data: dict):
    manager = await get_connection_manager()
    async with await manager.get_write_session() as session:
        # Always uses primary
        user = await session.get(User, user_id)
        # ... update user
        await session.commit()
        
        # Ensure read-after-write consistency
        await manager.verify_write_after_read(session)
        return user
```

### Monitoring Replication

```python
from lib.monitoring.replica_sync import ReplicationSyncMonitor

# Start monitoring
monitor = ReplicationSyncMonitor(
    check_interval=30,  # Check every 30 seconds
    lag_threshold=5.0   # Alert if lag > 5 seconds
)

async def start_monitoring(replica_pool):
    await monitor.start_monitoring(
        replica_pool.replica_engines,
        replica_pool.primary_engine
    )

# Get metrics
stats = monitor.get_replication_stats()
print(f"Healthy replicas: {stats['healthy_replicas']}")
print(f"Lagging replicas: {stats['lagging_replicas']}")

# Export for monitoring system
prometheus_metrics = await monitor.export_metrics_prometheus()
```

### Database Migrations

```python
from lib.db.migration_helpers import MigrationManager

manager = MigrationManager(
    primary_engine,
    replica_engines,
    timeout_seconds=300,
    lag_threshold=1.0
)

async def migrate_users_table():
    async def migration():
        async with primary_engine.begin() as conn:
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN profile_url VARCHAR(255)
            """))
    
    async def rollback():
        async with primary_engine.begin() as conn:
            await conn.execute(text("""
                ALTER TABLE users 
                DROP COLUMN profile_url
            """))
    
    success = await manager.apply_migration(
        migration,
        description="Add profile_url to users table",
        verify_replicas=True,
        rollback_func=rollback
    )
    
    if success:
        print("Migration completed successfully")
    else:
        print("Migration failed and was rolled back")
```

## Monitoring & Troubleshooting

### Health Checks

```python
# Check all replicas
health = await replica_pool.health_check(timeout=5)
for url, is_healthy in health.items():
    status = "✅ Healthy" if is_healthy else "❌ Unhealthy"
    print(f"{url}: {status}")

# Get detailed status
status = replica_pool.get_replica_status()
for url, info in status.items():
    print(f"{url}:")
    print(f"  Health: {info['is_healthy']}")
    print(f"  Lag: {info['lag_seconds']}s")
    print(f"  Response time: {info['response_time_ms']}ms")
```

### Replication Lag

**What is replication lag?**
- Time between write to primary and visibility on replica
- Measured in seconds
- Higher lag = less fresh reads on replicas

**Handling high lag:**

1. **Temporary (seconds):** Normal during high write load
   - Reads are automatically retried on primary
   - No action needed

2. **Persistent (minutes):** Indicates replication issues
   - Check replica disk space
   - Check network connectivity
   - Check replica disk I/O saturation

3. **Critical (hours+):** Replica is out of sync
   - Check replica error logs
   - Consider rebuilding replica from backup
   - Alert on-call engineer

### Common Issues

**Issue: All queries timing out**
- Check network connectivity between API and primary
- Verify primary database is running
- Check if primary is overloaded

**Issue: High replication lag**
- Monitor primary write rate
- Check replica resource usage (CPU, disk I/O, memory)
- Consider adding more replicas or upgrading hardware

**Issue: Reads failing but writes working**
- Replica likely down
- Reads automatically fallback to primary
- Check replica health in logs
- Fix replica and restart replication

**Issue: Data inconsistency**
- Replica significantly lagging behind primary
- Can be normal temporarily
- If persistent, check replication logs
- May need to rebuild replica

## Performance Considerations

### Read Distribution

- **Round-robin**: Distributes reads evenly across replicas
- **Health-aware**: Only sends reads to healthy replicas
- **Automatic failover**: Falls back to primary if all replicas down

### Write Performance

- All writes go to primary (no changes to write path)
- Slight overhead from routing logic (<1ms typical)
- Replica lag doesn't affect write latency

### Connection Pooling

```python
# Configuration example
ReplicaConfig(
    url="postgresql://replica1/resumeai",
    pool_size=10,           # Min connections in pool
    max_overflow=20,        # Max additional connections
    pool_timeout=30,        # Timeout waiting for connection
    pool_recycle=3600,      # Recycle connections after 1 hour
)
```

### Scaling Guidelines

| Requirement | Replicas | Configuration |
|------------|----------|---------------|
| < 100 RPS | 0-1 | Primary only or 1 replica |
| 100-500 RPS | 2-3 | 2-3 replicas in different regions |
| 500-2000 RPS | 4-6 | 4-6 replicas, load-balanced |
| 2000+ RPS | 6+ | Advanced architecture with read cache layer |

## Failover Procedures

### Automatic Failover (Transparent)

1. Health check detects replica failure
2. Replica marked as unhealthy
3. New reads routed to healthy replicas
4. If all replicas down, reads fallback to primary
5. Monitoring alerts on-call engineer

### Manual Failover to New Primary

```python
# If primary fails and needs replacement:

1. Promote read replica to primary:
   # RDS: Modify read replica > Promote
   # Cloud SQL: Replication > Promote replica

2. Update DATABASE_URL:
   DATABASE_URL=postgresql://new-primary:5432/resumeai

3. Restart API service

4. Set old primary as replica (if coming back online)
```

## Load Testing

```bash
# Test read distribution
python scripts/load_test_replicas.py \
  --test distribution \
  --num-queries 10000 \
  --concurrent 50

# Test write-heavy load
python scripts/load_test_replicas.py \
  --test heavy \
  --num-queries 1000

# Test failover behavior
python scripts/load_test_replicas.py \
  --test failover

# Run all tests and save results
python scripts/load_test_replicas.py \
  --test all \
  --output results.json
```

## Metrics & Observability

### Prometheus Metrics

```
# Replication lag (seconds)
replication_lag_seconds{replica="replica_1"} 0.5
replication_lag_seconds{replica="replica_2"} 1.2

# Replica health (1=healthy, 0=unhealthy)
replica_health{replica="replica_1"} 1
replica_health{replica="replica_2"} 1
```

### Dashboard Queries

```promql
# Average replica lag
avg(replication_lag_seconds)

# Percentage of healthy replicas
sum(replica_health) / count(replica_health) * 100

# Queries routed to each replica
rate(replica_queries_total[5m]) by (replica)
```

## Best Practices

1. **Always write to primary**
   - Never use replicas for write operations
   - Write operations create replication lag

2. **Monitor replication lag**
   - Set alerts for lag > 5 seconds
   - Check lag before critical reads

3. **Use read-after-write consistency**
   - After write, read from primary
   - Ensures written data is immediately visible

4. **Test failover regularly**
   - Practice replica failure scenarios
   - Verify automatic failover works

5. **Size resources appropriately**
   - Replicas need same resources as primary
   - For read-heavy workloads, may need more replicas

6. **Monitor replica health**
   - Set up alerts for unhealthy replicas
   - Check replication logs regularly
   - Monitor lag, error rates, resource usage

7. **Plan for growth**
   - Monitor read load trends
   - Add replicas before hitting capacity
   - Consider regional distribution for global scale

## Security Considerations

1. **Network Security**
   - Use private networks for replica connections
   - Configure security groups/firewalls
   - Encrypt connections in transit (SSL/TLS)

2. **Database Security**
   - Use same authentication for primary and replicas
   - Restrict replica user permissions
   - Replicas should only have read permissions

3. **Data Security**
   - Replicas contain same data as primary
   - Protect replica backups same as primary
   - Encrypt data at rest on replicas

## Troubleshooting Reference

| Problem | Cause | Solution |
|---------|-------|----------|
| High replication lag | High write load | Add more capacity or reduce write load |
| Replica down | Network/hardware issue | Check connectivity, restart replica |
| Data inconsistency | Replica out of sync | Rebuild replica from backup |
| Slow reads | Replica overloaded | Add more replicas or upgrade hardware |
| Queries failing | All replicas down | Automatic fallback to primary |

## References

- [PostgreSQL Streaming Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Replication Lag Explained](https://blog.percona.com/mysql-replication-lag-explained/)

## Support

For questions or issues:
1. Check logs for error messages
2. Review monitoring dashboards
3. Check replication status with `SHOW SLAVE STATUS`
4. Contact database team for infrastructure issues
