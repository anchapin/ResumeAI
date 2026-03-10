# Canary Deployment Guide

This document describes the canary deployment workflow for ResumeAI, enabling gradual rollouts with automated health monitoring and rollback capabilities.

## Overview

The canary deployment strategy allows you to:
- Deploy changes to a small subset of users first
- Monitor for issues before full rollout
- Automatically rollback if problems are detected
- Get manual approval before promoting to production
- View detailed metrics throughout the process

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                    (NGINX / Istio)                          │
└─────────────────────┬─────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐      ┌─────────────────┐
│  Production     │      │    Canary       │
│  Deployment    │      │    Deployment   │
│  (90-100%)     │      │    (0-50%)       │
└─────────────────┘      └─────────────────┘
```

## Traffic Splitting Stages

The canary deployment progresses through these stages:

| Stage | Traffic % | Purpose |
|-------|-----------|---------|
| Initial | 10% | Basic smoke test |
| Quarter | 25% | Verify under moderate load |
| Half | 50% | Test with significant traffic |
| Full | 100% | Complete rollout |

## Workflow Triggers

### Automatic Trigger
- Push to `main` branch
- New version tag (`v*`)

### Manual Trigger
- Navigate to GitHub Actions
- Select "Canary Deployment" workflow
- Choose environment and initial canary percentage
- Optionally skip canary for direct production deployment

## Configuration Options

### Workflow Inputs

| Parameter | Description | Default |
|-----------|-------------|---------|
| `environment` | Target environment | production |
| `canary_percentage` | Initial canary % | 10 |
| `skip_canary` | Skip canary entirely | false |

### Required Secrets

Configure these in GitHub repository settings:

```
DOCKERHUB_USERNAME - Docker Hub username
DOCKERHUB_TOKEN - Docker Hub access token
GITHUB_TOKEN - GitHub Actions token (auto-provided)
K8S_CONTEXT - Kubernetes context for deployment
API_KEY - Deployment tracking API key
SLACK_WEBHOOK_URL - Slack notification webhook
CANARY_APPROVERS - Comma-separated list of approvers
PROMETHEUS_URL - Prometheus push gateway URL (optional)
```

## Health Monitoring Criteria

The canary deployment monitors these metrics:

### Error Rate
- **Threshold**: >5% errors triggers rollback
- **Check interval**: 60 seconds

### Response Time
- **Warning threshold**: >2000ms P95 latency
- **Check interval**: 60 seconds

### Consecutive Failures
- **Threshold**: 3 consecutive failures triggers rollback
- **Check interval**: 60 seconds

### Availability
- **Target**: >99.5% success rate
- **Monitoring period**: 10 minutes per stage

## Rollback Triggers

Automatic rollback occurs when:
1. Health check fails 3 times consecutively
2. Error rate exceeds 5%
3. P95 latency exceeds 2 seconds for 3+ minutes
4. Manual approval is denied
5. Any stage health check fails

## Manual Promotion

At each stage transition, the workflow:
1. Pauses for manual approval
2. Sends notification to configured channels
3. Waits for approval from authorized approvers
4. Proceeds or aborts based on decision

To approve:
1. Navigate to the workflow run
2. Click "Review deployments"
3. Click "Approve" button

## Metrics Dashboard

### Prometheus Metrics

The following metrics are collected:

```prometheus
# Deployment status
canary_deployment_status{version, stage, status}

# Traffic metrics
canary_http_requests_total{canary="true"}
canary_http_requests_total{version="canary"}

# Latency metrics  
http_request_duration_seconds_bucket{canary="true"}
http_request_duration_seconds_bucket{version="canary"}

# Error metrics
canary_http_requests_total{status=~"5.."}
```

### Grafana Dashboard

A canary-specific dashboard shows:
- Traffic split visualization
- Error rate comparison (canary vs production)
- Latency comparison
- Deployment progress
- Rollback history

## Kubernetes Resources

### Canary Deployment
Located in: `k8s/canary/deployment.yaml`

- Separate deployment with canary label
- Independent resource limits
- Liveness and readiness probes

### Traffic Splitting
Located in: `k8s/canary/traffic-split.yaml`

- NGINX Ingress with canary annotations
- Istio VirtualService for traffic splitting
- DestinationRule for traffic policies

### Auto-scaling
Located in: `k8s/canary/scaling.yaml`

- HorizontalPodAutoscaler for canary pods
- PodDisruptionBudget for availability
- ResourceQuota and LimitRange

### Monitoring
Located in: `k8s/canary/config.yaml`

- ServiceMonitor for Prometheus
- PrometheusRule for alerting
- ConfigMap for canary-specific config

## Running a Canary Deployment

### Step 1: Trigger Deployment
```bash
# Via GitHub UI:
# 1. Go to Actions > Canary Deployment
# 2. Click "Run workflow"
# 3. Select parameters and run
```

### Step 2: Monitor Initial Stage
- Watch the "Monitor canary health" job
- Review health check results
- Check logs in Kubernetes pods

### Step 3: Approve Promotion
- Receive notification (Slack/Discord)
- Review metrics in dashboard
- Click approve in GitHub UI

### Step 4: Continue Through Stages
- Repeat approval for each stage
- Monitor metrics at each percentage
- Verify no regression from previous stage

### Step 5: Production Rollout
- Final promotion to 100%
- Traffic fully switched to new version
- Old canary deployment retained for quick rollback

## Rollback Procedure

### Automatic Rollback
If issues are detected:
1. Traffic immediately routed to production
2. Canary deployment scaled to 0
3. Notification sent to Slack/Discord
4. Deployment marked as failed

### Manual Rollback
If issues are discovered after promotion:
1. Navigate to Kubernetes dashboard
2. Scale canary to 0
3. Update ingress to remove canary weight
4. Or use the rollback workflow

```bash
kubectl scale deployment resume-api-canary --replicas=0 -n production
kubectl patch ingress resume-api -n production \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'
```

## Troubleshooting

### Common Issues

#### Canary pod not starting
- Check container image exists
- Verify resource limits
- Check K8s events: `kubectl describe pod -l version=canary -n production`

#### Health checks failing
- Verify /api/v1/health endpoint exists
- Check pod logs: `kubectl logs -l version=canary -n production`
- Ensure readiness probe is configured

#### Traffic not routing to canary
- Verify ingress annotations
- Check NGINX/Ingress controller logs
- Confirm service selectors match pods

#### Approval workflow stuck
- Verify CANARY_APPROVERS secret is set
- Check approvers have repository access
- Ensure GITHUB_TOKEN has required permissions

## Best Practices

1. **Start Small**: Always begin with 10% traffic
2. **Monitor Thoroughly**: Wait at least 60 seconds per stage
3. **Test Real Traffic**: Ensure canary receives production-like load
4. **Keep Logs**: Retain canary logs for debugging
5. **Quick Rollback**: Don't hesitate to rollback if issues appear
6. **Incremental Promotion**: Don't skip stages, even if tests pass

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Deployment Safeguards](./DEPLOYMENT_SAFEGUARDS.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Rollback Workflow](./.github/workflows/rollback.yml)
