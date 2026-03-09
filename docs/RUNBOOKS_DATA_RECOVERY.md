# Data Recovery Procedures Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Recovery Overview](#recovery-overview)
2. [Partial Table Recovery](#partial-table-recovery)
3. [User Data Recovery](#user-data-recovery)
4. [Transaction Recovery](#transaction-recovery)
5. [Point-in-Time Recovery](#point-in-time-recovery)
6. [Disaster Scenarios](#disaster-scenarios)
7. [Recovery Verification](#recovery-verification)

---

## Recovery Overview

### Backup Strategy

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Full Database | Daily | 30 days | S3: `s3://resumeai-backups/db/` |
| WAL Archives | Continuous | 7 days | S3: `s3://resumeai-backups/wal/` |
| File Uploads | Daily | 14 days | S3: `s3://resumeai-backups/files/` |
| Config Files | On change | 90 days | GitOps |

### Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Database restore | 30 min | 24 hours |
| Single table restore | 15 min | 1 hour |
| User data restore | 15 min | 1 hour |
| Point-in-time | 1 hour | 15 min |

---

## Partial Table Recovery

### Restore Single Table

**Use when:** Accidentally deleted/updated data in specific table

**Prerequisites:**
- Database backup available
- Table name identified
- Approximate time of issue

**Procedure:**

```bash
# 1. Identify table and time
echo "Issue: Table 'resumes' modified at ~2026-03-07 14:30"

# 2. Find closest backup before issue
ls -la /backups/db/ | grep resumeai | sort

# 3. Create new database for recovery
psql $DATABASE_URL -c "CREATE DATABASE resumeai_recovery;"

# 4. Restore backup to recovery DB
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery

# 5. Export affected table
psql -d resumeai_recovery -c "\COPY resumes TO '/tmp/resumes_recovery.csv' CSV HEADER;"

# 6. Import to production
# Option A: Replace table
psql $DATABASE_URL -c "DROP TABLE IF EXISTS resumes;"
psql $DATABASE_URL -c "CREATE TABLE resumes (LIKE resumeai_recovery.resumes INCLUDING ALL);"
psql $DATABASE_URL -c "\COPY resumes FROM '/tmp/resumes_recovery.csv' CSV HEADER;"

# Option B: Restore specific rows (if timestamp column exists)
psql $DATABASE_URL -c "
DELETE FROM resumes WHERE created_at < '2026-03-07 14:30:00';"

psql -d resumeai_recovery -c "
\COPY (SELECT * FROM resumes WHERE created_at >= '2026-03-07 14:30:00') TO '/tmp/resumes_delta.csv' CSV HEADER;"

psql $DATABASE_URL -c "\COPY resumes FROM '/tmp/resumes_delta.csv' CSV HEADER;"
```

### Restore Table from Specific Time

```bash
# 1. Use point-in-time recovery with pg_restore
pg_restore -h $DB_HOST -U $DB_USER -d resumeai_recovery \
  --target-time="2026-03-07 14:00:00" \
  --table=resumes \
  /backups/db/full-backup.dump

# 2. Export from recovery
psql -d resumeai_recovery -c "\COPY (SELECT * FROM resumes) TO '/tmp/resumes_pitr.csv' CSV HEADER;"

# 3. Update production
psql $DATABASE_URL -c "\COPY resumes FROM '/tmp/resumes_pitr.csv' CSV HEADER;"
```

---

## User Data Recovery

### Restore Single User Data

**Use when:** User accidentally deleted their data or requests data recovery

**Procedure:**

```bash
# 1. Identify user
email="user@example.com"
user_id=$(psql $DATABASE_URL -t -c "SELECT id FROM users WHERE email = '$email';")

# 2. Find user data in backup
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery

# 3. Export user's data
psql -d resumeai_recovery -c "\COPY (SELECT * FROM users WHERE id = $user_id) TO '/tmp/user_$user_id.csv' CSV HEADER;"
psql -d resumeai_recovery -c "\COPY (SELECT * FROM resumes WHERE user_id = $user_id) TO '/tmp/resumes_$user_id.csv' CSV HEADER;"
psql -d resumeai_recovery -c "\COPY (SELECT * FROM profiles WHERE user_id = $user_id) TO '/tmp/profiles_$user_id.csv' CSV HEADER;"

# 4. Check if user exists
psql $DATABASE_URL -c "SELECT id, email FROM users WHERE email = '$email';"

# 5. Update or insert user
psql $DATABASE_URL -c "\COPY users FROM '/tmp/user_$user_id.csv' CSV HEADER ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;"

# 6. Update or insert related data
psql $DATABASE_URL -c "\COPY resumes FROM '/tmp/resumes_$user_id.csv' CSV HEADER ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;"
psql $DATABASE_URL -c "\COPY profiles FROM '/tmp/profiles_$user_id.csv' CSV HEADER ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;"
```

### Restore User Sessions

**Procedure:**

```bash
# 1. Get user's sessions from backup
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery
psql -d resumeai_recovery -c "\COPY (SELECT * FROM sessions WHERE user_id = $user_id) TO '/tmp/sessions_$user_id.csv' CSV HEADER;"

# 2. Clear current sessions
redis-cli DEL "session:$user_id"

# 3. Import sessions
# Note: Sessions are stored in Redis, not DB
# Import to Redis
# (Requires custom script to parse and import)
```

### Restore User OAuth Tokens

**Procedure:**

```bash
# 1. Check backup for OAuth tokens
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery

psql -d resumeai_recovery -c "
SELECT * FROM oauth_tokens WHERE user_id = $user_id;"

# 2. Note: OAuth tokens are sensitive
# Better to force re-authentication than restore tokens
psql $DATABASE_URL -c "
DELETE FROM oauth_tokens WHERE user_id = $user_id;"

# 3. Notify user to re-authenticate
echo "User needs to re-connect OAuth provider"
```

---

## Transaction Recovery

### Identify Problematic Transaction

```bash
# 1. Find long-running transactions
psql $DATABASE_URL -c "
SELECT pid, usename, state, query, 
       now() - query_start as duration
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < now() - interval '5 minutes'
ORDER BY duration DESC;"

# 2. Find uncommitted changes
psql $DATABASE_URL -c "
SELECT * FROM pg_stat_activity 
WHERE state = 'idle in transaction' 
AND query_start < now() - interval '10 minutes';"

# 3. Find locks
psql $DATABASE_URL -c "
SELECT * FROM pg_locks WHERE NOT granted;"
```

### Cancel Problematic Transaction

```bash
# 1. Get transaction PID
pid=$(psql $DATABASE_URL -t -c "SELECT pid FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < now() - interval '10 minutes' LIMIT 1;")

# 2. Cancel transaction
psql $DATABASE_URL -c "SELECT pg_cancel_backend($pid);"

# 3. If stuck, terminate
psql $DATABASE_URL -c "SELECT pg_terminate_backend($pid);"

# 4. Check for deadlocks
psql $DATABASE_URL -c "
SELECT * FROM pg_stat_activity 
WHERE state = 'active' 
AND wait_event_type = 'Lock';"
```

### Rollback Failed Transaction

**If you have an open transaction and need to rollback:**

```bash
# Only possible if in transaction block
BEGIN;
-- Your operations
ROLLBACK;  -- To cancel

# Or if auto-commit failed
# Check for uncommitted data
psql $DATABASE_URL -c "
SELECT * FROM pg_prepared_xacts;"
COMMIT PREPARED 'transaction_id';  -- Or
ROLLBACK PREPARED 'transaction_id';
```

---

## Point-in-Time Recovery

### PITR to Specific Timestamp

**Use when:** Need to restore to exact moment (e.g., before bad deployment)

**Procedure:**

```bash
# 1. Stop application
kubectl scale deployment/resume-api --replicas=0 -n production

# 2. Stop database writes
psql $DATABASE_URL -c "SELECT pg_switch_wal();"

# 3. Create base backup
pg_basebackup -h $DB_HOST -U $DB_USER -D /tmp/pitr -Ft -z -P

# 4. Restore to point in time
# Using pg_restore with target time
pg_restore -h $DB_HOST -U $DB_USER -d resumeai \
  --target-time="2026-03-07 14:30:00" \
  --target-action=rollback \
  /tmp/pitr/base.tar.gz

# 5. Verify data
psql $DATABASE_URL -c "SELECT count(*) FROM users;"
psql $DATABASE_URL -c "SELECT count(*) FROM resumes;"

# 6. Start application
kubectl scale deployment/resume-api --replicas=3 -n production

# 7. Verify health
curl -s http://api.resumeai.com/health
```

### PITR to Named Restore Point

```bash
# 1. Create restore point before risky operation
psql $DATABASE_URL -c "SELECT pg_create_restore_point('before_deployment_20260307');"

# 2. If needed, restore to that point
pg_restore -h $DB_HOST -U $DB_USER -d resumeai \
  --target-time="2026-03-07 14:30:00" \
  --target-action=rollback \
  /path/to/backup

# Or use PostgreSQL 15+ native PITR
SELECT pg_restore_to_point('2026-03-07 14:30:00');
```

---

## Disaster Scenarios

### Database Corruption

**Symptoms:**
- Queries failing with corruption errors
- Database won't start

**Resolution:**

```bash
# 1. Attempt repair (PostgreSQL)
psql $DATABASE_URL -c "CHECKPOINT;"

# 2. If table is corrupted
pg_dump -t corrupted_table > table_backup.sql
psql $DATABASE_URL -c "DROP TABLE corrupted_table;"
psql $DATABASE_URL < table_backup.sql

# 3. If index is corrupted
REINDEX INDEX corrupted_index;
REINDEX TABLE corrupted_table;

# 4. If database won't start
# Restore from backup
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql $DATABASE_URL

# 5. Verify integrity
psql $DATABASE_URL -c "SELECT * FROM pg_database WHERE datname = 'resumeai';"
psql $DATABASE_URL -c "VACUUM FULL;"
```

### Accidental Mass Deletion

**Symptoms:**
- Large amount of data missing
- DELETE statement without WHERE

**Resolution:**

```bash
# 1. Check backup
ls -la /backups/db/
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery

# 2. Find deleted records
psql -d resumeai_recovery -c "
SELECT * FROM resumes WHERE id NOT IN (
  SELECT id FROM resumes
);" > /tmp/deleted_resumes.csv

# 3. Count missing
wc -l /tmp/deleted_resumes.csv

# 4. Import deleted records
psql $DATABASE_URL -c "\COPY resumes FROM '/tmp/deleted_resumes.csv' CSV HEADER;"

# 5. Verify
psql $DATABASE_URL -c "SELECT count(*) FROM resumes;"
```

### Schema Migration Failure

**Symptoms:**
- Migration ran but left data in bad state
- Columns incorrectly modified

**Resolution:**

```bash
# 1. Check migration logs
psql $DATABASE_URL -c "SELECT * FROM schema_migrations WHERE applied_at > '2026-03-07 14:00:00';"

# 2. Find reverse migration
ls -la migrations/versions/

# 3. Run reverse migration
python manage.py migrate resumeai <migration_name> --fake
python manage.py migrate resumeai <previous_migration>

# 4. Or restore column from backup
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql resumeai_recovery
psql -d resumeai_recovery -c "\COPY (SELECT id, column_to_fix FROM table) TO '/tmp/column_fix.csv' CSV HEADER;"
psql $DATABASE_URL -c "\COPY table FROM '/tmp/column_fix.csv' CSV HEADER;"
```

---

## Recovery Verification

### Verify Data Integrity

```bash
# 1. Check row counts
psql $DATABASE_URL -c "
SELECT 'users' as table_name, count(*) as row_count FROM users
UNION ALL
SELECT 'resumes', count(*) FROM resumes
UNION ALL
SELECT 'profiles', count(*) FROM profiles
ORDER BY table_name;"

# 2. Check for orphaned records
psql $DATABASE_URL -c "
SELECT 'orphaned_resumes' as issue, count(*) as count 
FROM resumes WHERE user_id NOT IN (SELECT id FROM users);"

# 3. Check referential integrity
psql $DATABASE_URL -c "
SELECT 'missing_users' as issue, count(*) as count 
FROM resumes WHERE user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM users WHERE id = resumes.user_id);"

# 4. Check for null violations
psql $DATABASE_URL -c "
SELECT 'null_emails' as issue, count(*) as count 
FROM users WHERE email IS NULL;"
```

### Verify Application Functionality

```bash
# 1. Test user login
curl -X POST https://api.resumeai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Test resume creation
curl -X POST https://api.resumeai.com/api/resumes \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# 3. Test PDF generation
curl -s http://api.resumeai.com/health

# 4. Run quick test suite
python -m pytest tests/test_api.py -v -k "health or auth"
```

### Performance Verification

```bash
# 1. Check query performance
psql $DATABASE_URL -c "
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"

# 2. Check indexes
psql $DATABASE_URL -c "
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;"

# 3. Load test
python -m pytest tests/load/ -v
```

---

## Quick Reference

### Common Commands

```bash
# List backups
ls -la /backups/db/

# Restore full database
gunzip -c /backups/db/resumeai-20260307.sql.gz | psql $DATABASE_URL

# Restore single table
psql -d backup_db -c "\COPY table TO '/tmp/table.csv' CSV HEADER;"
psql $DATABASE_URL -c "\COPY table FROM '/tmp/table.csv' CSV HEADER;"

# Check data integrity
psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# Verify health
curl -s http://api.resumeai.com/health | jq .
```

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [OPERATIONS.md](./OPERATIONS.md) - Incident response
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [DATABASE_INDEXING.md](../DATABASE_INDEXING.md) - Database optimization
- [DATABASE_REPLICAS_GUIDE.md](../DATABASE_REPLICAS_GUIDE.md) - Database replicas

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
