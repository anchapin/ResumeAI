# Kubernetes/Kustomize Base Configuration

# For ResumeAI API Service

## Quick Start

### Prerequisites

- Kubernetes 1.21+
- Helm 3.8+
- kubectl configured

### Installation

```bash
# Add the Helm repository (if published)
helm repo add resumeai https://anchapin.github.io/resumeai-charts

# Or install directly from the charts directory
cd k8s/charts/resume-api

# Create namespace
kubectl create namespace resumeai

# Install with Helm
helm install resume-api . -n resumeai

# Or use custom values
helm install resume-api . -n resumeai -f values-production.yaml
```

### Configuration

The following secrets must be provided:

```bash
# Create secrets
kubectl create secret generic resumeapi-secrets \
  --from-literal=MASTER_API_KEY='your-master-api-key' \
  --from-literal=OPENAI_API_KEY='your-openai-key' \
  -n resumeai
```

### Upgrading

```bash
helm upgrade resume-api . -n resumeai
```

### Uninstalling

```bash
helm uninstall resume-api -n resumeai
```

## Values Files

| File                     | Purpose                           |
| ------------------------ | --------------------------------- |
| `values.yaml`            | Default values for development    |
| `values-production.yaml` | Production settings (create this) |
| `values-staging.yaml`    | Staging settings (create this)    |

## Production Considerations

1. **Secrets Management**: Use external secrets operator or Vault
2. **TLS**: Ensure ingress TLS is configured
3. **Database**: Use managed PostgreSQL (RDS, Cloud SQL)
4. **Redis**: Use managed Redis (ElastiCache, MemoryDB)
5. **Monitoring**: Add Prometheus/Grafana for observability
6. **Logging**: Configure log aggregation (ELK, Loki)

## Directory Structure

```
k8s/
├── charts/
│   └── resume-api/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── _helpers.tpl
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── ingress.yaml
│           ├── configmap.yaml
│           ├── pvc.yaml
│           └── serviceaccount.yaml
└── README.md
```

## Example Production values.yaml

```yaml
replicaCount: 3

image:
  tag: 'v1.0.0'

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

resources:
  limits:
    cpu: 4000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 1Gi

ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
  tls:
    - secretName: resumeapi-prod-tls
      hosts:
        - api.resumeai.com

env:
  DEBUG: 'false'
  REQUIRE_API_KEY: 'true'

database:
  host: 'prod-db.xxxx.us-east-1.rds.amazonaws.com'

redis:
  host: 'prod-redis.xxxx.cache.amazonaws.com'

persistence:
  size: 50Gi
```
