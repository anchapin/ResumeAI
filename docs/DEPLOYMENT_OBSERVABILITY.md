# Deployment Observability

This document describes the deployment observability features added in Issue #820.

## Overview

Deployment observability provides comprehensive tracking and monitoring of all deployment activities in the ResumeAI project. This enables teams to:
- Track deployment status and history
- Monitor deployment health and performance
- Get alerts on deployment issues
- Visualize deployment metrics in Grafana

## Components

### 1. Deployment Event Tracking (`resume-api/monitoring/deployment_events.py`)

The core module for tracking deployment events with:

- **Event Types**:
  - `deployment_start` - Deployment begins
  - `deployment_complete` - Deployment succeeds
  - `deployment_fail` - Deployment fails
  - `deployment_rollback` - Deployment rolled back
  - `health_transition` - Health state changes
  - `feature_flag_change` - Feature flags modified
  - `config_change` - Configuration changes
  - `scaling_event` - Auto-scaling events

- **Prometheus Metrics**:
  - `deployment_total` - Total deployments by status/environment
  - `deployment_duration_seconds` - Deployment duration histogram
  - `deployments_in_progress` - Current deployments gauge
  - `deployment_events_total` - Total events by type
  - `health_transitions_total` - Health state transitions
  - `feature_flag_changes_total` - Feature flag changes

### 2. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/deployment/events/start` | POST | Record deployment start |
| `/api/v1/deployment/events/complete` | POST | Record deployment completion |
| `/api/v1/deployment/events/fail` | POST | Record deployment failure |
| `/api/v1/deployment/events/rollback` | POST | Record deployment rollback |
| `/api/v1/deployment/events/health-transition` | POST | Record health transition |
| `/api/v1/deployment/events/feature-flag-change` | POST | Record feature flag change |
| `/api/v1/deployment/status` | GET | Get current deployment status |

### 3. GitHub Actions Workflow

The deployment workflow (`.github/workflows/deployment.yml`) provides:

- **Automated Builds**: Builds Docker images on push to main or new tags
- **Deployment Tracking**: Reports start/complete/fail events to the API
- **GitHub Deployments**: Creates GitHub deployment status
- **Environment Support**: Manual deployment to production/staging/development

### 4. Prometheus Alerts

Alerts configured in `resume-api/config/alert_rules.yml`:

| Alert | Severity | Description |
|-------|----------|-------------|
| `DeploymentInProgressTooLong` | Warning | Deployment > 1 hour |
| `DeploymentFailed` | Critical | Any deployment failure |
| `DeploymentRolledBack` | Warning | Deployment rolled back |
| `HealthTransitionToUnhealthy` | Critical | Health state changed to unhealthy |
| `HighDeploymentFrequency` | Info | >10 deployments/hour |

### 5. Grafana Dashboard

Dashboard located at `resume-api/dashboards/deployment-observability.json` provides:

- Deployment success/failure counts
- Deployment duration metrics (p50, p95)
- Deployments in progress
- Deployment success rate
- Events by type
- Health state transitions
- Feature flag changes

## Usage

### Recording Deployment Events

#### Start a Deployment
```bash
curl -X POST "http://localhost:8000/api/v1/deployment/events/start?deployment_id=deploy-20240301-120000&version=v1.2.3&deployment_type=rolling&environment=production" \
  -H "X-API-Key: your-api-key"
```

#### Complete a Deployment
```bash
curl -X POST "http://localhost:8000/api/v1/deployment/events/complete?deployment_id=deploy-20240301-120000&status=success" \
  -H "X-API-Key: your-api-key"
```

#### Record a Failure
```bash
curl -X POST "http://localhost:8000/api/v1/deployment/events/fail?deployment_id=deploy-20240301-120000&failure_reason=health-check-failed" \
  -H "X-API-Key: your-api-key"
```

### CI/CD Integration

The GitHub Actions workflow automatically reports deployment events:

```yaml
- name: Report deployment start
  run: |
    curl -X POST "http://localhost:8000/api/v1/deployment/events/start?deployment_id=$DEPLOYMENT_ID&version=$VERSION" \
      -H "X-API-Key: ${{ secrets.API_KEY }}"
```

## Viewing Metrics

### Prometheus Queries

```promql
# Deployment success rate
sum(deployment_total{status="success"}) / sum(deployment_total)

# Average deployment duration
histogram_quantile(0.50, sum(rate(deployment_duration_seconds_bucket[5m])) by (le))

# Deployments in the last hour by environment
sum(increase(deployment_total[1h])) by (environment)

# Current deployments in progress
deployments_in_progress
```

### Grafana Dashboard

1. Access Grafana at `http://localhost:3000`
2. Navigate to "Deployment Observability" dashboard
3. Select time range and environment filters

## Alert Configuration

Alerts are triggered based on the rules in `resume-api/config/alert_rules.yml`. To modify:

1. Edit the alert rules file
2. Update the Prometheus configuration to reload rules
3. Alerts will fire based on the defined conditions

## Troubleshooting

### Deployment Events Not Being Recorded

1. Check API key is valid
2. Verify network connectivity to the API
3. Check application logs for errors

### Missing Metrics in Prometheus

1. Verify Prometheus is scraping the `/metrics` endpoint
2. Check that deployment metrics are enabled in config
3. Review Prometheus target health

### Alerts Not Firing

1. Verify alert rules are loaded in Prometheus
2. Check alert notification configuration
3. Review Prometheus alerting logs

## Related Files

- `resume-api/monitoring/deployment_events.py` - Core tracking module
- `resume-api/routes/deployment.py` - API endpoints
- `.github/workflows/deployment.yml` - CI/CD workflow
- `resume-api/config/alert_rules.yml` - Alert definitions
- `resume-api/dashboards/deployment-observability.json` - Grafana dashboard

## References

- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [GitHub Deployments API](https://docs.github.com/en/rest/deployments)
