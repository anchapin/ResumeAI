# Cache Management Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Redis Cache Overview](#redis-cache-overview)
2. [Cache Monitoring](#cache-monitoring)
3. [Cache Key Management](#cache-key-management)
4. [Cache Invalidation Procedures](#cache-invalidation-procedures)
5. [Cache Performance Issues](#cache-performance-issues)
6. [Cache Disaster Recovery](#cache-disaster-recovery)

---

## Redis Cache Overview

ResumeAI uses Redis for:
- Session storage
- API response caching
- Rate limiting counters
- Temporary data storage

**Redis Configuration:**
- Primary: `redis://redis-master:6379`
- Replica: `redis://redis-replica:6379`
- Max Memory: 2GB
- Eviction Policy: `allkeys-lru`

---

## Cache Monitoring

### Check Redis Health

```bash
# Test Redis connectivity
redis-cli -h redis-master ping
# Expected: PONG

# Check Redis info
redis-cli -h redis-master INFO

# Check memory usage
redis-cli -h redis-master INFO memory | grep used

# Check connected clients
redis-cli -h redis-master INFO clients

# Check hit rate
redis-cli -h redis-master INFO stats | grep keyspace
```

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|---------------------|
| Memory Used | > 1.5GB | > 1.9GB |
| Connected Clients | > 100 | > 200 |
| Hit Rate | < 80% | < 60% |
| Evicted Keys | > 1000/min | > 10000/min |
| Replication Lag | > 5s | > 30s |

### View Cache Statistics

```bash
# Get full stats
redis-cli -h redis-master INFO stats

# Get keyspace info
redis-cli -h redis-master INFO keyspace

# Get memory info
redis-cli -h redis-master INFO memory

# Monitor in real-time
redis-cli -h redis-master MONITOR
```

---

## Cache Key Management

### List Common Cache Keys

```bash
# List all keys (use with caution in production)
redis-cli -h redis-master KEYS "*"

# List keys by pattern
redis-cli -h redis-master KEYS "session:*"
redis-cli -h redis-master KEYS "pdf:*"
redis-cli -h redis-master KEYS "resume:*"
redis-cli -h redis-master KEYS "ratelimit:*"

# Get key TTL
redis-cli -h redis-master TTL <key>

# Get key type
redis-cli -h redis-master TYPE <key>
```

### Common Cache Key Patterns

| Pattern | Description | Typical TTL |
|---------|-------------|-------------|
| `session:{user_id}` | User session data | 24 hours |
| `pdf:{user_id}:{resume_id}` | Generated PDF cache | 1 hour |
| `resume:{user_id}:list` | User's resume list | 5 minutes |
| `ratelimit:{ip}:{endpoint}` | Rate limit counters | 1 minute |
| `oauth:{user_id}:state` | OAuth state | 10 minutes |

### View Cache Contents

```bash
# Get string value
redis-cli -h redis-master GET "session:123"

# Get hash value
redis-cli -h redis-master HGETALL "resume:123:456"

# Get list value
redis-cli -h redis-master LRANGE "queue:pdf" 0 -1
```

---

## Cache Invalidation Procedures

### Invalidate User Session

```bash
# Invalidate specific user session
redis-cli -h redis-master DEL "session:12345"

# Invalidate all user sessions (logout all users)
redis-cli -h redis-master KEYS "session:*" | xargs redis-cli DEL

# Invalidate sessions older than specific time
redis-cli -h redis-master --scan --pattern "session:*" | while read key; do
  ttl=$(redis-cli -h redis-master TTL "$key")
  if [ $ttl -lt 0 ]; then
    redis-cli -h redis-master DEL "$key"
  fi
done
```

### Invalidate PDF Cache

```bash
# Invalidate specific PDF
redis-cli -h redis-master DEL "pdf:12345:67890"

# Invalidate all PDFs for a user
redis-cli -h redis-master KEYS "pdf:12345:*" | xargs redis-cli DEL

# Invalidate all PDF cache
redis-cli -h redis-master FLUSHDB
```

### Invalidate Rate Limit

```bash
# Clear rate limit for IP
redis-cli -h redis-master DEL "ratelimit:192.168.1.1:/api/resumes"

# Clear all rate limits
redis-cli -h redis-master KEYS "ratelimit:*" | xargs redis-cli DEL
```

### Selective Cache Flush

```bash
# Flush by namespace
redis-cli -h redis-master --scan --pattern "session:*" | xargs redis-cli DEL
redis-cli -h redis-master --scan --pattern "resume:*" | xargs redis-cli DEL
redis-cli -h redis-master --scan --pattern "oauth:*" | xargs redis-cli DEL
```

---

## Cache Performance Issues

### High Memory Usage

**Symptoms:**
- Redis INFO shows memory > 1.5GB
- Slow response times
- OOM errors in logs

**Diagnosis:**

```bash
# Check memory usage
redis-cli -h redis-master INFO memory | grep used

# Find largest keys
redis-cli -h redis-master ---bigkeys

# Check key count by pattern
redis-cli -h redis-master DBSIZE

# Check for memory leaks
redis-cli -h redis-master INFO commandstats
```

**Resolution:**

1. Adjust eviction policy:
   ```bash
   redis-cli -h redis-master CONFIG SET maxmemory-policy allkeys-lru
   ```

2. Flush expired keys:
   ```bash
   redis-cli -h redis-master BGREWRITEAOF
   redis-cli -h redis-master BGSAVE
   ```

3. Add memory if needed (scale up)

### Low Cache Hit Rate

**Symptoms:**
- Hit rate < 80%
- High database load

**Diagnosis:**

```bash
# Check hit rate
redis-cli -H redis-master INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Calculate hit rate
hits=$(redis-cli -h redis-master INFO stats | grep keyspace_hits | cut -d: -f2)
misses=$(redis-cli -h redis-master INFO stats | grep keyspace_misses | cut -d: -f2)
rate=$((hits * 100 / (hits + misses)))
echo "Hit rate: $rate%"
```

**Resolution:**

1. Review cache key TTLs
2. Increase cache duration for frequently accessed data
3. Add more data to cache (pre-warming)
4. Check for cache invalidation issues

### Redis Connection Issues

**Symptoms:**
- Application errors: "Connection refused"
- Slow Redis operations

**Diagnosis:**

```bash
# Test connection
redis-cli -h redis-master ping

# Check Redis process
ps aux | grep redis

# Check network connectivity
netstat -tlnp | grep 6379
```

**Resolution:**

1. If Redis is down, restart:
   ```bash
   kubectl rollout restart statefulset/redis -n production
   ```

2. If network issue, check pod status:
   ```bash
   kubectl get pods -n production -l app=redis
   ```

3. Verify application can connect:
   ```bash
   kubectl exec -it deployment/resume-api -n production -- redis-cli ping
   ```

---

## Cache Disaster Recovery

### Redis Pod Crash

**Symptoms:**
- Redis pods not running
- Application unable to connect

**Resolution:**

```bash
# 1. Check Redis pod status
kubectl get pods -n production -l app=redis

# 2. Restart Redis
kubectl rollout restart statefulset/redis -n production

# 3. Wait for pods to be ready
kubectl wait --for=condition=ready pod/redis-0 -n production --timeout=300s

# 4. Verify connection
kubectl exec -it deployment/resume-api -n production -- redis-cli ping
```

### Data Loss Recovery

**If Redis data is lost:**

```bash
# 1. Clear any corrupted data
redis-cli -h redis-master FLUSHDB

# 2. Restart application to rebuild cache
kubectl rollout restart deployment/resume-api -n production

# 3. Monitor cache rebuild
redis-cli -h redis-master INFO stats | grep keyspace
```

### Failover to Replica

**If primary Redis fails:**

```bash
# 1. Promote replica to master
kubectl exec -it redis-replica-0 -n production -- redis-cli REPLICAOF NO ONE

# 2. Update application config
kubectl set env deployment/resume-api REDIS_URL="redis://redis-replica:6379" -n production

# 3. Restart application
kubectl rollout restart deployment/resume-api -n production
```

---

## Quick Reference

### Common Commands

```bash
# Connect to Redis
redis-cli -h redis-master

# Check health
redis-cli -h redis-master ping

# View stats
redis-cli -h redis-master INFO

# Count keys
redis-cli -h redis-master DBSIZE

# Flush all
redis-cli -h redis-master FLUSHDB

# Monitor in real-time
redis-cli -h redis-master MONITOR

# Get config
redis-cli -h redis-master CONFIG GET maxmemory
```

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [OPERATIONS.md](./OPERATIONS.md) - Incident response
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [MONITORING_SETUP.md](../MONITORING_SETUP.md) - Monitoring configuration

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
