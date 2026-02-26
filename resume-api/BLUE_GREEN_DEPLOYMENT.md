# Blue-Green Deployment Strategy

## Overview

Blue-green deployment is a release technique that reduces downtime and risk by running two identical production environments. At any time, only one environment (GREEN) receives live traffic while the other (BLUE) remains idle or used for testing. When deploying a new version, traffic is switched from GREEN to BLUE after verification.

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Traffic Switching](#traffic-switching)
6. [Verification](#verification)
7. [Rollback](#rollback)
8. [Database Considerations](#database-considerations)
9. [Monitoring](#monitoring)
10. [Cost Optimization](#cost-optimization)

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Load Balancer / Router                  │
│              (Directs traffic to active env)             │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼──────┐            ┌────▼──────┐
   │   BLUE    │            │  GREEN    │
   │ (Standby) │            │ (Active)  │
   └───────────┘            └───────────┘
        │                         │
   ┌────▼────┐              ┌────▼────┐
   │  1.2.2  │              │  1.2.3  │
   │ Version │              │ Version │
   └─────────┘              └─────────┘
        │                         │
        └────────────┬────────────┘
                     │
            ┌────────▼─────────┐
            │  Shared Database │
            │  (Async Repl OK) │
            └──────────────────┘
```

### Components

- **BLUE Environment**: Standby environment running previous stable version
- **GREEN Environment**: Active environment serving live traffic
- **Load Balancer**: Routes traffic to active environment (BLUE or GREEN)
- **Shared Database**: Single source of truth for data (or read replicas for scale)
- **Router/Switch**: Mechanism to switch traffic between environments

## Prerequisites

Before implementing blue-green deployment:

### Infrastructure Requirements

- [ ] Two identical compute environments (or Kubernetes cluster with sufficient resources)
- [ ] Load balancer with traffic switching capability
- [ ] Shared database or robust data sync mechanism
- [ ] Monitoring and alerting infrastructure
- [ ] Health check endpoints on both environments

### Tools Required

- [ ] Docker/container runtime on both environments
- [ ] Docker registry/image repository
- [ ] Database backup and restore tools
- [ ] Load balancer management tools (AWS ELB CLI, Nginx, HAProxy, etc.)
- [ ] Monitoring dashboards (Prometheus, DataDog, New Relic, etc.)

### Skills Required

- Deployment and container orchestration
- Load balancer configuration
- Database administration
- System monitoring and troubleshooting
- Incident response procedures

## Environment Setup

### Docker-based Blue-Green Setup

#### Directory Structure

```
/app/
├── docker-compose.yml          # Main compose file
├── docker-compose.blue.yml     # BLUE environment override
├── docker-compose.green.yml    # GREEN environment override
├── .env.blue                   # BLUE environment variables
├── .env.green                  # GREEN environment variables
├── scripts/
│   ├── setup_blue_green.sh     # Initial setup
│   ├── switch_traffic.sh       # Switch between environments
│   └── check_environment.sh    # Verify environment status
└── backups/
    ├── blue_backup/
    └── green_backup/
```

#### docker-compose.yml (Main)

```yaml
version: '3.8'

services:
  resume-api-blue:
    image: resume-api:${BLUE_VERSION}
    container_name: resume-api-blue
    env_file: .env.blue
    ports:
      - "8001:8000"
    networks:
      - resumeai
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    labels:
      environment: blue

  resume-api-green:
    image: resume-api:${GREEN_VERSION}
    container_name: resume-api-green
    env_file: .env.green
    ports:
      - "8002:8000"
    networks:
      - resumeai
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    labels:
      environment: green

  nginx-proxy:
    image: nginx:latest
    container_name: nginx-proxy
    ports:
      - "8000:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - resume-api-blue
      - resume-api-green
    networks:
      - resumeai
    restart: unless-stopped

networks:
  resumeai:
    driver: bridge
```

#### nginx.conf (Load Balancer)

```nginx
upstream api_blue {
    server resume-api-blue:8000;
}

upstream api_green {
    server resume-api-green:8000;
}

# Default upstream (initially GREEN is active)
upstream api_active {
    server resume-api-green:8000;
}

server {
    listen 80;
    server_name api.resumeai.com localhost;

    location / {
        proxy_pass http://api_active;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Connection settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        access_log off;
        proxy_pass http://api_active;
    }

    # Special endpoints for blue-green management
    location /blue/health {
        proxy_pass http://api_blue/health;
    }

    location /green/health {
        proxy_pass http://api_green/health;
    }
}
```

#### .env.blue

```bash
# BLUE environment - runs previous stable version
BLUE_VERSION=1.2.2
ENV_NAME=blue
API_PORT=8000
LOG_LEVEL=info

# Database configuration (shared)
DB_HOST=db.resumeai.com
DB_NAME=resumeai
DB_USER=resumeai_user
DB_PASSWORD=${DB_PASSWORD}

# Feature flags (should match GREEN for consistency)
FEATURE_FLAG_OAUTH=true
FEATURE_FLAG_STORAGE_QUOTA=true
FEATURE_FLAG_TOKEN_ENCRYPTION=true

# AI Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=${OPENAI_API_KEY}
```

#### .env.green

```bash
# GREEN environment - runs new version being deployed
GREEN_VERSION=1.2.3
ENV_NAME=green
API_PORT=8000
LOG_LEVEL=info

# Database configuration (shared)
DB_HOST=db.resumeai.com
DB_NAME=resumeai
DB_USER=resumeai_user
DB_PASSWORD=${DB_PASSWORD}

# Feature flags (test new features here first)
FEATURE_FLAG_OAUTH=true
FEATURE_FLAG_STORAGE_QUOTA=true
FEATURE_FLAG_TOKEN_ENCRYPTION=true
FEATURE_FLAG_NEW_ENDPOINT=false  # Test new features before enabling

# AI Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=${OPENAI_API_KEY}
```

## Deployment Process

### Step 1: Build New Version

```bash
# Build new version on GREEN environment
cd /app
docker build -t resume-api:1.2.3 .

# Tag for registry
docker tag resume-api:1.2.3 registry.example.com/resume-api:1.2.3

# Push to registry
docker push registry.example.com/resume-api:1.2.3

# Update GREEN_VERSION in environment
export GREEN_VERSION=1.2.3
```

### Step 2: Pull and Start GREEN Environment

```bash
# Pull new image
docker pull registry.example.com/resume-api:1.2.3

# Start GREEN container with new version
docker-compose -f docker-compose.yml -f docker-compose.green.yml up -d resume-api-green

# Wait for startup
sleep 10

# Verify GREEN is healthy
curl http://localhost:8002/health
```

### Step 3: Database Migration (if needed)

```bash
# Create backup before migration
./scripts/create_database_backup.sh --tag "pre-1.2.3-$(date +%s)"

# Run migrations in GREEN environment
docker exec resume-api-green python -m alembic upgrade head

# Verify migration success
curl http://localhost:8002/v1/status/database
```

### Step 4: Extended Testing on GREEN

```bash
# Run comprehensive test suite against GREEN
python scripts/validate_deployment.py --test-environment green

# Run smoke tests
python scripts/validate_deployment.py --smoke-test --environment green

# Performance testing (simulated load)
# ab -n 1000 -c 10 http://localhost:8002/health

# Manual testing
# - Test all major workflows
# - Test new features
# - Verify OAuth integrations
# - Check error handling
```

### Step 5: Verify Both Environments Healthy

```bash
# Check BLUE (current production)
curl http://localhost:8001/health

# Check GREEN (new deployment)
curl http://localhost:8002/health

# Both should return:
# {
#   "status": "healthy",
#   "version": "...",
#   "timestamp": "..."
# }
```

### Step 6: Request Traffic Switch

```bash
# Once ready, trigger traffic switch
./scripts/switch_traffic.sh green

# This:
# 1. Updates load balancer to route to GREEN
# 2. Verifies traffic is flowing
# 3. Monitors error rates
# 4. Prepares BLUE for next deployment
```

## Traffic Switching

### Automated Traffic Switch

```bash
#!/bin/bash
# scripts/switch_traffic.sh

TARGET_ENV=$1  # "blue" or "green"

if [ "$TARGET_ENV" != "blue" ] && [ "$TARGET_ENV" != "green" ]; then
    echo "Usage: $0 [blue|green]"
    exit 1
fi

echo "Switching traffic to $TARGET_ENV environment..."

# 1. Pre-switch verification
echo "Verifying $TARGET_ENV environment health..."
HEALTH_CHECK=$(curl -s http://localhost:800${TARGET_ENV:0:1}/health | jq -r '.status')
if [ "$HEALTH_CHECK" != "healthy" ]; then
    echo "ERROR: $TARGET_ENV environment is not healthy!"
    exit 1
fi

# 2. Update load balancer (method depends on your setup)
# Option A: Update Nginx config
if [ "$TARGET_ENV" = "green" ]; then
    sed -i 's/upstream api_active { server resume-api-blue:8000; }/upstream api_active { server resume-api-green:8000; }/' /etc/nginx/nginx.conf
else
    sed -i 's/upstream api_active { server resume-api-green:8000; }/upstream api_active { server resume-api-blue:8000; }/' /etc/nginx/nginx.conf
fi
nginx -s reload

# Option B: Update HAProxy
# echo "set server api/green_api state ready" | socat stdio /var/run/haproxy.sock

# Option C: AWS ELB
# aws elbv2 modify-target-group-attributes ...

# 3. Wait for connection draining (max 30 seconds)
echo "Draining connections from old environment..."
sleep 30

# 4. Verify traffic switched
echo "Verifying traffic routing..."
for i in {1..10}; do
    RESPONSE=$(curl -s http://localhost:8000/v1/version)
    echo "Request $i: $RESPONSE"
    sleep 2
done

# 5. Monitor for errors
echo "Monitoring error rates..."
python - <<EOF
import time
import urllib.request
import json

start_time = time.time()
errors = 0
requests = 0

while time.time() - start_time < 300:  # Monitor for 5 minutes
    try:
        response = urllib.request.urlopen('http://localhost:8000/health', timeout=5)
        requests += 1
    except:
        errors += 1
        requests += 1
    
    error_rate = (errors / requests * 100) if requests > 0 else 0
    if error_rate > 1:
        print(f"WARNING: High error rate {error_rate}% ({errors}/{requests})")
    
    time.sleep(2)

print(f"Traffic switch complete. Final error rate: {error_rate}%")
EOF

# 6. Update metadata
echo "Active environment: $TARGET_ENV" > /app/active_environment.txt
echo "Switched at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> /app/active_environment.txt

echo "Traffic successfully switched to $TARGET_ENV!"
```

### Manual Traffic Switch

For environments without automation, switch manually:

```bash
# 1. Verify GREEN is ready
curl http://localhost:8002/health

# 2. Update DNS to point to GREEN IP
# (Takes 5-60 minutes to propagate)
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.resumeai.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {"Value": "10.0.1.100"}  # GREEN IP
        ]
      }
    }]
  }'

# 3. Update load balancer target
aws elbv2 modify-target-group \
  --target-group-arn $TG_ARN \
  --matcher HttpCode=200,302

# 4. Monitor traffic switch
watch -n 5 'curl -s http://api.resumeai.com/v1/metrics | jq ".requests_per_second"'
```

### Gradual Traffic Shift (Canary Deployment)

For extra safety, shift traffic gradually:

```bash
# Using weighted target groups (AWS ELB)
for WEIGHT in 10 25 50 75 100; do
    echo "Shifting $WEIGHT% traffic to GREEN..."
    
    # Update weight distribution
    aws elbv2 modify-target-group-attributes \
      --target-group-arn $BLUE_TG \
      --attributes Key=stickiness.lb_cookie.duration_seconds,Value=$((100-WEIGHT))
    
    aws elbv2 modify-target-group-attributes \
      --target-group-arn $GREEN_TG \
      --attributes Key=stickiness.lb_cookie.duration_seconds,Value=$WEIGHT
    
    # Wait and monitor
    sleep 300  # 5 minutes at each step
    
    # Check error rate
    ERROR_RATE=$(curl -s http://localhost:8000/v1/metrics | jq '.error_rate')
    if (( $(echo "$ERROR_RATE > 1" | bc -l) )); then
        echo "ERROR RATE TOO HIGH! Rolling back..."
        break
    fi
done
```

## Verification

### Post-switch Verification

```bash
# Comprehensive verification after traffic switch
python scripts/validate_deployment.py --post-switch-verification

# Checks:
# ✓ New environment receiving 100% traffic
# ✓ No elevated error rates
# ✓ Response times within acceptable range
# ✓ Database connectivity
# ✓ All feature flags as expected
# ✓ No cascading failures
```

### User-Facing Verification

Test as actual users would:

```bash
# Test from different locations (if applicable)
# Test from mobile
# Test with various browsers

# Critical workflows to test:
# - Create new resume
# - Edit existing resume
# - Generate PDF
# - Tailor resume to job posting
# - Create resume variant
# - OAuth login (GitHub, LinkedIn)
# - Storage quota enforcement
```

### Metrics to Monitor

```bash
# After traffic switch, monitor for 24 hours:

# Error Rate
curl http://localhost:8000/v1/metrics | jq '.error_rate'
# Should remain < 0.1%

# Response Time
curl http://localhost:8000/v1/metrics | jq '.avg_response_time'
# Should remain within baseline

# Traffic Distribution
curl http://localhost:8000/v1/metrics | jq '.requests_per_second'
# Should be consistent

# Database Health
curl -X GET http://localhost:8000/v1/status/database
# Should show normal connection pool

# User Sessions
curl http://localhost:8000/v1/metrics | jq '.active_sessions'
# Should be consistent with pre-deployment
```

## Rollback

### Quick Rollback to BLUE

If GREEN has critical issues:

```bash
# Immediate action: Switch traffic back to BLUE
./scripts/switch_traffic.sh blue

# Wait for connections to drain
sleep 30

# Verify BLUE is receiving traffic
curl http://localhost:8001/health

# Monitor metrics
watch -n 5 'curl -s http://localhost:8000/v1/metrics | jq .'
```

### Complete Rollback Procedure

```bash
# 1. Alert team
echo "Triggering rollback to BLUE due to: [reason]" | mail -s "DEPLOYMENT ROLLBACK" team@example.com

# 2. Switch traffic
./scripts/switch_traffic.sh blue

# 3. Verify
curl http://localhost:8001/health

# 4. Monitor
docker logs -f resume-api-blue

# 5. Investigate
# Save GREEN logs for analysis
docker logs resume-api-green > /tmp/green_failure_$(date +%s).log

# 6. Begin fix
# Create fix branch from GREEN problematic version
# Commit fixes
# Build new image: resume-api:1.2.4
# Update GREEN_VERSION in .env.green

# 7. When ready for retry
export GREEN_VERSION=1.2.4
docker-compose -f docker-compose.yml -f docker-compose.green.yml up -d --pull always resume-api-green
```

## Database Considerations

### Shared Database Strategy

Blue-green deployments typically use a shared database:

```
BLUE (v1.2.2) ──┐
                ├─→ Shared Database ← No data duplication
GREEN (v1.2.3) ─┘
```

### Schema Compatibility

When deploying migrations that change the database schema:

```yaml
# Migration strategy: Backwards-compatible changes

# ✓ GOOD: Additive changes (new columns with defaults)
# CREATE TABLE new_feature (id INT PRIMARY KEY, ...);
# ALTER TABLE users ADD COLUMN new_field VARCHAR(255) DEFAULT 'value';

# ✗ AVOID: Destructive changes (dropping columns)
# ALTER TABLE users DROP COLUMN old_field;

# ✗ AVOID: Renaming columns
# ALTER TABLE users RENAME COLUMN old_name TO new_name;
```

### Multi-step Schema Migration

For breaking schema changes:

```
Version 1.2.2 (BLUE, active)
        ↓
Deploy 1.2.3 with new code reading BOTH old and new columns
        ↓
Run migration to add new columns to old tables
        ↓
Switch traffic to GREEN (1.2.3)
        ↓
Remove old column references from code in 1.2.4
        ↓
Run migration to drop old columns
        ↓
Deploy 1.2.4
```

### Data Consistency

If using read replicas:

```yaml
Shared Database:
  Primary: writes from both BLUE and GREEN
  Read Replicas: 
    - BLUE reads from replica 1
    - GREEN reads from replica 2
  
Replication Lag: < 100ms (acceptable for most use cases)
```

## Monitoring

### Real-time Monitoring During Deployment

```bash
#!/bin/bash
# Monitor deployment in real-time

watch -n 2 'echo "=== $(date) ===" && \
  echo "BLUE:" && curl -s http://localhost:8001/health | jq .status && \
  echo "GREEN:" && curl -s http://localhost:8002/health | jq .status && \
  echo "Traffic to:" && grep "upstream api_active" /etc/nginx/nginx.conf'
```

### Logging Configuration

Ensure both environments log all requests:

```yaml
logging:
  format: "$timestamp $environment $service_id $request_path $status $response_time_ms"
  level: info
  outputs:
    - file: /var/log/resume-api.log
    - file: /var/log/resume-api-${ENV}.log  # Separate per environment
    - stdout: true  # For container logging
```

## Cost Optimization

### Reduce Infrastructure Cost

Running two identical environments doubles costs. Consider:

1. **Smaller BLUE Environment**: Keep only essential services running on BLUE
   - Single container instead of load-balanced replicas
   - Reduced database replica count
   - Estimate: 30-50% cost reduction

2. **Scheduled Shutdown**: Shut down BLUE when not deploying
   - Reduces cost by 50% on idle time
   - Requires automated startup for deployments

3. **Hybrid Approach**:
   - Use blue-green only for critical deployments
   - Use rolling updates for minor deployments
   - Reduces cost by selecting appropriate strategy

### Example Cost Analysis

```
Full blue-green (both environments full-scale):
  BLUE:  2 x 2CPU, 4GB RAM  = $100/month
  GREEN: 2 x 2CPU, 4GB RAM  = $100/month
  Database: $300/month
  Load Balancer: $30/month
  Total: $530/month (100% over baseline)

Reduced-size BLUE:
  BLUE:  1 x 1CPU, 2GB RAM  = $50/month
  GREEN: 2 x 2CPU, 4GB RAM  = $100/month
  Database: $300/month
  Load Balancer: $30/month
  Total: $480/month (16% over baseline)
```

## References

- [Deployment Safeguards](DEPLOYMENT_SAFEGUARDS.md)
- [Rollback Procedure](ROLLBACK_PROCEDURE.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)

---

**Last Updated**: 2024-02-26
**Version**: 1.0
**Status**: Active
